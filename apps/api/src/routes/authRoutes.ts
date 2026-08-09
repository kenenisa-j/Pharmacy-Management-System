import { Router } from 'express';
import { register, login, refreshToken, logout, resetPassword, getAllUsers, toggleUserActive, deleteUser } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/reset-password', authenticateToken, resetPassword);

router.get('/users', authenticateToken, getAllUsers);
router.put('/users/:id/status', authenticateToken, toggleUserActive);
router.delete('/users/:id', authenticateToken, deleteUser);

export default router;