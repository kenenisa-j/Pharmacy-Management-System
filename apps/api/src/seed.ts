/**
 * Seed Script - Creates roles and demo users for the Pharmacy System
 * Run with: pnpm tsx src/seed.ts (from apps/api directory)
 */
import dotenv from 'dotenv';
dotenv.config();

import { db, users, roles, employees } from 'database';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const ROLES = [
    { name: 'OWNER', description: 'Full access to all system features including financial reports and user management' },
    { name: 'PHARMACIST', description: 'Can manage medicines, prescriptions, inventory, and receive purchase orders' },
    { name: 'CASHIER', description: 'Can process sales at the POS terminal and view inventory' },
];

const DEMO_USERS = [
    {
        email: 'owner@pharmacy.com',
        password: 'Owner@1234',
        roleName: 'OWNER',
        firstName: 'Samuel',
        lastName: 'Tesfaye',
        phone: '+251911000001',
    },
    {
        email: 'pharmacist@pharmacy.com',
        password: 'Pharma@1234',
        roleName: 'PHARMACIST',
        firstName: 'Dawit',
        lastName: 'Bekele',
        phone: '+251911000003',
    },
    {
        email: 'cashier@pharmacy.com',
        password: 'Cashier@1234',
        roleName: 'CASHIER',
        firstName: 'Tigist',
        lastName: 'Alemu',
        phone: '+251911000004',
    },
];

async function seed() {
    console.log('🌱 Starting database seed...\n');

    // 1. Seed roles
    console.log('📋 Creating roles...');
    const roleMap: Record<string, string> = {};

    for (const role of ROLES) {
        try {
            const existing = await db.select().from(roles).where(eq(roles.name, role.name)).limit(1);
            if (existing.length > 0) {
                roleMap[role.name] = existing[0].id;
                console.log(`   ✓ Role '${role.name}' already exists (id: ${existing[0].id})`);
            } else {
                const [created] = await db.insert(roles).values(role).returning();
                roleMap[role.name] = created.id;
                console.log(`   ✓ Created role '${role.name}' (id: ${created.id})`);
            }
        } catch (err: any) {
            console.error(`   ✗ Error with role '${role.name}':`, err.message);
        }
    }

    // 2. Seed demo users
    console.log('\n👤 Creating demo users...');
    for (const demoUser of DEMO_USERS) {
        try {
            const existing = await db.select().from(users).where(eq(users.email, demoUser.email)).limit(1);
            if (existing.length > 0) {
                console.log(`   ✓ User '${demoUser.email}' already exists`);
                continue;
            }

            const roleId = roleMap[demoUser.roleName];
            if (!roleId) {
                console.error(`   ✗ Role '${demoUser.roleName}' not found for user '${demoUser.email}'`);
                continue;
            }

            const passwordHash = await bcrypt.hash(demoUser.password, SALT_ROUNDS);

            const [newUser] = await db.insert(users).values({
                email: demoUser.email,
                passwordHash,
                roleId,
            }).returning();

            await db.insert(employees).values({
                userId: newUser.id,
                firstName: demoUser.firstName,
                lastName: demoUser.lastName,
                phone: demoUser.phone,
            });

            console.log(`   ✓ Created user '${demoUser.email}' with role '${demoUser.roleName}'`);
        } catch (err: any) {
            console.error(`   ✗ Error creating user '${demoUser.email}':`, err.message);
        }
    }

    console.log('\n✅ Seed complete!\n');
    console.log('='.repeat(60));
    console.log('🔑 DEMO LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    for (const u of DEMO_USERS) {
        console.log(`  Role: ${u.roleName.padEnd(18)} | Email: ${u.email.padEnd(30)} | Password: ${u.password}`);
    }
    console.log('='.repeat(60));
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
