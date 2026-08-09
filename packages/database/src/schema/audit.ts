import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id'), // ID or email of the actor
    userName: text('user_name'),
    action: text('action').notNull(), // e.g., 'CREATE_USER', 'DELETE_MEDICINE', 'PROCESS_SALE', 'UPDATE_SETTINGS'
    details: text('details'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});