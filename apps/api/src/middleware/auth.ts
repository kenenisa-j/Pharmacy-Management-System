import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { ROLE_PERMISSIONS } from '../config/roles.js';

// Extend Express Request type to include authenticated user data
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return next(new AppError('Access token missing or malformed', StatusCodes.UNAUTHORIZED));
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch (error) {
        return next(new AppError('Invalid or expired access token', StatusCodes.UNAUTHORIZED));
    }
};

// RBAC: Restrict route access to specific roles (e.g., ADMIN, OWNER, CASHIER)
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('User not authenticated', StatusCodes.UNAUTHORIZED));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', StatusCodes.FORBIDDEN));
        }

        next();
    };
};

// RBAC: Restrict route access based on fine-grained permissions
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('User not authenticated', StatusCodes.UNAUTHORIZED));
        }

        const userRole = req.user.role;
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        if (!permissions.includes(permission)) {
            return next(new AppError(`Forbidden: Requires permission '${permission}'`, StatusCodes.FORBIDDEN));
        }

        next();
    };
};