import { Router } from 'express';
import { getAllSettings, updateSettings } from '../controllers/settingsController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.route('/')
    .get(authenticateToken, getAllSettings)
    .put(authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), updateSettings);

export default router;