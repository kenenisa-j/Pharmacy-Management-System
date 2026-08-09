import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, customers, customerPrescriptions, sales } from 'database';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Get all customers with search support
export const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        let query = db.select().from(customers).$dynamic();

        if (search) {
            const searchTerm = `%${search}%`;
            query = query.where(
                or(
                    ilike(customers.name, searchTerm),
                    ilike(customers.phone, searchTerm),
                    ilike(customers.email, searchTerm)
                )
            );
        }

        const results = await query.orderBy(desc(customers.createdAt));

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// Get single customer profile with purchase history and prescriptions
export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, id))
            .limit(1);

        if (!customer) {
            return next(new AppError('Customer not found', StatusCodes.NOT_FOUND));
        }

        // Fetch customer purchase history
        const purchaseHistory = await db
            .select()
            .from(sales)
            .where(eq(sales.customerPhone, customer.phone))
            .orderBy(desc(sales.createdAt));

        // Fetch linked prescriptions
        const prescriptions = await db
            .select()
            .from(customerPrescriptions)
            .where(eq(customerPrescriptions.customerId, id))
            .orderBy(desc(customerPrescriptions.createdAt));

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: {
                ...customer,
                purchaseHistory,
                prescriptions,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create new customer profile
export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, phone, email, address } = req.body;

        if (!name || !phone) {
            return next(new AppError('Customer name and phone number are required', StatusCodes.BAD_REQUEST));
        }

        const [existing] = await db
            .select()
            .from(customers)
            .where(eq(customers.phone, phone))
            .limit(1);

        if (existing) {
            return next(new AppError('A customer with this phone number already exists', StatusCodes.BAD_REQUEST));
        }

        const [newCustomer] = await db
            .insert(customers)
            .values({
                name,
                phone,
                email: email || null,
                address: address || null,
            })
            .returning();

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Customer registered successfully',
            data: newCustomer,
        });
    } catch (error) {
        next(error);
    }
};

// Update customer details & credit balance
export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { name, phone, email, address, outstandingBalance } = req.body;

        const updates: any = { updatedAt: new Date() };
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (address !== undefined) updates.address = address;
        if (outstandingBalance !== undefined) updates.outstandingBalance = outstandingBalance.toString();

        const [updated] = await db
            .update(customers)
            .set(updates)
            .where(eq(customers.id, id))
            .returning();

        if (!updated) {
            return next(new AppError('Customer not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Customer profile updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

// Link a prescription to a customer profile
export const addCustomerPrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string; // customerId
        const { doctorName, prescriptionNumber, notes, imageUrl } = req.body;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, id))
            .limit(1);

        if (!customer) {
            return next(new AppError('Customer not found', StatusCodes.NOT_FOUND));
        }

        const [newPrescription] = await db
            .insert(customerPrescriptions)
            .values({
                customerId: id,
                doctorName: doctorName || null,
                prescriptionNumber: prescriptionNumber || null,
                notes: notes || null,
                imageUrl: imageUrl || null,
                isVerified: 1,
            })
            .returning();

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Prescription successfully linked to customer',
            data: newPrescription,
        });
    } catch (error) {
        next(error);
    }
};