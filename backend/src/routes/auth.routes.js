import { Router } from 'express';
import { login, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { loginSchema, changePasswordSchema } from '../schemas/auth.schema.js';
import { loginIpLimiter, loginAccountLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

router.post('/login', loginIpLimiter, loginAccountLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
