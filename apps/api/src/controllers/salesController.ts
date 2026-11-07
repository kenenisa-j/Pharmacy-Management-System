import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, sales, saleItems, medicines, categories, inventoryTransactions, notifications, auditLogs, inventory } from 'database';
import { eq, ilike, or, desc, inArray } from 'drizzle-orm';
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

            // 1. Fetch all medicine + inventory records in ONE single batch query with write lock
            const medicineIds = items.map(cartItem => cartItem.medicineId as string);
            const medicineRecords = await tx
                .select({
                    id: medicines.id,
                    name: medicines.name,
                    unitPrice: medicines.unitPrice,
                    stockQuantity: inventory.stockQuantity,
                    expiryDate: medicines.expiryDate,
                })
                .from(medicines)
                .innerJoin(inventory, eq(medicines.id, inventory.medicineId))
                .where(inArray(medicines.id, medicineIds))
                .for('update');

            const medMap = new Map(medicineRecords.map(m => [m.id, m]));
            const todayStr = new Date().toISOString().split('T')[0];

            for (const cartItem of items) {
                const medicine = medMap.get(cartItem.medicineId as string);
                if (!medicine) {
                    throw new AppError(`Medicine item not found in catalog`, StatusCodes.NOT_FOUND);
                }

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

            // 3. Prepare batch inserts for items, transaction logs, and low-stock alerts
            const saleItemsBatch = [];
            const inventoryMovementsBatch = [];
            const notificationsBatch: any[] = [];
            const inventoryUpdatePromises = [];
            const lowStockThreshold = 10;

            for (const item of validatedItems) {
                saleItemsBatch.push({
                    saleId: newSale.id,
                    medicineId: item.medicineId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice.toString(),
                    totalPrice: item.totalPrice.toString(),
                });

                const updatedStock = item.currentStock - item.quantity;

                // Push inventory update query
                inventoryUpdatePromises.push(
                    tx
                        .update(inventory)
                        .set({ stockQuantity: updatedStock, updatedAt: new Date() })
                        .where(eq(inventory.medicineId, item.medicineId))
                );

                // Push inventory transaction log
                inventoryMovementsBatch.push({
                    medicineId: item.medicineId,
                    type: 'SALE_DEDUCT' as const,
                    quantityChange: -item.quantity,
                    previousStock: item.currentStock,
                    newStock: updatedStock,
                    referenceNumber: receiptNumber,
                    reason: `Retail Sale Ref #${receiptNumber}`,
                    performedBy: cashierId || null,
                });

                if (updatedStock <= lowStockThreshold) {
                    notificationsBatch.push({
                        title: 'Low Stock Alert',
                        message: `Medicine "${item.medicineName}" has dropped to ${updatedStock} units remaining.`,
                        type: 'LOW_STOCK',
                        isRead: 0,
                    });
                }
            }

            notificationsBatch.push({
                title: 'New Sale Recorded',
                message: `Order #${receiptNumber} processed successfully for Birr ${grandTotal.toFixed(2)}.`,
                type: 'PURCHASE',
                isRead: 0,
            });

            // 4. Execute batch operations in parallel / single queries
            await Promise.all([
                tx.insert(saleItems).values(saleItemsBatch),
                tx.insert(inventoryTransactions).values(inventoryMovementsBatch),
                tx.insert(notifications).values(notificationsBatch),
                ...inventoryUpdatePromises,
            ]);

            // 5. Record Automated Audit Log Entry
            const itemsSoldSummary = validatedItems.map(it => `${it.medicineName} x${it.quantity}`).join(', ');
            const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'System POS Terminal';

            await tx.insert(auditLogs).values({
                userId: cashierId || 'System',
                userName: cashierName,
                action: 'SALE_CHECKOUT',
                details: `Sold: ${itemsSoldSummary} • Birr ${grandTotal.toFixed(2)} via ${paymentMethod}`,
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