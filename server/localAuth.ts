import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { Employee } from '@shared/schema';

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