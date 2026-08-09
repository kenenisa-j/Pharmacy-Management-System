import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

// Secure endpoint: Requires authentication and sales/inventory permissions
router.get(
    '/dashboard',
    authenticateToken,
    requirePermission(PERMISSIONS.VIEW_SALES),
    getDashboardAnalytics
);

export default router;