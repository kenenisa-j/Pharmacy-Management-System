import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { db, users, roles, employees } from 'database';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

// Helper: detect duplicate key violations from Drizzle/postgres errors
const isDuplicateKeyError = (err: any): boolean => {
    const msg = err?.message || err?.cause?.message || '';
    return msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate');
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, firstName, lastName, phone, roleName = 'CASHIER' } = req.body;

        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return next(new AppError('User with this email already exists', StatusCodes.BAD_REQUEST));
        }

        const roleRecord = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
        if (roleRecord.length === 0) {
            return next(new AppError(`Role '${roleName}' does not exist`, StatusCodes.BAD_REQUEST));
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Use a transaction so user + employee are created atomically
        const result = await db.transaction(async (tx) => {
            const [newUser] = await tx.insert(users).values({
                email,
                passwordHash,
                roleId: roleRecord[0].id,
            }).returning();

            await tx.insert(employees).values({
                userId: newUser.id,
                firstName,
                lastName,
                phone,
            });

            return newUser;
        });

        res.status(StatusCodes.CREATED).json({
            status: 'success',
            message: 'User registered successfully',
            data: { userId: result.id, email: result.email },
        });
    } catch (error: any) {
        if (isDuplicateKeyError(error)) {
            return next(new AppError('A user with this email already exists', StatusCodes.CONFLICT));
        }
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await db
            .select({
                id: users.id,
                email: users.email,
                passwordHash: users.passwordHash,
                isActive: users.isActive,
                role: roles.name,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.email, email))
            .limit(1);

        if (result.length === 0) {
            return next(new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED));
        }

        const user = result[0];

        if (!user.isActive) {
            return next(new AppError('Your account has been deactivated', StatusCodes.FORBIDDEN));
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return next(new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED));
        }

        const payload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Send refresh token securely via HttpOnly Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                accessToken,
                user: { id: user.id, email: user.email, role: user.role },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Read refresh token from cookies or request body fallback
        const token = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!token) {
            return next(new AppError('Refresh token is required', StatusCodes.BAD_REQUEST));
        }

        const payload = verifyRefreshToken(token);

        const newAccessToken = generateAccessToken({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        });

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: { accessToken: newAccessToken },
        });
    } catch (error) {
        return next(new AppError('Invalid or expired refresh token', StatusCodes.FORBIDDEN));
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Clear the HttpOnly refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (userRecord.length === 0) {
            return next(new AppError('User not found', StatusCodes.NOT_FOUND));
        }

        const user = userRecord[0];

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordValid) {
            return next(new AppError('Incorrect existing password', StatusCodes.UNAUTHORIZED));
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        await db
            .update(users)
            .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
            .where(eq(users.id, user.id));

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'Password reset successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await db
            .select({
                id: users.id,
                email: users.email,
                isActive: users.isActive,
                createdAt: users.createdAt,
                role: roles.name,
                firstName: employees.firstName,
                lastName: employees.lastName,
                phone: employees.phone,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .leftJoin(employees, eq(users.id, employees.userId))
            .orderBy(users.createdAt);

        res.status(StatusCodes.OK).json({
            status: 'success',
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

export const toggleUserActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;

        const [updated] = await db
            .update(users)
            .set({ isActive, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

        if (!updated) {
            return next(new AppError('User not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: `User account successfully ${isActive ? 'activated' : 'deactivated'}`,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Delete employee record first
        await db.delete(employees).where(eq(employees.userId, id));

        const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
        if (!deleted) {
            return next(new AppError('User not found', StatusCodes.NOT_FOUND));
        }

        res.status(StatusCodes.OK).json({
            status: 'success',
            message: 'User account removed successfully',
        });
    } catch (error) {
        next(error);
    }
};