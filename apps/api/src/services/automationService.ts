import { db, medicines, notifications, auditLogs, inventory } from 'database';
import { eq, sql } from 'drizzle-orm';
import { Request } from 'express';

interface SaleItemPayload {
    medicineId: string;
    quantity: number;
}

export const processSaleAutomation = async (
    items: SaleItemPayload[],
    receiptNumber: string,
    totalAmount: number,
    userId?: string,
    userName?: string,
    req?: Request
) => {
    try {
        for (const item of items) {
            // 1. Fetch current medicine + inventory stock details
            const [medicine] = await db
                .select({ id: medicines.id, name: medicines.name })
                .from(medicines)
                .where(eq(medicines.id, item.medicineId))
                .limit(1);

            if (!medicine) continue;

            const [invRecord] = await db
                .select({ stockQuantity: inventory.stockQuantity })
                .from(inventory)
                .where(eq(inventory.medicineId, item.medicineId))
                .limit(1);

            const currentStock = Number(invRecord?.stockQuantity || 0);
            const newStock = Math.max(0, currentStock - item.quantity);

            // 2. Automatically update inventory stock in inventory table
            await db
                .update(inventory)
                .set({ stockQuantity: newStock, updatedAt: new Date() })
                .where(eq(inventory.medicineId, item.medicineId));

            // 3. Check for Low Stock trigger threshold (e.g., stock <= 10 or custom minimum)
            const lowStockThreshold = 10;
            if (newStock <= lowStockThreshold) {
                await db.insert(notifications).values({
                    title: 'Low Stock Alert',
                    message: `Medicine "${medicine.name}" has dropped to ${newStock} units remaining.`,
                    type: 'LOW_STOCK',
                    isRead: 0,
                });
            }
        }

        // 4. Create Notification for Successful Sale Transaction
        await db.insert(notifications).values({
            title: 'New Sale Recorded',
            message: `Receipt #${receiptNumber} processed successfully for ETB ${totalAmount.toFixed(2)}.`,
            type: 'PURCHASE',
            isRead: 0,
        });

        // 5. Record Automated Audit Log Entry
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() : '127.0.0.1';
        const userAgent = req ? req.headers['user-agent'] : 'System Automation';

        await db.insert(auditLogs).values({
            userId: userId || 'System',
            userName: userName || 'POS Cashier / System',
            action: 'AUTOMATED_SALE_TRIGGER',
            details: `Processed sale receipt #${receiptNumber} amounting to ETB ${totalAmount.toFixed(2)} with inventory synchronization.`,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
        });

        console.log(`[Automation] Successfully processed ripple effects for sale receipt #${receiptNumber}`);
    } catch (error) {
        console.error('[Automation Error] Failed to execute sale automation hooks:', error);
    }
};