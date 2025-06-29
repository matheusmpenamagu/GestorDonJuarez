import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
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
  
  // Flow meter webhook - receives pour data
  app.post('/api/webhooks/pour', async (req, res) => {
    try {
      const { datetime, tap_id, total_volume_ml } = req.body;
      
      if (!datetime || !tap_id || total_volume_ml === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields: datetime, tap_id, total_volume_ml" 
        });
      }

      // Convert datetime to proper Date object
      const pourDate = new Date(datetime);
      
      // Validate the pour event data
      const pourEventData = insertPourEventSchema.parse({
        tapId: parseInt(tap_id),
        totalVolumeMl: parseInt(total_volume_ml),
        datetime: pourDate,
      });

      const pourEvent = await storage.createPourEvent(pourEventData);
      
      console.log(`Pour event created: Tap ${tap_id}, ${total_volume_ml}ml at ${toSaoPauloTime(pourDate)}`);
      
      res.json({ success: true, event: pourEvent });
    } catch (error) {
      console.error("Error processing pour webhook:", error);
      res.status(500).json({ message: "Error processing pour event" });
    }
  });

  // Keg change webhook - receives barrel change notifications
  app.post('/api/webhooks/keg-change', async (req, res) => {
    try {
      const { datetime, tap_id } = req.body;
      
      if (!datetime || !tap_id) {
        return res.status(400).json({ 
          message: "Missing required fields: datetime, tap_id" 
        });
      }

      // Get current tap info to record previous volume
      const tap = await storage.getTap(parseInt(tap_id));
      const previousVolumeMl = tap ? tap.kegCapacityMl! - tap.currentVolumeUsedMl! : null;

      // Convert datetime to proper Date object
      const changeDate = new Date(datetime);
      
      // Validate the keg change event data
      const kegChangeData = insertKegChangeEventSchema.parse({
        tapId: parseInt(tap_id),
        previousVolumeMl,
        datetime: changeDate,
      });

      const kegChangeEvent = await storage.createKegChangeEvent(kegChangeData);
      
      console.log(`Keg change event created: Tap ${tap_id} at ${toSaoPauloTime(changeDate)}`);
      
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

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
