import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, purchaseOrders, purchaseOrderItems, medicines, inventoryTransactions, suppliers, inventory } from 'database';
import { eq, desc, and } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Create a new purchase order
export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { supplierId, notes, items } = req.body; // items: [{ medicineId, quantity, unitCost }]
        const userId = req.user?.userId;

        if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
            return next(new AppError('Supplier ID and a valid list of order items are required', StatusCodes.BAD_REQUEST));
        }

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            if (!item.medicineId || !item.quantity || item.unitCost === undefined) {
                return next(new AppError('Each item must include medicineId, quantity, and unitCost', StatusCodes.BAD_REQUEST));
            }
            totalAmount += Number(item.quantity) * Number(item.unitCost);
        }

        const orderNumber = `PO-${Date.now().toString().slice(-8)}`;

        const [newOrder] = await db.transaction(async (tx) => {
            // 1. Insert Purchase Order Header
            const [insertedOrder] = await tx
                .insert(purchaseOrders)
                .values({
                    orderNumber,
                    supplierId,
                    status: 'PENDING',
                    totalAmount: totalAmount.toString(),
                    notes: notes || null,
                    createdBy: userId || null,
                })
                .returning();

            // 2. Insert Order Items
            const orderItemsValues = items.map((item: any) => ({
                purchaseOrderId: insertedOrder.id,
                medicineId: item.medicineId,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost).toString(),
                totalCost: (Number(item.quantity) * Number(item.unitCost)).toString(),
            }));

            await tx.insert(purchaseOrderItems).values(orderItemsValues);

            return [insertedOrder];
        });

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Purchase order created successfully',
            data: newOrder,
        });
    } catch (error) {
        next(error);
    }
};

// Get all purchase orders
export const getAllPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await db
            .select({
                id: purchaseOrders.id,
                orderNumber: purchaseOrders.orderNumber,
                status: purchaseOrders.status,
                totalAmount: purchaseOrders.totalAmount,
                notes: purchaseOrders.notes,
                createdAt: purchaseOrders.createdAt,
                supplierName: suppliers.name,
            })
            .from(purchaseOrders)
            .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
            .orderBy(desc(purchaseOrders.createdAt));

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: orders.length,
            data: orders,
        });
    } catch (error) {
        next(error);
    }
};

// Get single purchase order with detailed items
export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [order] = await db
            .select({
                id: purchaseOrders.id,
                orderNumber: purchaseOrders.orderNumber,
                status: purchaseOrders.status,
                totalAmount: purchaseOrders.totalAmount,
                notes: purchaseOrders.notes,
                createdAt: purchaseOrders.createdAt,
                supplierName: suppliers.name,
                supplierId: suppliers.id,
            })
            .from(purchaseOrders)
            .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
            .where(eq(purchaseOrders.id, id))
            .limit(1);

        if (!order) {
            return next(new AppError('Purchase order not found', StatusCodes.NOT_FOUND));
        }

        const items = await db
            .select({
                id: purchaseOrderItems.id,
                medicineId: purchaseOrderItems.medicineId,
                medicineName: medicines.name,
                quantity: purchaseOrderItems.quantity,
                unitCost: purchaseOrderItems.unitCost,
                totalCost: purchaseOrderItems.totalCost,
            })
            .from(purchaseOrderItems)
            .leftJoin(medicines, eq(purchaseOrderItems.medicineId, medicines.id))
            .where(eq(purchaseOrderItems.purchaseOrderId, id));

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                ...order,
                items,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Receive goods confirmation (Updates PO status to RECEIVED & automatically increments inventory stock)
export const receivePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.userId;

        const [order] = await db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, id))
            .limit(1);

        if (!order) {
            return next(new AppError('Purchase order not found', StatusCodes.NOT_FOUND));
        }

        if (order.status === 'RECEIVED') {
            return next(new AppError('This purchase order has already been received and processed', StatusCodes.BAD_REQUEST));
        }

        // Fetch order items
        const items = await db
            .select()
            .from(purchaseOrderItems)
            .where(eq(purchaseOrderItems.purchaseOrderId, id));

        await db.transaction(async (tx) => {
            // 1. Update purchase order status
            await tx
                .update(purchaseOrders)
                .set({ status: 'RECEIVED', updatedAt: new Date() })
                .where(eq(purchaseOrders.id, id));

            // 2. Process each item: update stock & log inventory transaction movement
            for (const item of items) {
                const [invRecord] = await tx
                    .select({ stockQuantity: inventory.stockQuantity })
                    .from(inventory)
                    .where(eq(inventory.medicineId, item.medicineId))
                    .limit(1);

                if (!invRecord) continue;

                const currentStock = Number(invRecord.stockQuantity || 0);
                const qtyReceived = Number(item.quantity);
                const newStock = currentStock + qtyReceived;

                // Update inventory stock count
                await tx
                    .update(inventory)
                    .set({ stockQuantity: newStock, updatedAt: new Date() })
                    .where(eq(inventory.medicineId, item.medicineId));

                // Log transaction movement
                await tx.insert(inventoryTransactions).values({
                    medicineId: item.medicineId,
                    type: 'PURCHASE_RECEIVE',
                    quantityChange: qtyReceived,
                    previousStock: currentStock,
                    newStock: newStock,
                    referenceNumber: order.orderNumber,
                    reason: `Restock received from PO ${order.orderNumber}`,
                    performedBy: userId || null,
                });
            }
        });

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Purchase order received successfully. Inventory stock levels updated.',
        });
    } catch (error) {
        next(error);
    }

};
// Update purchase order status (Approve or Cancel)
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body; // Expected: 'APPROVED' or 'CANCELLED'

        if (!['APPROVED', 'CANCELLED'].includes(status)) {
            return next(new AppError('Invalid status transition target. Allowed: APPROVED, CANCELLED', StatusCodes.BAD_REQUEST));
        }

        const [order] = await db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, id))
            .limit(1);

        if (!order) {
            return next(new AppError('Purchase order not found', StatusCodes.NOT_FOUND));
        }

        if (order.status === 'RECEIVED') {
            return next(new AppError('Cannot modify status of an already received purchase order', StatusCodes.BAD_REQUEST));
        }

        if (order.status === 'CANCELLED') {
            return next(new AppError('This purchase order is already cancelled', StatusCodes.BAD_REQUEST));
        }

        const [updatedOrder] = await db
            .update(purchaseOrders)
            .set({
                status,
                updatedAt: new Date()
            })
            .where(eq(purchaseOrders.id, id))
            .returning();

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: `Purchase order successfully marked as ${status.toLowerCase()}`,
            data: updatedOrder,
        });
    } catch (error) {
        next(error);
    }
};