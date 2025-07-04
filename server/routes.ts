import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket, broadcastUpdate } from "./websocket";
import { storage } from "./storage";
// Removed Replit Auth for demo purposes
import { insertPourEventSchema, insertKegChangeEventSchema, insertTapSchema, insertPointOfSaleSchema, insertBeerStyleSchema, insertDeviceSchema, insertUnitSchema, insertCo2RefillSchema } from "@shared/schema";
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
  // Assume the incoming date is already in São Paulo timezone
  return new Date(dateString);
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
        if (emp.employmentType !== 'Freelancer' || !emp.whatsapp) return false;
        
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
        startDate = fromSaoPauloTime(start_date as string);
      }
      if (end_date) {
        endDate = fromSaoPauloTime(end_date as string);
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
      const endDate = end_date 
        ? fromSaoPauloTime(end_date as string)
        : new Date();
      const startDate = start_date 
        ? fromSaoPauloTime(start_date as string)
        : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
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

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
