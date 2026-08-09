/**
 * Cleanup Script - Removes ADMIN and INVENTORY_MANAGER users and roles from the DB
 * Run with: pnpm tsx src/cleanup-roles.ts (from apps/api directory)
 */
import dotenv from 'dotenv';
dotenv.config();

import { db, users, roles, employees } from 'database';
import { eq, inArray } from 'drizzle-orm';

async function cleanup() {
    console.log('🧹 Starting role cleanup...\n');

    // 1. Find the role IDs for ADMIN and INVENTORY_MANAGER
    const oldRoles = await db
        .select()
        .from(roles)
        .where(inArray(roles.name, ['ADMIN', 'INVENTORY_MANAGER']));

    if (oldRoles.length === 0) {
        console.log('✅ No ADMIN or INVENTORY_MANAGER roles found. Nothing to clean up.');
        process.exit(0);
    }

    const oldRoleIds = oldRoles.map(r => r.id);
    console.log(`Found ${oldRoles.length} role(s) to remove: ${oldRoles.map(r => r.name).join(', ')}`);

    // 2. Find users assigned to those roles
    const oldUsers = await db
        .select()
        .from(users)
        .where(inArray(users.roleId, oldRoleIds));

    console.log(`Found ${oldUsers.length} user(s) to remove.`);

    // 3. Delete associated employees records first (FK constraint)
    if (oldUsers.length > 0) {
        const oldUserIds = oldUsers.map(u => u.id);

        await db.delete(employees).where(inArray(employees.userId, oldUserIds));
        console.log(`   ✓ Deleted employee records`);

        await db.delete(users).where(inArray(users.id, oldUserIds));
        console.log(`   ✓ Deleted user accounts: ${oldUsers.map(u => u.email).join(', ')}`);
    }

    // 4. Delete the roles themselves
    await db.delete(roles).where(inArray(roles.id, oldRoleIds));
    console.log(`   ✓ Deleted roles: ${oldRoles.map(r => r.name).join(', ')}`);

    console.log('\n✅ Cleanup complete! Only OWNER, PHARMACIST, CASHIER roles remain.\n');
    process.exit(0);
}

cleanup().catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
});
