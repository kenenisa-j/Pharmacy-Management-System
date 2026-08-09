import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, medicines, categories, suppliers, inventory } from 'database';
import { eq, ilike, or, desc, lte, and, sql } from 'drizzle-orm';
import bwipjs from 'bwip-js';
import { AppError } from '../utils/AppError.js';

// Get all medicines with advanced search, filters, and pagination
export const getAllMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            search,
            categoryId,
            supplierId,
            filter, // e.g., 'low-stock' or 'expired'
            page = '1',
            limit = '10'
        } = req.query;

        const pageNumber = Math.max(1, parseInt(page as string, 10));
        const pageSize = Math.max(1, parseInt(limit as string, 10));
        const offset = (pageNumber - 1) * pageSize;

        // Build dynamic conditions array
        const conditions = [];

        if (search) {
            const searchTerm = `%${search}%`;
            conditions.push(
                or(
                    ilike(medicines.name, searchTerm),
                    ilike(medicines.genericName, searchTerm),
                    ilike(medicines.brand, searchTerm),
                    ilike(medicines.barcode, searchTerm)
                )
            );
        }

        if (categoryId) {
            conditions.push(eq(medicines.categoryId, categoryId as string));
        }

        if (supplierId) {
            conditions.push(eq(medicines.supplierId, supplierId as string));
        }

        if (filter === 'low-stock') {
            conditions.push(lte(inventory.stockQuantity, medicines.minStockLevel));
        } else if (filter === 'expired') {
            conditions.push(lte(medicines.expiryDate, new Date().toISOString().split('T')[0]));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 1. Fetch paginated records
        const resultsQuery = db
            .select({
                id: medicines.id,
                name: medicines.name,
                genericName: medicines.genericName,
                brandName: medicines.brand,
                barcode: medicines.barcode,
                batchNumber: medicines.batchNumber,
                unitPrice: medicines.costPrice,
                sellingPrice: medicines.unitPrice,
                stock: inventory.stockQuantity,
                minStockLevel: medicines.minStockLevel,
                expiryDate: medicines.expiryDate,
                categoryId: medicines.categoryId,
                supplierId: medicines.supplierId,
                category: categories.name,
                supplier: suppliers.name,
            })
            .from(medicines)
            .leftJoin(categories, eq(medicines.categoryId, categories.id))
            .leftJoin(suppliers, eq(medicines.supplierId, suppliers.id))
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(whereClause)
            .orderBy(desc(medicines.createdAt))
            .limit(pageSize)
            .offset(offset);

        // 2. Fetch total count for pagination metadata
        const countQuery = db
            .select({ count: sql<number>`count(*)` })
            .from(medicines)
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(whereClause);

        const [results, countResult] = await Promise.all([resultsQuery, countQuery]);
        const totalCount = Number(countResult[0]?.count || 0);

        res.status(StatusCodes.OK).json({
            status: 'success',
            meta: {
                total: totalCount,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(totalCount / pageSize),
            },
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// Get single medicine by ID
export const getMedicineById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const [medicine] = await db
            .select({
                id: medicines.id,
                name: medicines.name,
                genericName: medicines.genericName,
                brandName: medicines.brand,
                barcode: medicines.barcode,
                batchNumber: medicines.batchNumber,
                unitPrice: medicines.costPrice,
                sellingPrice: medicines.unitPrice,
                stock: inventory.stockQuantity,
                minStockLevel: medicines.minStockLevel,
                expiryDate: medicines.expiryDate,
                categoryId: medicines.categoryId,
                supplierId: medicines.supplierId,
            })
            .from(medicines)
            .leftJoin(inventory, eq(medicines.id, inventory.medicineId))
            .where(eq(medicines.id, id as string))
            .limit(1);

        if (!medicine) {
            return next(new AppError('Medicine not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: medicine,
        });
    } catch (error) {
        next(error);
    }
};

// Create new medicine item
export const createMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            genericName,
            brandName,
            barcode,
            batchNumber,
            categoryId,
            manufacturer,
            supplierId,
            unitPrice,
            sellingPrice,
            stock,
            minStockLevel,
            expiryDate,
        } = req.body;

        // Check if barcode already exists
        if (barcode) {
            const existing = await db.select().from(medicines).where(eq(medicines.barcode, barcode)).limit(1);
            if (existing.length > 0) {
                return next(new AppError('A medicine with this barcode already exists', StatusCodes.BAD_REQUEST));
            }
        }

        const [newMedicine] = await db.insert(medicines).values({
            name,
            genericName,
            brand: brandName,
            barcode,
            batchNumber,
            categoryId,
            manufacturerId: manufacturer,
            supplierId,
            unitPrice: sellingPrice.toString(),
            costPrice: unitPrice.toString(),
            minStockLevel: Number(minStockLevel || 10),
            expiryDate: new Date(expiryDate).toISOString().split('T')[0],
        }).returning();

        // Create inventory record
        await db.insert(inventory).values({
            medicineId: newMedicine.id,
            stockQuantity: Number(stock || 0),
            locationInStore: 'Main Shelf',
        });

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Medicine added successfully to catalog',
            data: {
                ...newMedicine,
                brandName: newMedicine.brand,
                unitPrice: newMedicine.costPrice,
                sellingPrice: newMedicine.unitPrice,
                stock: Number(stock || 0),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Update medicine record
export const updateMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const updates: any = {};

        if (body.name !== undefined) updates.name = body.name;
        if (body.genericName !== undefined) updates.genericName = body.genericName;
        if (body.brandName !== undefined) updates.brand = body.brandName;
        if (body.barcode !== undefined) updates.barcode = body.barcode;
        if (body.batchNumber !== undefined) updates.batchNumber = body.batchNumber;
        if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
        if (body.manufacturer !== undefined) updates.manufacturerId = body.manufacturer;
        if (body.supplierId !== undefined) updates.supplierId = body.supplierId;
        if (body.sellingPrice !== undefined) updates.unitPrice = body.sellingPrice.toString();
        if (body.unitPrice !== undefined) updates.costPrice = body.unitPrice.toString();
        if (body.minStockLevel !== undefined) updates.minStockLevel = Number(body.minStockLevel);
        if (body.expiryDate !== undefined) updates.expiryDate = new Date(body.expiryDate).toISOString().split('T')[0];
        updates.updatedAt = new Date();

        const [updatedMedicine] = await db
            .update(medicines)
            .set(updates)
            .where(eq(medicines.id, id as string))
            .returning();

        if (!updatedMedicine) {
            return next(new AppError('Medicine not found', StatusCodes.NOT_FOUND));
        }

        if (body.stock !== undefined) {
            await db
                .update(inventory)
                .set({ stockQuantity: Number(body.stock), updatedAt: new Date() })
                .where(eq(inventory.medicineId, id as string));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Medicine updated successfully',
            data: updatedMedicine,
        });
    } catch (error) {
        next(error);
    }
};

// Delete medicine record
export const deleteMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const [deleted] = await db.delete(medicines).where(eq(medicines.id, id as string)).returning();

        if (!deleted) {
            return next(new AppError('Medicine not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Medicine removed from catalog',
        });
    } catch (error) {
        next(error);
    }
};

// Generate printable barcode image on the fly
export const generateBarcodeImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text } = req.params;

        if (!text) {
            return next(new AppError('Barcode text is required', StatusCodes.BAD_REQUEST));
        }

        bwipjs.toBuffer(
            {
                bcid: 'code128', // Barcode type
                text: text as string,      // Text to encode
                scale: 3,        // Scaling factor
                height: 10,      // Bar height, in millimeters
                includetext: true, // Show human-readable text
                textxalign: 'center',
            },
            (err, png) => {
                if (err) {
                    return next(new AppError('Failed to generate barcode', StatusCodes.INTERNAL_SERVER_ERROR));
                }

                res.setHeader('Content-Type', 'image/png');
                res.status(StatusCodes.OK).send(png);
            }
        );
    } catch (error) {
        next(error);
    }
};