import { Router } from 'express';
import {
    getAnalyticsDashboard,
    exportSalesCSV,
    exportInventoryExcel,
    exportSalesPDF,
} from '../controllers/reportController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

// Analytics — Owner + Pharmacist (VIEW_REPORTS)
router.get('/analytics', authenticateToken, requirePermission(PERMISSIONS.VIEW_REPORTS), getAnalyticsDashboard);

// Exports — Owner-only sensitive financial exports (MANAGE_SETTINGS covers owner)
// Inventory export available to Pharmacist too (VIEW_REPORTS)
router.get('/export/inventory/excel', authenticateToken, requirePermission(PERMISSIONS.VIEW_REPORTS), exportInventoryExcel);

// Sales exports — Owner only
router.get('/export/sales/csv', authenticateToken, requirePermission(PERMISSIONS.MANAGE_SETTINGS), exportSalesCSV);
router.get('/export/sales/pdf', authenticateToken, requirePermission(PERMISSIONS.MANAGE_SETTINGS), exportSalesPDF);

export default router;