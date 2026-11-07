import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, auditLogs, sales, saleItems, medicines } from 'database';
import { desc, ilike, or, inArray, eq } from 'drizzle-orm';

// Helper function to log critical system actions programmatically
export const logAuditAction = async (
    userId: string | undefined,
    userName: string | undefined,
    action: string,
    details: string,
    req?: Request
) => {
    try {
        const rawIp = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() : 'Unknown';
        // Normalize: ::1 → 127.0.0.1, ::ffff:x.x.x.x → x.x.x.x
        const ipAddress = rawIp
            ? rawIp === '::1' ? '127.0.0.1' : rawIp.replace(/^::ffff:/, '')
            : null;
        const userAgent = req ? req.headers['user-agent'] : 'Unknown';

        await db.insert(auditLogs).values({
            userId: userId || 'System',
            userName: userName || 'System Actor',
            action,
            details,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
        });
    } catch (error) {
        console.error('Failed to record audit log:', error);
    }
};

// Get all audit logs with optional search filter and sale details enrichment
export const getAllAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        let query = db.select().from(auditLogs).$dynamic();

        if (search) {
            const searchTerm = `%${search}%`;
            query = query.where(
                or(
                    ilike(auditLogs.userName, searchTerm),
                    ilike(auditLogs.action, searchTerm),
                    ilike(auditLogs.details, searchTerm)
                )
            );
        }

        const rawResults = await query.orderBy(desc(auditLogs.createdAt)).limit(100);

        // Extract receipt numbers for logs that need item details enrichment
        const receiptMatches = new Map<string, string>(); // log.id -> receiptNumber
        for (const log of rawResults) {
            if (log.details && !log.details.startsWith('Sold:')) {
                const match = log.details.match(/#(INV-[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)/i);
                if (match && match[1]) {
                    receiptMatches.set(log.id, match[1]);
                }
            }
        }

        // Query sale items for found receipts
        const receiptNumbers = Array.from(new Set(receiptMatches.values()));
        const receiptDetailsMap = new Map<string, { items: string[]; total: string; method: string }>();

        if (receiptNumbers.length > 0) {
            try {
                const saleRows = await db
                    .select({
                        receiptNumber: sales.receiptNumber,
                        medicineName: medicines.name,
                        quantity: saleItems.quantity,
                        totalAmount: sales.totalAmount,
                        paymentMethod: sales.paymentMethod,
                    })
                    .from(sales)
                    .innerJoin(saleItems, eq(sales.id, saleItems.saleId))
                    .innerJoin(medicines, eq(saleItems.medicineId, medicines.id))
                    .where(inArray(sales.receiptNumber, receiptNumbers));

                for (const row of saleRows) {
                    const existing = receiptDetailsMap.get(row.receiptNumber) || {
                        items: [],
                        total: row.totalAmount,
                        method: row.paymentMethod,
                    };
                    existing.items.push(`${row.medicineName} x${row.quantity}`);
                    receiptDetailsMap.set(row.receiptNumber, existing);
                }
            } catch (err) {
                console.warn('Could not enrich legacy sale receipts in audit log:', err);
            }
        }

        // Format and clean details: replace '$' with 'Birr', shorten, and show what was sold
        const formattedResults = rawResults.map(log => {
            let details = log.details || '';

            const receiptNo = receiptMatches.get(log.id);
            if (receiptNo && receiptDetailsMap.has(receiptNo)) {
                const enriched = receiptDetailsMap.get(receiptNo)!;
                details = `Sold: ${enriched.items.join(', ')} • Birr ${Number(enriched.total).toFixed(2)} via ${enriched.method}`;
            } else {
                // Replace any '$' with 'Birr '
                details = details.replace(/\$([0-9]+(?:\.[0-9]+)?)/g, 'Birr $1');
                details = details.replace(/\$/g, 'Birr ');
                // Clean verbose legacy boilerplate: "Processed sale receipt #... amounting to Birr ..."
                const legacyMatch = details.match(/Processed (?:sale receipt|retail order) #([A-Za-z0-9-]+) amounting to (Birr\s+[0-9.]+)/i);
                if (legacyMatch) {
                    const payMatch = details.match(/\bvia\s+(CASH|CARD|MOBILE_MONEY)\b/i);
                    details = `Order #${legacyMatch[1]} • ${legacyMatch[2]}${payMatch ? ` via ${payMatch[1]}` : ''}`;
                }
            }

            return {
                ...log,
                details,
            };
        });

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: formattedResults.length,
            data: formattedResults,
        });
    } catch (error) {
        next(error);
    }
};