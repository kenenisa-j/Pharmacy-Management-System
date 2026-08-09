import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, auditLogs } from 'database';
import { desc, ilike, or } from 'drizzle-orm';

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

// Get all audit logs with optional search filter
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

        const results = await query.orderBy(desc(auditLogs.createdAt)).limit(100);

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};