import { Router } from 'express';
import {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    receivePurchaseOrder,
    updateOrderStatus,
} from '../controllers/purchaseOrderController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllPurchaseOrders)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_PURCHASE_ORDERS), createPurchaseOrder);

router.get('/:id', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getPurchaseOrderById);

// Pharmacists can receive stock, but only Owner can approve/cancel
router.post('/:id/receive', authenticateToken, requirePermission(PERMISSIONS.RECEIVE_PURCHASE_ORDERS), receivePurchaseOrder);
router.patch('/:id/status', authenticateToken, requirePermission(PERMISSIONS.MANAGE_PURCHASE_ORDERS), updateOrderStatus);

export default router;