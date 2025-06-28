import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/api/ws'
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send initial data
    sendInitialData(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server initialized on /api/ws');
}

async function sendInitialData(ws: any) {
  try {
    // Send current dashboard data
    const stats = await storage.getDashboardStats();
    const taps = await storage.getTaps();
    const recentPours = await storage.getRecentPourEvents(10);

    ws.send(JSON.stringify({
      type: 'initial_data',
      data: {
        stats,
        taps,
        recentPours,
      },
    }));
  } catch (error) {
    console.error('Error sending initial WebSocket data:', error);
  }
}

// Function to broadcast updates to all connected clients
export async function broadcastUpdate(type: string, data?: any) {
  if (!wss) return;

  try {
    let updateData = data;

    // If no specific data provided, fetch current state
    if (!updateData) {
      switch (type) {
        case 'taps_updated':
          updateData = await storage.getTaps();
          break;
        case 'pour_event':
          updateData = await storage.getRecentPourEvents(10);
          break;
        case 'stats_updated':
          updateData = await storage.getDashboardStats();
          break;
        default:
          updateData = {};
      }
    }

    const message = JSON.stringify({
      type,
      data: updateData,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });

    console.log(`WebSocket broadcast: ${type}`);
  } catch (error) {
    console.error('Error broadcasting WebSocket update:', error);
  }
}

// Periodic updates for dashboard stats
setInterval(async () => {
  try {
    await broadcastUpdate('stats_updated');
  } catch (error) {
    console.error('Error in periodic stats update:', error);
  }
}, 30000); // Update every 30 seconds
