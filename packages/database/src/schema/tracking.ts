import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './core.js';

// Enums for tracking categories (exported for reuse if needed)
export const notificationTypeEnum = pgEnum('notification_type', ['LOW_STOCK', 'EXPIRY_ALERT', 'PURCHASE_RECEIVED', 'SYSTEM_ALERT']);
export const auditActionEnum = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'POS_SALE']);

// NOTE: notifications and auditLogs tables are defined in notifications.ts and audit.ts respectively.
// They are exported from the schema index. Do NOT redefine them here to avoid conflicts.