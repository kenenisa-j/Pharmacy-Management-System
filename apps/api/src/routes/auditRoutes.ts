import { Router } from 'express';
import { getAllAuditLogs } from '../controllers/auditController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

// Only users with VIEW_AUDIT_LOGS permission (Owner) can access audit records
router.get('/', authenticateToken, requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), getAllAuditLogs);

export default router;