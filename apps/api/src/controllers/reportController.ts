import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, sales, saleItems, medicines, customers, suppliers, inventory, categories, users } from 'database';
import { sql, desc, eq, sum, inArray, and, gte, lte } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
// @ts-ignore - no type declarations available for json2csv
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Get detailed periodic sales report (Today, This Week, This Month) with item quantities and revenue
export const getSalesPeriodReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const period = ((req.query.period as string) || 'today').toLowerCase(); // 'today', 'week', 'month'
        const customDate = req.query.date as string | undefined; // optional 'YYYY-MM-DD'

        // Determine date range using indexed Date comparisons (avoids slow SQL function table scans)
        let timeCondition: any;
        if (customDate) {
            const start = new Date(customDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customDate);
            end.setHours(23, 59, 59, 999);
            timeCondition = and(gte(sales.createdAt, start), lte(sales.createdAt, end));
        } else if (period === 'week') {
            const start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
            timeCondition = gte(sales.createdAt, start);
        } else if (period === 'month') {
            const start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
            timeCondition = gte(sales.createdAt, start);
        } else {
            // Default: today (start of day)
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            timeCondition = gte(sales.createdAt, start);
        }

        // 1. Fetch sales within period using indexed B-tree scan
        const periodSales = await db
            .select({
                id: sales.id,
                receiptNumber: sales.receiptNumber,
                customerName: sales.customerName,
                customerPhone: sales.customerPhone,
                subtotal: sales.subtotal,
                discountAmount: sales.discountAmount,
                totalAmount: sales.totalAmount,
                paymentMethod: sales.paymentMethod,
                cashierId: sales.cashierId,
                cashierEmail: users.email,
                createdAt: sales.createdAt,
            })
            .from(sales)
            .leftJoin(users, eq(sales.cashierId, users.id))
            .where(timeCondition)
            .orderBy(desc(sales.createdAt))
            .limit(100);

        // If no sales exist in this period, return immediately without further DB queries
        if (periodSales.length === 0) {
            return res.status(StatusCodes.OK).json({
                status: 'success',
                data: {
                    period,
                    summary: {
                        totalRevenue: 0,
                        totalQuantity: 0,
                        totalSalesCount: 0,
                        averageOrderValue: 0,
                        soldOutMedicinesCount: 0,
                    },
                    itemsSold: [],
                    soldOutCatalog: [],
                    salesList: [],
                },
            });
        }

        const periodSaleIds = periodSales.map(s => s.id);

        // 2. Fetch sale items in a single indexed query and aggregate in-memory
        const [rawSaleItems, soldOutCatalog] = await Promise.all([
            db
                .select({
                    saleId: saleItems.saleId,
                    medicineId: saleItems.medicineId,
                    medicineName: medicines.name,
                    genericName: medicines.genericName,
                    categoryName: categories.name,
                    unitPrice: medicines.unitPrice,
                    minStockLevel: medicines.minStockLevel,
                    currentStock: inventory.stockQuantity,
                    quantity: saleItems.quantity,
                    totalPrice: saleItems.totalPrice,
                })
                .from(saleItems)
                .innerJoin(medicines, eq(saleItems.medicineId, medicines.id))
                .leftJoin(categories, eq(medicines.categoryId, categories.id))
                .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
                .where(inArray(saleItems.saleId, periodSaleIds)),

            db
                .select({
                    id: medicines.id,
                    name: medicines.name,
                    categoryName: categories.name,
                    stockQuantity: inventory.stockQuantity,
                })
                .from(medicines)
                .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
                .leftJoin(categories, eq(medicines.categoryId, categories.id))
                .where(sql`${inventory.stockQuantity} <= 0 OR ${inventory.stockQuantity} IS NULL`)
                .limit(10)
        ]);

        const saleItemsMap = new Map<string, string[]>();
        const itemsMap = new Map<string, any>();

        for (const item of rawSaleItems) {
            // Group items per receipt
            const list = saleItemsMap.get(item.saleId) || [];
            list.push(`${item.medicineName} x${item.quantity}`);
            saleItemsMap.set(item.saleId, list);

            // Aggregate items sold
            const curStock = Number(item.currentStock ?? 0);
            const minStock = Number(item.minStockLevel ?? 10);
            const existing = itemsMap.get(item.medicineId) || {
                medicineId: item.medicineId,
                medicineName: item.medicineName,
                genericName: item.genericName,
                categoryName: item.categoryName || 'Uncategorized',
                unitPrice: item.unitPrice,
                minStockLevel: minStock,
                currentStock: curStock,
                quantitySold: 0,
                totalRevenue: 0,
                isSoldOut: curStock <= 0,
                isLowStock: curStock > 0 && curStock <= minStock,
            };

            existing.quantitySold += Number(item.quantity || 0);
            existing.totalRevenue += Number(item.totalPrice || (Number(item.quantity || 0) * Number(item.unitPrice || 0)));
            itemsMap.set(item.medicineId, existing);
        }

        const itemsSold = Array.from(itemsMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);

        // 3. Compute summary metrics in-memory
        const totalRevenue = periodSales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
        const totalQuantity = itemsSold.reduce((acc, it) => acc + it.quantitySold, 0);
        const totalSalesCount = periodSales.length;
        const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        const salesWithItems = periodSales.map(s => ({
            ...s,
            itemsSummary: (saleItemsMap.get(s.id) || []).join(', ') || 'No item detail recorded',
        }));

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                period,
                summary: {
                    totalRevenue,
                    totalQuantity,
                    totalSalesCount,
                    averageOrderValue,
                    soldOutMedicinesCount: soldOutCatalog.length,
                },
                itemsSold,
                soldOutCatalog,
                salesList: salesWithItems,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get comprehensive analytical metrics
export const getAnalyticsDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Total Revenue & Profit
        const [salesSummary] = await db
            .select({
                totalRevenue: sum(sales.totalAmount),
                totalSalesCount: sql<number>`count(*)`
            })
            .from(sales);

        // Total Inventory Value & Stock Count
        const [inventorySummary] = await db
            .select({
                totalStock: sum(inventory.stockQuantity),
                totalItems: sql<number>`count(*)`
            })
            .from(inventory);

        // Recent Sales for graph/trends
        const recentSales = await db
            .select()
            .from(sales)
            .orderBy(desc(sales.createdAt))
            .limit(10);

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                revenue: Number(salesSummary?.totalRevenue || 0),
                salesCount: Number(salesSummary?.totalSalesCount || 0),
                totalStock: Number(inventorySummary?.totalStock || 0),
                uniqueItems: Number(inventorySummary?.totalItems || 0),
                recentSales,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Export Sales Data as CSV
export const exportSalesCSV = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));

        const fields = ['receiptNumber', 'customerName', 'customerPhone', 'paymentMethod', 'totalAmount', 'createdAt'];
        const parser = new Parser({ fields });
        const csv = parser.parse(allSales);

        res.header('Content-Type', 'text/csv');
        res.attachment(`sales-report-${Date.now()}.csv`);
        return res.send(csv);
    } catch (error) {
        next(error);
    }
};

// Export Inventory as Excel
export const exportInventoryExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Join medicines with inventory and categories for full info
        const allMedicines = await db
            .select({
                name: medicines.name,
                categoryId: medicines.categoryId,
                stockQuantity: inventory.stockQuantity,
                costPrice: medicines.costPrice,
                unitPrice: medicines.unitPrice,
                batchNumber: medicines.batchNumber,
                categoryName: categories.name,
            })
            .from(medicines)
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .leftJoin(categories, eq(medicines.categoryId, categories.id));

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Inventory Report');

        sheet.columns = [
            { header: 'Medicine Name', key: 'name', width: 25 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Stock Qty', key: 'stock', width: 10 },
            { header: 'Cost Price', key: 'costPrice', width: 12 },
            { header: 'Selling Price', key: 'sellingPrice', width: 12 },
            { header: 'Batch Number', key: 'batchNumber', width: 15 },
        ];

        allMedicines.forEach(med => {
            sheet.addRow({
                name: med.name,
                category: med.categoryName || '',
                stock: med.stockQuantity ?? 0,
                costPrice: med.costPrice,
                sellingPrice: med.unitPrice,
                batchNumber: med.batchNumber,
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

// Export Sales Summary as PDF
export const exportSalesPDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(50);

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).text('Pharmacy Sales Performance Report', { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).text('Recent Transactions Summary:', { underline: true });
        doc.moveDown(1);

        allSales.forEach((sale, index) => {
            doc.fontSize(10).text(
                `${index + 1}. Receipt #${sale.receiptNumber} | Customer: ${sale.customerName || 'Walk-in'} | Total: Birr ${sale.totalAmount} | Method: ${sale.paymentMethod}`
            );
        });

        doc.end();
    } catch (error) {
        next(error);
    }
};