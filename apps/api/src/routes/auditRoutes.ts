import { Router } from 'express';
import { getAllAuditLogs } from '../controllers/auditController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.get('/', authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), getAllAuditLogs);

export default router;