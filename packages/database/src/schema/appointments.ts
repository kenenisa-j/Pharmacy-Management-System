import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { customers } from './customer.js';
import { users } from './core.js';

export const appointments = pgTable('appointments', {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    patientName: varchar('patient_name', { length: 255 }).notNull(),
    patientPhone: varchar('patient_phone', { length: 50 }),
    doctorName: varchar('doctor_name', { length: 150 }),
    appointmentDate: timestamp('appointment_date').notNull(),
    status: varchar('status', { length: 20 }).default('SCHEDULED').notNull(),
    // status values: 'SCHEDULED', 'COMPLETED', 'CANCELLED'
    reason: text('reason'),
    notes: text('notes'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
    deviceId: varchar('device_id', { length: 100 }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    customerIdIdx: index('appointments_customer_id_idx').on(table.customerId),
    doctorDateIdx: index('appointments_doctor_date_idx').on(table.doctorName, table.appointmentDate),
}));
