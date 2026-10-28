import { Router } from 'express';
import {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllAppointments)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), createAppointment);

router.route('/:id')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAppointmentById);

router.route('/:id/status')
    .put(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), updateAppointmentStatus);

export default router;
