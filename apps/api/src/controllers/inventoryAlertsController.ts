import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, medicines, categories, suppliers, inventory } from 'database';
import { lte, gte, and, asc, sql, eq } from 'drizzle-orm';

// Get low stock alerts
export const getLowStockAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lowStockMedicines = await db
            .select({
                id: medicines.id,
                name: medicines.name,
                genericName: medicines.genericName,
                stock: inventory.stockQuantity,
                minStockLevel: medicines.minStockLevel,
                category: categories.name,
                supplier: suppliers.name,
                supplierPhone: suppliers.phone,
            })
            .from(medicines)
            .leftJoin(categories, eq(medicines.categoryId, categories.id))
            .leftJoin(suppliers, eq(medicines.supplierId, suppliers.id))
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(lte(inventory.stockQuantity, medicines.minStockLevel))
            .orderBy(asc(inventory.stockQuantity));

        res.status(StatusCodes.OK).json({
            status: 'success',
            count: lowStockMedicines.length,
            data: lowStockMedicines,
        });
    } catch (error) {
        next(error);
    }
};

// Get near-expiry or expired medicine alerts
export const getExpiryAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { days = '90' } = req.query; // Default to looking ahead 90 days
        const daysAhead = parseInt(days as string, 10);

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const expiringMedicines = await db
            .select({
                id: medicines.id,
                name: medicines.name,
                genericName: medicines.genericName,
                batchNumber: medicines.batchNumber,
                stock: inventory.stockQuantity,
                expiryDate: medicines.expiryDate,
                category: categories.name,
                supplier: suppliers.name,
            })
            .from(medicines)
            .leftJoin(categories, eq(medicines.categoryId, categories.id))
            .leftJoin(suppliers, eq(medicines.supplierId, suppliers.id))
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(lte(medicines.expiryDate, targetDateStr))
            .orderBy(asc(medicines.expiryDate));

        res.status(StatusCodes.OK).json({
            status: 'success',
            count: expiringMedicines.length,
            thresholdDays: daysAhead,
            data: expiringMedicines,
        });
    } catch (error) {
        next(error);
    }
};