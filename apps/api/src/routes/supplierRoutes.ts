import { Router } from 'express';
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierFinancials,
} from '../controllers/supplierController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_SUPPLIERS), getAllSuppliers)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), createSupplier);

// Financial balance is Owner-only (MANAGE_SUPPLIERS)
router.get('/:id/financials', authenticateToken, requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), getSupplierFinancials);

router.route('/:id')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_SUPPLIERS), getSupplierById)
    .put(authenticateToken, requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), updateSupplier)
    .delete(authenticateToken, requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), deleteSupplier);

export default router;