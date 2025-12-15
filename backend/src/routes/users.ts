import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAuthAndActive, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { audit } from '../middleware/audit.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    
    const filter: any = { organizationId: req.auth?.organizationId };
    
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };

    const [items, total] = await Promise.all([
      User.find(filter)
        .populate('organizationId', 'name category')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ name: 1 })
        .lean(),
      User.countDocuments(filter)
    ]);

    const sanitizedItems = items.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({ items: sanitizedItems, page, pageSize, total });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req: Request, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('organizationId', 'name category')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/', requireAdmin, [
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['PLATFORM_ADMIN', 'ORG_ADMIN', 'ORG_USER'])
], audit('User', 'CREATE', () => null, (req, result) => result), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email, organizationId: req.auth?.organizationId });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      organizationId: req.auth?.organizationId,
      organizationCategory: req.auth?.organizationCategory,
      name,
      email,
      passwordHash,
      role,
      isActive: true
    });

    const populatedUser = await User.findById(user._id)
      .populate('organizationId', 'name category')
      .lean();

    const { passwordHash: _, ...userWithoutPassword } = populatedUser as any;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', [
  body('name').optional().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['PLATFORM_ADMIN', 'ORG_ADMIN', 'ORG_USER']),
  body('isActive').optional().isBoolean()
], audit('User', 'UPDATE', async (req) => {
  return await User.findById(req.params.id).lean();
}, async (req, result) => {
  return await User.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };

    if (updateData.role && req.params.id !== req.auth?.userId && req.auth?.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Only platform admins can change user roles' });
    }

    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        organizationId: req.auth?.organizationId,
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('organizationId', 'name category')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.patch('/:id/password', [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    if (req.params.id !== req.auth?.userId && req.auth?.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.params.id, { passwordHash: newPasswordHash });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.delete('/:id', requireAdmin, audit('User', 'DELETE', async (req) => {
  return await User.findById(req.params.id).lean();
}, () => null), async (req: Request, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
