import { Router } from 'express';
import { register, login, refreshToken, logout, resetPassword, getAllUsers, toggleUserActive, deleteUser } from '../controllers/authController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/roles.js';

const router = Router();

router.post('/register', authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/reset-password', authenticateToken, resetPassword);

router.get('/users', authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), getAllUsers);
router.put('/users/:id/status', authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), toggleUserActive);
router.delete('/users/:id', authenticateToken, requirePermission(PERMISSIONS.MANAGE_USERS), deleteUser);

export default router;