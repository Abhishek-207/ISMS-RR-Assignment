import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { requireAuth, requireAuthAndActive, requireOrgAdmin, AuthRequest } from '../middleware/auth.js';
import { MaterialCategory } from '../models/Masters.js';
import { audit } from '../middleware/audit.js';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuthAndActive);

// Generic helpers
function paginateParams(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  return { page, pageSize };
}


// Get material categories
router.get('/material-categories', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize } = paginateParams(req);
    const filter: any = { organizationId: req.auth?.organizationId, isActive: true };
    
    if (req.query.q) {
      filter.name = { $regex: String(req.query.q), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      MaterialCategory.find(filter).skip((page - 1) * pageSize).limit(pageSize).sort({ name: 1 }).lean(),
      MaterialCategory.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get material categories error:', error);
    res.status(500).json({ error: 'Failed to fetch material categories' });
  }
});

// Create material category
router.post('/material-categories', requireOrgAdmin, [
  body('name').isLength({ min: 1 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await MaterialCategory.create({
      organizationId: req.auth?.organizationId,
      name: req.body.name,
      isActive: true
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create material category error:', error);
    res.status(500).json({ error: 'Failed to create material category' });
  }
});

// Update material category
router.patch('/material-categories/:id', requireOrgAdmin, [
  body('name').optional().isLength({ min: 1 }),
  body('isActive').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await MaterialCategory.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.auth?.organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Material category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Update material category error:', error);
    res.status(500).json({ error: 'Failed to update material category' });
  }
});

// Delete material category
router.delete('/material-categories/:id', requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const category = await MaterialCategory.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.auth?.organizationId },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Material category not found' });
    }

    res.json({ message: 'Material category deleted successfully' });
  } catch (error) {
    console.error('Delete material category error:', error);
    res.status(500).json({ error: 'Failed to delete material category' });
  }
});



export default router;
