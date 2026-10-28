import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { db, appointments } from 'database';
import { eq, ilike, or, desc, and, gte, lte, sql } from 'drizzle-orm';
import { AppError } from '../utils/AppError.js';

// Get all appointments with optional search and filtering
export const getAllAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, doctor } = req.query;

        let query = db.select().from(appointments).$dynamic();

        const conditions = [];

        if (search) {
            const searchTerm = `%${search}%`;
            conditions.push(
                or(
                    ilike(appointments.patientName, searchTerm),
                    ilike(appointments.patientPhone, searchTerm),
                    ilike(appointments.reason, searchTerm)
                )
            );
        }

        if (doctor) {
            conditions.push(eq(appointments.doctorName, doctor as string));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const results = await query.orderBy(desc(appointments.appointmentDate));

        res.status(StatusCodes.OK).json({
            status: 'success',
            results: results.length,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// Get single appointment by ID
export const getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        const [appointment] = await db
            .select()
            .from(appointments)
            .where(eq(appointments.id, id))
            .limit(1);

        if (!appointment) {
            return next(new AppError('Appointment not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: appointment,
        });
    } catch (error) {
        next(error);
    }
};

// Create appointment with idempotency and double-booking conflict detection
export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            id,
            customerId,
            patientName,
            patientPhone,
            doctorName,
            appointmentDate,
            reason,
            notes,
            idempotencyKey,
            deviceId,
        } = req.body;

        if (!patientName || !appointmentDate) {
            return next(new AppError('Patient name and appointment date are required', StatusCodes.BAD_REQUEST));
        }

        const apptDate = new Date(appointmentDate);
        if (isNaN(apptDate.getTime())) {
            return next(new AppError('Invalid appointment date format', StatusCodes.BAD_REQUEST));
        }

        // 1. Idempotency check: by client ID or idempotencyKey
        if (id) {
            const [existingById] = await db
                .select()
                .from(appointments)
                .where(eq(appointments.id, id))
                .limit(1);

            if (existingById) {
                return res.status(StatusCodes.OK).json({
                    status: 'success',
                    message: 'Appointment already recorded (idempotent)',
                    data: existingById,
                });
            }
        }

        if (idempotencyKey) {
            const [existingByKey] = await db
                .select()
                .from(appointments)
                .where(eq(appointments.idempotencyKey, idempotencyKey))
                .limit(1);

            if (existingByKey) {
                return res.status(StatusCodes.OK).json({
                    status: 'success',
                    message: 'Appointment already processed (idempotent)',
                    data: existingByKey,
                });
            }
        }

        // 2. Conflict check: Check doctor overlap (within 30 minutes window)
        if (doctorName) {
            const windowStart = new Date(apptDate.getTime() - 30 * 60 * 1000);
            const windowEnd = new Date(apptDate.getTime() + 30 * 60 * 1000);

            const [conflict] = await db
                .select()
                .from(appointments)
                .where(
                    and(
                        eq(appointments.doctorName, doctorName),
                        gte(appointments.appointmentDate, windowStart),
                        lte(appointments.appointmentDate, windowEnd),
                        sql`${appointments.status} != 'CANCELLED'`
                    )
                )
                .limit(1);

            if (conflict) {
                return next(
                    new AppError(
                        `Dr. ${doctorName} already has a conflicting appointment at ${new Date(conflict.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please choose another time.`,
                        StatusCodes.CONFLICT
                    )
                );
            }
        }

        // 3. Insert record
        const insertValues: any = {
            customerId: customerId || null,
            patientName,
            patientPhone: patientPhone || null,
            doctorName: doctorName || null,
            appointmentDate: apptDate,
            reason: reason || null,
            notes: notes || null,
            idempotencyKey: idempotencyKey || null,
            deviceId: deviceId || null,
            createdBy: req.user?.userId || null,
        };

        if (id) {
            insertValues.id = id;
        }

        const [newAppointment] = await db
            .insert(appointments)
            .values(insertValues)
            .returning();

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'Appointment scheduled successfully',
            data: newAppointment,
        });
    } catch (error) {
        next(error);
    }
};

// Update appointment status
export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return next(new AppError('Invalid appointment status', StatusCodes.BAD_REQUEST));
        }

        const [updated] = await db
            .update(appointments)
            .set({ status, updatedAt: new Date() })
            .where(eq(appointments.id, id))
            .returning();

        if (!updated) {
            return next(new AppError('Appointment not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Appointment status updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};
