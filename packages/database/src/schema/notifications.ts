import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull(), // 'LOW_STOCK' | 'EXPIRY' | 'PURCHASE' | 'PAYMENT'
    isRead: integer('is_read').default(0).notNull(), // 0: Unread, 1: Read
    createdAt: timestamp('created_at').defaultNow().notNull(),
});