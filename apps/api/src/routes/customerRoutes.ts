import { Router } from 'express';
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    addCustomerPrescription,
} from '../controllers/customerController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllCustomers)
    .post(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), createCustomer);

router.route('/:id')
    .get(authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getCustomerById)
    .put(authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), updateCustomer);

router.post('/:id/prescriptions', authenticateToken, requirePermission(PERMISSIONS.MANAGE_INVENTORY), addCustomerPrescription);

export default router;