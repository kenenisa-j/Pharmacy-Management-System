import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, sales, saleItems, medicines, customers, suppliers, inventory, categories } from 'database';
import { sql, desc, eq, sum } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
// @ts-ignore - no type declarations available for json2csv
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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
                `${index + 1}. Receipt #${sale.receiptNumber} | Customer: ${sale.customerName || 'Walk-in'} | Total: $${sale.totalAmount} | Method: ${sale.paymentMethod}`
            );
        });

        doc.end();
    } catch (error) {
        next(error);
    }
};