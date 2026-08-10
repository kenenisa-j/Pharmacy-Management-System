import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, medicines, inventoryTransactions, users, roles, inventory } from 'database';
import { eq, desc, and, sql } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Record stock adjustment with detailed audit logging
export const recordInventoryMovement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { medicineId, type, quantity, referenceNumber, reason, notes } = req.body;
        const userId = req.user?.userId; // Extracted from authentication middleware

        if (!medicineId || !type || quantity === undefined) {
            return next(new AppError('Missing required movement parameters (medicineId, type, quantity)', StatusCodes.BAD_REQUEST));
        }

        if (!reason) {
            return next(new AppError('An audit reason or motive must be provided for stock adjustments', StatusCodes.BAD_REQUEST));
        }

        const qty = Number(quantity);
        if (isNaN(qty) || qty === 0) {
            return next(new AppError('Quantity change must be a valid non-zero number', StatusCodes.BAD_REQUEST));
        }

        // Verify the medicine exists before entering the transaction
        const [medicineCheck] = await db
            .select({ id: medicines.id, name: medicines.name })
            .from(medicines)
            .where(eq(medicines.id, medicineId))
            .limit(1);

        if (!medicineCheck) {
            return next(new AppError('Medicine not found in catalog', StatusCodes.NOT_FOUND));
        }

        // Execute atomic transaction — stock read is INSIDE the lock to prevent race conditions
        const [transactionRecord] = await db.transaction(async (tx) => {
            // 1. Fetch current stock with pessimistic write lock (prevents concurrent adjustments)
            const [stockRecord] = await tx
                .select({
                    stock: inventory.stockQuantity,
                })
                .from(inventory)
                .where(eq(inventory.medicineId, medicineId))
                .for('update') // Acquires row-level lock for duration of transaction
                .limit(1);

            const currentStock = Number(stockRecord?.stock || 0);
            let stockDelta = qty;

            // Type classification rules
            if (['DAMAGE_REMOVAL', 'EXPIRED_REMOVAL', 'SALE_OUT', 'THEFT_LOSS', 'SALE_DEDUCT'].includes(type)) {
                stockDelta = -Math.abs(qty);
            } else if (['PURCHASE_RECEIVE', 'RETURN_RESTOCK', 'RESTOCK'].includes(type)) {
                stockDelta = Math.abs(qty);
            } else if (type === 'PHYSICAL_COUNT_ADJUSTMENT' || type === 'SALE' || type === 'ADJUSTMENT' || type === 'RETURN' || type === 'DAMAGE') {
                stockDelta = qty; // Can be positive or negative variance
            } else {
                throw new AppError('Invalid inventory transaction movement type', StatusCodes.BAD_REQUEST);
            }

            const newStockLevel = currentStock + stockDelta;

            if (newStockLevel < 0) {
                throw new AppError(
                    `Stock deficit error. Attempting to reduce stock below zero (Current: ${currentStock}, Requested Reduction: ${Math.abs(stockDelta)})`,
                    StatusCodes.BAD_REQUEST
                );
            }

            // 2. Update main inventory stock counter in inventory table
            await tx
                .update(inventory)
                .set({
                    stockQuantity: newStockLevel,
                    updatedAt: new Date()
                })
                .where(eq(inventory.medicineId, medicineId));

            // 3. Insert comprehensive audit log with user tracking and reason
            const [inserted] = await tx
                .insert(inventoryTransactions)
                .values({
                    medicineId,
                    type,
                    quantityChange: stockDelta,
                    previousStock: currentStock,
                    newStock: newStockLevel,
                    referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
                    reason,
                    notes: notes || null,
                    performedBy: userId || null,
                    createdAt: new Date(),
                })
                .returning();

            return [inserted];
        });

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Stock movement logged and inventory updated successfully',
            data: {
                transactionId: transactionRecord.id,
                medicineName: medicineCheck.name,
                previousStock: transactionRecord.previousStock,
                newStock: transactionRecord.newStock,
                change: transactionRecord.quantityChange,
                reason: transactionRecord.reason,
                performedBy: userId,
                timestamp: transactionRecord.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Retrieve rich audit trail with user and medicine join details
export const getInventoryAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const medicineId = req.params.medicineId as string;
        const { page = '1', limit = '20' } = req.query;

        const pageNumber = Math.max(1, parseInt(page as string, 10));
        const pageSize = Math.max(1, parseInt(limit as string, 10));
        const offset = (pageNumber - 1) * pageSize;

        let query = db
            .select({
                id: inventoryTransactions.id,
                type: inventoryTransactions.type,
                quantityChange: inventoryTransactions.quantityChange,
                previousStock: inventoryTransactions.previousStock,
                newStock: inventoryTransactions.newStock,
                referenceNumber: inventoryTransactions.referenceNumber,
                reason: inventoryTransactions.reason,
                notes: inventoryTransactions.notes,
                createdAt: inventoryTransactions.createdAt,
                medicineName: medicines.name,
                medicineBarcode: medicines.barcode,
                performedByEmail: users.email,
                performedByRole: roles.name,
            })
            .from(inventoryTransactions)
            .leftJoin(medicines, eq(inventoryTransactions.medicineId, medicines.id))
            .leftJoin(users, eq(inventoryTransactions.performedBy, users.id))
            .leftJoin(roles, eq(users.roleId, roles.id))
            .$dynamic();

        if (medicineId) {
            query = query.where(eq(inventoryTransactions.medicineId, medicineId as string));
        }

        const results = await query.orderBy(desc(inventoryTransactions.createdAt)).limit(pageSize).offset(offset);

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};