import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, sales, saleItems, medicines, categories, inventoryTransactions, notifications, auditLogs, inventory } from 'database';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Search medicines for POS item lookup (Fast search by name or barcode)
export const searchPOSMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.query.query as string | undefined;

        const baseQuery = db
            .select({
                id: medicines.id,
                name: medicines.name,
                genericName: medicines.genericName,
                brand: medicines.brand,
                category: categories.name,
                barcode: medicines.barcode,
                sellingPrice: medicines.unitPrice,  // map unitPrice → sellingPrice for POS
                stock: inventory.stockQuantity,
            })
            .from(medicines)
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .leftJoin(categories, eq(medicines.categoryId, categories.id));

        let results;
        if (!query || query.trim() === '') {
            results = await baseQuery.limit(20);
        } else {
            const searchTerm = `%${query.trim()}%`;
            results = await baseQuery
                .where(
                    or(
                        ilike(medicines.name, searchTerm),
                        ilike(medicines.barcode, searchTerm),
                        ilike(medicines.genericName, searchTerm)
                    )
                )
                .limit(20);
        }

        // Normalise: ensure numeric types and ETB-friendly values
        const data = results.map(m => ({
            ...m,
            sellingPrice: Number(m.sellingPrice || 0),
            stock: Number(m.stock || 0),
        }));

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: data.length,
            data,
        });
    } catch (error) {
        next(error);
    }
};

// Complete a POS checkout transaction
export const createSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { items, paymentMethod, customerName, customerPhone, discountAmount, notes } = req.body;
        // items: [{ medicineId, quantity }]
        // paymentMethod: 'CASH' | 'CARD' | 'MOBILE_MONEY'
        const cashierId = req.user?.userId;
        const cashierName = req.user?.email || 'POS Cashier';

        if (!items || !Array.isArray(items) || items.length === 0) {
            return next(new AppError('Cart is empty. Add items to complete checkout.', StatusCodes.BAD_REQUEST));
        }

        if (!['CASH', 'CARD', 'MOBILE_MONEY'].includes(paymentMethod)) {
            return next(new AppError('Invalid payment method selected', StatusCodes.BAD_REQUEST));
        }

        const receiptNumber = `INV-${Date.now().toString().slice(-8)}`;

        const completedSale = await db.transaction(async (tx) => {
            let subtotal = 0;
            const validatedItems = [];

            // 1. Verify stock and calculate totals (with pessimistic row-level locking)
            for (const cartItem of items) {
                // Lock the medicine + inventory rows for the duration of the transaction
                // This prevents two concurrent checkouts from reading the same stale stock value
                const [medicine] = await tx
                    .select({
                        id: medicines.id,
                        name: medicines.name,
                        unitPrice: medicines.unitPrice,
                        stockQuantity: inventory.stockQuantity,
                        expiryDate: medicines.expiryDate,
                    })
                    .from(medicines)
                    .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
                    .where(eq(medicines.id, cartItem.medicineId as string))
                    .for('update') // Acquire pessimistic write lock — blocks concurrent reads on same rows
                    .limit(1);

                if (!medicine) {
                    throw new AppError(`Medicine item not found in catalog`, StatusCodes.NOT_FOUND);
                }

                // Expiry Check validation: reject selling expired medicine
                const todayStr = new Date().toISOString().split('T')[0];
                if (medicine.expiryDate && medicine.expiryDate < todayStr) {
                    throw new AppError(`Cannot sell expired medicine: "${medicine.name}". Expired on ${medicine.expiryDate}`, StatusCodes.BAD_REQUEST);
                }

                const requestedQty = Number(cartItem.quantity);
                const currentStock = Number(medicine.stockQuantity || 0);

                if (currentStock < requestedQty) {
                    throw new AppError(`Insufficient stock for ${medicine.name}. Available: ${currentStock}`, StatusCodes.BAD_REQUEST);
                }

                const unitPrice = Number(medicine.unitPrice || 0);
                const totalPrice = unitPrice * requestedQty;
                subtotal += totalPrice;

                validatedItems.push({
                    medicineId: medicine.id,
                    medicineName: medicine.name,
                    quantity: requestedQty,
                    unitPrice,
                    totalPrice,
                    currentStock,
                });
            }


            const discount = Number(discountAmount || 0);
            const grandTotal = Math.max(0, subtotal - discount);

            // 2. Insert Sale Record
            const [newSale] = await tx
                .insert(sales)
                .values({
                    receiptNumber,
                    cashierId: cashierId || null,
                    customerName: customerName || 'Walk-in Customer',
                    customerPhone: customerPhone || null,
                    subtotal: subtotal.toString(),
                    discountAmount: discount.toString(),
                    totalAmount: grandTotal.toString(),
                    paymentMethod,
                    paymentStatus: 'PAID',
                    notes: notes || null,
                })
                .returning();

            // 3. Insert Sale Items, Deduct Stock, and Trigger Thresholds
            for (const item of validatedItems) {
                await tx.insert(saleItems).values({
                    saleId: newSale.id,
                    medicineId: item.medicineId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice.toString(),
                    totalPrice: item.totalPrice.toString(),
                });

                const updatedStock = item.currentStock - item.quantity;

                // Update inventory level in inventory table
                await tx
                    .update(inventory)
                    .set({ stockQuantity: updatedStock, updatedAt: new Date() })
                    .where(eq(inventory.medicineId, item.medicineId));

                // Log inventory movement transaction
                await tx.insert(inventoryTransactions).values({
                    medicineId: item.medicineId,
                    type: 'SALE_DEDUCT',
                    quantityChange: -item.quantity,
                    previousStock: item.currentStock,
                    newStock: updatedStock,
                    referenceNumber: receiptNumber,
                    reason: `Retail Sale Receipt #${receiptNumber}`,
                    performedBy: cashierId || null,
                });

                // Automated Low Stock Trigger Check (Threshold <= 10)
                const lowStockThreshold = 10;
                if (updatedStock <= lowStockThreshold) {
                    await tx.insert(notifications).values({
                        title: 'Low Stock Alert',
                        message: `Medicine "${item.medicineName}" has dropped to ${updatedStock} units remaining.`,
                        type: 'LOW_STOCK',
                        isRead: 0,
                    });
                }
            }

            // 4. Create Notification for Successful Sale Transaction
            await tx.insert(notifications).values({
                title: 'New Sale Recorded',
                message: `Receipt #${receiptNumber} processed successfully for $${grandTotal.toFixed(2)}.`,
                type: 'PURCHASE',
                isRead: 0,
            });

            // 5. Record Automated Audit Log Entry
            const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'System POS Terminal';

            await tx.insert(auditLogs).values({
                userId: cashierId || 'System',
                userName: cashierName,
                action: 'AUTOMATED_SALE_CHECKOUT',
                details: `Processed sale receipt #${receiptNumber} amounting to $${grandTotal.toFixed(2)} via ${paymentMethod} with complete inventory synchronization.`,
                ipAddress,
                userAgent,
            });

            return newSale;
        });

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Checkout completed successfully with automated ripple updates',
            data: completedSale,
        });
    } catch (error) {
        next(error);
    }
};

// Get recent sales history
export const getSalesHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recentSales = await db
            .select()
            .from(sales)
            .orderBy(desc(sales.createdAt))
            .limit(50);

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: recentSales.length,
            data: recentSales,
        });
    } catch (error) {
        next(error);
    }
};