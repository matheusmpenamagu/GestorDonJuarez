import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket, broadcastUpdate } from "./websocket";
import { storage } from "./storage";
// Removed Replit Auth for demo purposes
import { insertPourEventSchema, insertKegChangeEventSchema, insertTapSchema, insertPointOfSaleSchema, insertBeerStyleSchema, insertDeviceSchema } from "@shared/schema";
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

  // Simple health check endpoint for ESP32
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      timezone: "America/Sao_Paulo"
    });
  });
  
  // Flow meter webhook - receives pour data from ESP32
  app.post('/api/webhooks/pour', async (req, res) => {
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
        // Get current total consumed volume for this tap and capture snapshot data
        const currentTap = await storage.getTap(targetTapId);
        const currentTotalConsumed = currentTap?.currentVolumeUsedMl || 0;
        const newTotalConsumed = currentTotalConsumed + pourVolumeMl;
        
        // Validate and create the pour event data (snapshot information will be captured in storage)
        const pourEventData = insertPourEventSchema.parse({
          tapId: targetTapId,
          totalVolumeMl: pourVolumeMl, // Volume of this individual measurement
          pourVolumeMl: pourVolumeMl, // Same as totalVolumeMl for individual events
          datetime: pourDate,
        });

        const pourEvent = await storage.createPourEvent(pourEventData);

        // Update tap's current volume used (cumulative)
        await storage.updateTap(targetTapId, {
          currentVolumeUsedMl: newTotalConsumed
        });

        console.log(`Pour event created: Tap ${targetTapId}, ${pourVolumeMl}ml consumed at ${toSaoPauloTime(pourDate)} (Total: ${newTotalConsumed}ml)`);
        
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
  app.post('/api/webhooks/keg-change', async (req, res) => {
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

      // Get current tap info to record previous volume
      const tap = await storage.getTap(targetTapId);
      const previousVolumeMl = tap ? tap.kegCapacityMl! - tap.currentVolumeUsedMl! : null;

      // Convert datetime to proper Date object
      const changeDate = fromSaoPauloTime(datetime);
      
      // Validate the keg change event data
      const kegChangeData = insertKegChangeEventSchema.parse({
        tapId: targetTapId,
        previousVolumeMl,
        datetime: changeDate,
      });

      const kegChangeEvent = await storage.createKegChangeEvent(kegChangeData);

      // Reset tap's volume usage to 0 (new keg)
      await storage.updateTap(targetTapId, {
        currentVolumeUsedMl: 0
      });

      // Broadcast update via WebSocket
      await broadcastUpdate('keg_change', kegChangeEvent);
      
      console.log(`Keg change event created: Tap ${targetTapId} at ${toSaoPauloTime(changeDate)}`);
      
      res.json({ success: true, event: kegChangeEvent });
    } catch (error) {
      console.error("Error processing keg change webhook:", error);
      res.status(500).json({ message: "Error processing keg change event" });
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



  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
