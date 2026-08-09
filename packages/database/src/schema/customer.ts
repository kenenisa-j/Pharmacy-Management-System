import { pgTable, uuid, text, numeric, timestamp, integer } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').unique().notNull(),
    email: text('email'),
    address: text('address'),
    outstandingBalance: numeric('outstanding_balance', { precision: 10, scale: 2 }).default('0').notNull(),
    loyaltyPoints: integer('loyalty_points').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customerPrescriptions = pgTable('customer_prescriptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
    doctorName: text('doctor_name'),
    prescriptionNumber: text('prescription_number'),
    notes: text('notes'),
    imageUrl: text('image_url'), // Link to stored prescription scan/photo
    isVerified: integer('is_verified').default(0).notNull(), // 0: Pending, 1: Verified
    createdAt: timestamp('created_at').defaultNow().notNull(),
});