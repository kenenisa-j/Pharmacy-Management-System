import { Router } from 'express';
import {
    getAllMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    generateBarcodeImage,
} from '../controllers/medicineController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

// Add this route before your /:id parameter routes to prevent conflict
router.get('/barcode/:text', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), generateBarcodeImage);

router.get('/', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllMedicines);
router.get('/:id', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getMedicineById);
router.post('/', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), createMedicine);
router.patch('/:id', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), updateMedicine);
router.delete('/:id', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), deleteMedicine);

export default router;