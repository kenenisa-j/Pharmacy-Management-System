import { Router } from 'express';
import {
    searchPOSMedicines,
    createSale,
    getSalesHistory,
} from '../controllers/salesController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

// Catalog search — all roles with VIEW_INVENTORY (Owner, Pharmacist, Cashier)
router.get('/search', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), searchPOSMedicines);

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_SALES), getSalesHistory)
    // POST sale — PROCESS_SALE covers Cashier + Pharmacist + Owner
    .post(authenticateToken, requirePermission(PERMISSIONS.PROCESS_SALE), createSale);

export default router;