import { Router } from 'express';
import { getAllSettings, updateSettings } from '../controllers/settingsController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    // Any authenticated user can read store settings (needed by cashiers for tax/currency)
    .get(authenticateToken, getAllSettings)
    // Only users with MANAGE_SETTINGS permission (Owner) can update settings
    .put(authenticateToken, requirePermission(PERMISSIONS.MANAGE_SETTINGS), updateSettings);

export default router;