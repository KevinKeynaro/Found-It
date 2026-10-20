import { Router } from 'express';
import { authenticate, enforcePasswordChange } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import uploadPhoto from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import {
  createItemSchema,
  updateItemSchema,
  returnItemSchema,
} from '../schemas/items.schema.js';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  returnItem,
  reopenItem,
  deleteItem,
} from '../controllers/items.controller.js';

const router = Router();

// Gated by authentication and password change enforcement
router.use(authenticate, enforcePasswordChange);

router.get('/', listItems);
router.get('/:id', getItem);
router.post(
  '/',
  requireRole('teacher', 'admin'),
  uploadPhoto,
  validate(createItemSchema),
  createItem
);
router.patch(
  '/:id',
  requireRole('teacher', 'admin'),
  uploadPhoto,
  validate(updateItemSchema),
  updateItem
);
router.post(
  '/:id/return',
  requireRole('teacher', 'admin'),
  validate(returnItemSchema),
  returnItem
);
router.post('/:id/reopen', requireRole('teacher', 'admin'), reopenItem);
router.delete('/:id', deleteItem);

export default router;
