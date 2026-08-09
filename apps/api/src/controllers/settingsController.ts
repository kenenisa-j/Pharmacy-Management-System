import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, storeSettings } from 'database';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Get all store settings
export const getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settingsList = await db.select().from(storeSettings);

        // Transform array into key-value map object for easy frontend consumption
        const settingsMap = settingsList.reduce((acc: Record<string, string>, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: settingsMap,
        });
    } catch (error) {
        next(error);
    }
};

// Update or insert store settings
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settingsObject = req.body; // e.g., { STORE_NAME: 'Denkinesh Pharmacy', TAX_RATE: '15', CURRENCY: 'USD' }

        for (const [key, value] of Object.entries(settingsObject)) {
            const stringValue = String(value);

            const [existing] = await db
                .select()
                .from(storeSettings)
                .where(eq(storeSettings.key, key))
                .limit(1);

            if (existing) {
                await db
                    .update(storeSettings)
                    .set({ value: stringValue, updatedAt: new Date() })
                    .where(eq(storeSettings.key, key));
            } else {
                await db.insert(storeSettings).values({
                    key,
                    value: stringValue,
                });
            }
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Store settings updated successfully',
        });
    } catch (error) {
        next(error);
    }
};