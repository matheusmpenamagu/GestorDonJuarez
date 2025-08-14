import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Database URL selection based on environment
const getDatabaseUrl = () => {
  if (isDevelopment) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for development environment");
    }
    return process.env.DATABASE_URL;
  } else {
    if (!process.env.PRODUCTION_DATABASE_URL) {
      throw new Error("PRODUCTION_DATABASE_URL must be set for production environment");
    }
    return process.env.PRODUCTION_DATABASE_URL;
  }
};

const databaseUrl = getDatabaseUrl();
console.log(`🗄️ Using ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} database`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });