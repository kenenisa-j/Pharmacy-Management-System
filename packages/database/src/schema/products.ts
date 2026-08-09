import { pgTable, uuid, varchar, text, timestamp, integer, decimal, date } from 'drizzle-orm/pg-core';

// 1. Categories Table (e.g., Antibiotics, Analgesics, Vitamins, Syrup)
export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Manufacturers Table (e.g., Pfizer, Novartis, GSK)
export const manufacturers = pgTable('manufacturers', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull().unique(),
    country: varchar('country', { length: 100 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Suppliers Table (Distributors who supply medicines to the pharmacy)
export const suppliers = pgTable('suppliers', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull(),
    contactPerson: varchar('contact_person', { length: 100 }),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Medicines Table (Master pharmaceutical product catalog)
export const medicines = pgTable('medicines', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(), // Commercial name (e.g., Augmentin)
    genericName: varchar('generic_name', { length: 200 }).notNull(), // Active ingredient (e.g., Amoxicillin/Clavulanate)
    brand: varchar('brand', { length: 100 }),
    barcode: varchar('barcode', { length: 100 }).unique(),
    batchNumber: varchar('batch_number', { length: 100 }).notNull(),
    categoryId: uuid('category_id').references(() => categories.id).notNull(),
    manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id).notNull(),
    supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(), // Selling price per unit
    costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(), // Purchase cost per unit
    expiryDate: date('expiry_date').notNull(),
    minStockLevel: integer('min_stock_level').default(10).notNull(), // Threshold for low stock alert
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Inventory Table (Real-time stock tracking per medicine)
export const inventory = pgTable('inventory', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicineId: uuid('medicine_id').references(() => medicines.id, { onDelete: 'cascade' }).notNull().unique(),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    locationInStore: varchar('location_in_store', { length: 100 }), // e.g., "Shelf A3, Row 2"
    lastRestockedDate: timestamp('last_restocked_date').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});