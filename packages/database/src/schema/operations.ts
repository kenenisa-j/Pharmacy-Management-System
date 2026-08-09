import { pgTable, uuid, varchar, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { medicines } from './products.js';
import { users } from './core.js';

// 1. Inventory Transactions Table (Every stock movement audit trail)
export const inventoryTransactions = pgTable('inventory_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicineId: uuid('medicine_id').references(() => medicines.id).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    // e.g., PURCHASE_RECEIVE, SALE_OUT, DAMAGE_REMOVAL, EXPIRED_REMOVAL,
    //       RETURN_RESTOCK, THEFT_LOSS, PHYSICAL_COUNT_ADJUSTMENT, SALE_DEDUCT
    quantityChange: integer('quantity_change').notNull(), // Positive = addition, Negative = deduction
    previousStock: integer('previous_stock').notNull(),
    newStock: integer('new_stock').notNull(),
    referenceNumber: varchar('reference_number', { length: 100 }),
    reason: text('reason'),
    notes: text('notes'),
    performedBy: uuid('performed_by').references(() => users.id), // User who made the movement
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Purchase Orders Table (Restocking orders sent to suppliers)
export const purchaseOrders = pgTable('purchase_orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    supplierId: uuid('supplier_id').notNull(),
    status: varchar('status', { length: 20 }).default('PENDING').notNull(),
    // Status values: PENDING, APPROVED, RECEIVED, CANCELLED
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Purchase Order Items Table (Line items inside a purchase order)
export const purchaseOrderItems = pgTable('purchase_order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
    medicineId: uuid('medicine_id').references(() => medicines.id).notNull(),
    quantity: integer('quantity').notNull(),
    unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
    totalCost: decimal('total_cost', { precision: 12, scale: 2 }).notNull(),
});

// 4. Sales Table (POS checkout transactions)
export const sales = pgTable('sales', {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
    invoiceNumber: varchar('invoice_number', { length: 50 }), // Alias / legacy field
    cashierId: uuid('cashier_id').references(() => users.id),
    customerName: varchar('customer_name', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
    // Payment method values: CASH, CARD, MOBILE_MONEY
    paymentStatus: varchar('payment_status', { length: 20 }).default('PAID').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Sale Items Table (Individual medicines sold in a POS transaction)
export const saleItems = pgTable('sale_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'cascade' }).notNull(),
    medicineId: uuid('medicine_id').references(() => medicines.id).notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
});