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

const SAO_PAULO_TZ = "America/Sao_Paulo";

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

  // Helper function to send WhatsApp message via Evolution API
  async function sendWhatsAppMessage(remoteJid: string, text: string): Promise<boolean> {
    try {
      const body = {
        number: remoteJid,
        text: text,
        textMessage: {
          text: text
        }
      };
      
      console.log('Sending WhatsApp message:', {
        url: 'https://wpp.donjuarez.com.br/message/sendText/dj-ponto',
        headers: { 'apikey': process.env.evoGlobalApikey?.substring(0, 10) + '...' },
        body: body
      });

      const response = await fetch('https://wpp.donjuarez.com.br/message/sendText/dj-ponto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.evoGlobalApikey!,
        },
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      console.log('Evolution API response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (!response.ok) {
        console.error('Failed to send WhatsApp message:', response.status, response.statusText, responseText);
        return false;
      }

      console.log('WhatsApp message sent successfully to:', remoteJid);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // WhatsApp webhook for freelancer time tracking (Evolution API)
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
        await sendWhatsAppMessage(remoteJid, "Hmmm.. não encontrei um usuário cadastrado neste número de whatsapp.");
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
          await sendWhatsAppMessage(remoteJid, `Unidade não encontrada. Escolha uma das opções:\n\n${unitsList}`);
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
        await sendWhatsAppMessage(remoteJid, successMessage);
        return res.json({ status: 'success', message: 'Entry registered successfully', entry: timeEntry });
      }

      if (messageType === 'unknown') {
        await sendWhatsAppMessage(remoteJid, 'Hmmmm... não consegui entender a mensagem para registrar seu ponto. Envie "Cheguei" para marcar sua entrada ou "Fui" para marcar sua saída.');
        return res.json({ status: 'error', message: 'Message not recognized' });
      }

      // If it's an entrada (check-in), request unit selection
      if (messageType === 'entrada') {
        const units = await storage.getUnits();
        const unitsList = units.map(unit => `${unit.id} - ${unit.name}`).join('\n');
        const unitSelectionMessage = `Olá ${freelancer.firstName}! 👋\n\nEm qual unidade você está trabalhando hoje?\n\n${unitsList}\n\nResponda apenas com o número da unidade.`;
        
        await sendWhatsAppMessage(remoteJid, unitSelectionMessage);
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
        await sendWhatsAppMessage(remoteJid, exitMessage);
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
        unitId: parseInt(req.body.unitId)
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
            
            // Try exact match first
            let match = categories.find(cat => cat.name.toLowerCase() === normalized);
            if (match) return match.id;

            // Try partial match (contains)
            match = categories.find(cat => 
              cat.name.toLowerCase().includes(normalized) || 
              normalized.includes(cat.name.toLowerCase())
            );
            if (match) return match.id;

            // Default to first category if no match
            return categories.length > 0 ? categories[0].id : null;
          }

          // Function to find best matching unit by similarity
          const findBestUnit = (unitName: string): number | null => {
            if (!unitName) return units.length > 0 ? units[0].id : null;
            
            const normalized = unitName.toLowerCase().trim();
            
            // Create mapping patterns for unit matching
            const unitMappings = {
              'apollonio': (u: any) => u.name.toLowerCase().includes('apollonio'),
              'grão pará': (u: any) => u.name.toLowerCase().includes('grão pará'),
              'beer truck': (u: any) => u.name.toLowerCase().includes('beer truck'),
              'chopeira': (u: any) => u.name.toLowerCase().includes('chopeira'),
              'fábrica': (u: any) => u.name.toLowerCase().includes('fábrica')
            };
            
            // Try exact match on name first
            let match = units.find(unit => unit.name.toLowerCase().trim() === normalized);
            if (match) return match.id;

            // Try pattern matching
            for (const [pattern, matcher] of Object.entries(unitMappings)) {
              if (normalized.includes(pattern)) {
                match = units.find(matcher);
                if (match) return match.id;
              }
            }

            // Try partial match on name (fallback)
            match = units.find(unit => 
              unit.name.toLowerCase().includes(normalized) || 
              normalized.includes(unit.name.toLowerCase())
            );
            if (match) return match.id;

            // Default to first unit if no match
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
          const errors: any[] = [];
          const detailedErrors: string[] = [];

          for (const productData of products) {
            try {
              // Map common CSV column names (Portuguese and English)
              const rawCode = productData.codigo || productData.code || productData.Codigo || productData.Code || productData.CODIGO || productData["COD."] || "";
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

              // Use extracted unit from name, or raw unit measure, or extracted unit
              const finalUnitOfMeasure = rawUnitMeasure || extractedUnit || "";

              const productInfo = {
                code: rawCode.toString(),
                name: name,
                stockCategory: stockCategoryId?.toString() || "",
                unit: unitId?.toString() || "",
                unitOfMeasure: finalUnitOfMeasure,
                currentValue: parseFloat(rawValue) || 0,
              };

              console.log(`Processing product: ${productInfo.code} - ${productInfo.name}`);
              console.log(`Category mapping: "${rawCategory}" -> ID ${stockCategoryId}`);
              console.log(`Unit mapping: "${rawUnit}" -> ID ${unitId}`);
              console.log(`Unit of measure: "${finalUnitOfMeasure}"`);

              // Check if product already exists
              let product = await storage.getProductByCode(rawCode.toString());
              let isNewProduct = false;
              
              if (!product) {
                // Create new product
                product = await storage.upsertProductByCode(productInfo);
                created++;
                isNewProduct = true;
                console.log(`✓ New product created: ${product.code} - ${product.name}`);
              } else {
                // Update existing product with latest info
                await storage.updateProduct(product.id, {
                  name: productInfo.name,
                  stockCategory: productInfo.stockCategory,
                  unitOfMeasure: productInfo.unitOfMeasure,
                  currentValue: productInfo.currentValue
                });
                updated++;
                console.log(`✓ Existing product updated: ${product.code} - ${product.name}`);
              }
              
              // Ensure product is associated with the unit from CSV
              if (unitId) {
                try {
                  console.log(`Attempting to associate product ${product.id} (${product.code}) with unit ${unitId}`);
                  await storage.addProductToUnit(product.id, unitId, 0);
                  console.log(`✓ Product ${product.code} associated with unit ${unitId}`);
                } catch (unitError) {
                  // Log the actual error
                  console.log(`→ Error associating product ${product.code} with unit ${unitId}:`, unitError);
                }
              } else {
                console.log(`⚠ No unit ID found for product ${product.code}`);
              }

            } catch (productError) {
              console.error(`Erro processando produto ${productData.code || 'sem código'}:`, productError);
              errors.push({ data: productData, error: productError instanceof Error ? productError.message : 'Erro desconhecido' });
              detailedErrors.push(`Erro ao processar produto: ${productError instanceof Error ? productError.message : 'Erro desconhecido'}`);
            }
          }

          res.json({
            message: `Importação concluída: ${created} criados, ${updated} atualizados, ${errors.length} erros`,
            stats: { created, updated, errors: errors.length, total: products.length },
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
      const stockCountId = parseInt(req.params.id);
      
      if (isNaN(stockCountId)) {
        return res.status(400).json({ message: "Invalid stock count ID" });
      }
      
      // Generate random token for public access
      const crypto = await import('crypto');
      const publicToken = crypto.randomBytes(16).toString('hex');
      
      // Update stock count with public token and status
      await storage.updateStockCount(stockCountId, {
        status: 'started',
        publicToken
      });
      
      // Get stock count with responsible person
      const stockCount = await storage.getStockCount(stockCountId);
      
      // Generate public URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : `https://gestor.donjuarez.com.br`;
      const publicUrl = `${baseUrl}/contagem-publica/${publicToken}`;
      
      // Send WhatsApp message to responsible person
      if (stockCount?.responsible?.whatsapp) {
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
        
        const success = await sendWhatsAppMessage(stockCount.responsible.whatsapp, message);
        
        if (success) {
          console.log(`WhatsApp sent successfully to ${stockCount.responsible.whatsapp}`);
        } else {
          console.log(`Failed to send WhatsApp to ${stockCount.responsible.whatsapp}`);
        }
      }
      
      res.status(200).json({ 
        message: "Stock count started successfully", 
        publicUrl,
        publicToken 
      });
    } catch (error) {
      console.error("Error starting stock count:", error);
      res.status(500).json({ message: "Failed to start stock count" });
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

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
