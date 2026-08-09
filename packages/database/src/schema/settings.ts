import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const storeSettings = pgTable('store_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').unique().notNull(), // e.g., 'STORE_NAME', 'TAX_RATE', 'CURRENCY', 'RECEIPT_FOOTER'
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});