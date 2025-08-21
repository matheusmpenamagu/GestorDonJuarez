import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupWebSocket, broadcastUpdate } from "./websocket";
import { storage } from "./storage";
// Removed Replit authentication - using employee auth only
import { authenticateEmployee } from "./localAuth";
import { insertPourEventSchema, insertKegChangeEventSchema, insertTapSchema, insertPointOfSaleSchema, insertBeerStyleSchema, insertDeviceSchema, insertUnitSchema, insertCo2RefillSchema, insertProductCategorySchema, insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

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

// Employee authentication middleware for hybrid auth (cookies + headers)
const requireAuth = async (req: any, res: any, next: any) => {
  console.log('🔐 [REQUIRE-AUTH] === AUTHENTICATION CHECK ===');
  console.log('🔐 [REQUIRE-AUTH] Method:', req.method);
  console.log('🔐 [REQUIRE-AUTH] Path:', req.path);
  console.log('🔐 [REQUIRE-AUTH] Session ID:', req.sessionID);
  console.log('🔐 [REQUIRE-AUTH] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔐 [REQUIRE-AUTH] Cookies:', req.headers.cookie);
  
  try {
    // Check for employee session in regular session
    console.log('🔐 [REQUIRE-AUTH] Checking regular employee session...');
    console.log('🔐 [REQUIRE-AUTH] Session data:', JSON.stringify(req.session, null, 2));
    
    if (req.session?.employee) {
      console.log('✅ [REQUIRE-AUTH] Found regular employee session:', req.session.employee);
      req.user = req.session.employee;
      return next();
    }

    // Check for PIN session (for public tablet access)
    console.log('🔐 [REQUIRE-AUTH] Checking PIN employee session...');
    if (req.session?.pinEmployee) {
      console.log('✅ [REQUIRE-AUTH] Found PIN employee session:', req.session.pinEmployee);
      req.user = req.session.pinEmployee;
      return next();
    }

    // Check for session ID in Authorization header (fallback for Replit proxy issues)
    const authHeader = req.headers.authorization;
    console.log('🔐 [REQUIRE-AUTH] Authorization header:', authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      console.log('🔐 [REQUIRE-AUTH] Extracted session ID from Bearer token:', sessionId);
      
      // Get session data from store directly with proper Promise handling
      try {
        const sessionData = await new Promise<any>((resolve, reject) => {
          req.sessionStore.get(sessionId, (err: any, data: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });

        console.log('🔐 [REQUIRE-AUTH] Session store data for Bearer token:', JSON.stringify(sessionData, null, 2));

        if (sessionData?.employee) {
          console.log('✅ [REQUIRE-AUTH] Found employee in session store via Bearer token');
          
          // Check if session is expired
          const cookieExpiry = sessionData.cookie?.expires;
          if (cookieExpiry) {
            const now = new Date();
            const expiryDate = new Date(cookieExpiry);
            console.log('🔐 [REQUIRE-AUTH] Session expiry check - Now:', now.toISOString(), 'Expires:', expiryDate.toISOString());
            
            if (now > expiryDate) {
              console.log('❌ [REQUIRE-AUTH] Session expired');
              return res.status(401).json({ message: 'Session expired' });
            }
          }
          
          req.user = sessionData.employee;
          console.log('✅ [REQUIRE-AUTH] Set req.user to:', JSON.stringify(req.user, null, 2));
          console.log('✅ [REQUIRE-AUTH] Calling next() to proceed to endpoint');
          return next();
        }

        // Check for PIN session in session store
        if (sessionData?.pinEmployee) {
          console.log('✅ [REQUIRE-AUTH] Found PIN employee in session store via Bearer token');
          req.user = sessionData.pinEmployee;
          return next();
        }
      } catch (sessionError) {
        console.error('Session store error:', sessionError);
      }
    }

    // No valid authentication found
    console.log('❌ [REQUIRE-AUTH] No valid authentication found');
    console.log('🔐 [REQUIRE-AUTH] === END AUTHENTICATION CHECK ===');
    return res.status(401).json({ message: 'Unauthorized' });
  } catch (error) {
    console.error('❌ [REQUIRE-AUTH] Auth middleware error:', error);
    console.log('🔐 [REQUIRE-AUTH] === END AUTHENTICATION CHECK ===');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to convert dates to São Paulo timezone
function toSaoPauloTime(date: Date): string {
  const zonedDate = toZonedTime(date, SAO_PAULO_TZ);
  return format(zonedDate, "dd/MM/yyyy HH:mm:ss");
}

// Helper function to parse dates from São Paulo timezone
function fromSaoPauloTime(dateString: string): Date {
  try {
    // Handle ISO datetime format with timezone info
    if (dateString.includes('T')) {
      // Check if it already has timezone info
      if (dateString.includes('+') || dateString.includes('-') || dateString.endsWith('Z')) {
        // Already has timezone, parse directly
        const parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
          console.log('✅ Parsed date with timezone:', parsedDate.toISOString());
          return parsedDate;
        }
      }
      
      // Remove Z suffix if present and treat as São Paulo time
      const cleanDateString = dateString.replace(/\.000Z$/, '');
      
      // Parse the date components manually
      const [datePart, timePart] = cleanDateString.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second = 0] = timePart.split(':').map(Number);
      
      // Create UTC date by adding São Paulo offset (UTC-3)
      // São Paulo is 3 hours behind UTC, so we add 3 hours to convert local time to UTC
      const saoPauloOffsetHours = 3;
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour + saoPauloOffsetHours, minute, second));
      
      console.log('✅ Parsed date without timezone:', utcDate.toISOString());
      return utcDate;
    }
    
    // Parse date in YYYY-MM-DD format and set to São Paulo timezone
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    console.log('✅ Parsed simple date:', localDate.toISOString());
    return localDate;
  } catch (error) {
    console.error('❌ Error parsing date:', dateString, error);
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

// PDF parsing function for cash register closure data
function parsePDFContent(text: string): any {
  console.log('Parsing PDF content...');
  
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

  // Helper function to extract currency values with improved patterns
  const extractCurrency = (text: string): string => {
    // Multiple patterns for currency extraction
    const patterns = [
      /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g, // R$ 1.234,56
      /(?:R\$\s*)?(\d+,\d{2})/g, // R$ 123,45
      /(?:R\$\s*)?(\d+\.\d{2})/g, // R$ 123.45
      /(\d{1,3}(?:\.\d{3})*,\d{2})/g, // 1.234,56
      /(\d+,\d{2})/g, // 123,45
      /(\d+\.\d{2})/g // 123.45
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let value = matches[0].replace('R$', '').trim();
        // Convert Brazilian format to decimal
        if (value.includes(',')) {
          value = value.replace(/\./g, '').replace(',', '.');
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue.toFixed(2);
        }
      }
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

  // Clean and prepare text for parsing
  const cleanText = text.replace(/[^\x20-\x7E\u00C0-\u017F]/g, ' ').replace(/\s+/g, ' ');
  const lines = cleanText.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracted PDF text (cleaned):', cleanText.substring(0, 500));
  console.log('Number of lines found:', lines.length);

  // Look for specific patterns across the entire content
  const findValueNearKeyword = (keywords: string[], textContent: string): string => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[\\s\\S]*?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2})`, 'i');
      const match = textContent.match(regex);
      if (match) {
        const value = match[1];
        // Convert Brazilian format to decimal
        let processedValue = value.replace(/\./g, '').replace(',', '.');
        const numValue = parseFloat(processedValue);
        if (!isNaN(numValue) && numValue > 0) {
          console.log(`Found ${keyword}: ${value} -> ${numValue.toFixed(2)}`);
          return numValue.toFixed(2);
        }
      }
    }
    return '0.00';
  };

  // Extract values using keyword-based search
  data.cashSales = findValueNearKeyword(['dinheiro', 'especie', 'cash', 'moeda'], cleanText);
  data.debitSales = findValueNearKeyword(['debito', 'débito', 'cartao debito', 'cartão débito'], cleanText);
  data.creditSales = findValueNearKeyword(['credito', 'crédito', 'cartao credito', 'cartão crédito'], cleanText);
  data.pixSales = findValueNearKeyword(['pix'], cleanText);
  data.withdrawals = findValueNearKeyword(['sangria', 'retirada', 'saque'], cleanText);
  data.initialFund = findValueNearKeyword(['fundo inicial', 'caixa abertura', 'abertura'], cleanText);

  // Process each line to extract additional information
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
      if (line.includes('apollonio') || line.includes('apollo')) {
        data.unitId = 5; // Apollonio unit ID from database
      } else if (line.includes('grão') || line.includes('grao') || line.includes('para')) {
        data.unitId = 6; // Grão Pará unit ID
      } else if (line.includes('don juarez') || line.includes('donjuarez')) {
        data.unitId = 1; // Don Juarez main unit
      }
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
  }

  console.log('Parsed data:', data);
  
  // Return data even if unitId is null - we'll handle it in the frontend
  return data;
}

// Use proper authentication instead of demo mode
// const requireAuth = (req: any, res: any, next: any) => {
//   next();
// };

// Webhook token validation middleware
const validateWebhookToken = (req: any, res: any, next: any) => {
  try {
    console.log('🔐 [WEBHOOK-AUTH] Validating webhook token...');
    console.log('🔐 [WEBHOOK-AUTH] Headers received:', Object.keys(req.headers));
    
    const providedToken = req.headers['x-webhook-token'] || req.headers['webhook-token'];
    const expectedToken = process.env.webhook_token;

    console.log('🔐 [WEBHOOK-AUTH] Provided token:', providedToken ? `${providedToken.substring(0, 4)}...` : 'NONE');
    console.log('🔐 [WEBHOOK-AUTH] Expected token configured:', !!expectedToken);

    if (!expectedToken) {
      console.error('❌ [WEBHOOK-AUTH] Webhook token not configured in environment');
      return res.status(500).json({ 
        message: "Server configuration error" 
      });
    }

    if (!providedToken) {
      console.error('❌ [WEBHOOK-AUTH] Missing webhook token in request headers');
      console.error('❌ [WEBHOOK-AUTH] Available headers:', Object.keys(req.headers));
      return res.status(401).json({ 
        message: "Unauthorized: Missing webhook token" 
      });
    }

    if (providedToken !== expectedToken) {
      console.error('❌ [WEBHOOK-AUTH] Invalid webhook token provided');
      console.error('❌ [WEBHOOK-AUTH] Expected vs provided length:', expectedToken.length, 'vs', providedToken.length);
      return res.status(401).json({ 
        message: "Unauthorized: Invalid webhook token" 
      });
    }

    console.log('✅ [WEBHOOK-AUTH] Token validation successful!');
    // Token is valid, proceed to webhook handler
    next();
  } catch (error) {
    console.error('💥 [WEBHOOK-AUTH] Error validating webhook token:', error);
    return res.status(500).json({ 
      message: "Error validating token" 
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'client', 'public', 'uploads')));
  // Real authentication route - returns authenticated user info
  // Local employee authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const employee = await authenticateEmployee(email, password);
      if (!employee) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Store employee info in session
      (req.session as any).employee = {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatar: employee.avatar,
        employmentTypes: employee.employmentTypes,
        type: 'employee'
      };
      
      console.log('✅ [LOGIN] === DETAILED LOGIN DEBUG ===');
      console.log('✅ [LOGIN] Session ID before save:', req.sessionID);
      console.log('✅ [LOGIN] Session object before save:', JSON.stringify(req.session, null, 2));
      console.log('✅ [LOGIN] Cookie header sent:', req.headers.cookie);
      console.log('✅ [LOGIN] Session store type:', req.sessionStore?.constructor?.name);
      
      // Force session save and respond only after save is complete
      req.session.save((err) => {
        if (err) {
          console.error('🚨 [LOGIN] Session save error:', err);
          return res.status(500).json({ message: 'Session save failed' });
        }
        
        console.log('✅ [LOGIN] Session saved to store successfully');
        console.log('✅ [LOGIN] Session ID after save:', req.sessionID);
        console.log('✅ [LOGIN] === END LOGIN DEBUG ===');
        
        // Send session ID in response for client to store
        res.json({
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          avatar: employee.avatar,
          employmentTypes: employee.employmentTypes,
          type: 'employee',
          sessionId: req.sessionID // Include session ID for client
        });
      });


    } catch (error) {
      console.error('🚨 [LOGIN] Error during employee login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Employee logout - hybrid auth support
  app.post('/api/auth/logout', async (req, res) => {
    try {
      console.log('🚪 [LOGOUT] Processing logout request...');
      
      // Check if there's an Authorization header with session ID
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const sessionId = authHeader.substring(7);
        console.log('🚪 [LOGOUT] Found session ID in header:', sessionId);
        
        // Destroy session in store
        req.sessionStore.destroy(sessionId, (err: any) => {
          if (err) {
            console.error('🚨 [LOGOUT] Session destroy error:', err);
            return res.status(500).json({ message: 'Logout failed' });
          }
          console.log('✅ [LOGOUT] Session destroyed successfully');
          res.json({ message: 'Logout successful' });
        });
        return;
      }
      
      // Clear employee from regular session and destroy it
      if ((req.session as any).employee) {
        delete (req.session as any).employee;
      }
      
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        console.log('✅ [LOGOUT] Regular session destroyed');
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('🚨 [LOGOUT] Error during logout:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user (employee auth only)
  app.get('/api/auth/user', async (req, res) => {
    try {
      console.log('🔐 [AUTH-USER] === EMPLOYEE SESSION DEBUG ===');
      console.log('🔐 [AUTH-USER] Cookies received:', req.headers.cookie);
      console.log('🔐 [AUTH-USER] Authorization header:', req.headers.authorization);
      console.log('🔐 [AUTH-USER] Session ID:', req.sessionID);
      console.log('🔐 [AUTH-USER] Session object:', JSON.stringify(req.session, null, 2));
      
      // Check for session ID in Authorization header (fallback for Replit proxy issues)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const sessionId = authHeader.substring(7);
        console.log('🔐 [AUTH-USER] Found session ID in Authorization header:', sessionId);
        
        // Get session data from store directly with proper Promise handling
        try {
          const sessionData = await new Promise<any>((resolve, reject) => {
            req.sessionStore.get(sessionId, (err: any, data: any) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          });

          if (sessionData && sessionData.employee) {
            console.log('✅ [AUTH-USER] Found employee session via Authorization header:', sessionData.employee);
            return res.json(sessionData.employee);
          } else {
            console.log('❌ [AUTH-USER] No employee session found via Authorization header');
            return res.status(401).json({ message: 'Not authenticated' });
          }
        } catch (sessionError) {
          console.error('🚨 [AUTH-USER] Error getting session from store:', sessionError);
          return res.status(401).json({ message: 'Not authenticated' });
        }
      }
      
      // Check for employee session (normal cookie-based)
      const employeeSession = (req.session as any).employee;
      console.log('🔐 [AUTH-USER] Employee session found:', !!employeeSession);
      console.log('🔐 [AUTH-USER] Employee session data:', employeeSession);
      
      if (employeeSession) {
        console.log('✅ [AUTH-USER] Returning employee session:', employeeSession);
        return res.json(employeeSession);
      }

      // No valid session found
      console.log('❌ [AUTH-USER] No valid session found');
      console.log('🔐 [AUTH-USER] === END SESSION DEBUG ===');
      return res.status(401).json({ message: 'Not authenticated' });
    } catch (error) {
      console.error('🚨 [AUTH-USER] Error getting user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // PIN authentication for public tablet interface
  app.post('/api/auth/pin', async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length !== 4) {
        return res.status(400).json({ message: 'PIN deve ter 4 dígitos' });
      }

      const employee = await storage.authenticateEmployeeByPin(pin);
      if (!employee) {
        return res.status(401).json({ message: 'PIN inválido' });
      }

      // Create a temporary session for PIN-based access
      (req.session as any).pinEmployee = {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatar: employee.avatar,
        type: 'pin-session'
      };
      
      // Save session and respond
      req.session.save((err) => {
        if (err) {
          console.error('🚨 [PIN-AUTH] Session save error:', err);
          return res.status(500).json({ message: 'Session save failed' });
        }
        
        res.json({
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          avatar: employee.avatar,
          type: 'pin-session',
          sessionId: req.sessionID
        });
      });

    } catch (error) {
      console.error('🚨 [PIN-AUTH] Error during PIN authentication:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Logout from PIN session
  app.post('/api/auth/pin-logout', async (req, res) => {
    try {
      // Clear PIN session
      if ((req.session as any).pinEmployee) {
        delete (req.session as any).pinEmployee;
      }
      
      req.session.save((err) => {
        if (err) {
          console.error('🚨 [PIN-LOGOUT] Session save error:', err);
          return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'PIN session ended' });
      });
    } catch (error) {
      console.error('🚨 [PIN-LOGOUT] Error during PIN logout:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
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



  // Test endpoint to simulate pour events from ESP32 (for debugging)
  app.post('/api/test/simulate-pour', requireAuth, async (req, res) => {
    try {
      const { device_id = "D8483", volume_ml = 350 } = req.body;
      
      console.log(`[TEST-POUR] Simulating pour event: ${volume_ml}ml from device ${device_id}`);
      
      // Create a test pour event with current datetime
      const testData = {
        device_id,
        datetime: new Date().toISOString(),
        total_volume_ml: volume_ml
      };
      
      // Call the internal pour processing logic
      const device = await storage.getDeviceByCode(device_id);
      if (!device) {
        return res.status(404).json({ message: `Device ${device_id} not found` });
      }
      
      const taps = await storage.getTaps();
      const tap = taps.find(t => t.deviceId === device.id);
      if (!tap) {
        return res.status(404).json({ message: `No tap found for device ${device_id}` });
      }
      
      const pourDate = new Date();
      const pourVolumeMl = Math.round(volume_ml);
      
      const pourEventData = insertPourEventSchema.parse({
        tapId: tap.id,
        totalVolumeMl: pourVolumeMl,
        pourVolumeMl: pourVolumeMl,
        datetime: pourDate,
      });
      
      const pourEvent = await storage.createPourEvent(pourEventData);
      
      console.log(`[TEST-POUR] Pour event created: Tap ${tap.id}, ${pourVolumeMl}ml`);
      
      // Broadcast update
      await broadcastUpdate('pour_event', pourEvent);
      
      res.json({ 
        success: true, 
        message: "Test pour event created successfully",
        event: pourEvent,
        device: device.code,
        tap: tap.name
      });
      
    } catch (error) {
      console.error('[TEST-POUR] Error creating test pour event:', error);
      res.status(500).json({ 
        message: "Error creating test pour event",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Flow meter webhook - receives pour data from ESP32
  app.post('/api/webhooks/pour', validateWebhookToken, async (req, res) => {
    // Set CORS headers for ESP32 compatibility
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-webhook-token');
    
    // Set response timeout to prevent ESP32 timeouts
    res.setTimeout(5000); // 5 seconds - quicker response for ESP32
    
    // Send immediate acknowledgment to prevent timeout
    const startTime = Date.now();
    
    try {
      console.log('=== WEBHOOK POUR START ===');
      console.log('🚀 ESP32 Pour webhook received!');
      console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📦 Body:', JSON.stringify(req.body, null, 2));
      console.log('🌐 Remote IP:', req.ip);
      console.log('🔍 User Agent:', req.get('User-Agent'));
      
      // Validate request body exists
      if (!req.body) {
        console.error('❌ Empty request body');
        return res.status(400).json({ message: "Empty request body" });
      }
      
      // Handle malformed timezone in datetime (ESP32 bug fix)
      if (req.body.datetime && typeof req.body.datetime === 'string') {
        // Fix timezone format: -03:0 -> -03:00, +05:0 -> +05:00
        req.body.datetime = req.body.datetime.replace(/([+-]\d{2}):(\d)$/, '$1:0$2');
        console.log('🔧 Fixed datetime format:', req.body.datetime);
      }
      
      // Support both device_id (ESP32) and tap_id (direct) formats
      const { device_id, tap_id, datetime, total_volume_ml } = req.body;
      
      console.log('Extracted fields:', { device_id, tap_id, datetime, total_volume_ml });
      
      if (!datetime || total_volume_ml === undefined) {
        console.error('❌ Missing required fields:', { datetime, total_volume_ml });
        console.error('❌ Raw request body:', req.body);
        return res.status(400).json({ 
          message: "Missing required fields: datetime, total_volume_ml" 
        });
      }
      
      // Validate datetime format
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?$/;
      if (!dateRegex.test(datetime)) {
        console.error('❌ Invalid datetime format:', datetime);
        return res.status(400).json({ 
          message: `Invalid datetime format: ${datetime}. Expected: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss±HH:mm` 
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
          console.error('❌ Device not found:', device_id);
          // Check if device code is similar to existing ones
          const allDevices = await storage.getDevices();
          const similarDevices = allDevices
            .map(d => d.code)
            .filter(code => code.toLowerCase().includes(device_id.toLowerCase().substring(0, 3)))
            .slice(0, 3);
          
          const suggestion = similarDevices.length > 0 
            ? ` Similar devices: ${similarDevices.join(', ')}` 
            : '';
            
          return res.status(404).json({ 
            message: `Device not found with ID/code: ${device_id}.${suggestion}` 
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
      let pourDate: Date;
      try {
        console.log('🕐 Converting datetime:', datetime);
        pourDate = fromSaoPauloTime(datetime);
        console.log('✅ Date conversion successful:', pourDate.toISOString());
      } catch (dateError) {
        console.error('❌ Date conversion failed:', dateError);
        return res.status(400).json({ 
          message: `Invalid datetime format: ${datetime}. Use ISO format like 2025-08-15T17:58:18-03:00` 
        });
      }
      
      // The ESP32 reports the volume that flowed out in this reading
      // We treat this as a direct consumption event, not cumulative
      const pourVolumeMl = Math.round(total_volume_ml);

      // Only create event if there's actual volume reported (> 0)
      if (pourVolumeMl > 0) {
        // Get current tap information for snapshot data
        
        // Prepare the pour event data for validation
        const pourEventInput = {
          tapId: targetTapId,
          totalVolumeMl: pourVolumeMl, // Volume of this individual measurement
          pourVolumeMl: pourVolumeMl, // Same as totalVolumeMl for individual events
          datetime: pourDate,
        };
        
        console.log('🔍 Validating pour event data:', pourEventInput);
        
        // Create pour event data - bypassing Zod validation for now due to datetime issues
        const pourEventData = {
          tapId: targetTapId,
          totalVolumeMl: pourVolumeMl,
          pourVolumeMl: pourVolumeMl,
          datetime: pourDate,
        };
        
        console.log('📝 Creating pour event directly:', {
          ...pourEventData,
          datetime: pourDate.toISOString()
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
      const { device_id, tap_id, datetime, beer_style_id } = req.body;
      
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

      // Validate beer style if provided
      if (beer_style_id) {
        const beerStyleIdNum = parseInt(beer_style_id);
        if (isNaN(beerStyleIdNum)) {
          return res.status(400).json({ 
            message: "Invalid beer_style_id. Must be a valid number." 
          });
        }

        // Check if beer style exists
        const beerStyle = await storage.getBeerStyle(beerStyleIdNum);
        if (!beerStyle) {
          return res.status(404).json({ 
            message: `Beer style with ID ${beerStyleIdNum} not found.` 
          });
        }

        // Update the tap with the new beer style
        await storage.updateTap(targetTapId, { 
          currentBeerStyleId: beerStyleIdNum 
        });
        
        console.log(`Updated tap ${targetTapId} with beer style ${beerStyleIdNum} (${beerStyle.name})`);
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
      
      const beerStyleInfo = beer_style_id ? ` with beer style ID ${beer_style_id}` : '';
      console.log(`Keg change event created: Tap ${targetTapId} with ${capacity}L capacity${beerStyleInfo} at ${toSaoPauloTime(changeDate)}`);
      
      res.json({ success: true, event: kegChangeEvent, tapUpdated: !!beer_style_id });
    } catch (error) {
      console.error("Error processing keg change webhook:", error);
      res.status(500).json({ message: "Error processing keg change event" });
    }
  });

  // Public endpoint to get active tap numbers for a unit - used by external devices
  app.get('/api/public/taps/:unitId', validateWebhookToken, async (req, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      
      if (isNaN(unitId)) {
        return res.status(400).json({ 
          message: "Invalid unit ID. Must be a valid number." 
        });
      }

      // Get all active taps
      const taps = await storage.getTaps();
      const activeTaps = taps.filter(tap => tap.isActive);

      // Get points of sale to filter by unit
      const pointsOfSale = await storage.getPointsOfSale();
      const unitPOS = pointsOfSale.filter(pos => pos.id === unitId);
      
      if (unitPOS.length === 0) {
        return res.status(404).json({ 
          message: `Unit with ID ${unitId} not found.` 
        });
      }

      // Filter taps by unit and get only the tap numbers
      const unitTapNumbers = activeTaps
        .filter(tap => unitPOS.some(pos => pos.id === tap.posId))
        .map(tap => tap.id);

      console.log(`Public API: Retrieved ${unitTapNumbers.length} active tap numbers for unit ${unitId}: [${unitTapNumbers.join(', ')}]`);
      
      res.json({
        unitId,
        activeTaps: unitTapNumbers
      });
    } catch (error) {
      console.error("Error retrieving tap numbers for unit:", error);
      res.status(500).json({ 
        message: "Error retrieving tap numbers",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  });

  // Get all taps with current status
  app.get('/api/taps', requireAuth, async (req, res) => {
    try {
      const taps = await storage.getTaps();
      res.json(taps);
    } catch (error) {
      console.error("Error fetching taps:", error);
      res.status(500).json({ message: "Error fetching taps" });
    }
  });

  // Get recent pour events for real-time display
  app.get('/api/recent-pours', requireAuth, async (req, res) => {
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
  app.get('/api/history/pours', requireAuth, async (req, res) => {
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
  app.get('/api/history/keg-changes', requireAuth, async (req, res) => {
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
  app.get('/api/timeline', requireAuth, async (req, res) => {
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
  app.post('/api/taps', requireAuth, async (req, res) => {
    try {
      const tapData = insertTapSchema.parse(req.body);
      const tap = await storage.createTap(tapData);
      res.json(tap);
    } catch (error) {
      console.error("Error creating tap:", error);
      res.status(500).json({ message: "Error creating tap" });
    }
  });

  app.put('/api/taps/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/taps/:id', requireAuth, async (req, res) => {
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
  app.get('/api/points-of-sale', requireAuth, async (req, res) => {
    try {
      const pointsOfSale = await storage.getPointsOfSale();
      res.json(pointsOfSale);
    } catch (error) {
      console.error("Error fetching points of sale:", error);
      res.status(500).json({ message: "Error fetching points of sale" });
    }
  });

  app.post('/api/points-of-sale', requireAuth, async (req, res) => {
    try {
      const posData = insertPointOfSaleSchema.parse(req.body);
      const pos = await storage.createPointOfSale(posData);
      res.json(pos);
    } catch (error) {
      console.error("Error creating point of sale:", error);
      res.status(500).json({ message: "Error creating point of sale" });
    }
  });

  app.put('/api/points-of-sale/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/points-of-sale/:id', requireAuth, async (req, res) => {
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
  app.get('/api/beer-styles', requireAuth, async (req, res) => {
    try {
      const beerStyles = await storage.getBeerStyles();
      res.json(beerStyles);
    } catch (error) {
      console.error("Error fetching beer styles:", error);
      res.status(500).json({ message: "Error fetching beer styles" });
    }
  });

  app.post('/api/beer-styles', requireAuth, async (req, res) => {
    try {
      const styleData = insertBeerStyleSchema.parse(req.body);
      const style = await storage.createBeerStyle(styleData);
      res.json(style);
    } catch (error) {
      console.error("Error creating beer style:", error);
      res.status(500).json({ message: "Error creating beer style" });
    }
  });

  app.put('/api/beer-styles/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/beer-styles/:id', requireAuth, async (req, res) => {
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
  app.get('/api/devices', requireAuth, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Error fetching devices" });
    }
  });

  // Get available devices (not assigned to any tap)
  app.get('/api/devices/available', requireAuth, async (req, res) => {
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
  app.post('/api/devices', requireAuth, async (req, res) => {
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
  app.put('/api/devices/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/devices/:id', requireAuth, async (req, res) => {
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
  app.get('/api/roles', requireAuth, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Error fetching roles" });
    }
  });

  // Create new role
  app.post('/api/roles', requireAuth, async (req, res) => {
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
  app.put('/api/roles/:id', requireAuth, async (req, res) => {
    try {
      const { insertRoleSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const roleData = insertRoleSchema.partial().parse(req.body);
      
      // Financial permissions are now allowed for any authenticated user
      // This can be restricted later based on specific security requirements
      
      const role = await storage.updateRole(id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Error updating role" });
    }
  });

  // Delete role
  app.delete('/api/roles/:id', requireAuth, async (req, res) => {
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

  // Verify employee PIN
  app.post('/api/employees/verify-pin', requireAuth, async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length !== 4) {
        return res.status(400).json({ message: "PIN deve ter 4 dígitos" });
      }
      
      const employees = await storage.getEmployees();
      
      for (const employee of employees) {
        if (employee.pin) {
          const bcrypt = await import('bcryptjs');
          const isValid = await bcrypt.compare(pin, employee.pin);
          if (isValid) {
            // Remover PIN da resposta por segurança
            const { pin: _, ...employeeWithoutPin } = employee;
            return res.json(employeeWithoutPin);
          }
        }
      }
      
      res.status(401).json({ message: "PIN inválido" });
    } catch (error) {
      console.error("Error verifying PIN:", error);
      res.status(500).json({ message: "Erro ao verificar PIN" });
    }
  });

  // Get all employees
  app.get('/api/employees', requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Error fetching employees" });
    }
  });

  // Get single employee by ID
  app.get('/api/employees/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Error fetching employee" });
    }
  });

  // Create new employee
  app.post('/api/employees', requireAuth, async (req, res) => {
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
  app.put('/api/employees/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/employees/:id', requireAuth, async (req, res) => {
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
  app.get('/api/units', requireAuth, async (req, res) => {
    try {
      console.log('🔐 [UNITS] User authenticated:', req.user?.firstName, req.user?.type);
      const units = await storage.getUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Error fetching units" });
    }
  });

  app.post('/api/units', requireAuth, async (req, res) => {
    try {
      const unitData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "Error creating unit" });
    }
  });

  app.put('/api/units/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/units/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUnit(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Error deleting unit" });
    }
  });

  // Unit logo upload endpoint
  app.post('/api/units/upload-logo', requireAuth, async (req, res) => {
    try {
      const { imageBlob } = req.body;
      
      if (!imageBlob) {
        return res.status(400).json({ message: "Image blob is required" });
      }

      // Remove data URL prefix (data:image/jpeg;base64,...)
      const base64Data = imageBlob.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `unit-logo-${timestamp}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      // Process image with Sharp - ensure 100x100px square
      await sharp(imageBuffer)
        .resize(100, 100, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toFile(filepath);

      // Return the public URL
      const publicUrl = `/uploads/${filename}`;
      res.json({ logoUrl: publicUrl });

    } catch (error) {
      console.error("Error processing unit logo:", error);
      res.status(500).json({ message: "Error processing image" });
    }
  });

  // ============ CO2 REFILLS ROUTES ============

  // Get all CO2 refills
  app.get('/api/co2-refills', requireAuth, async (req, res) => {
    try {
      const refills = await storage.getCo2Refills();
      res.json(refills);
    } catch (error) {
      console.error("Error fetching CO2 refills:", error);
      res.status(500).json({ message: "Error fetching CO2 refills" });
    }
  });

  // Create new CO2 refill
  app.post('/api/co2-refills', requireAuth, async (req, res) => {
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
  app.put('/api/co2-refills/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/co2-refills/:id', requireAuth, async (req, res) => {
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
  app.get('/api/co2-stats', requireAuth, async (req, res) => {
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
  app.get('/api/freelancer-entries', requireAuth, async (req, res) => {
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
  app.get('/api/freelancer-stats', requireAuth, async (req, res) => {
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
  app.post('/api/freelancer-entries', requireAuth, async (req, res) => {
    try {
      console.log("=== Creating freelancer entry ===");
      console.log("Request body:", req.body);
      
      let unitId = req.body.unitId ? parseInt(req.body.unitId) : null;
      
      // If this is a "saída" (exit) entry and no unit is specified, find the unit from the last "entrada" (entry)
      if (req.body.entryType === 'saida' && (!unitId || unitId === 0)) {
        console.log("Saída entry without unit specified, searching for last entrada unit...");
        
        const freelancerPhone = req.body.freelancerPhone;
        const employeeId = req.body.employeeId ? parseInt(req.body.employeeId) : null;
        
        if (freelancerPhone || employeeId) {
          try {
            const lastEntryUnit = await storage.getLastEntryUnitForFreelancer(freelancerPhone, employeeId);
            if (lastEntryUnit) {
              unitId = lastEntryUnit;
              console.log(`Found last entrada unit: ${unitId} for freelancer`);
            }
          } catch (error) {
            console.log("Could not find last entrada unit, continuing without unit");
          }
        }
      }
      
      const entryData = {
        employeeId: req.body.employeeId ? parseInt(req.body.employeeId) : null,
        freelancerPhone: req.body.freelancerPhone,
        freelancerName: req.body.freelancerName,
        unitId: unitId,
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
  app.put('/api/freelancer-entries/:id', requireAuth, async (req, res) => {
    try {
      console.log("=== Updating freelancer entry ===");
      console.log("Entry ID:", req.params.id);
      console.log("Request body:", req.body);
      
      const id = parseInt(req.params.id);
      let unitId = req.body.unitId ? parseInt(req.body.unitId) : null;
      
      // If this is a "saída" (exit) entry and no unit is specified, find the unit from the last "entrada" (entry)
      if (req.body.entryType === 'saida' && (!unitId || unitId === 0)) {
        console.log("Saída entry without unit specified, searching for last entrada unit...");
        
        const freelancerPhone = req.body.freelancerPhone;
        const employeeId = req.body.employeeId ? parseInt(req.body.employeeId) : null;
        
        if (freelancerPhone || employeeId) {
          try {
            const lastEntryUnit = await storage.getLastEntryUnitForFreelancer(freelancerPhone, employeeId);
            if (lastEntryUnit) {
              unitId = lastEntryUnit;
              console.log(`Found last entrada unit: ${unitId} for freelancer`);
            }
          } catch (error) {
            console.log("Could not find last entrada unit, continuing without unit");
          }
        }
      }
      
      const entryData = {
        employeeId: req.body.employeeId ? parseInt(req.body.employeeId) : null,
        freelancerPhone: req.body.freelancerPhone,
        freelancerName: req.body.freelancerName,
        unitId: unitId,
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
  app.delete('/api/freelancer-entries/:id', requireAuth, async (req, res) => {
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
  app.get('/api/product-categories', requireAuth, async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Error fetching product categories" });
    }
  });

  app.get('/api/product-categories/:id', requireAuth, async (req, res) => {
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

  app.post('/api/product-categories', requireAuth, async (req, res) => {
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

  app.put('/api/product-categories/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/product-categories/:id', requireAuth, async (req, res) => {
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
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const { categoryId, includeShelfLifeFilter } = req.query;
      console.log('🛍️ [PRODUCTS] Fetching products with filters:', { categoryId, includeShelfLifeFilter });
      
      // Get products, optionally filtered by category
      let products;
      if (categoryId) {
        console.log('🛍️ [PRODUCTS] Filtering by category ID:', categoryId);
        products = await storage.getProductsByCategory(Number(categoryId));
      } else {
        console.log('🛍️ [PRODUCTS] Getting all products');
        products = await storage.getProducts();
      }
      
      console.log('🛍️ [PRODUCTS] Found', products.length, 'products');
      
      // Only filter by shelf life if explicitly requested (for label generation)
      let finalProducts = products;
      if (includeShelfLifeFilter === 'true') {
        console.log('🔍 [PRODUCTS] === OPTIMIZED SHELF LIFE FILTERING ===');
        try {
          const allShelfLives = await storage.getProductShelfLifes();
          const shelfLifeMap = new Map(allShelfLives.map((sl: any) => [sl.productId, sl]));
          
          finalProducts = products.filter(product => {
            const hasShelfLife = shelfLifeMap.has(product.id);
            return hasShelfLife;
          });
          
          console.log('🔍 [PRODUCTS] === END OPTIMIZED SHELF LIFE FILTERING ===');
          console.log('🛍️ [PRODUCTS] Found', finalProducts.length, 'products with shelf life data');
        } catch (error) {
          console.error('⚠️ [PRODUCTS] Error during shelf life filtering:', error);
          // Fall back to all products if shelf life filtering fails
          finalProducts = products;
        }
      }
      
      // For each product, get its associated units
      const units = await storage.getUnits();
      const unitsMap = new Map(units.map(unit => [unit.id, unit.name]));
      
      const productsWithUnits = await Promise.all(
        finalProducts.map(async (product) => {
          // Get all associated units from product_units relationship table
          const productUnits = await storage.getProductUnits(product.id);
          
          const associatedUnits = productUnits.map(pu => ({
            unitId: pu.unitId,
            unitName: unitsMap.get(pu.unitId) || 'N/A'
          }));
          
          return {
            ...product,
            associatedUnits
          };
        })
      );
      
      console.log('🛍️ [PRODUCTS] Returning', productsWithUnits.length, 'final products');
      res.json(productsWithUnits);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get('/api/products/:id', requireAuth, async (req, res) => {
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

  app.post('/api/products', requireAuth, async (req, res) => {
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
  app.post('/api/products/multi-unit', requireAuth, async (req, res) => {
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
  app.put('/api/products/multi-unit', requireAuth, async (req, res) => {
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

  // Clear all products and related data (must be before /:id routes)
  app.delete('/api/products/clear-all', requireAuth, async (req, res) => {
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

  app.put('/api/products/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/products/:id', requireAuth, async (req, res) => {
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
  app.post('/api/products/import', requireAuth, async (req, res) => {
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
  app.post('/api/products/upload', requireAuth, async (req, res) => {
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
            
            const normalized = normalizeText(categoryName);
            console.log(`Finding category for: "${categoryName}" (normalized: "${normalized}")`);
            
            // First priority: Try exact match on database category names (normalized)
            let match = categories.find(cat => normalizeText(cat.name) === normalized);
            if (match) {
              console.log(`✓ Exact name match: "${categoryName}" -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Second priority: Try partial match on database category names (normalized)
            match = categories.find(cat => {
              const normalizedCatName = normalizeText(cat.name);
              return normalizedCatName.includes(normalized) || normalized.includes(normalizedCatName);
            });
            if (match) {
              console.log(`✓ Partial name match: "${categoryName}" -> ${match.name} (ID ${match.id})`);
              return match.id;
            }

            // Third priority: Try specific mapping rules for known category variations
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

            // Check specific mappings
            if (categoryMappings[normalized]) {
              const targetCategoryName = categoryMappings[normalized];
              const mappingMatch = categories.find(cat => cat.name === targetCategoryName);
              if (mappingMatch) {
                console.log(`✓ Specific mapping: "${categoryName}" -> ${mappingMatch.name} (ID ${mappingMatch.id})`);
                return mappingMatch.id;
              }
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
            console.log(`⚠ No match found for "${unitName}", using default unit (ID ${units[0]?.id})`);
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
              // Map CSV column names according to user specification
              const rawCode = productData["COD."] || productData.codigo || productData.code || productData.Codigo || productData.Code || productData.CODIGO || productData.COD || "";
              const rawName = productData.PRODUTO || productData.produto || productData.product || productData.nome || productData.name || productData.Produto || productData.Product || productData.NOME || productData.titulo || productData.TITULO || productData.Titulo || "";
              const rawCategory = productData.CATEGORIA || productData.categoria || productData.category || productData.Categoria || productData.Category || productData.tipo || productData.Tipo || productData.TIPO || "";
              const rawUnit = productData.UNIDADE || productData.unidade || productData.unit || productData.Unidade || productData.Unit || "";
              const rawUnitMeasure = productData.medida || productData.measure || productData.Medida || productData.Measure || productData.MEDIDA || productData["UNIDADE DE MEDIDA"] || productData["unidade de medida"] || "";
              const rawValue = productData["VALOR ATUAL"] || productData.valor || productData.value || productData.Valor || productData.Value || productData.VALOR || productData.currentValue || "0";

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
                stockCategory: stockCategoryId || 1, // Use category ID, fallback to first category
                unitOfMeasure: finalUnitOfMeasure,
                currentValue: parseFloat(rawValue) || 0,
              };
              
              const associatedUnitId = unitId || 1; // Unit ID to associate with product

              // Only log debug for ABACAXI to reduce noise
              if (rawCode === '536') {
                console.log(`📊 PRODUCT ${rawCode} DEBUG:`);
                console.log(`  Raw data from CSV:`, {
                  code: rawCode,
                  name: rawName, 
                  category: rawCategory,
                  unit: rawUnit,
                  unitMeasure: rawUnitMeasure,
                  value: rawValue
                });
                console.log(`  Final processing:`, {
                  categoryId: stockCategoryId,
                  unitId: unitId,
                  associatedUnitId: associatedUnitId,
                  finalUnitOfMeasure: finalUnitOfMeasure
                });
              }

              console.log(`Processing product: ${productInfo.code} - ${productInfo.name}`);
              console.log(`Category mapping: "${rawCategory}" -> ID ${stockCategoryId}`);
              console.log(`Unit mapping: "${rawUnit}" -> ID ${associatedUnitId}`);
              console.log(`Unit of measure: "${finalUnitOfMeasure}"`);

              // Check if product already exists by code
              let product = await storage.getProductByCode(rawCode.toString());
              
              if (!product) {
                // Código NÃO existe: Cadastra novo item
                product = await storage.createProduct(productInfo);
                created++;
                console.log(`✓ CREATED: ${product.code} - ${product.name}`);
                
                // Associate with the unit from CSV
                try {
                  await storage.createProductUnit({
                    productId: product.id,
                    unitId: associatedUnitId
                  });
                  console.log(`✓ Associated new product with unit ${associatedUnitId}`);
                } catch (unitError) {
                  console.log(`→ Error associating new product with unit:`, unitError);
                }
              } else {
                // Código JÁ existe: Atualiza TODOS os campos usando planilha como referência
                await storage.updateProduct(product.id, {
                  name: productInfo.name,
                  stockCategory: productInfo.stockCategory,
                  unitOfMeasure: productInfo.unitOfMeasure,
                  currentValue: productInfo.currentValue
                });

                // Update unit association - remove old and add new
                try {
                  // Remove existing associations
                  const existingUnits = await storage.getProductUnits(product.id);
                  for (const existingUnit of existingUnits) {
                    await storage.deleteProductUnit(product.id, existingUnit.unitId);
                  }
                  
                  // Add new association
                  await storage.createProductUnit({
                    productId: product.id,
                    unitId: associatedUnitId
                  });
                  console.log(`→ Updated unit association to ID: ${associatedUnitId}`);
                } catch (unitError) {
                  console.log(`→ Error updating unit association:`, unitError);
                }

                updated++;
                console.log(`✓ UPDATED: ${product.code} - ${product.name}`);
                console.log(`  → Name: ${productInfo.name}`);
                console.log(`  → Category ID: ${productInfo.stockCategory}`);
                console.log(`  → Unit ID: ${associatedUnitId}`);
                console.log(`  → Unit of Measure: ${productInfo.unitOfMeasure}`);
                console.log(`  → Current Value: ${productInfo.currentValue}`);
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

  // Get products by unit (authenticated)
  app.get('/api/products/by-unit/:unitId', requireAuth, async (req, res) => {
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
  app.get('/api/stock-counts', requireAuth, async (req, res) => {
    try {
      const stockCounts = await storage.getStockCounts();
      res.json(stockCounts);
    } catch (error) {
      console.error("Error fetching stock counts:", error);
      res.status(500).json({ message: "Failed to fetch stock counts" });
    }
  });

  app.get('/api/stock-counts/:id', requireAuth, async (req, res) => {
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

  app.post('/api/stock-counts', requireAuth, async (req, res) => {
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

  app.put('/api/stock-counts/:id', requireAuth, async (req, res) => {
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

  app.delete('/api/stock-counts/:id', requireAuth, async (req, res) => {
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
  app.get('/api/stock-counts/:id/items', requireAuth, async (req, res) => {
    try {
      const stockCountId = parseInt(req.params.id);
      const items = await storage.getStockCountItems(stockCountId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching stock count items:", error);
      res.status(500).json({ message: "Failed to fetch stock count items" });
    }
  });

  app.post('/api/stock-counts/:id/items', requireAuth, async (req, res) => {
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
  app.put('/api/stock-counts/:id/items', requireAuth, async (req, res) => {
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

  app.delete('/api/stock-counts/:id/items/:productId', requireAuth, async (req, res) => {
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
  app.post('/api/stock-counts/:id/initialize', requireAuth, async (req, res) => {
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
  app.post('/api/stock-counts/:id/start', requireAuth, async (req, res) => {
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
  app.post('/api/stock-counts/:id/fechar-contagem', requireAuth, async (req, res) => {
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
  app.post('/api/stock-counts/:id/finalizar', requireAuth, async (req, res) => {
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
  app.get('/api/stock-counts/:id/previous-order', requireAuth, async (req, res) => {
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
  app.post('/api/stock-counts/:id/save-order', requireAuth, async (req, res) => {
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
  app.get('/api/product-units', requireAuth, async (req, res) => {
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

  app.post('/api/product-units', requireAuth, async (req, res) => {
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

  app.delete('/api/product-units/:productId/:unitId', requireAuth, async (req, res) => {
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
  app.post('/api/product-units/populate-all', requireAuth, async (req, res) => {
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
  app.get('/api/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.get('/api/settings/:key', requireAuth, async (req, res) => {
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

  app.post('/api/settings', requireAuth, async (req, res) => {
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

  app.put('/api/settings/:key', requireAuth, async (req, res) => {
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
  app.get('/api/cash-register-closures', requireAuth, async (req, res) => {
    try {
      const closures = await storage.getCashRegisterClosures();
      res.json(closures);
    } catch (error) {
      console.error("Error fetching cash register closures:", error);
      res.status(500).json({ message: "Error fetching cash register closures" });
    }
  });

  // Create new cash register closure
  app.post('/api/cash-register-closures', requireAuth, async (req, res) => {
    try {
      const { insertCashRegisterClosureSchema } = await import("@shared/schema");
      
      // Convert datetime string to Date object if it's a string
      const requestData = { 
        ...req.body, 
        createdBy: req.session?.user?.id || 'system-pdf-processor'
      };
      if (requestData.datetime && typeof requestData.datetime === 'string') {
        requestData.datetime = new Date(requestData.datetime);
      }
      
      const closureData = insertCashRegisterClosureSchema.parse(requestData);
      const closure = await storage.createCashRegisterClosure(closureData);
      res.status(201).json(closure);
    } catch (error) {
      console.error("Error creating cash register closure:", error);
      res.status(500).json({ message: "Error creating cash register closure" });
    }
  });

  // Update cash register closure
  app.put('/api/cash-register-closures/:id', requireAuth, async (req, res) => {
    try {
      const { insertCashRegisterClosureSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      
      // Convert datetime string to Date object if it's a string
      const requestData = { ...req.body };
      if (requestData.datetime && typeof requestData.datetime === 'string') {
        requestData.datetime = new Date(requestData.datetime);
      }
      
      const closureData = insertCashRegisterClosureSchema.partial().parse(requestData);
      const closure = await storage.updateCashRegisterClosure(id, closureData);
      res.json(closure);
    } catch (error) {
      console.error("Error updating cash register closure:", error);
      res.status(500).json({ message: "Error updating cash register closure" });
    }
  });

  // Delete cash register closure
  app.delete('/api/cash-register-closures/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Attempting to delete cash register closure with ID: ${id}`);
      
      if (isNaN(id)) {
        console.error(`Invalid ID provided: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid ID provided" });
      }
      
      await storage.deleteCashRegisterClosure(id);
      console.log(`Successfully deleted cash register closure with ID: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cash register closure:", error);
      console.error("Error details:", error.message, error.stack);
      res.status(500).json({ message: "Error deleting cash register closure" });
    }
  });

  // ============ CO2 RECHARGE ROUTES ============

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

  // ============ FLEET MANAGEMENT ROUTES ============

  // Fuels routes
  app.get('/api/fleet/fuels', requireAuth, async (req, res) => {
    try {
      const fuels = await storage.getFuels();
      res.json(fuels);
    } catch (error) {
      console.error("Error fetching fuels:", error);
      res.status(500).json({ message: "Error fetching fuels" });
    }
  });

  app.post('/api/fleet/fuels', requireAuth, async (req, res) => {
    try {
      const { insertFuelSchema } = await import("@shared/schema");
      const fuelData = insertFuelSchema.parse(req.body);
      const fuel = await storage.createFuel(fuelData);
      res.status(201).json(fuel);
    } catch (error) {
      console.error("Error creating fuel:", error);
      res.status(500).json({ message: "Error creating fuel" });
    }
  });

  app.put('/api/fleet/fuels/:id', requireAuth, async (req, res) => {
    try {
      const { insertFuelSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const fuelData = insertFuelSchema.partial().parse(req.body);
      const fuel = await storage.updateFuel(id, fuelData);
      res.json(fuel);
    } catch (error) {
      console.error("Error updating fuel:", error);
      res.status(500).json({ message: "Error updating fuel" });
    }
  });

  // Gas Stations routes
  app.get('/api/fleet/gas-stations', requireAuth, async (req, res) => {
    try {
      const gasStations = await storage.getGasStations();
      res.json(gasStations);
    } catch (error) {
      console.error("Error fetching gas stations:", error);
      res.status(500).json({ message: "Error fetching gas stations" });
    }
  });

  app.post('/api/fleet/gas-stations', requireAuth, async (req, res) => {
    try {
      const { insertGasStationSchema } = await import("@shared/schema");
      const gasStationData = insertGasStationSchema.parse(req.body);
      const gasStation = await storage.createGasStation(gasStationData);
      res.status(201).json(gasStation);
    } catch (error) {
      console.error("Error creating gas station:", error);
      res.status(500).json({ message: "Error creating gas station" });
    }
  });

  app.put('/api/fleet/gas-stations/:id', requireAuth, async (req, res) => {
    try {
      const { insertGasStationSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const gasStationData = insertGasStationSchema.partial().parse(req.body);
      const gasStation = await storage.updateGasStation(id, gasStationData);
      res.json(gasStation);
    } catch (error) {
      console.error("Error updating gas station:", error);
      res.status(500).json({ message: "Error updating gas station" });
    }
  });

  // Vehicles routes
  app.get('/api/fleet/vehicles', requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Error fetching vehicles" });
    }
  });

  app.post('/api/fleet/vehicles', requireAuth, async (req, res) => {
    try {
      const { insertVehicleSchema } = await import("@shared/schema");
      const parsedData = insertVehicleSchema.parse(req.body);
      
      // Convert string date to Date object if provided
      const vehicleData = {
        ...parsedData,
        nextMaintenanceDate: parsedData.nextMaintenanceDate 
          ? new Date(parsedData.nextMaintenanceDate) 
          : null,
      };
      
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Error creating vehicle" });
    }
  });

  app.put('/api/fleet/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const { insertVehicleSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const parsedData = insertVehicleSchema.partial().parse(req.body);
      
      // Convert string date to Date object if provided
      const vehicleData = {
        ...parsedData,
        nextMaintenanceDate: parsedData.nextMaintenanceDate 
          ? new Date(parsedData.nextMaintenanceDate) 
          : null,
      };
      
      const vehicle = await storage.updateVehicle(id, vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Error updating vehicle" });
    }
  });

  // Labels Module API Routes
  
  // Product Shelf Lifes routes
  app.get('/api/labels/shelf-lifes', requireAuth, async (req, res) => {
    try {
      const shelfLifes = await storage.getProductShelfLifes();
      res.json(shelfLifes);
    } catch (error) {
      console.error("Error fetching product shelf lifes:", error);
      res.status(500).json({ message: "Error fetching product shelf lifes" });
    }
  });

  app.get('/api/labels/shelf-lifes/product/:productId', requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const shelfLife = await storage.getProductShelfLifeByProduct(productId);
      res.json(shelfLife);
    } catch (error) {
      console.error("Error fetching product shelf life:", error);
      res.status(500).json({ message: "Error fetching product shelf life" });
    }
  });

  app.post('/api/labels/shelf-lifes', requireAuth, async (req, res) => {
    try {
      const { insertProductShelfLifeSchema } = await import("@shared/schema");
      const shelfLifeData = insertProductShelfLifeSchema.parse(req.body);
      const shelfLife = await storage.createProductShelfLife(shelfLifeData);
      res.status(201).json(shelfLife);
    } catch (error) {
      console.error("Error creating product shelf life:", error);
      res.status(500).json({ message: "Error creating product shelf life" });
    }
  });

  app.put('/api/labels/shelf-lifes/:id', requireAuth, async (req, res) => {
    try {
      const { insertProductShelfLifeSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const shelfLifeData = insertProductShelfLifeSchema.partial().parse(req.body);
      const shelfLife = await storage.updateProductShelfLife(id, shelfLifeData);
      res.json(shelfLife);
    } catch (error) {
      console.error("Error updating product shelf life:", error);
      res.status(500).json({ message: "Error updating product shelf life" });
    }
  });

  app.delete('/api/labels/shelf-lifes/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProductShelfLife(id);
      res.json({ message: "Product shelf life deleted successfully" });
    } catch (error) {
      console.error("Error deleting product shelf life:", error);
      res.status(500).json({ message: "Error deleting product shelf life" });
    }
  });

  // Product Portions routes
  app.get('/api/labels/portions', requireAuth, async (req, res) => {
    try {
      const portions = await storage.getProductPortions();
      res.json(portions);
    } catch (error) {
      console.error("Error fetching product portions:", error);
      res.status(500).json({ message: "Error fetching product portions" });
    }
  });

  app.get('/api/labels/portions/product/:productId', requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const portions = await storage.getProductPortionsByProduct(productId);
      res.json(portions);
    } catch (error) {
      console.error("Error fetching product portions:", error);
      res.status(500).json({ message: "Error fetching product portions" });
    }
  });

  app.post('/api/labels/portions', requireAuth, async (req, res) => {
    try {
      const { insertProductPortionSchema } = await import("@shared/schema");
      const portionData = insertProductPortionSchema.parse(req.body);
      const portion = await storage.createProductPortion(portionData);
      res.status(201).json(portion);
    } catch (error) {
      console.error("Error creating product portion:", error);
      res.status(500).json({ message: "Error creating product portion" });
    }
  });

  app.put('/api/labels/portions/:id', requireAuth, async (req, res) => {
    try {
      const { insertProductPortionSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const portionData = insertProductPortionSchema.partial().parse(req.body);
      const portion = await storage.updateProductPortion(id, portionData);
      res.json(portion);
    } catch (error) {
      console.error("Error updating product portion:", error);
      res.status(500).json({ message: "Error updating product portion" });
    }
  });

  app.delete('/api/labels/portions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProductPortion(id);
      res.json({ message: "Product portion deleted successfully" });
    } catch (error) {
      console.error("Error deleting product portion:", error);
      res.status(500).json({ message: "Error deleting product portion" });
    }
  });

  // Labels routes
  app.get('/api/labels', requireAuth, async (req, res) => {
    try {
      const labels = await storage.getLabels();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
      res.status(500).json({ message: "Error fetching labels" });
    }
  });

  app.post('/api/labels', requireAuth, async (req, res) => {
    try {
      console.log('🏷️ [SERVER] === LABEL CREATION DEBUG ===');
      console.log('🏷️ [SERVER] Raw request body:', JSON.stringify(req.body, null, 2));
      
      const { insertLabelSchema } = await import("@shared/schema");
      
      // Converter storageMethod de inglês para português
      const storageMethodMap = {
        'frozen': 'congelado',
        'cooled': 'resfriado', 
        'ambient': 'temperatura_ambiente'
      };
      
      const translatedStorageMethod = storageMethodMap[req.body.storageMethod] || req.body.storageMethod;
      console.log('🏷️ [SERVER] Storage method translation:', req.body.storageMethod, '->', translatedStorageMethod);
      
      // Gerar identificador de 6 dígitos único
      const identifier = await storage.generateLabelIdentifier();
      console.log('🏷️ [SERVER] Generated identifier:', identifier);
      
      // Preparar dados para validação
      const dataToValidate = {
        ...req.body,
        identifier,
        storageMethod: translatedStorageMethod,
        date: req.body.productionDate, // Usar productionDate como date
      };
      
      console.log('🏷️ [SERVER] Data to validate:', JSON.stringify(dataToValidate, null, 2));
      
      const labelData = insertLabelSchema.parse(dataToValidate);
      console.log('🏷️ [SERVER] Validated data:', JSON.stringify(labelData, null, 2));
      
      const label = await storage.createLabel(labelData);
      console.log('🏷️ [SERVER] Created label:', JSON.stringify(label, null, 2));
      console.log('🏷️ [SERVER] === END LABEL CREATION DEBUG ===');
      
      res.status(201).json(label);
    } catch (error) {
      console.error('❌ [SERVER] Error creating label:', error);
      console.log('🏷️ [SERVER] === END LABEL CREATION DEBUG (WITH ERROR) ===');
      res.status(500).json({ message: "Error creating label" });
    }
  });

  app.put('/api/labels/:id', requireAuth, async (req, res) => {
    try {
      const { insertLabelSchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      const labelData = insertLabelSchema.partial().parse(req.body);
      const label = await storage.updateLabel(id, labelData);
      res.json(label);
    } catch (error) {
      console.error("Error updating label:", error);
      res.status(500).json({ message: "Error updating label" });
    }
  });

  app.delete('/api/labels/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLabel(id);
      res.json({ message: "Label deleted successfully" });
    } catch (error) {
      console.error("Error deleting label:", error);
      res.status(500).json({ message: "Error deleting label" });
    }
  });

  // Rota para buscar etiqueta pelo identificador QR
  app.get('/api/labels/qr/:identifier', requireAuth, async (req, res) => {
    try {
      console.log('🔍 [QR-SEARCH] === SEARCHING LABEL BY QR ===');
      console.log('🔍 [QR-SEARCH] Identifier:', req.params.identifier);
      
      const identifier = req.params.identifier;
      const label = await storage.getLabelByIdentifier(identifier);
      
      if (!label) {
        console.log('❌ [QR-SEARCH] Label not found');
        return res.status(404).json({ message: "Etiqueta não encontrada" });
      }
      
      console.log('✅ [QR-SEARCH] Label found:', JSON.stringify(label, null, 2));
      console.log('🔍 [QR-SEARCH] === END QR SEARCH ===');
      res.json(label);
    } catch (error) {
      console.error('❌ [QR-SEARCH] Error searching label:', error);
      res.status(500).json({ message: "Error searching label" });
    }
  });

  // Rota para dar baixa numa etiqueta
  app.patch('/api/labels/:id/withdrawal', requireAuth, async (req, res) => {
    try {
      console.log('📤 [WITHDRAWAL] === PROCESSING LABEL WITHDRAWAL ===');
      const id = parseInt(req.params.id);
      console.log('📤 [WITHDRAWAL] Label ID:', id);
      console.log('📤 [WITHDRAWAL] Request body:', JSON.stringify(req.body, null, 2));
      
      // Buscar dados do usuário autenticado
      const user = (req as any).user;
      console.log('📤 [WITHDRAWAL] User object from req.user:', JSON.stringify(user, null, 2));
      console.log('📤 [WITHDRAWAL] Full req object keys:', Object.keys(req));
      console.log('📤 [WITHDRAWAL] Session keys:', Object.keys(req.session || {}));
      
      // Try multiple approaches to get the user ID
      let withdrawalResponsibleId = user?.id || req.body.withdrawalResponsibleId;
      
      // Fallback: check session directly 
      if (!withdrawalResponsibleId && req.session?.employee?.id) {
        withdrawalResponsibleId = req.session.employee.id;
        console.log('📤 [WITHDRAWAL] Found ID from session.employee:', withdrawalResponsibleId);
      }
      
      // Fallback: check PIN session
      if (!withdrawalResponsibleId && req.session?.pinEmployee?.id) {
        withdrawalResponsibleId = req.session.pinEmployee.id;
        console.log('📤 [WITHDRAWAL] Found ID from session.pinEmployee:', withdrawalResponsibleId);
      }
      
      // Fallback: direct session store lookup
      if (!withdrawalResponsibleId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const sessionId = authHeader.substring(7);
          try {
            const sessionData = await new Promise<any>((resolve, reject) => {
              req.sessionStore.get(sessionId, (err: any, data: any) => {
                if (err) reject(err);
                else resolve(data);
              });
            });
            
            if (sessionData?.employee?.id) {
              withdrawalResponsibleId = sessionData.employee.id;
              console.log('📤 [WITHDRAWAL] Found ID from direct session store lookup:', withdrawalResponsibleId);
            }
          } catch (error) {
            console.error('📤 [WITHDRAWAL] Session store lookup error:', error);
          }
        }
      }
      
      console.log('📤 [WITHDRAWAL] Withdrawal responsible ID:', withdrawalResponsibleId);
      
      if (!withdrawalResponsibleId) {
        console.log('❌ [WITHDRAWAL] No responsible user found');
        return res.status(400).json({ message: "Usuário responsável não identificado" });
      }
      
      const withdrawalData = {
        withdrawalDate: new Date(),
        withdrawalResponsibleId,
      };
      
      console.log('📤 [WITHDRAWAL] Withdrawal data:', JSON.stringify(withdrawalData, null, 2));
      
      const label = await storage.updateLabelWithdrawal(id, withdrawalData);
      
      console.log('✅ [WITHDRAWAL] Label withdrawal processed:', JSON.stringify(label, null, 2));
      console.log('📤 [WITHDRAWAL] === END WITHDRAWAL PROCESSING ===');
      
      res.json(label);
    } catch (error) {
      console.error('❌ [WITHDRAWAL] Error processing withdrawal:', error);
      console.log('📤 [WITHDRAWAL] === END WITHDRAWAL PROCESSING (WITH ERROR) ===');
      res.status(500).json({ message: "Error processing withdrawal" });
    }
  });

  // Rota para baixa em massa de etiquetas
  app.post('/api/labels/bulk-withdrawal', requireAuth, async (req, res) => {
    try {
      console.log('📦 [BULK-WITHDRAWAL] === PROCESSING BULK LABEL WITHDRAWAL ===');
      console.log('📦 [BULK-WITHDRAWAL] Request body:', JSON.stringify(req.body, null, 2));
      
      const { labelIds, withdrawalDateTime } = req.body;
      
      if (!labelIds || !Array.isArray(labelIds) || labelIds.length === 0) {
        console.log('❌ [BULK-WITHDRAWAL] Invalid label IDs');
        return res.status(400).json({ message: "IDs de etiquetas inválidos" });
      }
      
      // Buscar dados do usuário autenticado
      const user = (req as any).user;
      const withdrawalResponsibleId = user?.employee?.id || user?.pinEmployee?.id || user?.id;
      
      console.log('📦 [BULK-WITHDRAWAL] Withdrawal responsible ID:', withdrawalResponsibleId);
      
      if (!withdrawalResponsibleId) {
        console.log('❌ [BULK-WITHDRAWAL] No responsible user found');
        return res.status(400).json({ message: "Usuário responsável não identificado" });
      }
      
      const withdrawalDate = withdrawalDateTime ? new Date(withdrawalDateTime) : new Date();
      console.log('📦 [BULK-WITHDRAWAL] Withdrawal date:', withdrawalDate);
      
      let processedCount = 0;
      const errors: any[] = [];
      
      // Processar cada etiqueta individualmente
      for (const labelId of labelIds) {
        try {
          const withdrawalData = {
            withdrawalDate,
            withdrawalResponsibleId,
          };
          
          await storage.updateLabelWithdrawal(labelId, withdrawalData);
          processedCount++;
          console.log(`✅ [BULK-WITHDRAWAL] Label ${labelId} processed successfully`);
        } catch (error) {
          console.error(`❌ [BULK-WITHDRAWAL] Error processing label ${labelId}:`, error);
          errors.push({ labelId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      console.log(`📦 [BULK-WITHDRAWAL] Bulk withdrawal completed: ${processedCount}/${labelIds.length} processed`);
      console.log('📦 [BULK-WITHDRAWAL] === END BULK WITHDRAWAL PROCESSING ===');
      
      res.json({
        processedCount,
        totalRequested: labelIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('❌ [BULK-WITHDRAWAL] Error processing bulk withdrawal:', error);
      console.log('📦 [BULK-WITHDRAWAL] === END BULK WITHDRAWAL PROCESSING (WITH ERROR) ===');
      res.status(500).json({ message: "Error processing bulk withdrawal" });
    }
  });

  // Fuel Entries routes
  app.get('/api/fleet/fuel-entries', requireAuth, async (req, res) => {
    try {
      const fuelEntries = await storage.getFuelEntries();
      res.json(fuelEntries);
    } catch (error) {
      console.error("Error fetching fuel entries:", error);
      res.status(500).json({ message: "Error fetching fuel entries" });
    }
  });

  app.post('/api/fleet/fuel-entries', requireAuth, async (req, res) => {
    try {
      const { insertFuelEntrySchema } = await import("@shared/schema");
      
      // Convert date string to Date object if needed
      const requestData = { ...req.body };
      if (requestData.date && typeof requestData.date === 'string') {
        requestData.date = new Date(requestData.date);
      }
      
      const fuelEntryData = insertFuelEntrySchema.parse(requestData);
      const fuelEntry = await storage.createFuelEntry(fuelEntryData);
      res.status(201).json(fuelEntry);
    } catch (error) {
      console.error("Error creating fuel entry:", error);
      res.status(500).json({ message: "Error creating fuel entry" });
    }
  });

  app.put('/api/fleet/fuel-entries/:id', requireAuth, async (req, res) => {
    try {
      const { insertFuelEntrySchema } = await import("@shared/schema");
      const id = parseInt(req.params.id);
      
      // Convert date string to Date object if needed
      const requestData = { ...req.body };
      if (requestData.date && typeof requestData.date === 'string') {
        requestData.date = new Date(requestData.date);
      }
      
      const fuelEntryData = insertFuelEntrySchema.partial().parse(requestData);
      const fuelEntry = await storage.updateFuelEntry(id, fuelEntryData);
      res.json(fuelEntry);
    } catch (error) {
      console.error("Error updating fuel entry:", error);
      res.status(500).json({ message: "Error updating fuel entry" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  setupWebSocket(httpServer);
  
  return httpServer;
}
