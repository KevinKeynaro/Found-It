import { Router } from 'express';
import { authenticate, enforcePasswordChange } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { uploadCsv } from '../middlewares/upload.js';
import { importRateLimiter } from '../middlewares/rateLimiters.js';
import validate from '../middlewares/validate.js';
import {
  createUserSchema,
  updateUserSchema,
} from '../schemas/users.schema.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  getImportTemplate,
  previewImport,
  importUsers,
  exportUsers,
} from '../controllers/users.controller.js';

const router = Router();

// Apply auth, password change enforcement, and admin role check to the whole router
router.use(authenticate, enforcePasswordChange, requireRole('admin'));

// Static routes declared BEFORE /:id
router.get('/import/template', getImportTemplate);
router.post('/import/preview', uploadCsv, previewImport);
router.post('/import', importRateLimiter, uploadCsv, importUsers);
router.get('/export', exportUsers);

// Collection and instance routes
router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);

router.get('/:id', getUser);
router.patch('/:id', validate(updateUserSchema), updateUser);
router.post('/:id/deactivate', deactivateUser);
router.post('/:id/activate', activateUser);
router.post('/:id/reset-password', resetUserPassword);

export default router;
