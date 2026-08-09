import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema/index.js';

dotenv.config({ path: '../../.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pharmacy_db';

// Setup postgres client for queries
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from './schema/index.js';