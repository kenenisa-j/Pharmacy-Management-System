import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// 1. Roles Table (Owner, Admin, Pharmacist, Cashier, Inventory Manager)
export const roles = pgTable('roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull().unique(), // e.g., 'ADMIN', 'CASHIER'
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Permissions Table (Granular system actions)
export const permissions = pgTable('permissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(), // e.g., 'medicines:create', 'sales:delete'
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Users Table (System authentication credentials)
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    roleId: uuid('role_id').references(() => roles.id).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Employees Table (Extended staff profile information)
export const employees = pgTable('employees', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    address: text('address'),
    hireDate: timestamp('hire_date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Settings Table (Store configurations, tax rates, currency, etc.)
export const settings = pgTable('settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    storeName: varchar('store_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    address: text('address').notNull(),
    currency: varchar('currency', { length: 10 }).default('ETB').notNull(), // Default Ethiopian Birr or adjust as needed
    taxRate: integer('tax_rate').default(15).notNull(), // Stored as percentage or basis points
    receiptFooter: text('receipt_footer'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});