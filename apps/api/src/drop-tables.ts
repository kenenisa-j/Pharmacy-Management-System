import dotenv from 'dotenv';
dotenv.config();

import { db } from 'database';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🗑️ Wiping public schema in database...');
    try {
        await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`);
        await db.execute(sql`CREATE SCHEMA public;`);
        await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
        console.log('✅ Public schema wiped and recreated successfully!');
    } catch (e: any) {
        console.error('❌ Failed to wipe schema:', e.message);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
