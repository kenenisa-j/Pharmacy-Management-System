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

        // Store the URL as the authenticated API endpoint instead of the public static path
        const fileUrl = `/api/prescriptions/view/${req.file.filename}`;

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

// Securely stream a prescription file — requires authenticated session
// Replaces the unauthenticated express.static(/uploads/prescriptions) mount
export const viewPrescriptionFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filename } = req.params;

        // Sanitize the filename to prevent path traversal attacks (e.g. ../../etc/passwd)
        const safeName = path.basename(filename as string);

        // Only allow files that match our generated naming pattern: rx-<digits>-<digits>.<ext>
        if (!/^rx-\d+-\d+\.(jpg|jpeg|png|pdf)$/i.test(safeName)) {
            return next(new AppError('Invalid or disallowed prescription filename', StatusCodes.BAD_REQUEST));
        }

        const filePath = path.join(process.cwd(), 'uploads', 'prescriptions', safeName);

        if (!fs.existsSync(filePath)) {
            return next(new AppError('Prescription file not found', StatusCodes.NOT_FOUND));
        }

        // Derive content type from extension
        const ext = path.extname(safeName).toLowerCase();
        const contentTypeMap: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.pdf': 'application/pdf',
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        // Prevent the browser from caching patient files
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Stream the file securely
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', () => {
            next(new AppError('Error streaming prescription file', StatusCodes.INTERNAL_SERVER_ERROR));
        });
        fileStream.pipe(res);
    } catch (error) {
        next(error);
    }
};