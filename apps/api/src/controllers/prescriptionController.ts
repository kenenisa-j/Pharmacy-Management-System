import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, customerPrescriptions, sales } from 'database';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage for prescription files (Images/PDFs)
const uploadDir = path.join(process.cwd(), 'uploads', 'prescriptions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `rx-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

export const uploadPrescriptionFile = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new AppError('Only image (JPEG/PNG) and PDF prescription files are allowed', StatusCodes.BAD_REQUEST));
    },
}).single('file');

// Upload and attach prescription to customer & sale reference
export const uploadAndAttachPrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId, saleId, doctorName, prescriptionNumber, notes } = req.body;

        if (!customerId) {
            return next(new AppError('Customer ID is required to link a prescription', StatusCodes.BAD_REQUEST));
        }

        if (!req.file) {
            return next(new AppError('Prescription document file (image or PDF) is required', StatusCodes.BAD_REQUEST));
        }

        const fileUrl = `/uploads/prescriptions/${req.file.filename}`;

        const [newPrescription] = await db
            .insert(customerPrescriptions)
            .values({
                customerId,
                doctorName: doctorName || null,
                prescriptionNumber: prescriptionNumber || `RX-${Date.now().toString().slice(-6)}`,
                notes: notes || null,
                imageUrl: fileUrl,
                isVerified: 1,
            })
            .returning();

        // If a saleId is provided, optionally link or log reference
        if (saleId) {
            await db
                .update(sales)
                .set({ notes: `Linked Rx#: ${newPrescription.prescriptionNumber}` })
                .where(eq(sales.id, saleId));
        }

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Prescription uploaded and attached successfully',
            data: newPrescription,
        });
    } catch (error) {
        next(error);
    }
};

// Get all verified prescriptions across the pharmacy
export const getAllPrescriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await db
            .select()
            .from(customerPrescriptions)
            .orderBy(desc(customerPrescriptions.createdAt))
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