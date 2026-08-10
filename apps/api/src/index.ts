import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { StatusCodes } from 'http-status-codes';
import { env } from './config/env.js';
import { AppError } from './utils/AppError.js';
import authRouter from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import analyticsRouter from './routes/analyticsRoutes.js';
import medicineRouter from './routes/medicineRoutes.js';
import inventoryRouter from './routes/inventoryRoutes.js';
import supplierRouter from './routes/supplierRoutes.js';
import purchaseOrderRouter from './routes/purchaseOrderRoutes.js';
import salesRouter from './routes/salesRoutes.js';
import customerRouter from './routes/customerRoutes.js';
import prescriptionRouter from './routes/prescriptionRoutes.js';

import notificationRouter from './routes/notificationRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import settingsRouter from './routes/settingsRoutes.js';
import auditRouter from './routes/auditRoutes.js';

const app = express();

// ──────────────────────────────────────────────
// 1. Global Middleware (order matters!)
// ──────────────────────────────────────────────

// CORS Configuration (Allowing Next.js frontend origin)
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:3002'];
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser tools (Postman, mobile apps, curl) with no origin
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                // Reject silently instead of throwing — Express 5 propagates
                // thrown errors and can crash the server
                console.warn(`⚠️ CORS: blocked request from origin: ${origin}`);
                callback(null, false);
            }
        },
        credentials: true,
    })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser (must be before routes that read cookies)
app.use(cookieParser());

// HTTP Request Logging
app.use(morgan('dev'));

// ──────────────────────────────────────────────
// 2. Health Check
// ──────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Pharmacy API is healthy',
        timestamp: new Date().toISOString(),
    });
});

// ──────────────────────────────────────────────
// 3. API Routes
// ──────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/medicines', medicineRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/purchase-orders', purchaseOrderRouter);
app.use('/api/sales', salesRouter);
app.use('/api/customers', customerRouter);
app.use('/api/prescriptions', prescriptionRouter);
app.use('/api/reports', reportRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/notifications', notificationRouter);

// NOTE: Prescription files are NOT served statically.
// They are streamed through the authenticated endpoint: GET /api/prescriptions/view/:filename
// This prevents unauthenticated access to patient PHI documents (HIPAA compliance).

// ──────────────────────────────────────────────
// 4. Handle Unhandled Routes (404)
// ──────────────────────────────────────────────
app.all('{*path}', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, StatusCodes.NOT_FOUND));
});

// ──────────────────────────────────────────────
// 5. Global Error Handling Middleware
// ──────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    err.status = err.status || 'error';

    if (env.nodeEnv === 'development') {
        console.error('❌ ERROR Details:', err);
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        // Production response (don't leak stack traces)
        res.status(err.statusCode).json({
            status: err.status,
            message: err.isOperational ? err.message : 'Something went very wrong!',
        });
    }
});

// Start Server
app.listen(env.port, () => {
    console.log(`🚀 Pharmacy API server running on http://localhost:${env.port} in ${env.nodeEnv} mode`);
});