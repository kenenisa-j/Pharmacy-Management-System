import { Router } from 'express';
import {
    recordInventoryMovement,
    getInventoryAuditTrail,
} from '../controllers/inventoryController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';
import { getLowStockAlerts, getExpiryAlerts } from '../controllers/inventoryAlertsController.js';

const router = Router();

router.get('/alerts/low-stock', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getLowStockAlerts);
router.get('/alerts/expiry', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getExpiryAlerts);
router.post('/movement', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), recordInventoryMovement);
router.get('/audit-trail', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getInventoryAuditTrail);
router.get('/audit-trail/:medicineId', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getInventoryAuditTrail);

export default router;