import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, notifications } from 'database';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Helper function to trigger internal notifications programmatically across other modules
export const createNotificationRecord = async (title: string, message: string, type: 'LOW_STOCK' | 'EXPIRY' | 'PURCHASE' | 'PAYMENT') => {
    try {
        await db.insert(notifications).values({
            title,
            message,
            type,
            isRead: 0,
        });
    } catch (error) {
        console.error('Failed to create system notification:', error);
    }
};

// Get all system notifications
export const getAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.createdAt))
            .limit(50);

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [updated] = await db
            .update(notifications)
            .set({ isRead: 1 })
            .where(eq(notifications.id, id))
            .returning();

        if (!updated) {
            return next(new AppError('Notification not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Notification marked as read',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await db.update(notifications).set({ isRead: 1 });

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'All notifications marked as read',
        });
    } catch (error) {
        next(error);
    }
};