import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { requireAuth, requireAuthAndActive, requireOrgAdmin, AuthRequest } from '../middleware/auth.js';
import { MaterialCategory, MaterialStatus } from '../models/Masters.js';
import { audit } from '../middleware/audit.js';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuthAndActive);

function paginateParams(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  return { page, pageSize };
}

router.get('/material-categories', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize } = paginateParams(req);
    const filter: any = { organizationId: req.auth?.organizationId };
    
    if (req.query.includeInactive !== 'true') {
      filter.isActive = true;
    }
    
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

router.post('/material-categories', requireOrgAdmin, [
  body('name').isLength({ min: 1 }).trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = await MaterialCategory.findOne({
      organizationId: req.auth?.organizationId,
      name: { $regex: `^${req.body.name}$`, $options: 'i' }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
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

router.patch('/material-categories/:id', requireOrgAdmin, [
  body('name').optional().isLength({ min: 1 }).trim(),
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

router.get('/material-statuses', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize } = paginateParams(req);
    const filter: any = { organizationId: req.auth?.organizationId };
    
    if (req.query.includeInactive !== 'true') {
      filter.isActive = true;
    }
    
    if (req.query.q) {
      filter.name = { $regex: String(req.query.q), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      MaterialStatus.find(filter).skip((page - 1) * pageSize).limit(pageSize).sort({ name: 1 }).lean(),
      MaterialStatus.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get material statuses error:', error);
    res.status(500).json({ error: 'Failed to fetch material statuses' });
  }
});

router.post('/material-statuses', requireOrgAdmin, [
  body('name').isLength({ min: 1 }).trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = await MaterialStatus.findOne({
      organizationId: req.auth?.organizationId,
      name: { $regex: `^${req.body.name}$`, $options: 'i' }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Status with this name already exists' });
    }

    const status = await MaterialStatus.create({
      organizationId: req.auth?.organizationId,
      name: req.body.name,
      isActive: true
    });

    res.status(201).json(status);
  } catch (error) {
    console.error('Create material status error:', error);
    res.status(500).json({ error: 'Failed to create material status' });
  }
});

router.patch('/material-statuses/:id', requireOrgAdmin, [
  body('name').optional().isLength({ min: 1 }).trim(),
  body('isActive').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const status = await MaterialStatus.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.auth?.organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!status) {
      return res.status(404).json({ error: 'Material status not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Update material status error:', error);
    res.status(500).json({ error: 'Failed to update material status' });
  }
});

router.delete('/material-statuses/:id', requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const status = await MaterialStatus.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.auth?.organizationId },
      { isActive: false },
      { new: true }
    );

    if (!status) {
      return res.status(404).json({ error: 'Material status not found' });
    }

    res.json({ message: 'Material status deleted successfully' });
  } catch (error) {
    console.error('Delete material status error:', error);
    res.status(500).json({ error: 'Failed to delete material status' });
  }
});

export default router;
