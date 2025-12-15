import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuthAndActive, requireAdmin } from '../middleware/auth.js';
import { UsersController } from '../controllers/usersController.js';
import { audit } from '../middleware/audit.js';
import { User } from '../models/User.model.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', UsersController.getAll);

router.get('/:id', UsersController.getById);

router.post('/', requireAdmin, [
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['PLATFORM_ADMIN', 'ORG_ADMIN', 'ORG_USER'])
], audit('User', 'CREATE', () => null, (req, result) => result), UsersController.create);

router.patch('/:id', [
  body('name').optional().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['PLATFORM_ADMIN', 'ORG_ADMIN', 'ORG_USER']),
  body('isActive').optional().isBoolean()
], audit('User', 'UPDATE', async (req) => {
  return await User.findById(req.params.id).lean();
}, async (req, result) => {
  return await User.findById(req.params.id).lean();
}), UsersController.update);

router.patch('/:id/password', [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 })
], UsersController.changePassword);

router.patch('/:id/toggle-status', requireAdmin, audit('User', 'UPDATE', async (req) => {
  return await User.findById(req.params.id).lean();
}, async (req, result) => {
  return await User.findById(req.params.id).lean();
}), UsersController.toggleStatus);

router.delete('/:id', requireAdmin, audit('User', 'DELETE', async (req) => {
  return await User.findById(req.params.id).lean();
}, () => null), UsersController.delete);

export default router;
