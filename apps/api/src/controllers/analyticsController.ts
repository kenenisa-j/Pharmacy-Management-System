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

        // 3. Category Distribution (Count of medicines per category, sorted by active inventory)
        const categoryDistribution = await db
            .select({
                categoryName: categories.name,
                count: count(medicines.id),
                totalStock: sql<number>`COALESCE(SUM(${inventory.stockQuantity}), 0)`,
            })
            .from(categories)
            .leftJoin(medicines, eq(categories.id, medicines.categoryId))
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .groupBy(categories.name)
            .orderBy(desc(count(medicines.id)), desc(sql`COALESCE(SUM(${inventory.stockQuantity}), 0)`));

        // 4. Revenue Trends (Most recent sales grouped by date in local Ethiopia timezone)
        const period = (req.query.period as string) || '7d';
        let limitDays = 7;
        if (period === '30d') limitDays = 30;
        else if (period === '90d') limitDays = 90;

        const recentRevenueTrends = await db
            .select({
                date: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD')`,
                revenue: sum(sales.totalAmount),
            })
            .from(sales)
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD')`)
            .orderBy(desc(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD')`))
            .limit(limitDays);

        // Reverse to ensure chronological order from left to right on the chart
        const revenueTrends = recentRevenueTrends.reverse();

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