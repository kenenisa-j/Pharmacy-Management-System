import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, sales, saleItems, medicines, categories, notifications, inventory } from 'database';
import { sql, eq, desc, sum, count, lte } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Calculate Total Revenue and Sales Count
        const salesSummaryQuery = await db
            .select({
                totalRevenue: sum(sales.totalAmount),
                totalSales: count(sales.id),
            })
            .from(sales);

        const totalRevenue = Number(salesSummaryQuery[0]?.totalRevenue || 0);
        const totalSales = Number(salesSummaryQuery[0]?.totalSales || 0);

        // 2. Calculate Total Medicines Count & Low Stock Count
        const medicineStatsQuery = await db
            .select({
                totalMedicines: count(medicines.id),
            })
            .from(medicines);

        const totalMedicines = Number(medicineStatsQuery[0]?.totalMedicines || 0);

        const lowStockQuery = await db
            .select({
                id: medicines.id,
                name: medicines.name,
                stock: inventory.stockQuantity,
                minStockLevel: medicines.minStockLevel,
            })
            .from(medicines)
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(lte(inventory.stockQuantity, medicines.minStockLevel))
            .limit(5);

        // 3. Category Distribution (Count of medicines per category)
        const categoryDistribution = await db
            .select({
                categoryName: categories.name,
                count: count(medicines.id),
            })
            .from(categories)
            .leftJoin(medicines, eq(categories.id, medicines.categoryId))
            .groupBy(categories.name);

        // 4. Revenue Trends (Recent sales grouped by date)
        const revenueTrends = await db
            .select({
                date: sql<string>`DATE(${sales.createdAt})`,
                revenue: sum(sales.totalAmount),
            })
            .from(sales)
            .groupBy(sql`DATE(${sales.createdAt})`)
            .orderBy(sql`DATE(${sales.createdAt})`)
            .limit(7);

        // 5. Recent Sales & Notifications
        const recentSales = await db
            .select({
                id: sales.id,
                invoiceNumber: sales.receiptNumber,   // receiptNumber is always populated; invoiceNumber is a legacy nullable alias
                totalAmount: sales.totalAmount,
                paymentMethod: sales.paymentMethod,
                createdAt: sales.createdAt,
            })
            .from(sales)
            .orderBy(desc(sales.createdAt))
            .limit(5);

        const recentNotifications = await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.createdAt))
            .limit(5);

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                metrics: {
                    totalRevenue,
                    totalSales,
                    totalMedicines,
                    lowStockCount: lowStockQuery.length,
                },
                lowStockItems: lowStockQuery,
                categoryDistribution: categoryDistribution.map(c => ({ name: c.categoryName, value: Number(c.count) })),
                revenueTrends: revenueTrends.map(r => ({ date: r.date, revenue: Number(r.revenue || 0) })),
                recentSales,
                recentNotifications,
            },
        });
    } catch (error) {
        next(error);
    }
};