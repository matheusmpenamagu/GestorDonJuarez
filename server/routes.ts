import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket, broadcastUpdate } from "./websocket";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
// Removed Replit Auth for demo purposes
import { insertPourEventSchema, insertKegChangeEventSchema, insertTapSchema, insertPointOfSaleSchema, insertBeerStyleSchema, insertDeviceSchema, insertUnitSchema, insertCo2RefillSchema, insertProductCategorySchema, insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import multer from "multer";

const SAO_PAULO_TZ = "America/Sao_Paulo";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Helper function to convert dates to São Paulo timezone
function toSaoPauloTime(date: Date): string {
  const zonedDate = toZonedTime(date, SAO_PAULO_TZ);
  return format(zonedDate, "dd/MM/yyyy HH:mm:ss");
}

// Helper function to parse dates from São Paulo timezone
function fromSaoPauloTime(dateString: string): Date {
  // Parse date in YYYY-MM-DD format and set to São Paulo timezone
  // For start dates, use 00:00:00
  // For end dates, use 23:59:59
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// PDF parsing function for cash register closure data
function parsePDFContent(text: string): any {
  console.log('Parsing PDF content...');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('PDF lines:', lines.slice(0, 20)); // Log first 20 lines for debugging

  // Initialize data object with default values
  const data: any = {
    datetime: new Date().toISOString(),
    unitId: null,
    operationType: 'salao',
    initialFund: '0.00',
    cashSales: '0.00',
    debitSales: '0.00',
    creditSales: '0.00',
    pixSales: '0.00',
    withdrawals: '0.00',
    shift: 'dia',
    observations: 'Importado via PDF'
  };

  // Helper function to extract currency values
  const extractCurrency = (text: string): string => {
    // Look for patterns like "R$ 123,45" or "123,45" or "123.45"
    const currencyRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:\.\d{2})?)/;
    const match = text.match(currencyRegex);
    if (match) {
      // Convert Brazilian format (123.456,78) to decimal (123456.78)
      let value = match[1];
      if (value.includes(',')) {
        // Brazilian format
        value = value.replace(/\./g, '').replace(',', '.');
      }
      return parseFloat(value).toFixed(2);
    }
    return '0.00';
  };

  // Helper function to extract date/time
  const extractDateTime = (text: string): string => {
    // Look for date patterns like "DD/MM/YYYY" or "DD-MM-YYYY"
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const timeRegex = /(\d{1,2}):(\d{2})/;
    
    const dateMatch = text.match(dateRegex);
    const timeMatch = text.match(timeRegex);
    
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      let dateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      if (timeMatch) {
        const [, hour, minute] = timeMatch;
        dateTime += `T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      } else {
        dateTime += 'T00:00';
      }
      
      return dateTime;
    }
    
    return new Date().toISOString();
  };

  // Process each line to extract relevant information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const originalLine = lines[i];

    // Extract date/time information
    if (line.includes('data') || line.includes('período') || originalLine.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
      const extractedDate = extractDateTime(originalLine);
      if (extractedDate !== new Date().toISOString()) {
        data.datetime = extractedDate;
      }
    }

    // Extract unit information
    if (line.includes('unidade') || line.includes('loja') || line.includes('filial')) {
      // Try to match with existing units in the system
      if (line.includes('apollonio') || line.includes('apollo')) {
        data.unitId = 5; // Apollonio unit ID from database
      } else if (line.includes('grão') || line.includes('grao') || line.includes('para')) {
        data.unitId = 6; // Grão Pará unit ID
      }
    }

    // Extract operation type
    if (line.includes('delivery') || line.includes('entrega')) {
      data.operationType = 'delivery';
    } else if (line.includes('salão') || line.includes('salao') || line.includes('balcão')) {
      data.operationType = 'salao';
    }

    // Extract shift information
    if (line.includes('turno') || line.includes('período')) {
      if (line.includes('manhã') || line.includes('manha') || line.includes('dia')) {
        data.shift = 'dia';
      } else if (line.includes('tarde')) {
        data.shift = 'tarde';
      } else if (line.includes('noite')) {
        data.shift = 'noite';
      } else if (line.includes('madrugada') || line.includes('madrug')) {
        data.shift = 'madrugada';
      }
    }

    // Extract financial values
    if (line.includes('fundo') && (line.includes('inicial') || line.includes('abertura'))) {
      data.initialFund = extractCurrency(originalLine);
    }
    
    if (line.includes('dinheiro') || line.includes('espécie') || line.includes('cash')) {
      if (line.includes('venda') || line.includes('receb')) {
        data.cashSales = extractCurrency(originalLine);
      }
    }
    
    if (line.includes('débito') || line.includes('debito') || line.includes('cartão débito')) {
      data.debitSales = extractCurrency(originalLine);
    }
    
    if (line.includes('crédito') || line.includes('credito') || line.includes('cartão crédito')) {
      data.creditSales = extractCurrency(originalLine);
    }
    
    if (line.includes('pix')) {
      data.pixSales = extractCurrency(originalLine);
    }
    
    if (line.includes('sangria') || line.includes('retirada') || line.includes('saque')) {
      data.withdrawals = extractCurrency(originalLine);
    }

    // Look for total sales
    if (line.includes('total') && (line.includes('venda') || line.includes('receit'))) {
      const totalValue = extractCurrency(originalLine);
      // If we don't have individual breakdown, put everything in cash sales
      if (data.cashSales === '0.00' && data.debitSales === '0.00' && 
          data.creditSales === '0.00' && data.pixSales === '0.00') {
        data.cashSales = totalValue;
      }
    }
  }

  console.log('Parsed data:', data);
  
  // Return data even if unitId is null - we'll handle it in the frontend
  return data;
}

// Simple demo auth middleware - allows all requests for demonstration
const demoAuth = (req: any, res: any, next: any) => {
  next();
};

// Webhook token validation middleware
const validateWebhookToken = (req: any, res: any, next: any) => {
  try {
    const providedToken = req.headers['x-webhook-token'] || req.headers['webhook-token'];
    const expectedToken = process.env.webhook_token;

    if (!expectedToken) {
      console.error('Webhook token not configured in environment');
      return res.status(500).json({ 
        message: "Server configuration error" 
      });
    }

    if (!providedToken) {
      console.error('Missing webhook token in request headers');
      return res.status(401).json({ 
        message: "Unauthorized: Missing webhook token" 
      });
    }

    if (providedToken !== expectedToken) {
      console.error('Invalid webhook token provided');
      return res.status(401).json({ 
        message: "Unauthorized: Invalid webhook token" 
      });
    }

    // Token is valid, proceed to webhook handler
    next();
  } catch (error) {
    console.error('Error validating webhook token:', error);
    return res.status(500).json({ 
      message: "Error validating token" 
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Demo auth route for localStorage-based authentication
  app.get('/api/auth/user', (req, res) => {
    // Return a demo user for frontend compatibility
    res.json({
      id: 'demo-user',
      email: 'demo@donjuarez.com.br',
      name: 'Demo User'
    });
  });

  // Webhook endpoints for ESP32 hardware
  
  // Test endpoint for ESP32 webhook
  app.post('/api/test/pour', (req, res) => {
    console.log('Test webhook called with:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ message: "Test endpoint working", body: req.body });
  });

  // Test endpoint for WhatsApp Business Cloud API webhook
  app.post('/api/test/whatsapp-official', async (req, res) => {
    console.log('Test WhatsApp Business Cloud API webhook called');
    
    // Simulate WhatsApp Business Cloud API webhook format
    const testMessage = req.body.message || "cheguei";
    const testPhone = req.body.phone || "5533988286293";
    
    const whatsappPayload = {
      entry: [{
        id: "123456789",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550559999",
              phone_number_id: "123456789"
            },
            contacts: [{
              profile: {
                name: "Test User"
              },
              wa_id: testPhone
            }],
            messages: [{
              from: testPhone,
              id: "wamid.test123",
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: testMessage
              },
              type: "text"
            }]
          }
        }]
      }]
    };
    
    console.log('Simulating WhatsApp Business Cloud API webhook with payload:', JSON.stringify(whatsappPayload, null, 2));
    
    try {
      // Call our webhook endpoint internally
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/webhooks/whatsapp-official`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      });
      
      const result = await response.json();
      res.json({ 
        message: "Test WhatsApp Business Cloud API webhook processed", 
        result,
        status: response.status 
      });
    } catch (error) {
      console.error('Error testing WhatsApp Business Cloud API webhook:', error);
      res.status(500).json({ message: "Error testing webhook", error: error.message });
    }
  });

  // Test endpoint for Evolution API webhook
  app.post('/api/test/evolution', async (req, res) => {
    console.log('Test Evolution API webhook called');
    
    // Simulate Evolution API webhook format
    const testMessage = req.body.message || "cheguei";
    const testPhone = req.body.phone || "5511999999999"; // Default test phone
    
    const evolutionPayload = {
      data: {
        key: {
          remoteJid: `${testPhone}@s.whatsapp.net`,
          id: "test-message-id"
        },
        message: {
          conversation: testMessage
        }
      }
    };
    
    console.log('Simulating Evolution webhook with payload:', JSON.stringify(evolutionPayload, null, 2));
    
    try {
      // Call our webhook endpoint internally
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/webhooks/evolution-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evolutionPayload),
      });
      
      const result = await response.json();
      res.json({ 
        message: "Test Evolution webhook processed", 
        result,
        status: response.status 
      });
    } catch (error) {
      console.error('Error testing Evolution webhook:', error);
      res.status(500).json({ message: "Error testing webhook", error: error.message });
    }
  });

  // Simple health check endpoint for ESP32
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      timezone: "America/Sao_Paulo"
    });
  });
  
  // Flow meter webhook - receives pour data from ESP32
  app.post('/api/webhooks/pour', validateWebhookToken, async (req, res) => {
    // Set CORS headers for ESP32 compatibility
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set response timeout to prevent ESP32 timeouts
    res.setTimeout(5000); // 5 seconds - quicker response for ESP32
    
    // Send immediate acknowledgment to prevent timeout
    const startTime = Date.now();
    
    try {
      console.log('=== WEBHOOK START ===');
      console.log('Pour webhook received:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers);
      
      // Validate request body exists
      if (!req.body) {
        console.error('Empty request body');
        return res.status(400).json({ message: "Empty request body" });
      }
      
      // Support both device_id (ESP32) and tap_id (direct) formats
      const { device_id, tap_id, datetime, total_volume_ml } = req.body;
      
      console.log('Extracted fields:', { device_id, tap_id, datetime, total_volume_ml });
      
      if (!datetime || total_volume_ml === undefined) {
        console.error('Missing required fields:', { datetime, total_volume_ml });
        return res.status(400).json({ 
          message: "Missing required fields: datetime, total_volume_ml" 
        });
      }

      let targetTapId = tap_id;

      // If device_id is provided, find the associated tap
      if (device_id && !tap_id) {
        console.log('Looking up device:', device_id, typeof device_id);
        let device;
        
        // Try to find device by code (string) or by ID (numeric)
        if (typeof device_id === 'string' && isNaN(Number(device_id))) {
          // Look for device by code first
          console.log('Searching by device code:', device_id);
          device = await storage.getDeviceByCode(device_id);
        } else {
          // Look for device by ID
          console.log('Searching by device ID:', Number(device_id));
          device = await storage.getDevice(Number(device_id));
        }
        
        console.log('Device found:', device ? device.code : 'NOT FOUND');
        
        if (!device) {
          return res.status(404).json({ 
            message: `Device not found with ID/code: ${device_id}` 
          });
        }

        const taps = await storage.getTaps();
        const tap = taps.find(t => t.deviceId === device.id);
        if (!tap) {
          return res.status(404).json({ 
            message: `No tap found for device: ${device.code} (${device.name})` 
          });
        }
        targetTapId = tap.id;
      }

      if (!targetTapId) {
        return res.status(400).json({ 
          message: "Either device_id or tap_id must be provided" 
        });
      }

      // Convert datetime to proper Date object
      const pourDate = fromSaoPauloTime(datetime);
      
      // The ESP32 reports the volume that flowed out in this reading
      // We treat this as a direct consumption event, not cumulative
      const pourVolumeMl = Math.round(total_volume_ml);

      // Only create event if there's actual volume reported (> 0)
      if (pourVolumeMl > 0) {
        // Get current tap information for snapshot data
        
        // Validate and create the pour event data (snapshot information will be captured in storage)
        const pourEventData = insertPourEventSchema.parse({
          tapId: targetTapId,
          totalVolumeMl: pourVolumeMl, // Volume of this individual measurement
          pourVolumeMl: pourVolumeMl, // Same as totalVolumeMl for individual events
          datetime: pourDate,
        });

        const pourEvent = await storage.createPourEvent(pourEventData);

        console.log(`Pour event created: Tap ${targetTapId}, ${pourVolumeMl}ml consumed at ${toSaoPauloTime(pourDate)}`);
        
        // Send response first, then broadcast update
        res.json({ success: true, event: pourEvent, pourVolumeMl });
        
        // Broadcast update via WebSocket (async, don't wait)
        broadcastUpdate('pour_event', pourEvent).catch(err => 
          console.error('WebSocket broadcast error:', err)
        );
      } else {
        // No volume reported, just acknowledge
        console.log(`No volume reported: Tap ${targetTapId}, volume: ${total_volume_ml}ml`);
        res.json({ success: true, pourVolumeMl: 0, message: "No volume reported" });
      }
      
    } catch (error) {
      console.error("=== WEBHOOK ERROR ===");
      console.error("Error processing pour webhook:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Request body:", req.body);
      console.error("=== END ERROR ===");
      
      // Send a quick response to ESP32
      res.status(500).json({ 
        message: "Error processing pour event",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Keg change webhook - receives barrel change notifications from ESP32
  app.post('/api/webhooks/keg-change', validateWebhookToken, async (req, res) => {
    try {
      // Support both device_id (ESP32) and tap_id (direct) formats
      const { device_id, tap_id, datetime } = req.body;
      
      if (!datetime) {
        return res.status(400).json({ 
          message: "Missing required field: datetime" 
        });
      }

      let targetTapId = tap_id;

      // If device_id is provided, find the associated tap
      if (device_id && !tap_id) {
        const device = await storage.getDevice(device_id);
        if (!device) {
          return res.status(404).json({ message: "Device not found" });
        }

        const taps = await storage.getTaps();
        const tap = taps.find(t => t.deviceId === device_id);
        if (!tap) {
          return res.status(404).json({ message: "No tap found for this device" });
        }
        targetTapId = tap.id;
      }

      if (!targetTapId) {
        return res.status(400).json({ 
          message: "Either device_id or tap_id must be provided" 
        });
      }

      // Get keg capacity from request body (default to 30L)
      const { keg_capacity_liters = 30 } = req.body;
      const capacity = parseInt(keg_capacity_liters);
      
      if (isNaN(capacity) || (capacity !== 30 && capacity !== 50)) {
        return res.status(400).json({ 
          message: "Invalid keg_capacity_liters. Must be 30 or 50." 
        });
      }

      // Get current tap info to record previous volume
      const tap = await storage.getTap(targetTapId);
      const previousVolumeMl = tap ? tap.currentVolumeAvailableMl : null;

      // Convert datetime to proper Date object
      const changeDate = fromSaoPauloTime(datetime);
      
      // Validate the keg change event data
      const kegChangeData = insertKegChangeEventSchema.parse({
        tapId: targetTapId,
        previousVolumeMl,
        kegCapacityLiters: capacity,
        datetime: changeDate,
      });

      const kegChangeEvent = await storage.createKegChangeEvent(kegChangeData);

      // Broadcast update via WebSocket
      await broadcastUpdate('keg_change', kegChangeEvent);
      
      console.log(`Keg change event created: Tap ${targetTapId} with ${capacity}L capacity at ${toSaoPauloTime(changeDate)}`);
      
      res.json({ success: true, event: kegChangeEvent });
    } catch (error) {
      console.error("Error processing keg change webhook:", error);
      res.status(500).json({ message: "Error processing keg change event" });
    }
  });

  // Device heartbeat webhook - receives device status updates from ESP32
  app.post('/api/webhooks/heartbeat', validateWebhookToken, async (req, res) => {
    try {
      const { device_id } = req.body;

      if (!device_id) {
        return res.status(400).json({ 
          message: "Missing required field: device_id" 
        });
      }

      let device;
      const deviceIdStr = device_id.toString();
      
      // Try to find device by code (string) or by ID (numeric)
      if (typeof device_id === 'string' && isNaN(Number(device_id))) {
        // Look for device by exact code first
        device = await storage.getDeviceByCode(deviceIdStr);
        
        // If not found and device_id is longer than 5 chars, try truncated version
        if (!device && deviceIdStr.length > 5) {
          const truncatedCode = deviceIdStr.slice(0, 5).toUpperCase();
          device = await storage.getDeviceByCode(truncatedCode);
        }
      } else {
        // Look for device by ID
        device = await storage.getDevice(Number(device_id));
      }
      
      if (!device) {
        // Create new device with default name if not found
        console.log(`Creating new device with code: ${deviceIdStr}`);
        
        // Generate a 5-character code for the database
        let deviceCode = deviceIdStr.slice(0, 5).toUpperCase();
        if (deviceCode.length < 5) {
          // Pad with zeros if too short
          deviceCode = deviceCode.padEnd(5, '0');
        }
        
        // Check if this code already exists, if so, add a suffix
        let finalCode = deviceCode;
        let suffix = 1;
        while (await storage.getDeviceByCode(finalCode)) {
          finalCode = deviceCode.slice(0, 4) + suffix.toString();
          suffix++;
          if (suffix > 9) break; // Limit attempts
        }
        
        const newDeviceData = {
          code: finalCode,
          name: "ESP8266",
          description: "",
          isActive: true
        };
        
        device = await storage.createDevice(newDeviceData);
        console.log(`New device created: ${device.code} (ID: ${device.id})`);
      }

      // Update device heartbeat timestamp
      await storage.updateDeviceHeartbeat(device.id);
      
      console.log(`Heartbeat received from device ${device.code} (ID: ${device.id})`);
      
      res.json({ success: true, message: "Heartbeat received" });
      
    } catch (error) {
      console.error("Error processing heartbeat webhook:", error);
      res.status(500).json({ message: "Error processing heartbeat" });
    }
  });

  // Helper function to send WhatsApp message via Official Business Cloud API
  async function sendWhatsAppMessage(remoteJid: string, text: string, webhookType: 'freelancer' | 'stock_count' = 'stock_count'): Promise<boolean> {
    try {
      // Adiciona código do Brasil (+55) se não estiver presente
      let formattedNumber = remoteJid;
      if (!formattedNumber.startsWith('55')) {
        formattedNumber = '55' + formattedNumber;
      }
      
      console.log('[WHATSAPP] =============================================================');
      console.log('[WHATSAPP] Preparando envio de mensagem WhatsApp Business Cloud API');
      console.log('[WHATSAPP] Tipo de webhook:', webhookType);
      console.log('[WHATSAPP] Destinatário original:', remoteJid);
      console.log('[WHATSAPP] Destinatário formatado (+55):', formattedNumber);
      
      // Preparação da mensagem para WhatsApp Business Cloud API
      const body = {
        messaging_product: "whatsapp",
        to: formattedNumber,
        type: "text",
        text: {
          body: text
        }
      };
      
      console.log('[WHATSAPP] Tamanho do texto:', text.length, 'caracteres');
      console.log('[WHATSAPP] Primeiros 200 caracteres da mensagem:');
      console.log('[WHATSAPP] "' + text.substring(0, 200) + (text.length > 200 ? '...' : '') + '"');
      console.log('[WHATSAPP] Phone Number ID:', process.env.META_PHONE_NUMBER_ID);
      console.log('[WHATSAPP] Access Token (primeiros 10 chars):', process.env.META_ACCESS_TOKEN?.substring(0, 10) + '...');
      console.log('[WHATSAPP] Body da requisição:', JSON.stringify(body, null, 2));
      
      // URL da API oficial do WhatsApp Business Cloud
      const whatsappApiUrl = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
      
      const startTime = Date.now();
      console.log('[WHATSAPP] Iniciando requisição HTTP para WhatsApp Business Cloud API...');
      console.log('[WHATSAPP] URL:', whatsappApiUrl);

      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`
        },
        body: JSON.stringify(body)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`[WHATSAPP] Resposta recebida em ${responseTime}ms`);
      console.log('[WHATSAPP] Status HTTP:', response.status);
      console.log('[WHATSAPP] Status Text:', response.statusText);
      console.log('[WHATSAPP] Headers da resposta:');
      
      // Log response headers
      for (const [key, value] of response.headers.entries()) {
        console.log(`[WHATSAPP]   ${key}: ${value}`);
      }

      const responseText = await response.text();
      console.log('[WHATSAPP] Body da resposta (raw):', responseText);
      
      // Try to parse and beautify JSON response
      try {
        const responseJson = JSON.parse(responseText);
        console.log('[WHATSAPP] Body da resposta (JSON formatado):');
        console.log('[WHATSAPP]', JSON.stringify(responseJson, null, 2));
      } catch (parseError) {
        console.log('[WHATSAPP] Response não é JSON válido, exibindo como texto');
      }

      if (!response.ok) {
        console.error('[WHATSAPP] ❌ FALHA NO ENVIO ❌');
        console.error('[WHATSAPP] Status de erro:', response.status);
        console.error('[WHATSAPP] Mensagem de erro:', response.statusText);
        console.error('[WHATSAPP] Detalhes do erro:', responseText);
        console.log('[WHATSAPP] =============================================================');
        return false;
      }

      console.log('[WHATSAPP] ✅ SUCESSO NO ENVIO ✅');
      console.log('[WHATSAPP] Mensagem enviada com sucesso via API oficial para:', remoteJid);
      console.log('[WHATSAPP] Tempo total de envio:', responseTime + 'ms');
      console.log('[WHATSAPP] =============================================================');
      return true;
    } catch (error) {
      console.error('[WHATSAPP] ⚠️ EXCEÇÃO DURANTE O ENVIO ⚠️');
      console.error('[WHATSAPP] Tipo do erro:', error.constructor.name);
      console.error('[WHATSAPP] Mensagem do erro:', error.message);
      console.error('[WHATSAPP] Stack trace completo:');
      console.error(error.stack);
      console.log('[WHATSAPP] =============================================================');
      return false;
    }
  }

  // WhatsApp webhook for freelancer time tracking (Official Business Cloud API)
  app.get('/api/webhooks/whatsapp-official', (req, res) => {
    // Webhook verification for Meta/Facebook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('WhatsApp webhook verification requested');
    console.log('Mode:', mode);
    console.log('Token:', token);
    
    if (mode === 'subscribe' && token === process.env.webhook_token) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      res.status(403).send('Verification failed');
    }
  });

  app.post('/api/webhooks/whatsapp-official', async (req, res) => {
    try {
      console.log('WhatsApp Business Cloud API webhook received:', JSON.stringify(req.body, null, 2));
      
      // Extract data from WhatsApp Business Cloud API format
      const { entry } = req.body;
      if (!entry || !entry.length) {
        return res.status(400).json({ message: "Invalid webhook format - no entry" });
      }

      const changes = entry[0].changes;
      if (!changes || !changes.length) {
        return res.status(400).json({ message: "Invalid webhook format - no changes" });
      }

      const messageData = changes[0].value;
      if (!messageData || !messageData.messages || !messageData.messages.length) {
        console.log('No messages in webhook, might be status update');
        return res.status(200).json({ message: "No messages to process" });
      }

      const message = messageData.messages[0];
      const contacts = messageData.contacts || [];
      const contact = contacts[0];
      
      if (!message.from || !message.text) {
        return res.status(400).json({ message: "Missing phone number or message text" });
      }

      const phoneNumber = message.from;
      const messageText = message.text.body;
      
      console.log(`Processing message from phone: ${phoneNumber}, text: "${messageText}"`);
      
      // Clean and normalize phone number for comparison
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      console.log(`Cleaned phone number: ${cleanPhoneNumber}`);
      
      // Find freelancer by phone number
      const freelancers = await storage.getEmployees();
      const freelancer = freelancers.find(emp => {
        if (!emp.whatsapp) return false;
        
        const cleanEmployeePhone = emp.whatsapp.replace(/\D/g, '');
        
        // Compare last 8 digits for maximum compatibility
        const last8Employee = cleanEmployeePhone.slice(-8);
        const last8Received = cleanPhoneNumber.slice(-8);
        
        console.log(`Comparing employee ${emp.id} phone last 8 digits: ${last8Employee} vs received: ${last8Received}`);
        
        const isMatch = last8Employee === last8Received;
        console.log(`Employee ${emp.id} (${emp.firstName} ${emp.lastName}) match: ${isMatch}`);
        
        return isMatch;
      });

      if (!freelancer || !freelancer.whatsapp) {
        await sendWhatsAppMessage(phoneNumber, "Usuário não encontrado neste número de WhatsApp.", 'freelancer');
        return res.json({ status: 'error', message: 'User not found' });
      }

      // Analyze message content
      const normalizedMessage = messageText.toLowerCase().trim();
      let messageType: 'entrada' | 'saida' | 'unit_response' | 'unknown';
      
      // Check if it's a unit selection response (just a number)
      const unitNumberMatch = messageText.trim().match(/^(\d+)$/);
      if (unitNumberMatch) {
        messageType = 'unit_response';
      } else if (normalizedMessage.includes('cheguei') || normalizedMessage.includes('entrada')) {
        messageType = 'entrada';
      } else if (normalizedMessage.includes('fui') || normalizedMessage.includes('saida') || normalizedMessage.includes('saída')) {
        messageType = 'saida';
      } else {
        messageType = 'unknown';
      }

      // Handle unit selection response
      if (messageType === 'unit_response') {
        const unitId = parseInt(unitNumberMatch[1]);
        const units = await storage.getUnits();
        const selectedUnit = units.find(u => u.id === unitId);
        
        if (!selectedUnit) {
          const unitsList = units.map(unit => `${unit.id} - ${unit.name}`).join('\n');
          await sendWhatsAppMessage(phoneNumber, `Unidade não encontrada. Escolha uma das opções:\n\n${unitsList}`, 'freelancer');
          return res.json({ status: 'error', message: 'Unit not found' });
        }
        
        // Register entrada with selected unit
        const timeEntry = await storage.createFreelancerTimeEntry({
          employeeId: freelancer.id,
          freelancerPhone: freelancer.whatsapp,
          freelancerName: `${freelancer.firstName} ${freelancer.lastName || ''}`.trim(),
          unitId: selectedUnit.id,
          entryType: 'entrada',
          message: 'Cheguei',
          timestamp: new Date(),
          isManualEntry: false,
          notes: 'Via WhatsApp - Business Cloud API',
        });

        const successMessage = `Ponto de entrada registrado com sucesso! 🎉\n\nUnidade: ${selectedUnit.name}\nHorário: ${toSaoPauloTime(new Date())}\n\nBom trabalho, ${freelancer.firstName}!`;
        await sendWhatsAppMessage(phoneNumber, successMessage, 'freelancer');
        return res.json({ status: 'success', message: 'Entry registered successfully', entry: timeEntry });
      }

      if (messageType === 'unknown') {
        await sendWhatsAppMessage(phoneNumber, 'Não consegui entender a mensagem. Envie "Cheguei" para marcar entrada ou "Fui" para marcar saída.', 'freelancer');
        return res.json({ status: 'error', message: 'Message not recognized' });
      }

      // If it's an entrada (check-in), request unit selection
      if (messageType === 'entrada') {
        const units = await storage.getUnits();
        const unitsList = units.map(unit => `${unit.id} - ${unit.name}`).join('\n');
        const unitSelectionMessage = `Olá ${freelancer.firstName}! 👋\n\nEm qual unidade você está trabalhando hoje?\n\n${unitsList}\n\nResponda apenas com o número da unidade.`;
        
        await sendWhatsAppMessage(phoneNumber, unitSelectionMessage, 'freelancer');
        return res.json({ status: 'awaiting_unit', message: 'Unit selection requested', employeeId: freelancer.id });
      }

      // If it's a saida (check-out), register immediately
      if (messageType === 'saida') {
        const timeEntry = await storage.createFreelancerTimeEntry({
          employeeId: freelancer.id,
          freelancerPhone: freelancer.whatsapp,
          freelancerName: `${freelancer.firstName} ${freelancer.lastName || ''}`.trim(),
          unitId: null, // Will be set based on last entry
          entryType: 'saida',
          message: 'Fui',
          timestamp: new Date(),
          isManualEntry: false,
          notes: 'Via WhatsApp - Business Cloud API',
        });

        const exitMessage = `Ponto de saída registrado com sucesso! 👍\n\nAté mais, ${freelancer.firstName}!`;
        await sendWhatsAppMessage(phoneNumber, exitMessage, 'freelancer');
        return res.json({ status: 'success', message: 'Exit registered successfully', entry: timeEntry });
      }

      res.json({ message: "Message processed" });
      
    } catch (error) {
      console.error("Error processing WhatsApp Business Cloud API webhook:", error);
      res.status(500).json({ message: "Error processing WhatsApp message" });
    }
  });

  // WhatsApp webhook for freelancer time tracking (Evolution API - Legacy)
  app.post('/api/webhooks/evolution-whatsapp', async (req, res) => {
    try {
      console.log('Evolution API webhook received:', JSON.stringify(req.body, null, 2));
      
      // Extract data from Evolution API webhook format
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ message: "Invalid webhook format" });
      }

      const { key, message } = data;
      if (!key || !message) {
        return res.status(400).json({ message: "Missing key or message data" });
      }

      const remoteJid = key.remoteJid;
      const messageText = message.conversation || message.extendedTextMessage?.text || '';
      
      if (!remoteJid || !messageText) {
        return res.status(400).json({ message: "Missing remoteJid or message text" });
      }

      // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
      const phoneMatch = remoteJid.match(/^(\d+)@/);
      if (!phoneMatch) {
        return res.status(400).json({ message: "Invalid phone number format in remoteJid" });
      }
      
      const phoneNumber = phoneMatch[1];
      console.log(`Processing message from phone: ${phoneNumber}, message: "${messageText}"`);

      // Find employee by phone number (freelancers only)
      const employees = await storage.getEmployees();
      
      // Extract the Brazilian phone number (remove +55 country code if present)
      let cleanPhoneNumber = phoneNumber;
      
      console.log(`Original number: ${phoneNumber} (${phoneNumber.length} digits)`);
      
      // Handle Brazilian number formats:
      // 553388286293 (12 digits) -> 33988286293 (11 digits)
      // 5533988286293 (13 digits) -> 33988286293 (11 digits)
      if (phoneNumber.startsWith('55') && phoneNumber.length >= 12) {
        cleanPhoneNumber = phoneNumber.substring(2); // Always remove '55' prefix
        console.log(`After removing 55: ${cleanPhoneNumber}`);
      }
      
      console.log(`Looking for phone: ${cleanPhoneNumber} (original: ${phoneNumber})`);
      
      const freelancer = employees.find(emp => {
        if (!emp.employmentTypes.includes('Freelancer') || !emp.whatsapp) return false;
        
        const empPhone = emp.whatsapp.replace(/\D/g, ''); // Remove non-digits
        console.log(`Comparing with employee ${emp.firstName}: ${empPhone}`);
        
        // Check if the phones match using the last 8 digits (most unique part)
        const empPhoneLast8 = empPhone.slice(-8);
        const cleanPhoneLast8 = cleanPhoneNumber.slice(-8);
        
        console.log(`  Comparing last 8 digits: ${empPhoneLast8} vs ${cleanPhoneLast8}`);
        
        // Match using various criteria
        const exactMatch = empPhone === cleanPhoneNumber;
        const contains = empPhone.includes(cleanPhoneNumber) || cleanPhoneNumber.includes(empPhone);
        const last8Match = empPhoneLast8 === cleanPhoneLast8;
        
        const isMatch = exactMatch || contains || last8Match;
        console.log(`  Match result: exact=${exactMatch}, contains=${contains}, last8=${last8Match}, final=${isMatch}`);
        
        return isMatch;
      });

      if (!freelancer || !freelancer.whatsapp) {
        await sendWhatsAppMessage(remoteJid, "Hmmm.. não encontrei um usuário cadastrado neste número de whatsapp.", 'freelancer');
        return res.json({ status: 'error', message: 'User not found' });
      }

      // Analyze message content
      const normalizedMessage = messageText.toLowerCase().trim();
      let messageType: 'entrada' | 'saida' | 'unit_response' | 'unknown';
      
      // Check if it's a unit selection response (just a number)
      const unitNumberMatch = messageText.trim().match(/^(\d+)$/);
      if (unitNumberMatch) {
        messageType = 'unit_response';
      } else if (normalizedMessage.includes('cheguei') || normalizedMessage.includes('entrada')) {
        messageType = 'entrada';
      } else if (normalizedMessage.includes('fui') || normalizedMessage.includes('saida') || normalizedMessage.includes('saída')) {
        messageType = 'saida';
      } else {
        messageType = 'unknown';
      }

      // Handle unit selection response
      if (messageType === 'unit_response') {
        const unitId = parseInt(unitNumberMatch[1]);
        const units = await storage.getUnits();
        const selectedUnit = units.find(u => u.id === unitId);
        
        if (!selectedUnit) {
          const unitsList = units.map(unit => `${unit.id} - ${unit.name}`).join('\n');
          await sendWhatsAppMessage(remoteJid, `Unidade não encontrada. Escolha uma das opções:\n\n${unitsList}`, 'freelancer');
          return res.json({ status: 'error', message: 'Unit not found' });
        }
        
        // Register entrada with selected unit
        console.log('Creating entry with data:', {
          employeeId: freelancer.id,
          freelancerPhone: freelancer.whatsapp,
          freelancerName: `${freelancer.firstName} ${freelancer.lastName || ''}`.trim(),
          unitId: selectedUnit.id,
          entryType: 'entrada',
          message: 'Cheguei',
          timestamp: new Date(),
          isManualEntry: false,
          notes: 'Via WhatsApp - Evolution API',
        });
        
        const timeEntry = await storage.createFreelancerTimeEntry({
          employeeId: freelancer.id,
          freelancerPhone: freelancer.whatsapp,
          freelancerName: `${freelancer.firstName} ${freelancer.lastName || ''}`.trim(),
          unitId: selectedUnit.id,
          entryType: 'entrada',
          message: 'Cheguei',
          timestamp: new Date(),
          isManualEntry: false,
          notes: 'Via WhatsApp - Evolution API',
        });

        const successMessage = `Ponto de entrada registrado com sucesso! 🎉\n\nUnidade: ${selectedUnit.name}\nHorário: ${toSaoPauloTime(new Date())}\n\nBom trabalho, ${freelancer.firstName}!`;
        await sendWhatsAppMessage(remoteJid, successMessage, 'freelancer');
        return res.json({ status: 'success', message: 'Entry registered successfully', entry: timeEntry });
      }

      if (messageType === 'unknown') {
        await sendWhatsAppMessage(remoteJid, 'Hmmmm... não consegui entender a mensagem para registrar seu ponto. Envie "Cheguei" para marcar sua entrada ou "Fui" para marcar sua saída.', 'freelancer');
        return res.json({ status: 'error', message: 'Message not recognized' });
      }

      // If it's an entrada (check-in), request unit selection
      if (messageType === 'entrada') {
        const units = await storage.getUnits();
        const unitsList = units.map(unit => `${unit.id} - ${unit.name}`).join('\n');
        const unitSelectionMessage = `Olá ${freelancer.firstName}! 👋\n\nEm qual unidade você está trabalhando hoje?\n\n${unitsList}\n\nResponda apenas com o número da unidade.`;
        
        await sendWhatsAppMessage(remoteJid, unitSelectionMessage, 'freelancer');
        return res.json({ status: 'awaiting_unit', message: 'Unit selection requested', employeeId: freelancer.id });
      }

      // If it's a saida (check-out), register immediately
      if (messageType === 'saida') {
        const timeEntry = await storage.createFreelancerTimeEntry({
          employeeId: freelancer.id,
          freelancerPhone: freelancer.whatsapp,
          freelancerName: `${freelancer.firstName} ${freelancer.lastName || ''}`.trim(),
          unitId: null, // Will be set based on last entry
          entryType: 'saida',
          message: 'Fui',
          timestamp: new Date(),
          isManualEntry: false,
          notes: 'Via WhatsApp - Evolution API',
        });

        const exitMessage = `Ponto de saída registrado com sucesso! 👍\n\nAté mais, ${freelancer.firstName}!`;
        await sendWhatsAppMessage(remoteJid, exitMessage, 'freelancer');
        return res.json({ status: 'success', message: 'Exit registered successfully', entry: timeEntry });
      }

      res.json({ message: "Message processed" });
      
    } catch (error) {
      console.error("Error processing Evolution API webhook:", error);
      res.status(500).json({ message: "Error processing WhatsApp message" });
    }
  });

  // Dashboard API endpoints (protected)
  
  // Get dashboard statistics
  app.get('/api/dashboard/stats', demoAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  });

  // Get all taps with current status
  app.get('/api/taps', demoAuth, async (req, res) => {
    try {
      const taps = await storage.getTaps();
      res.json(taps);
    } catch (error) {
      console.error("Error fetching taps:", error);
      res.status(500).json({ message: "Error fetching taps" });
    }
  });

  // Get recent pour events for real-time display
  app.get('/api/recent-pours', demoAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getRecentPourEvents(limit);
      
      // Convert dates to São Paulo timezone for display
      const formattedEvents = events.map(event => ({
        ...event,
        datetime: toSaoPauloTime(event.datetime),
      }));
      
      res.json(formattedEvents);
    } catch (error) {
      console.error("Error fetching recent pours:", error);
      res.status(500).json({ message: "Error fetching recent pour events" });
    }
  });

  // Get pour history with filtering and CSV export
  app.get('/api/history/pours', demoAuth, async (req, res) => {
    try {
      const { start_date, end_date, tap_id, format: responseFormat } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let tapId: number | undefined;

      if (start_date) {
        startDate = fromSaoPauloTime(start_date as string);
      }
      if (end_date) {
        endDate = fromSaoPauloTime(end_date as string);
      }
      if (tap_id) {
        tapId = parseInt(tap_id as string);
      }

      const events = await storage.getPourEvents(startDate, endDate, tapId);

      if (responseFormat === 'csv') {
        // Generate CSV
        const csvHeader = 'Data/Hora,Torneira,Volume (ml),Ponto de Venda,Estilo da Cerveja\n';
        const csvRows = events.map(event => {
          const datetime = toSaoPauloTime(event.datetime);
          const tapName = event.tap.name || `Torneira ${event.tap.id}`;
          const volume = event.pourVolumeMl;
          const pos = event.tap.pointOfSale?.name || '';
          const beerStyle = event.tap.currentBeerStyle?.name || '';
          
          return `"${datetime}","${tapName}","${volume}","${pos}","${beerStyle}"`;
        }).join('\n');
        
        const csv = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="historico_consumo_${format(new Date(), 'yyyy-MM-dd')}.csv"`);
        res.send(csv);
      } else {
        // Return JSON with formatted dates
        const formattedEvents = events.map(event => ({
          ...event,
          datetime: toSaoPauloTime(event.datetime),
        }));
        
        res.json(formattedEvents);
      }
    } catch (error) {
      console.error("Error fetching pour history:", error);
      res.status(500).json({ message: "Error fetching pour history" });
    }
  });

  // Get keg change history
  app.get('/api/history/keg-changes', demoAuth, async (req, res) => {
    try {
      const { start_date, end_date, tap_id } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let tapId: number | undefined;

      if (start_date) {
        startDate = fromSaoPauloTime(start_date as string);
      }
      if (end_date) {
        endDate = fromSaoPauloTime(end_date as string);
      }
      if (tap_id) {
        tapId = parseInt(tap_id as string);
      }

      const events = await storage.getKegChangeEvents(startDate, endDate, tapId);
      
      // Convert dates to São Paulo timezone for display
      const formattedEvents = events.map(event => ({
        ...event,
        datetime: toSaoPauloTime(event.datetime),
      }));
      
      res.json(formattedEvents);
    } catch (error) {
      console.error("Error fetching keg change history:", error);
      res.status(500).json({ message: "Error fetching keg change history" });
    }
  });

  // Get combined timeline of pour events and keg changes
  app.get('/api/timeline', demoAuth, async (req, res) => {
    try {
      const { startDate, endDate, tapId } = req.query;
      
      let start: Date | undefined;
      let end: Date | undefined;
      let tapFilter: number | undefined;

      if (startDate) {
        start = fromSaoPauloTime(startDate as string);
      }
      if (endDate) {
        end = fromSaoPauloTime(endDate as string);
      }
      if (tapId) {
        tapFilter = parseInt(tapId as string);
      }

      // Get pour events
      const pourEvents = await storage.getPourEvents(start, end, tapFilter);
      
      // Get keg change events
      const kegChangeEvents = await storage.getKegChangeEvents(start, end, tapFilter);
      
      // Convert pour events to timeline format
      const timelinePourEvents = pourEvents.map(event => ({
        id: event.id,
        type: 'pour',
        datetime: toSaoPauloTime(event.datetime),
        tapName: event.tap?.name || 'Torneira desconhecida',
        posName: event.tap?.pointOfSale?.name || 'Local desconhecido',
        beerStyleName: event.tap?.currentBeerStyle?.name,
        totalVolumeMl: event.totalVolumeMl,
        deviceCode: event.deviceCode || null,
      }));

      // Convert keg change events to timeline format
      const timelineKegEvents = kegChangeEvents.map(event => ({
        id: event.id,
        type: 'keg_change',
        datetime: toSaoPauloTime(event.datetime),
        tapName: event.tap?.name || 'Torneira desconhecida',
        posName: event.tap?.pointOfSale?.name || 'Local desconhecido',
        beerStyleName: null, // Keg changes don't have beer style info
        totalVolumeMl: null,
        deviceCode: null, // Keg change events don't have direct device access
      }));

      // Combine and sort events by datetime (newest first)
      const allEvents = [...timelinePourEvents, ...timelineKegEvents];
      allEvents.sort((a, b) => {
        const dateA = new Date(a.datetime).getTime();
        const dateB = new Date(b.datetime).getTime();
        return dateB - dateA; // Most recent first
      });
      
      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      res.status(500).json({ message: "Error fetching timeline" });
    }
  });

  // Management API endpoints (protected)
  
  // Taps management
  app.post('/api/taps', demoAuth, async (req, res) => {
    try {
      const tapData = insertTapSchema.parse(req.body);
      const tap = await storage.createTap(tapData);
      res.json(tap);
    } catch (error) {
      console.error("Error creating tap:", error);
      res.status(500).json({ message: "Error creating tap" });
    }
  });

  app.put('/api/taps/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id); // Convert to integer
      const tapData = insertTapSchema.partial().parse(req.body);
      const tap = await storage.updateTap(id, tapData);
      res.json(tap);
    } catch (error) {
      console.error("Error updating tap:", error);
      res.status(500).json({ message: "Error updating tap" });
    }
  });

  app.delete('/api/taps/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTap(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tap:", error);
      res.status(500).json({ message: "Error deleting tap" });
    }
  });

  // Points of Sale management
  app.get('/api/points-of-sale', demoAuth, async (req, res) => {
    try {
      const pointsOfSale = await storage.getPointsOfSale();
      res.json(pointsOfSale);
    } catch (error) {
      console.error("Error fetching points of sale:", error);
      res.status(500).json({ message: "Error fetching points of sale" });
    }
  });

  app.post('/api/points-of-sale', demoAuth, async (req, res) => {
    try {
      const posData = insertPointOfSaleSchema.parse(req.body);
      const pos = await storage.createPointOfSale(posData);
      res.json(pos);
    } catch (error) {
      console.error("Error creating point of sale:", error);
      res.status(500).json({ message: "Error creating point of sale" });
    }
  });

  app.put('/api/points-of-sale/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const posData = insertPointOfSaleSchema.partial().parse(req.body);
      const pos = await storage.updatePointOfSale(id, posData);
      res.json(pos);
    } catch (error) {
      console.error("Error updating point of sale:", error);
      res.status(500).json({ message: "Error updating point of sale" });
    }
  });

  app.delete('/api/points-of-sale/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePointOfSale(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting point of sale:", error);
      res.status(500).json({ message: "Error deleting point of sale" });
    }
  });

  // Beer Styles management
  app.get('/api/beer-styles', demoAuth, async (req, res) => {
    try {
      const beerStyles = await storage.getBeerStyles();
      res.json(beerStyles);
    } catch (error) {
      console.error("Error fetching beer styles:", error);
      res.status(500).json({ message: "Error fetching beer styles" });
    }
  });

  app.post('/api/beer-styles', demoAuth, async (req, res) => {
    try {
      const styleData = insertBeerStyleSchema.parse(req.body);
      const style = await storage.createBeerStyle(styleData);
      res.json(style);
    } catch (error) {
      console.error("Error creating beer style:", error);
      res.status(500).json({ message: "Error creating beer style" });
    }
  });

  app.put('/api/beer-styles/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const styleData = insertBeerStyleSchema.partial().parse(req.body);
      const style = await storage.updateBeerStyle(id, styleData);
      res.json(style);
    } catch (error) {
      console.error("Error updating beer style:", error);
      res.status(500).json({ message: "Error updating beer style" });
    }
  });

  app.delete('/api/beer-styles/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBeerStyle(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting beer style:", error);
      res.status(500).json({ message: "Error deleting beer style" });
    }
  });

  // Devices API endpoints
  
  // Get all devices
  app.get('/api/devices', demoAuth, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Error fetching devices" });
    }
  });

  // Get available devices (not assigned to any tap)
  app.get('/api/devices/available', demoAuth, async (req, res) => {
    try {
      const excludeTapId = req.query.excludeTapId ? parseInt(req.query.excludeTapId as string) : null;
      const devices = await storage.getDevices();
      const taps = await storage.getTaps();
      
      const availableDevices = devices.filter(device => {
        if (!device.isActive) return false;
        
        const assignedTap = taps.find(tap => tap.deviceId === device.id);
        if (!assignedTap) return true;
        
        // Include device if it's assigned to the tap we're editing
        return excludeTapId && assignedTap.id === excludeTapId;
      });
      
      res.json(availableDevices);
    } catch (error) {
      console.error("Error fetching available devices:", error);
      res.status(500).json({ message: "Error fetching available devices" });
    }
  });

  // Create new device
  app.post('/api/devices', demoAuth, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      res.status(500).json({ message: "Error creating device" });
    }
  });

  // Update device
  app.put('/api/devices/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deviceData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(id, deviceData);
      res.json(device);
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Error updating device" });
    }
  });

  // Delete device
  app.delete('/api/devices/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDevice(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Error deleting device" });
    }
  });

  // ============ ROLES ROUTES ============

  // Get all roles
  app.get('/api/roles', demoAuth, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Error fetching roles" });
    }
  });

  // Create new role
  app.post('/api/roles', demoAuth, async (req, res) => {
    try {
      const { insertRoleSchema } = await import("@shared/schema");
      const roleData = insertRoleSchema.parse(req.body);
      
      // Check if the role includes financial permission
      if (roleData.permissions && roleData.permissions.includes('financial')) {
        // Only specific user can grant financial permission
        const authorizedUserId = 'e6bea1c6-e6f4-4f7b-8efc-73c4f2d7f6c0'; // Your user ID
        if (req.session.user?.id !== authorizedUserId) {
          return res.status(403).json({ 
            message: "Você não tem autorização para conceder permissões financeiras" 
          });
        }
      }
      
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Error creating role" });
    }
  });

  // Update role
  app.put('/api/roles/:id', demoAuth, async (req, res) => {
    try {
      const { insertRoleSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const roleData = insertRoleSchema.partial().parse(req.body);
      
      // Check if the role includes financial permission
      if (roleData.permissions && roleData.permissions.includes('financial')) {
        // Only specific user can grant financial permission
        const authorizedUserId = 'e6bea1c6-e6f4-4f7b-8efc-73c4f2d7f6c0'; // Your user ID
        if (req.session.user?.id !== authorizedUserId) {
          return res.status(403).json({ 
            message: "Você não tem autorização para conceder permissões financeiras" 
          });
        }
      }
      
      const role = await storage.updateRole(id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Error updating role" });
    }
  });

  // Delete role
  app.delete('/api/roles/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRole(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Error deleting role" });
    }
  });

  // ============ EMPLOYEES ROUTES ============

  // Get all employees
  app.get('/api/employees', demoAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Error fetching employees" });
    }
  });

  // Create new employee
  app.post('/api/employees', demoAuth, async (req, res) => {
    try {
      const { insertEmployeeSchema } = await import("@shared/schema");
      const { generateRandomAvatar } = await import("./avatarUtils");
      
      const employeeData = insertEmployeeSchema.parse(req.body);
      
      // Generate random avatar if not provided
      if (!employeeData.avatar) {
        employeeData.avatar = generateRandomAvatar();
      }
      
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Error creating employee" });
    }
  });

  // Update employee
  app.put('/api/employees/:id', demoAuth, async (req, res) => {
    try {
      const { insertEmployeeSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const employeeData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, employeeData);
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Error updating employee" });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmployee(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Error deleting employee" });
    }
  });

  // Units management routes
  app.get('/api/units', demoAuth, async (req, res) => {
    try {
      const units = await storage.getUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Error fetching units" });
    }
  });

  app.post('/api/units', demoAuth, async (req, res) => {
    try {
      const unitData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "Error creating unit" });
    }
  });

  app.put('/api/units/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const unitData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(id, unitData);
      res.json(unit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Error updating unit" });
    }
  });

  app.delete('/api/units/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUnit(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Error deleting unit" });
    }
  });

  // ============ CO2 REFILLS ROUTES ============

  // Get all CO2 refills
  app.get('/api/co2-refills', demoAuth, async (req, res) => {
    try {
      const refills = await storage.getCo2Refills();
      res.json(refills);
    } catch (error) {
      console.error("Error fetching CO2 refills:", error);
      res.status(500).json({ message: "Error fetching CO2 refills" });
    }
  });

  // Create new CO2 refill
  app.post('/api/co2-refills', demoAuth, async (req, res) => {
    try {
      const refillData = {
        date: new Date(req.body.date),
        supplier: req.body.supplier,
        kilosRefilled: parseFloat(req.body.kilosRefilled),
        valuePaid: parseFloat(req.body.valuePaid),
        unitId: parseInt(req.body.unitId),
        transactionType: req.body.transactionType || 'entrada'
      };
      const refill = await storage.createCo2Refill(refillData);
      await broadcastUpdate('stats_updated');
      res.json(refill);
    } catch (error) {
      console.error("Error creating CO2 refill:", error);
      res.status(500).json({ message: "Error creating CO2 refill" });
    }
  });

  // Update CO2 refill
  app.put('/api/co2-refills/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Convert date string to Date object if present
      const body = req.body.date ? {
        ...req.body,
        date: new Date(req.body.date)
      } : req.body;
      const refillData = insertCo2RefillSchema.partial().parse(body);
      const refill = await storage.updateCo2Refill(id, refillData);
      await broadcastUpdate('stats_updated');
      res.json(refill);
    } catch (error) {
      console.error("Error updating CO2 refill:", error);
      res.status(500).json({ message: "Error updating CO2 refill" });
    }
  });

  // Delete CO2 refill
  app.delete('/api/co2-refills/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCo2Refill(id);
      await broadcastUpdate('stats_updated');
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting CO2 refill:", error);
      res.status(500).json({ message: "Error deleting CO2 refill" });
    }
  });

  // Get CO2 statistics
  app.get('/api/co2-stats', demoAuth, async (req, res) => {
    try {
      const stats = await storage.getCo2Stats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching CO2 stats:", error);
      res.status(500).json({ message: "Error fetching CO2 stats" });
    }
  });

  // Generate test pour events for CO2 efficiency calculation
  app.post('/api/generate-test-pours', async (req, res) => {
    try {
      const today = new Date();
      
      // Gerar eventos dos últimos 30 dias
      for (let i = 0; i < 30; i++) {
        const eventDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        
        // 3-5 eventos por dia
        const eventsPerDay = Math.floor(Math.random() * 3) + 3;
        
        for (let j = 0; j < eventsPerDay; j++) {
          const eventDateTime = new Date(eventDate);
          eventDateTime.setHours(12 + Math.floor(Math.random() * 10)); // Entre 12h e 22h
          eventDateTime.setMinutes(Math.floor(Math.random() * 60));
          
          const volumeMl = Math.floor(Math.random() * 500) + 200;
          await storage.createPourEvent({
            tapId: Math.random() > 0.5 ? 1 : 2, // Alternar entre torneiras 1 e 2
            totalVolumeMl: volumeMl,
            pourVolumeMl: volumeMl, // Mesmo valor para teste
            datetime: eventDateTime
          });
        }
      }
      
      // Gerar eventos dos 30 dias anteriores (30-60 dias atrás)
      for (let i = 30; i < 60; i++) {
        const eventDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        
        // 2-4 eventos por dia (menos que o período atual)
        const eventsPerDay = Math.floor(Math.random() * 3) + 2;
        
        for (let j = 0; j < eventsPerDay; j++) {
          const eventDateTime = new Date(eventDate);
          eventDateTime.setHours(12 + Math.floor(Math.random() * 10));
          eventDateTime.setMinutes(Math.floor(Math.random() * 60));
          
          const volumeMl2 = Math.floor(Math.random() * 400) + 150;
          await storage.createPourEvent({
            tapId: Math.random() > 0.5 ? 1 : 2,
            totalVolumeMl: volumeMl2,
            pourVolumeMl: volumeMl2, // Mesmo valor para teste
            datetime: eventDateTime
          });
        }
      }
      
      await broadcastUpdate('stats_updated');
      res.json({ message: "Test pour events generated successfully" });
    } catch (error) {
      console.error("Error generating test pour events:", error);
      res.status(500).json({ message: "Error generating test pour events" });
    }
  });

  // Freelancer Time Tracking API endpoints
  
  // Get freelancer time entries with filtering
  app.get('/api/freelancer-entries', demoAuth, async (req, res) => {
    try {
      const { start_date, end_date, freelancer_phone } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (start_date) {
        // Parse date and add timezone offset for São Paulo (UTC-3)
        const [year, month, day] = (start_date as string).split('-').map(Number);
        startDate = new Date(year, month - 1, day, 3, 0, 0, 0); // Add 3 hours to compensate UTC-3
      }
      if (end_date) {
        // Parse date and add timezone offset for São Paulo (UTC-3)
        const [year, month, day] = (end_date as string).split('-').map(Number);
        endDate = new Date(year, month - 1, day + 1, 2, 59, 59, 999); // Next day 02:59:59 to cover all of target day
      }
      
      const entries = await storage.getFreelancerTimeEntries(
        startDate, 
        endDate, 
        freelancer_phone as string
      );
      
      // Convert dates to São Paulo timezone for display
      const formattedEntries = entries.map(entry => ({
        ...entry,
        timestamp: toSaoPauloTime(entry.timestamp),
      }));
      
      res.json(formattedEntries);
    } catch (error) {
      console.error("Error fetching freelancer entries:", error);
      res.status(500).json({ message: "Error fetching freelancer entries" });
    }
  });

  // Get freelancer statistics for a period
  app.get('/api/freelancer-stats', demoAuth, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      // Default to last 7 days if no dates provided
      let endDate: Date;
      let startDate: Date;
      
      if (end_date) {
        // Parse date and add timezone offset for São Paulo (UTC-3)
        const [year, month, day] = (end_date as string).split('-').map(Number);
        endDate = new Date(year, month - 1, day + 1, 2, 59, 59, 999); // Next day 02:59:59 to cover all of target day
      } else {
        endDate = new Date();
      }
      
      if (start_date) {
        // Parse date and add timezone offset for São Paulo (UTC-3)
        const [year, month, day] = (start_date as string).split('-').map(Number);
        startDate = new Date(year, month - 1, day, 3, 0, 0, 0); // Add 3 hours to compensate UTC-3
      } else {
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      const stats = await storage.getFreelancerStats(startDate, endDate);
      
      res.json({
        period: {
          start: toSaoPauloTime(startDate),
          end: toSaoPauloTime(endDate),
        },
        freelancers: stats,
      });
    } catch (error) {
      console.error("Error fetching freelancer stats:", error);
      res.status(500).json({ message: "Error fetching freelancer statistics" });
    }
  });

  // Create new time entry manually
  app.post('/api/freelancer-entries', demoAuth, async (req, res) => {
    try {
      console.log("=== Creating freelancer entry ===");
      console.log("Request body:", req.body);
      
      const entryData = {
        employeeId: req.body.employeeId ? parseInt(req.body.employeeId) : null,
        freelancerPhone: req.body.freelancerPhone,
        freelancerName: req.body.freelancerName,
        unitId: req.body.unitId ? parseInt(req.body.unitId) : null,
        entryType: req.body.entryType,
        timestamp: fromSaoPauloTime(req.body.timestamp),
        message: req.body.message,
        isManualEntry: true,
        notes: req.body.notes,
      };
      
      console.log("Processed entry data:", entryData);
      
      const entry = await storage.createFreelancerTimeEntry(entryData);
      console.log("Entry created successfully:", entry);
      res.json(entry);
    } catch (error) {
      console.error("Error creating freelancer entry:", error);
      console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Error creating freelancer entry", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Update time entry
  app.put('/api/freelancer-entries/:id', demoAuth, async (req, res) => {
    try {
      console.log("=== Updating freelancer entry ===");
      console.log("Entry ID:", req.params.id);
      console.log("Request body:", req.body);
      
      const id = parseInt(req.params.id);
      const entryData = {
        employeeId: req.body.employeeId ? parseInt(req.body.employeeId) : null,
        freelancerPhone: req.body.freelancerPhone,
        freelancerName: req.body.freelancerName,
        unitId: req.body.unitId ? parseInt(req.body.unitId) : null,
        entryType: req.body.entryType,
        timestamp: req.body.timestamp ? fromSaoPauloTime(req.body.timestamp) : undefined,
        message: req.body.message,
        notes: req.body.notes,
      };
      
      console.log("Processed update data:", entryData);
      
      const entry = await storage.updateFreelancerTimeEntry(id, entryData);
      console.log("Entry updated successfully:", entry);
      res.json(entry);
    } catch (error) {
      console.error("Error updating freelancer entry:", error);
      res.status(500).json({ message: "Error updating freelancer entry" });
    }
  });

  // Delete time entry
  app.delete('/api/freelancer-entries/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFreelancerTimeEntry(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting freelancer entry:", error);
      res.status(500).json({ message: "Error deleting freelancer entry" });
    }
  });

  // Product Categories routes
  app.get('/api/product-categories', demoAuth, async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Error fetching product categories" });
    }
  });

  app.get('/api/product-categories/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getProductCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching product category:", error);
      res.status(500).json({ message: "Error fetching product category" });
    }
  });

  app.post('/api/product-categories', demoAuth, async (req, res) => {
    try {
      const result = insertProductCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }
      
      const category = await storage.createProductCategory(result.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(500).json({ message: "Error creating product category" });
    }
  });

  app.put('/api/product-categories/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertProductCategorySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }
      
      const category = await storage.updateProductCategory(id, result.data);
      res.json(category);
    } catch (error) {
      console.error("Error updating product category:", error);
      res.status(500).json({ message: "Error updating product category" });
    }
  });

  app.delete('/api/product-categories/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProductCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product category:", error);
      res.status(500).json({ message: "Error deleting product category" });
    }
  });

  // Products routes
  app.get('/api/products', demoAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      
      // For each product, get its associated units
      const units = await storage.getUnits();
      const unitsMap = new Map(units.map(unit => [unit.id, unit.name]));
      
      const productsWithUnits = await Promise.all(
        products.map(async (product) => {
          const productUnits = await storage.getProductUnits(product.id);
          return {
            ...product,
            associatedUnits: productUnits.map(pu => ({
              unitId: pu.unitId,
              unitName: unitsMap.get(pu.unitId) || 'N/A'
            }))
          };
        })
      );
      
      res.json(productsWithUnits);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get('/api/products/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.post('/api/products', demoAuth, async (req, res) => {
    try {
      const result = insertProductSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }
      
      const product = await storage.createProduct(result.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Error creating product" });
    }
  });

  // Create product with multiple units
  app.post('/api/products/multi-unit', demoAuth, async (req, res) => {
    try {
      const { units, ...productData } = req.body;
      
      if (!units || !Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ message: "Pelo menos uma unidade deve ser selecionada" });
      }
      
      // Create the product first (use first unit for compatibility)
      const productToCreate = {
        ...productData,
        unit: units[0] // Use first unit for the product record
      };
      
      const product = await storage.createProduct(productToCreate);
      
      // Associate product with all selected units
      for (const unitId of units) {
        try {
          await storage.addProductToUnit(product.id, unitId, 0);
        } catch (unitError) {
          // Ignore if association already exists
          console.log(`Association product ${product.id} - unit ${unitId} already exists`);
        }
      }
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product with multiple units:", error);
      res.status(500).json({ message: "Failed to create product with multiple units" });
    }
  });

  // Update product with multiple units
  app.put('/api/products/multi-unit', demoAuth, async (req, res) => {
    try {
      const { productId, units, ...productData } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID é obrigatório" });
      }
      
      if (!units || !Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ message: "Pelo menos uma unidade deve ser selecionada" });
      }
      
      // Update the product (use first unit for compatibility)
      const productToUpdate = {
        ...productData,
        unit: units[0] // Use first unit for the product record
      };
      
      const product = await storage.updateProduct(productId, productToUpdate);
      
      // Get current associations
      const currentAssociations = await storage.getProductUnits(productId);
      const currentUnitIds = currentAssociations.map(pa => pa.unitId);
      
      // Remove old associations that are not in new selection
      for (const association of currentAssociations) {
        if (!units.includes(association.unitId)) {
          try {
            await storage.removeProductFromUnit(productId, association.unitId);
          } catch (error) {
            console.log(`Error removing association product ${productId} - unit ${association.unitId}`);
          }
        }
      }
      
      // Add new associations
      for (const unitId of units) {
        if (!currentUnitIds.includes(unitId)) {
          try {
            await storage.addProductToUnit(productId, unitId, 0);
          } catch (unitError) {
            console.log(`Association product ${productId} - unit ${unitId} already exists or failed to create`);
          }
        }
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product with multiple units:", error);
      res.status(500).json({ message: "Failed to update product with multiple units" });
    }
  });

  app.put('/api/products/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertProductSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }
      
      const product = await storage.updateProduct(id, result.data);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete('/api/products/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // Clear all products and related data
  app.delete('/api/products/clear-all', demoAuth, async (req, res) => {
    try {
      console.log("=== Clearing all products and related data ===");
      
      // First, delete all product-unit associations
      await storage.clearAllProductUnits();
      console.log("Cleared all product-unit associations");
      
      // Then, delete all stock count items that reference products
      await storage.clearAllStockCountItems();
      console.log("Cleared all stock count items");
      
      // Finally, delete all products
      await storage.clearAllProducts();
      console.log("Cleared all products");
      
      res.json({ 
        message: "Todos os produtos e dados relacionados foram removidos com sucesso",
        cleared: {
          products: true,
          productUnits: true,
          stockCountItems: true
        }
      });
    } catch (error) {
      console.error("Error clearing products:", error);
      res.status(500).json({ message: "Erro ao limpar produtos" });
    }
  });

  // Bulk import/update products by code
  app.post('/api/products/import', demoAuth, async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Esperado um array de produtos" });
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as any[]
      };

      for (const productData of req.body) {
        try {
          const result = insertProductSchema.safeParse(productData);
          if (!result.success) {
            results.errors.push({ data: productData, error: result.error.issues });
            continue;
          }
          
          const existingProduct = await storage.getProductByCode(result.data.code);
          if (existingProduct) {
            await storage.updateProduct(existingProduct.id, result.data);
            results.updated++;
          } else {
            await storage.createProduct(result.data);
            results.created++;
          }
        } catch (error) {
          results.errors.push({ data: productData, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: "Error importing products" });
    }
  });

  // Upload products from CSV file with intelligent processing
  app.post('/api/products/upload', demoAuth, async (req, res) => {
    console.log("=== CSV Upload Request Started ===");
    try {
      const multer = await import('multer');
      const upload = multer.default({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      upload.single('file')(req, res, async (err) => {
        console.log("Upload middleware executed");
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: "Erro no upload do arquivo" });
        }

        console.log("File received:", req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : "No file");

        if (!req.file) {
          console.log("No file provided in request");
          return res.status(400).json({ message: "Nenhum arquivo enviado" });
        }

        try {
          const fileBuffer = req.file.buffer;
          let products: any[] = [];

          console.log("Processing file:", req.file.originalname);

          if (req.file.originalname.endsWith('.csv')) {
            // Parse CSV
            const csvContent = fileBuffer.toString('utf-8');
            console.log("CSV content length:", csvContent.length);
            console.log("First 200 chars:", csvContent.substring(0, 200));
            
            const lines = csvContent.split('\n').filter(line => line.trim());
            console.log("Total lines found:", lines.length);
            
            if (lines.length < 2) {
              console.log("CSV has insufficient lines");
              return res.status(400).json({ message: "Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados" });
            }

            // Auto-detect CSV separator (comma or semicolon)
            const firstLine = lines[0];
            const separator = firstLine.includes(';') ? ';' : ',';
            console.log("Detected CSV separator:", separator);
            
            const headers = firstLine.split(separator).map(h => h.trim().replace(/['"]/g, ''));
            console.log("Headers found:", headers);
            
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''));
              if (values.length === headers.length && values.some(v => v)) { // Skip empty lines
                const product: any = {};
                headers.forEach((header, index) => {
                  product[header] = values[index];
                });
                products.push(product);
              }
            }
            
            console.log("Products parsed from CSV:", products.length);
            console.log("First product example:", products[0]);
          } else {
            return res.status(400).json({ message: "Apenas arquivos CSV são suportados no momento" });
          }

          // Get existing categories and units for intelligent matching
          const categories = await storage.getProductCategories();
          const units = await storage.getUnits();

          // Function to find best matching category by similarity
          const findBestCategory = (categoryName: string): number | null => {
            if (!categoryName) return categories.length > 0 ? categories[0].id : null;
            
            const normalized = categoryName.toLowerCase().trim();
            console.log(`Finding category for: "${categoryName}" (normalized: "${normalized}")`);
            
            // Specific mapping rules for known category variations
            const categoryMappings = {
              'embalagem': 'Embalagens',
              'embalagens': 'Embalagens',
              'materia prima': 'Matéria prima',
              'matéria prima': 'Matéria prima',
              'materiaprima': 'Matéria prima',
              'bartender': 'Bartender',
              'bar': 'Bartender',
              'cozinha apollonio': 'Cozinha Apollonio',
              'apollonio': 'Cozinha Apollonio',
              'cozinha finalizacao': 'Cozinha finalização',
              'cozinha finalização': 'Cozinha finalização',
              'finalizacao': 'Cozinha finalização',
              'finalização': 'Cozinha finalização',
              'cozinha pre preparo': 'Cozinha pre preparo',
              'prepreparo': 'Cozinha pre preparo',
              'pre preparo': 'Cozinha pre preparo',
              'revenda': 'Revenda'
            };

            // Check specific mappings first
            if (categoryMappings[normalized]) {
              const targetCategoryName = categoryMappings[normalized];
              const match = categories.find(cat => cat.name === targetCategoryName);
              if (match) {
                console.log(`✓ Specific mapping: "${categoryName}" -> ${match.name} (ID ${match.id})`);
                return match.id;
              }
            }
            
            // Try exact match
            let match = categories.find(cat => cat.name.toLowerCase() === normalized);
            if (match) {
              console.log(`✓ Exact match: "${categoryName}" -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Try partial match (contains)
            match = categories.find(cat => 
              cat.name.toLowerCase().includes(normalized) || 
              normalized.includes(cat.name.toLowerCase())
            );
            if (match) {
              console.log(`✓ Partial match: "${categoryName}" -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Default to first category if no match
            const defaultCategory = categories[0];
            console.log(`⚠ No match found for "${categoryName}", using default: ${defaultCategory?.name} (ID ${defaultCategory?.id})`);
            return categories.length > 0 ? categories[0].id : null;
          }

          // Function to normalize text and handle encoding issues
          const normalizeText = (text: string): string => {
            return text.toLowerCase().trim()
              .replace(/[áàâãä]/g, 'a')
              .replace(/[éèêë]/g, 'e')
              .replace(/[íìîï]/g, 'i')
              .replace(/[óòôõö]/g, 'o')
              .replace(/[úùûü]/g, 'u')
              .replace(/[ç]/g, 'c')
              .replace(/[ñ]/g, 'n')
              // Handle specific corrupted patterns
              .replace(/gr�o\s*par�/g, 'grao para')
              .replace(/gr�o/g, 'grao')
              .replace(/par�/g, 'para')
              .replace(/[�]/g, 'a') // Handle other corrupted characters
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();
          };

          // Function to find best matching unit by similarity
          const findBestUnit = (unitName: string): number | null => {
            if (!unitName) return units.length > 0 ? units[0].id : null;
            
            const normalized = normalizeText(unitName);
            console.log(`Finding unit for: "${unitName}" (normalized: "${normalized}")`);
            
            // Specific mapping rules based on CSV patterns (normalized without accents)
            const specificMappings = [
              // Check for Grão Pará first (more specific than Apollonio)
              { 
                patterns: [
                  'grao para', 'graopara', 'grao par',
                  'don juarez / grao para', 'don juarez grao para',
                  'don juarez / grao par', 'don juarez grao par'
                ], 
                unitId: 1, 
                unitName: 'Don Juarez Grão Pará' 
              },
              { 
                patterns: [
                  'beer truck', 'beertruck', 'truck',
                  'don juarez / beer truck', 'don juarez beer truck'
                ], 
                unitId: 3, 
                unitName: 'Beer Truck' 
              },
              { 
                patterns: [
                  'apollonio', 'frango na brasa', 'frango',
                  'apollonio frango na brasa', 'apollonio frango'
                ], 
                unitId: 5, 
                unitName: 'Apollonio' 
              },
              { 
                patterns: ['chopeira'], 
                unitId: 4, 
                unitName: 'Chopeira' 
              },
              { 
                patterns: ['fabrica'], 
                unitId: 2, 
                unitName: 'Fábrica' 
              }
            ];
            
            // Try specific mappings first
            for (const mapping of specificMappings) {
              for (const pattern of mapping.patterns) {
                if (normalized.includes(pattern)) {
                  console.log(`✓ Matched pattern "${pattern}" -> ${mapping.unitName} (ID ${mapping.unitId})`);
                  return mapping.unitId;
                }
              }
            }
            
            // Try exact match on unit name (normalized)
            let match = units.find(unit => normalizeText(unit.name) === normalized);
            if (match) {
              console.log(`✓ Exact match -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Try partial match on name (normalized)
            match = units.find(unit => {
              const normalizedUnitName = normalizeText(unit.name);
              return normalizedUnitName.includes(normalized) || normalized.includes(normalizedUnitName);
            });
            if (match) {
              console.log(`✓ Partial match -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Default to first unit if no match
            console.log(`⚠ No match found, using default unit (ID ${units[0]?.id})`);
            return units.length > 0 ? units[0].id : null;
          }

          // Function to extract unit from product name and clean name
          const processProductName = (fullName: string): { name: string; unitOfMeasure: string } => {
            if (!fullName) return { name: "", unitOfMeasure: "" };
            
            const name = fullName.trim();
            const unitMapping: { [key: string]: string } = {
              'lt': 'LT',
              'lts': 'LT', 
              'litro': 'LT',
              'litros': 'LT',
              'und': 'UN',
              'un': 'UN',
              'unidade': 'UN',
              'unidades': 'UN',
              'pc': 'UN',
              'pcs': 'UN',
              'kg': 'KG',
              'kgs': 'KG',
              'quilo': 'KG',
              'quilos': 'KG',
              'kilogram': 'KG',
              'kilograms': 'KG',
              'g': 'G',
              'grama': 'G',
              'gramas': 'G',
              'gram': 'G',
              'grams': 'G',
              'ml': 'ML',
              'mls': 'ML',
              'mililitro': 'ML',
              'mililitros': 'ML',
              'l': 'LT',
              'm': 'M',
              'metro': 'M',
              'metros': 'M'
            };

            // Look for unit at the end of the name (separated by space)
            const words = name.split(/\s+/);
            const lastWord = words[words.length - 1].toLowerCase();
            
            if (unitMapping[lastWord]) {
              // Remove the unit from the name
              const cleanName = words.slice(0, -1).join(' ').trim();
              return {
                name: cleanName || name, // Fallback to original if clean name is empty
                unitOfMeasure: unitMapping[lastWord]
              };
            }

            // If no unit found, return original name
            return {
              name: name,
              unitOfMeasure: ""
            };
          }

          let created = 0;
          let updated = 0;
          let associated = 0; // New counter for unit associations
          const errors: any[] = [];
          const detailedErrors: string[] = [];

          for (const productData of products) {
            try {
              // Map common CSV column names (Portuguese and English) 
              const rawCode = productData.codigo || productData.code || productData.Codigo || productData.Code || productData.CODIGO || productData.COD || productData["COD."] || "";
              const rawName = productData.produto || productData.product || productData.nome || productData.name || productData.Produto || productData.Product || productData.NOME || productData.PRODUTO || "";
              const rawCategory = productData.categoria || productData.category || productData.Categoria || productData.Category || productData.CATEGORIA || "";
              const rawUnit = productData.unidade || productData.unit || productData.Unidade || productData.Unit || productData.UNIDADE || "";
              const rawUnitMeasure = productData.medida || productData.measure || productData.Medida || productData.Measure || productData.MEDIDA || "";
              const rawValue = productData.valor || productData.value || productData.Valor || productData.Value || productData.VALOR || productData.currentValue || productData["VALOR ATUAL"] || "0";

              if (!rawCode) {
                errors.push({ data: productData, error: 'Código é obrigatório' });
                detailedErrors.push(`Linha sem código: ${JSON.stringify(productData)}`);
                continue;
              }

              // Process product name to extract unit of measure
              const { name, unitOfMeasure: extractedUnit } = processProductName(rawName);
              
              if (!name) {
                errors.push({ data: productData, error: 'Nome do produto é obrigatório' });
                detailedErrors.push(`Produto sem nome válido: código ${rawCode}`);
                continue;
              }

              // Find matching category and unit using intelligent search
              const stockCategoryId = findBestCategory(rawCategory);
              const unitId = findBestUnit(rawUnit);

              // Get category name instead of ID for stock_category field
              const categoryName = stockCategoryId 
                ? categories.find(cat => cat.id === stockCategoryId)?.name || ""
                : "";

              // Get unit name instead of ID for unit field
              const unitName = unitId 
                ? units.find(unit => unit.id === unitId)?.name || ""
                : "";

              // Use extracted unit from name, or raw unit measure, or extracted unit
              const finalUnitOfMeasure = rawUnitMeasure || extractedUnit || "";

              const productInfo = {
                code: rawCode.toString(),
                name: name,
                stockCategory: categoryName,
                unit: unitName,
                unitOfMeasure: finalUnitOfMeasure,
                currentValue: parseFloat(rawValue) || 0,
              };

              console.log(`Processing product: ${productInfo.code} - ${productInfo.name}`);
              console.log(`Category mapping: "${rawCategory}" -> ID ${stockCategoryId} (${categoryName})`);
              console.log(`Unit mapping: "${rawUnit}" -> ID ${unitId} (${unitName})`);
              console.log(`Unit of measure: "${finalUnitOfMeasure}"`);

              // Check if product already exists by code
              let product = await storage.getProductByCode(rawCode.toString());
              let action = "";
              
              if (!product) {
                // CASO 1: Novo código - Cria o item
                product = await storage.upsertProductByCode(productInfo);
                created++;
                action = "CREATED";
                console.log(`✓ NEW PRODUCT: ${product.code} - ${product.name}`);
                
                // Associate with the unit from CSV
                if (unitId) {
                  try {
                    await storage.addProductToUnit(product.id, unitId, 0);
                    console.log(`✓ Associated new product with unit ${unitId}`);
                  } catch (unitError) {
                    console.log(`→ Error associating new product with unit:`, unitError);
                  }
                }
              } else {
                // CASO 2 e 3: Produto já existe - verificar unidade
                if (unitId) {
                  // Verificar se o produto já está associado a esta unidade
                  const productUnits = await storage.getProductUnits(product.id);
                  const isAssociatedWithUnit = productUnits.some(pu => pu.unitId === unitId);
                  
                  if (isAssociatedWithUnit) {
                    // CASO 3: Mesmo código e mesma unidade - Atualiza as informações
                    await storage.updateProduct(product.id, {
                      name: productInfo.name,
                      stockCategory: productInfo.stockCategory,
                      unitOfMeasure: productInfo.unitOfMeasure,
                      currentValue: productInfo.currentValue
                    });
                    updated++;
                    action = "UPDATED_SAME_UNIT";
                    console.log(`✓ UPDATED (same unit): ${product.code} - ${product.name}`);
                  } else {
                    // CASO 2: Mesmo código, unidade diferente - Associa a nova unidade
                    try {
                      await storage.addProductToUnit(product.id, unitId, 0);
                      // Também atualiza as informações do produto
                      await storage.updateProduct(product.id, {
                        name: productInfo.name,
                        stockCategory: productInfo.stockCategory,
                        unitOfMeasure: productInfo.unitOfMeasure,
                        currentValue: productInfo.currentValue
                      });
                      associated++;
                      action = "ASSOCIATED_NEW_UNIT";
                      console.log(`✓ ASSOCIATED with new unit: ${product.code} - unit ${unitId}`);
                    } catch (unitError) {
                      console.log(`→ Error associating product with new unit:`, unitError);
                      console.error("Full error:", unitError);
                    }
                  }
                } else {
                  // Sem unidade específica - apenas atualiza informações
                  await storage.updateProduct(product.id, {
                    name: productInfo.name,
                    stockCategory: productInfo.stockCategory,
                    unitOfMeasure: productInfo.unitOfMeasure,
                    currentValue: productInfo.currentValue
                  });
                  updated++;
                  action = "UPDATED_NO_UNIT";
                  console.log(`✓ UPDATED (no unit): ${product.code} - ${product.name}`);
                }
              }

            } catch (productError) {
              console.error(`Erro processando produto ${productData.code || 'sem código'}:`, productError);
              errors.push({ data: productData, error: productError instanceof Error ? productError.message : 'Erro desconhecido' });
              detailedErrors.push(`Erro ao processar produto: ${productError instanceof Error ? productError.message : 'Erro desconhecido'}`);
            }
          }

          res.json({
            message: `Importação concluída: ${created} criados, ${updated} atualizados, ${associated} associados a novas unidades, ${errors.length} erros`,
            stats: { created, updated, associated, errors: errors.length, total: products.length },
            errors: detailedErrors.slice(0, 10) // Return first 10 errors only
          });

        } catch (parseError) {
          console.error("Erro analisando arquivo:", parseError);
          res.status(400).json({ message: "Erro ao analisar conteúdo do arquivo" });
        }
      });
    } catch (error) {
      console.error("Erro no endpoint de upload:", error);
      res.status(500).json({ message: "Falha ao processar upload" });
    }
  });

  // Get products by unit (authenticated)
  app.get('/api/products/by-unit/:unitId', demoAuth, async (req, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      
      console.log(`Fetching products for unit ID: ${unitId}`);
      const products = await storage.getProductsByUnit(unitId);
      console.log(`Found ${products.length} products for unit ${unitId}`);
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by unit:", error);
      res.status(500).json({ message: "Failed to fetch products by unit" });
    }
  });

  // Get products by unit (public access for stock counting)
  app.get('/api/products/public/by-unit/:unitId', async (req, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      
      console.log(`Public access: Fetching products for unit ID: ${unitId}`);
      const products = await storage.getProductsByUnit(unitId);
      console.log(`Found ${products.length} products for unit ${unitId}`);
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by unit (public):", error);
      res.status(500).json({ message: "Failed to fetch products by unit" });
    }
  });

  // Stock Counts routes
  app.get('/api/stock-counts', demoAuth, async (req, res) => {
    try {
      const stockCounts = await storage.getStockCounts();
      res.json(stockCounts);
    } catch (error) {
      console.error("Error fetching stock counts:", error);
      res.status(500).json({ message: "Failed to fetch stock counts" });
    }
  });

  app.get('/api/stock-counts/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stockCount = await storage.getStockCount(id);
      if (!stockCount) {
        return res.status(404).json({ message: "Stock count not found" });
      }
      res.json(stockCount);
    } catch (error) {
      console.error("Error fetching stock count:", error);
      res.status(500).json({ message: "Failed to fetch stock count" });
    }
  });

  app.post('/api/stock-counts', demoAuth, async (req, res) => {
    try {
      console.log("Raw request body:", req.body);
      
      // Validate and transform the request data
      const stockCountData = {
        date: new Date(req.body.date),
        responsibleId: parseInt(req.body.responsibleId),
        unitId: parseInt(req.body.unitId),
        notes: req.body.notes || null,
        status: req.body.status || "draft",
      };
      
      console.log("Processed stock count data:", stockCountData);
      console.log("Date is valid:", !isNaN(stockCountData.date.getTime()));
      
      const stockCount = await storage.createStockCount(stockCountData);
      res.status(201).json(stockCount);
    } catch (error) {
      console.error("Error creating stock count:", error);
      res.status(500).json({ message: "Failed to create stock count" });
    }
  });

  app.put('/api/stock-counts/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if stock count exists and get current status
      const existingStockCount = await storage.getStockCount(id);
      if (!existingStockCount) {
        return res.status(404).json({ message: "Stock count not found" });
      }
      
      // If stock count is started, only allow updating quantities, not basic info
      if (existingStockCount.status === 'started' || existingStockCount.status === 'em_contagem' || existingStockCount.status === 'contagem_finalizada') {
        return res.status(400).json({ 
          message: "Contagem iniciada não pode ter informações básicas alteradas. Apenas quantidades podem ser modificadas." 
        });
      }
      
      const stockCount = await storage.updateStockCount(id, req.body);
      res.json(stockCount);
    } catch (error) {
      console.error("Error updating stock count:", error);
      res.status(500).json({ message: "Failed to update stock count" });
    }
  });

  app.delete('/api/stock-counts/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStockCount(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stock count:", error);
      res.status(500).json({ message: "Failed to delete stock count" });
    }
  });

  // Stock Count Items routes
  app.get('/api/stock-counts/:id/items', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const items = await storage.getStockCountItems(stockCountId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching stock count items:", error);
      res.status(500).json({ message: "Failed to fetch stock count items" });
    }
  });

  app.post('/api/stock-counts/:id/items', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const items = req.body.items || [];
      
      await storage.updateStockCountItems(stockCountId, items);
      res.status(200).json({ message: "Items updated successfully" });
    } catch (error) {
      console.error("Error updating stock count items:", error);
      res.status(500).json({ message: "Failed to update stock count items" });
    }
  });

  // Update quantities in finalized stock counts
  app.put('/api/stock-counts/:id/items', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const items = req.body.items || [];
      
      console.log(`[UPDATE QUANTITIES] Updating stock count ${stockCountId} with ${items.length} items`);
      
      // Verify stock count exists and is finalized
      const stockCount = await storage.getStockCount(stockCountId);
      if (!stockCount) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      
      if (stockCount.status !== 'contagem_finalizada') {
        return res.status(400).json({ message: "Só é possível editar quantidades em contagens finalizadas" });
      }
      
      // Filter valid items
      const validItems = items.filter(item => 
        item.productId && 
        item.countedQuantity !== null &&
        item.countedQuantity !== undefined
      );
      
      console.log(`[UPDATE QUANTITIES] Processing ${validItems.length} valid items`);
      
      // Update each item
      for (const item of validItems) {
        await storage.upsertStockCountItem(stockCountId, item);
      }
      
      console.log(`[UPDATE QUANTITIES] Successfully updated quantities for stock count ${stockCountId}`);
      res.status(200).json({ message: "Quantidades atualizadas com sucesso" });
    } catch (error) {
      console.error("Error updating stock count quantities:", error);
      res.status(500).json({ message: "Erro ao atualizar quantidades" });
    }
  });

  app.delete('/api/stock-counts/:id/items/:productId', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const productId = parseInt(req.params.productId);
      
      if (isNaN(stockCountId) || isNaN(productId)) {
        return res.status(400).json({ message: "Invalid stock count ID or product ID" });
      }
      
      // Check if stock count exists and get current status
      const existingStockCount = await storage.getStockCount(stockCountId);
      if (!existingStockCount) {
        return res.status(404).json({ message: "Stock count not found" });
      }
      
      // If stock count is started, don't allow removing products
      if (existingStockCount.status === 'started' || existingStockCount.status === 'em_contagem' || existingStockCount.status === 'contagem_finalizada') {
        return res.status(400).json({ 
          message: "Não é possível remover produtos de uma contagem iniciada. Apenas quantidades podem ser alteradas." 
        });
      }
      
      await storage.deleteStockCountItemByProduct(stockCountId, productId);
      res.status(200).json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error deleting stock count item:", error);
      res.status(500).json({ message: "Failed to delete stock count item" });
    }
  });

  // Route to initialize stock count with all products
  app.post('/api/stock-counts/:id/initialize', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      console.log("Initializing stock count ID:", stockCountId);
      
      if (isNaN(stockCountId)) {
        return res.status(400).json({ message: "Invalid stock count ID" });
      }
      
      // Get the stock count to find the unit
      const stockCount = await storage.getStockCount(stockCountId);
      if (!stockCount) {
        return res.status(404).json({ message: "Stock count not found" });
      }

      // Get products available in this unit
      const products = await storage.getProductsByUnit(stockCount.unitId);
      console.log("Found products for unit", stockCount.unitId, ":", products.length);
      
      // Create items for all products with 0 count
      const items = products.map(product => ({
        stockCountId,
        productId: product.id,
        countedQuantity: "0",
        systemQuantity: null,
        notes: null,
      }));
      
      console.log("Creating items for products:", items.slice(0, 3));
      
      await storage.createStockCountItems(items);
      res.status(200).json({ message: "Stock count initialized with all products" });
    } catch (error) {
      console.error("Error initializing stock count:", error);
      res.status(500).json({ message: "Failed to initialize stock count" });
    }
  });

  // Route to start stock count (generate public token and send WhatsApp)
  app.post('/api/stock-counts/:id/start', demoAuth, async (req, res) => {
    try {
      console.log(`[START] Starting stock count for ID: ${req.params.id}`);
      const stockCountId = parseInt(req.params.id);
      
      if (isNaN(stockCountId)) {
        console.log(`[START] Invalid stock count ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid stock count ID" });
      }
      
      console.log(`[START] Generating public token for stock count ${stockCountId}`);
      // Generate random token for public access
      const crypto = await import('crypto');
      const publicToken = crypto.randomBytes(16).toString('hex');
      console.log(`[START] Generated token: ${publicToken}`);
      
      // Update stock count with public token and status
      console.log(`[START] Updating stock count with status 'started' and token`);
      await storage.updateStockCount(stockCountId, {
        status: 'started',
        publicToken
      });
      
      // Get stock count with responsible person
      console.log(`[START] Fetching stock count details`);
      const stockCount = await storage.getStockCount(stockCountId);
      console.log(`[START] Stock count data:`, {
        id: stockCount?.id,
        status: stockCount?.status,
        responsibleId: stockCount?.responsibleId,
        hasResponsible: !!stockCount?.responsible,
        whatsapp: stockCount?.responsible?.whatsapp
      });
      
      // Generate public URL - sempre usar produção
      const baseUrl = `https://gestor.donjuarez.com.br`;
      const publicUrl = `${baseUrl}/contagem-publica/${publicToken}`;
      console.log(`[START] Generated public URL: ${publicUrl}`);
      
      // Send WhatsApp message to responsible person
      if (stockCount?.responsible?.whatsapp) {
        console.log(`[START] ================================================`);
        console.log(`[START] ENVIANDO WHATSAPP DE CONTAGEM INICIADA`);
        console.log(`[START] Destinatário: ${stockCount.responsible.whatsapp}`);
        console.log(`[START] Nome do responsável: ${stockCount.responsible.firstName} ${stockCount.responsible.lastName}`);
        console.log(`[START] Email do responsável: ${stockCount.responsible.email}`);
        
        const { format } = await import("date-fns");
        const { ptBR } = await import("date-fns/locale");
        
        const message = `🗂️ *Contagem de Estoque Iniciada*\n\n` +
          `📋 Contagem #${stockCountId}\n` +
          `📅 ${format(new Date(stockCount.date), "dd/MM/yyyy", { locale: ptBR })}\n\n` +
          `🔗 Link para contagem:\n${publicUrl}\n\n` +
          `*Instruções:*\n` +
          `• Acesse o link acima\n` +
          `• Conte os produtos por categoria\n` +
          `• Anote observações quando necessário\n` +
          `• Os dados são salvos automaticamente`;
        
        console.log(`[START] Mensagem preparada (${message.length} caracteres):`);
        console.log(`[START] "${message}"`);
        console.log(`[START] Iniciando chamada sendWhatsAppMessage...`);
        
        const success = await sendWhatsAppMessage(stockCount.responsible.whatsapp, message, 'stock_count');
        
        if (success) {
          console.log(`[START] ✅ WhatsApp enviado com SUCESSO para ${stockCount.responsible.whatsapp}`);
        } else {
          console.log(`[START] ❌ FALHA ao enviar WhatsApp para ${stockCount.responsible.whatsapp}`);
        }
        console.log(`[START] ================================================`);
      } else {
        console.log(`[START] ⚠️ Nenhum número de WhatsApp encontrado para o responsável`);
        console.log(`[START] Dados do responsável:`, stockCount?.responsible || 'RESPONSIBLE NOT FOUND');
      }
      
      console.log(`[START] Success! Returning response`);
      res.status(200).json({ 
        message: "Stock count started successfully", 
        publicUrl,
        publicToken 
      });
    } catch (error) {
      console.error("[START] Error starting stock count:", error);
      console.error("[START] Error stack:", error.stack);
      res.status(500).json({ message: "Failed to start stock count" });
    }
  });


  // New status transition routes
  
  // Start stock count (rascunho -> pronta_para_contagem)
  app.post('/api/stock-counts/:id/fechar-contagem', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      
      if (isNaN(stockCountId)) {
        return res.status(400).json({ message: "ID de contagem inválido" });
      }
      
      const stockCount = await storage.startStockCount(stockCountId);
      
      // Get stock count with responsible person for WhatsApp
      const fullStockCount = await storage.getStockCount(stockCountId);
      
      // Generate public URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : `https://gestor.donjuarez.com.br`;
      const publicUrl = `${baseUrl}/contagem-publica/${stockCount.publicToken}`;
      
      // Send WhatsApp message to responsible person
      if (fullStockCount?.responsible?.whatsapp) {
        console.log(`[CLOSE] ================================================`);
        console.log(`[CLOSE] ENVIANDO WHATSAPP DE CONTAGEM PRONTA`);
        console.log(`[CLOSE] Destinatário: ${fullStockCount.responsible.whatsapp}`);
        console.log(`[CLOSE] Nome do responsável: ${fullStockCount.responsible.firstName} ${fullStockCount.responsible.lastName}`);
        console.log(`[CLOSE] Email do responsável: ${fullStockCount.responsible.email}`);
        
        const { format } = await import("date-fns");
        const { ptBR } = await import("date-fns/locale");
        
        const message = `🗂️ *Contagem de Estoque Pronta*\n\n` +
          `📋 Contagem #${stockCountId}\n` +
          `📅 ${format(new Date(fullStockCount.date), "dd/MM/yyyy", { locale: ptBR })}\n\n` +
          `🔗 Link para contagem:\n${publicUrl}\n\n` +
          `*Instruções:*\n` +
          `• Acesse o link acima\n` +
          `• Conte os produtos por categoria\n` +
          `• Anote observações quando necessário\n` +
          `• Os dados são salvos automaticamente`;
        
        console.log(`[CLOSE] Mensagem preparada (${message.length} caracteres):`);
        console.log(`[CLOSE] "${message}"`);
        console.log(`[CLOSE] Iniciando chamada sendWhatsAppMessage...`);
        
        const success = await sendWhatsAppMessage(fullStockCount.responsible.whatsapp, message, 'stock_count');
        
        if (success) {
          console.log(`[CLOSE] ✅ WhatsApp enviado com SUCESSO para ${fullStockCount.responsible.whatsapp}`);
        } else {
          console.log(`[CLOSE] ❌ FALHA ao enviar WhatsApp para ${fullStockCount.responsible.whatsapp}`);
        }
        console.log(`[CLOSE] ================================================`);
      } else {
        console.log(`[CLOSE] ⚠️ Nenhum número de WhatsApp encontrado para o responsável`);
        console.log(`[CLOSE] Dados do responsável:`, fullStockCount?.responsible || 'RESPONSIBLE NOT FOUND');
      }
      
      res.status(200).json({ 
        message: "Contagem fechada e enviada com sucesso", 
        publicUrl,
        stockCount
      });
    } catch (error) {
      console.error("Error closing stock count:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao fechar contagem" 
      });
    }
  });

  // Begin counting via public token (pronta_para_contagem -> em_contagem)
  app.post('/api/stock-counts/public/:token/begin', async (req, res) => {
    try {
      console.log(`[BEGIN] Starting count for token: ${req.params.token}`);
      const publicToken = req.params.token;
      
      if (!publicToken) {
        console.log(`[BEGIN] Invalid token: ${publicToken}`);
        return res.status(400).json({ message: "Token público inválido" });
      }
      
      console.log(`[BEGIN] Calling storage.beginCounting for token: ${publicToken}`);
      const stockCount = await storage.beginCounting(publicToken);
      console.log(`[BEGIN] Success! Stock count ID: ${stockCount.id}, new status: ${stockCount.status}`);
      
      res.status(200).json({ 
        message: "Contagem iniciada com sucesso", 
        stockCount
      });
    } catch (error) {
      console.error("[BEGIN] Error beginning counting:", error);
      console.error("[BEGIN] Error stack:", error.stack);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao iniciar contagem" 
      });
    }
  });

  // Finish counting via public token (em_contagem -> contagem_finalizada)
  app.post('/api/stock-counts/public/:token/finish', async (req, res) => {
    try {
      const publicToken = req.params.token;
      
      if (!publicToken) {
        return res.status(400).json({ message: "Token público inválido" });
      }
      
      // Find stock count by public token
      const stockCount = await storage.getStockCountByPublicToken(publicToken);
      if (!stockCount) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      
      if (stockCount.status !== 'em_contagem') {
        return res.status(400).json({ message: "Contagem não está em andamento" });
      }
      
      // Finalize the stock count
      const finalizedCount = await storage.finalizeStockCount(stockCount.id);
      
      res.status(200).json({ 
        message: "Contagem finalizada com sucesso", 
        stockCount: finalizedCount
      });
    } catch (error) {
      console.error("Error finishing counting:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao finalizar contagem" 
      });
    }
  });

  // Finalize stock count (em_contagem -> contagem_finalizada)
  app.post('/api/stock-counts/:id/finalizar', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      
      if (isNaN(stockCountId)) {
        return res.status(400).json({ message: "ID de contagem inválido" });
      }
      
      const stockCount = await storage.finalizeStockCount(stockCountId);
      
      res.status(200).json({ 
        message: "Contagem finalizada com sucesso", 
        stockCount
      });
    } catch (error) {
      console.error("Error finalizing stock count:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao finalizar contagem" 
      });
    }
  });

  // Get stock count by public token (for public access)
  app.get('/api/stock-counts/public/:token', async (req, res) => {
    try {
      const publicToken = req.params.token;
      
      if (!publicToken) {
        return res.status(400).json({ message: "Token público inválido" });
      }
      
      // Find stock count by public token
      const allStockCounts = await storage.getStockCounts();
      const stockCount = allStockCounts.find(sc => sc.publicToken === publicToken);
      
      if (!stockCount) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      
      res.json(stockCount);
    } catch (error) {
      console.error("Error fetching public stock count:", error);
      res.status(500).json({ message: "Erro ao buscar contagem" });
    }
  });

  // Update stock count items via public token
  app.put('/api/stock-counts/public/:token/items', async (req, res) => {
    try {
      const publicToken = req.params.token;
      const items = req.body.items || [];
      
      console.log(`[PUBLIC STOCK UPDATE] Token: ${publicToken}, Items count: ${items.length}`);
      console.log(`[PUBLIC STOCK UPDATE] Items data:`, JSON.stringify(items, null, 2));
      
      if (!publicToken) {
        console.log("[PUBLIC STOCK UPDATE] Erro: Token público ausente");
        return res.status(400).json({ message: "Token público inválido" });
      }
      
      // Find stock count by public token
      const allStockCounts = await storage.getStockCounts();
      const stockCount = allStockCounts.find(sc => sc.publicToken === publicToken);
      
      console.log(`[PUBLIC STOCK UPDATE] Stock count found: ${stockCount ? 'Yes' : 'No'}`);
      if (stockCount) {
        console.log(`[PUBLIC STOCK UPDATE] Stock count status: ${stockCount.status}`);
      }
      
      if (!stockCount) {
        console.log("[PUBLIC STOCK UPDATE] Erro: Contagem não encontrada");
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      
      // Only allow updates if the count is in progress
      if (stockCount.status !== 'em_contagem') {
        console.log(`[PUBLIC STOCK UPDATE] Erro: Status inválido (${stockCount.status}), esperado 'em_contagem'`);
        return res.status(400).json({ message: "Contagem não está em andamento" });
      }
      
      // Filtrar apenas itens válidos (com productId e quantidade válida)
      const validItems = items.filter(item => 
        item.productId && 
        item.countedQuantity !== "" && 
        item.countedQuantity !== null &&
        !isNaN(parseFloat(item.countedQuantity))
      );
      
      console.log(`[PUBLIC STOCK UPDATE] Salvando ${validItems.length} itens válidos na contagem ${stockCount.id}`);
      console.log(`[PUBLIC STOCK UPDATE] Itens válidos:`, JSON.stringify(validItems, null, 2));
      
      // Salvar cada item individualmente para preservar itens existentes
      if (validItems.length > 0) {
        for (const item of validItems) {
          await storage.upsertStockCountItem(stockCount.id, item);
        }
      }
      
      console.log("[PUBLIC STOCK UPDATE] Itens salvos com sucesso");
      res.status(200).json({ message: "Quantidades atualizadas com sucesso" });
    } catch (error) {
      console.error("[PUBLIC STOCK UPDATE] Error updating public stock count items:", error);
      res.status(500).json({ message: "Erro ao atualizar quantidades" });
    }
  });

  // Get stock count items via public token
  app.get('/api/stock-counts/public/:token/items', async (req, res) => {
    try {
      const publicToken = req.params.token;
      
      console.log(`[PUBLIC STOCK ITEMS] Token: ${publicToken}`);
      
      if (!publicToken) {
        console.log("[PUBLIC STOCK ITEMS] Erro: Token público ausente");
        return res.status(400).json({ message: "Token público inválido" });
      }
      
      // Find stock count by public token
      const allStockCounts = await storage.getStockCounts();
      const stockCount = allStockCounts.find(sc => sc.publicToken === publicToken);
      
      console.log(`[PUBLIC STOCK ITEMS] Stock count found: ${stockCount ? 'Yes' : 'No'}`);
      
      if (!stockCount) {
        console.log("[PUBLIC STOCK ITEMS] Erro: Contagem não encontrada");
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      
      const items = await storage.getStockCountItems(stockCount.id);
      console.log(`[PUBLIC STOCK ITEMS] Retornando ${items.length} itens`);
      
      res.status(200).json(items);
    } catch (error) {
      console.error("[PUBLIC STOCK ITEMS] Error fetching stock count items:", error);
      res.status(500).json({ message: "Erro ao buscar itens" });
    }
  });

  // Route to get previous stock count order for smart ordering
  app.get('/api/stock-counts/:id/previous-order', demoAuth, async (req, res) => {
    try {
      const currentStockCountId = parseInt(req.params.id);
      
      if (isNaN(currentStockCountId)) {
        return res.status(400).json({ message: "Invalid stock count ID" });
      }
      
      // Get current stock count to find responsible person
      const currentStockCount = await storage.getStockCount(currentStockCountId);
      
      if (!currentStockCount) {
        return res.status(404).json({ message: "Stock count not found" });
      }
      
      // Find the most recent completed stock count by the same responsible person
      const allStockCounts = await storage.getStockCounts();
      
      const previousStockCounts = allStockCounts
        .filter(sc => 
          sc.responsibleId === currentStockCount.responsibleId &&
          sc.status === 'completed' &&
          sc.id < currentStockCountId
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, 1);
      
      if (previousStockCounts.length === 0) {
        // No previous count found, return default alphabetical order
        return res.json({ 
          hasOrder: false,
          categories: [],
          products: {}
        });
      }
      
      const previousStockCount = previousStockCounts[0];
      
      // Get items from previous stock count to extract ordering
      const items = await storage.getStockCountItems(previousStockCount.id);
      
      // Get products to build category and product ordering
      const products = await storage.getProducts();
      
      // Build category order based on product appearance in previous count
      const categoryOrder: string[] = [];
      const productOrder: Record<string, string[]> = {};
      
      // Get product categories for name mapping
      const productCategories = await storage.getProductCategories();
      
      // Process items in the order they were saved in previous count
      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          // Map category correctly
          let categoryName = "Sem categoria";
          
          if (product.stockCategory) {
            // If it's a number, find the category name
            if (!isNaN(Number(product.stockCategory))) {
              const categoryId = Number(product.stockCategory);
              const category = productCategories.find(cat => cat.id === categoryId);
              categoryName = category ? category.name : `Categoria ID ${categoryId}`;
            } else {
              // If it's a string, use directly
              categoryName = product.stockCategory;
            }
          }
          
          // Add category if not already in order
          if (!categoryOrder.includes(categoryName)) {
            categoryOrder.push(categoryName);
            productOrder[categoryName] = [];
          }
          
          // Add product if not already in category order
          if (!productOrder[categoryName].includes(product.name)) {
            productOrder[categoryName].push(product.name);
          }
        }
      });
      
      res.json({
        hasOrder: true,
        categories: categoryOrder,
        products: productOrder,
        previousStockCountId: previousStockCount.id
      });
      
    } catch (error) {
      console.error("Error getting previous stock count order:", error);
      res.status(500).json({ message: "Failed to get previous stock count order" });
    }
  });

  // Route to save custom order for stock count
  app.post('/api/stock-counts/:id/save-order', demoAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const { categoryOrder, productOrder } = req.body;
      
      if (isNaN(stockCountId)) {
        return res.status(400).json({ message: "Invalid stock count ID" });
      }
      
      // Save the order data to the stock count
      await storage.updateStockCount(stockCountId, {
        categoryOrder: JSON.stringify(categoryOrder),
        productOrder: JSON.stringify(productOrder)
      });
      
      res.json({ 
        message: "Order saved successfully",
        categoryOrder,
        productOrder
      });
      
    } catch (error) {
      console.error("Error saving stock count order:", error);
      res.status(500).json({ message: "Failed to save stock count order" });
    }
  });

  // Product Units routes
  app.get('/api/product-units', demoAuth, async (req, res) => {
    try {
      const { productId, unitId } = req.query;
      const productUnits = await storage.getProductUnits(
        productId ? parseInt(productId as string) : undefined,
        unitId ? parseInt(unitId as string) : undefined
      );
      res.json(productUnits);
    } catch (error) {
      console.error("Error fetching product units:", error);
      res.status(500).json({ message: "Failed to fetch product units" });
    }
  });

  app.post('/api/product-units', demoAuth, async (req, res) => {
    try {
      const { productId, unitId, stockQuantity } = req.body;
      const productUnit = await storage.addProductToUnit(
        parseInt(productId), 
        parseInt(unitId), 
        parseFloat(stockQuantity || 0)
      );
      res.status(201).json(productUnit);
    } catch (error) {
      console.error("Error creating product unit:", error);
      res.status(500).json({ message: "Failed to create product unit association" });
    }
  });

  app.delete('/api/product-units/:productId/:unitId', demoAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const unitId = parseInt(req.params.unitId);
      await storage.removeProductFromUnit(productId, unitId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing product from unit:", error);
      res.status(500).json({ message: "Failed to remove product from unit" });
    }
  });

  // Route to populate all products to all units (for initial setup)
  app.post('/api/product-units/populate-all', demoAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const units = await storage.getUnits();
      
      let created = 0;
      let errors = 0;
      
      for (const product of products) {
        for (const unit of units) {
          try {
            await storage.addProductToUnit(product.id, unit.id, 0);
            created++;
          } catch (error) {
            // Ignore duplicates, just count errors
            errors++;
          }
        }
      }
      
      res.json({ 
        message: `Populated products to units: ${created} created, ${errors} duplicates/errors`,
        created,
        errors
      });
    } catch (error) {
      console.error("Error populating product units:", error);
      res.status(500).json({ message: "Failed to populate product units" });
    }
  });

  // Settings routes
  app.get('/api/settings', demoAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.get('/api/settings/:key', demoAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Erro ao buscar configuração" });
    }
  });

  app.post('/api/settings', demoAuth, async (req, res) => {
    try {
      const { key, value, description } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Chave e valor são obrigatórios" });
      }
      
      const setting = await storage.setSetting(key, value, description);
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating setting:", error);
      res.status(500).json({ message: "Erro ao criar configuração" });
    }
  });

  app.put('/api/settings/:key', demoAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Valor é obrigatório" });
      }
      
      const setting = await storage.updateSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Erro ao atualizar configuração" });
    }
  });

  // ============ CASH REGISTER CLOSURES ROUTES ============

  // Get all cash register closures
  app.get('/api/cash-register-closures', demoAuth, async (req, res) => {
    try {
      const closures = await storage.getCashRegisterClosures();
      res.json(closures);
    } catch (error) {
      console.error("Error fetching cash register closures:", error);
      res.status(500).json({ message: "Error fetching cash register closures" });
    }
  });

  // Create new cash register closure
  app.post('/api/cash-register-closures', demoAuth, async (req, res) => {
    try {
      const { insertCashRegisterClosureSchema } = await import("@shared/schema");
      const closureData = insertCashRegisterClosureSchema.parse({
        ...req.body,
        createdBy: req.session.user?.id,
      });
      const closure = await storage.createCashRegisterClosure(closureData);
      res.status(201).json(closure);
    } catch (error) {
      console.error("Error creating cash register closure:", error);
      res.status(500).json({ message: "Error creating cash register closure" });
    }
  });

  // Update cash register closure
  app.put('/api/cash-register-closures/:id', demoAuth, async (req, res) => {
    try {
      const { insertCashRegisterClosureSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const closureData = insertCashRegisterClosureSchema.partial().parse(req.body);
      const closure = await storage.updateCashRegisterClosure(id, closureData);
      res.json(closure);
    } catch (error) {
      console.error("Error updating cash register closure:", error);
      res.status(500).json({ message: "Error updating cash register closure" });
    }
  });

  // Delete cash register closure
  app.delete('/api/cash-register-closures/:id', demoAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCashRegisterClosure(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cash register closure:", error);
      res.status(500).json({ message: "Error deleting cash register closure" });
    }
  });

  // Upload PDF and parse cash register closure data
  app.post('/api/cash-register-closures/upload-pdf', demoAuth, upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo PDF foi enviado" });
      }

      // Verify file type
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: "Apenas arquivos PDF são aceitos" });
      }

      console.log('Processing PDF file:', req.file.originalname);
      
      console.log('PDF file received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.buffer.length
      });

      // Parse PDF content using pdfjs-dist
      let extractedText = '';
      let parsedData: any = {};
      
      try {
        // Use pdfjs-dist to extract text from PDF
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
        
        // Load PDF document
        const pdfDoc = await pdfjs.getDocument({
          data: req.file.buffer,
          useSystemFonts: true
        }).promise;
        
        // Extract text from all pages
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          extractedText += pageText + '\n';
        }
        
        console.log('Extracted PDF text:', extractedText.substring(0, 500));
        
        // Parse extracted text to find specific fields
        parsedData = parsePDFContent(extractedText);
        
      } catch (pdfError: any) {
        console.error('Error parsing PDF with pdfjs:', pdfError);
        // Fallback to basic data structure
        parsedData = {
          datetime: new Date(),
          operation: "salao",
          initialFund: 0,
          cashSales: 0,
          debitSales: 0,
          creditSales: 0,
          pixSales: 0,
          withdrawals: 0,
          shift: "dia",
          notes: `PDF processado: ${req.file.originalname}. Erro no parsing automático: ${pdfError.message}`
        };
      }

      // Return parsed data for manual completion/verification
      return res.status(200).json({
        message: "PDF processado com sucesso. Verifique os dados extraídos.",
        requiresManualCompletion: true,
        parsedData,
        debug: {
          fileName: req.file.originalname,
          fileSize: req.file.buffer.length,
          extractedTextPreview: extractedText.substring(0, 1000),
          parsingSuccess: !!extractedText
        }
      });
      
    } catch (error: any) {
      console.error("Error processing PDF upload:", error);
      res.status(500).json({ 
        message: "Erro ao processar arquivo PDF",
        error: error.message 
      });
    }
  });

  // Helper function to parse PDF content and extract cash register data
  function parsePDFContent(text: string): any {
    const extractedData: any = {
      datetime: new Date(),
      operation: "salao",
      initialFund: 0,
      cashSales: 0,
      debitSales: 0,
      creditSales: 0,
      pixSales: 0,
      withdrawals: 0,
      shift: "dia",
      notes: ""
    };

    try {
      // Extract date and time from "Caixa Abertura"
      const dateTimeMatch = text.match(/Caixa\s+Abertura[:\s]*([\d\/\s\:]+)/i);
      if (dateTimeMatch) {
        const dateTimeStr = dateTimeMatch[1].trim();
        console.log('Found datetime string:', dateTimeStr);
        
        // Try to parse various date formats: DD/MM/YYYY HH:MM:SS
        const parsedDate = parseDate(dateTimeStr);
        if (parsedDate) {
          extractedData.datetime = parsedDate;
        }
      }

      // Extract monetary values - look for patterns like "R$ 123,45" or "123,45"
      const extractMoneyValue = (pattern: RegExp): number => {
        const match = text.match(pattern);
        if (match) {
          const valueStr = match[1].replace(/[R$\s]/g, '').replace(',', '.');
          const value = parseFloat(valueStr);
          return isNaN(value) ? 0 : value;
        }
        return 0;
      };

      // Map common field patterns from ERP PDFs
      extractedData.initialFund = extractMoneyValue(/(?:Fundo\s+Inicial|Valor\s+Inicial)[:\s]*R?\$?\s*([\d,\.]+)/i);
      extractedData.cashSales = extractMoneyValue(/(?:Vendas?\s+Dinheiro|Dinheiro)[:\s]*R?\$?\s*([\d,\.]+)/i);
      extractedData.debitSales = extractMoneyValue(/(?:Vendas?\s+D[eé]bito|D[eé]bito)[:\s]*R?\$?\s*([\d,\.]+)/i);
      extractedData.creditSales = extractMoneyValue(/(?:Vendas?\s+Cr[eé]dito|Cr[eé]dito)[:\s]*R?\$?\s*([\d,\.]+)/i);
      extractedData.pixSales = extractMoneyValue(/(?:Vendas?\s+PIX|PIX)[:\s]*R?\$?\s*([\d,\.]+)/i);
      extractedData.withdrawals = extractMoneyValue(/(?:Retiradas?|Sangrias?)[:\s]*R?\$?\s*([\d,\.]+)/i);

      // Determine shift based on time
      if (extractedData.datetime) {
        const hour = extractedData.datetime.getHours();
        extractedData.shift = hour >= 6 && hour < 18 ? "dia" : "noite";
      }

      // Add notes with raw parsing info
      extractedData.notes = `Dados extraídos automaticamente do PDF. Data/hora base: ${dateTimeMatch?.[1] || 'não encontrada'}`;

      console.log('Parsed data:', extractedData);
      return extractedData;

    } catch (error) {
      console.error('Error parsing PDF content:', error);
      return extractedData;
    }
  }

  // Helper function to parse date strings in various formats
  function parseDate(dateStr: string): Date | null {
    try {
      // Remove extra spaces and normalize
      const cleaned = dateStr.replace(/\s+/g, ' ').trim();
      
      // Try DD/MM/YYYY HH:MM:SS format
      const ddmmyyyyMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
      if (ddmmyyyyMatch) {
        const [, day, month, year, hour, minute, second] = ddmmyyyyMatch;
        return new Date(
          parseInt(year),
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }

      // Try DD/MM/YYYY format
      const ddmmyyyy = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      return null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  // Test endpoint for WhatsApp Business Cloud API
  app.post('/api/test-whatsapp', async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ message: "Phone and message are required" });
      }
      
      console.log('Testing WhatsApp Business Cloud API...');
      
      const testMessage = `🧪 Teste da API oficial do WhatsApp Business Cloud
      
${message}

⏰ Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
      
      const success = await sendWhatsAppMessage(phone, testMessage, 'stock_count');
      
      res.json({ 
        success, 
        message: success ? "Message sent successfully via WhatsApp Business Cloud API" : "Failed to send message",
        phoneNumber: phone,
        messageLength: testMessage.length,
        apiType: "WhatsApp Business Cloud API",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Test WhatsApp API error:', error);
      res.status(500).json({ message: "Error testing WhatsApp API", error: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
