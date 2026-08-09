import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, suppliers, medicines, inventoryTransactions } from 'database';
import { eq, ilike, or, desc, and, sql } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Get all suppliers with optional search
export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = req.query.search as string | undefined;

        let query = db.select().from(suppliers).$dynamic();

        if (search) {
            const searchTerm = `%${search}%`;
            query = query.where(
                or(
                    ilike(suppliers.name, searchTerm),
                    ilike(suppliers.contactPerson, searchTerm),
                    ilike(suppliers.email, searchTerm),
                    ilike(suppliers.phone, searchTerm)
                )
            );
        }

        const results = await query.orderBy(desc(suppliers.createdAt));

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// Get single supplier by ID with supplied catalog count
export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [supplier] = await db
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, id))
            .limit(1);

        if (!supplier) {
            return next(new AppError('Supplier not found', StatusCodes.NOT_FOUND));
        }

        // Fetch medicines linked to this supplier
        const suppliedMedicines = await db
            .select()
            .from(medicines)
            .where(eq(medicines.supplierId, id));

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                ...supplier,
                medicinesCount: suppliedMedicines.length,
                medicines: suppliedMedicines,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create new supplier
export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, contactPerson, email, phone, address } = req.body;

        if (!name) {
            return next(new AppError('Supplier name is required', StatusCodes.BAD_REQUEST));
        }

        // Check if supplier with same name already exists
        const [existing] = await db
            .select()
            .from(suppliers)
            .where(ilike(suppliers.name, name))
            .limit(1);

        if (existing) {
            return next(new AppError('A supplier with this name already exists', StatusCodes.BAD_REQUEST));
        }

        const [newSupplier] = await db
            .insert(suppliers)
            .values({
                name,
                contactPerson: contactPerson || null,
                email: email || null,
                phone: phone || null,
                address: address || null,
            })
            .returning();

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Supplier added successfully',
            data: newSupplier,
        });
    } catch (error) {
        next(error);
    }
};

// Update supplier details
export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const updates = req.body;

        updates.updatedAt = new Date();

        const [updatedSupplier] = await db
            .update(suppliers)
            .set(updates)
            .where(eq(suppliers.id, id))
            .returning();

        if (!updatedSupplier) {
            return next(new AppError('Supplier not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Supplier updated successfully',
            data: updatedSupplier,
        });
    } catch (error) {
        next(error);
    }
};

// Delete supplier
export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Optional check: ensure no products are actively tied to this supplier before deletion
        const linkedMedicines = await db
            .select({ id: medicines.id })
            .from(medicines)
            .where(eq(medicines.supplierId, id))
            .limit(1);

        if (linkedMedicines.length > 0) {
            return next(
                new AppError('Cannot delete supplier with active linked medicines in catalog. Reassign or delete them first.', StatusCodes.BAD_REQUEST)
            );
        }

        const [deleted] = await db
            .delete(suppliers)
            .where(eq(suppliers.id, id))
            .returning();

        if (!deleted) {
            return next(new AppError('Supplier not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Supplier removed successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get comprehensive supplier financial standing and purchase history
export const getSupplierFinancials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [supplier] = await db
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, id))
            .limit(1);

        if (!supplier) {
            return next(new AppError('Supplier not found', StatusCodes.NOT_FOUND));
        }

        // Fetch inventory purchase receive transactions linked to this supplier's medicines
        const purchaseHistory = await db
            .select({
                transactionId: inventoryTransactions.id,
                medicineName: medicines.name,
                quantityReceived: inventoryTransactions.quantityChange,
                referenceNumber: inventoryTransactions.referenceNumber,
                date: inventoryTransactions.createdAt,
                notes: inventoryTransactions.notes,
            })
            .from(inventoryTransactions)
            .innerJoin(medicines, eq(inventoryTransactions.medicineId, medicines.id))
            .where(
                and(
                    eq(medicines.supplierId, id),
                    eq(inventoryTransactions.type, 'PURCHASE_RECEIVE')
                )
            )
            .orderBy(desc(inventoryTransactions.createdAt));

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                supplierName: supplier.name,
                totalPurchasesRecorded: purchaseHistory.length,
                purchaseHistory,
            },
        });
    } catch (error) {
        next(error);
    }
};