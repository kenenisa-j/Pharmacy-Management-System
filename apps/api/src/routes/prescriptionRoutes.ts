import { Router } from 'express';
import {
    uploadPrescriptionFile,
    uploadAndAttachPrescription,
    getAllPrescriptions,
} from '../controllers/prescriptionController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllPrescriptions)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), uploadPrescriptionFile, uploadAndAttachPrescription);

export default router;