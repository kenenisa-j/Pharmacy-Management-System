import { Router } from 'express';
import {
    getAllNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '../controllers/notificationController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.get('/', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), getAllNotifications);
// NOTE: /read-all MUST be declared before /:id/read — otherwise Express matches "read-all" as the :id param
router.patch('/read-all', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), markAllNotificationsAsRead);
router.patch('/:id/read', authenticateToken, requirePermission(PERMISSIONS.VIEW_INVENTORY), markNotificationAsRead);

export default router;