/**
 * Password Reset Script - Force-resets passwords for all demo users
 */
import dotenv from 'dotenv';
dotenv.config();

import { db, users } from 'database';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const DEMO_USERS = [
    { email: 'owner@pharmacy.com',      password: 'Owner@1234' },
    { email: 'admin@pharmacy.com',      password: 'Admin@1234' },
    { email: 'pharmacist@pharmacy.com', password: 'Pharma@1234' },
    { email: 'cashier@pharmacy.com',    password: 'Cashier@1234' },
    { email: 'inventory@pharmacy.com',  password: 'Inventory@1234' },
];

async function resetPasswords() {
    console.log('🔑 Force-resetting passwords for all demo users...\n');

    for (const demo of DEMO_USERS) {
        const passwordHash = await bcrypt.hash(demo.password, SALT_ROUNDS);

        const result = await db
            .update(users)
            .set({ passwordHash, isActive: true, updatedAt: new Date() })
            .where(eq(users.email, demo.email))
            .returning();

        if (result.length > 0) {
            console.log(`   ✓ Reset password for '${demo.email}'`);
        } else {
            console.log(`   ✗ User '${demo.email}' NOT FOUND in database`);
        }
    }

    console.log('\n✅ Done! Login credentials:\n');
    console.log('='.repeat(60));
    for (const u of DEMO_USERS) {
        console.log(`  Email: ${u.email.padEnd(32)} | Password: ${u.password}`);
    }
    console.log('='.repeat(60));
    process.exit(0);
}

resetPasswords().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
