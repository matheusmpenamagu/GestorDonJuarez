import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { Employee } from '@shared/schema';
import session from 'express-session';
import type { Express } from 'express';
import MemoryStore from 'memorystore';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function authenticateEmployee(email: string, password: string): Promise<Employee | null> {
  console.log('🔐 [LOCAL-AUTH] Attempting to authenticate employee:', email);
  
  try {
    const employee = await storage.getEmployeeByEmail(email);
    if (!employee) {
      console.log('❌ [LOCAL-AUTH] Employee not found:', email);
      return null;
    }

    if (!employee.isActive) {
      console.log('❌ [LOCAL-AUTH] Employee account is inactive:', email);
      return null;
    }

    const isValidPassword = await verifyPassword(password, employee.password);
    if (!isValidPassword) {
      console.log('❌ [LOCAL-AUTH] Invalid password for employee:', email);
      return null;
    }

    console.log('✅ [LOCAL-AUTH] Employee authenticated successfully:', email);
    return employee;
  } catch (error) {
    console.error('🚨 [LOCAL-AUTH] Authentication error:', error);
    return null;
  }
}

let globalSessionStore: any = null;

export function setupLocalAuth(app: Express) {
  console.log('🔐 Setting up local authentication with memory store');
  
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  globalSessionStore = sessionStore;

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax'
    }
  }));

  // Make sessionStore available globally for auth middleware
  app.use((req: any, res: any, next: any) => {
    req.sessionStore = sessionStore;
    next();
  });

  console.log('✅ Local authentication setup complete');
}

export function getSessionStore() {
  return globalSessionStore;
}