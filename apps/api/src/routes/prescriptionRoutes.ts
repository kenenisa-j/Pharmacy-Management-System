import { Router } from 'express';
import {
    uploadPrescriptionFile,
    uploadAndAttachPrescription,
    getAllPrescriptions,
    viewPrescriptionFile,
} from '../controllers/prescriptionController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), getAllPrescriptions)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), uploadPrescriptionFile, uploadAndAttachPrescription);

// Secure authenticated endpoint to stream prescription files (replaces public static mount)
router.get('/view/:filename', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), viewPrescriptionFile);

export default router;