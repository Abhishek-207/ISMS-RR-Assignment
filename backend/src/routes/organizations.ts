import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireAuthAndActive, requirePlatformAdmin, requireOrgAdminOrPlatformAdmin, AuthRequest } from '../middleware/auth.js';
import { Organization } from '../models/Organization.js';
import { audit } from '../middleware/audit.js';

const router = Router();

router.use(requireAuthAndActive);

// Get organizations - Platform Admin can see all, others see only their category
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    
    const filter: any = { isActive: true };
    
    // Non-platform admins can only see organizations in their category
    if (req.auth?.role !== 'PLATFORM_ADMIN') {
      filter.category = req.auth?.organizationCategory;
    }
    
    // Apply filters
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };

    const [items, total] = await Promise.all([
      Organization.find(filter)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ name: 1 })
        .lean(),
      Organization.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get single organization
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const organization = await Organization.findById(req.params.id).lean();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check access: Platform Admin or same category
    if (req.auth?.role !== 'PLATFORM_ADMIN' && organization.category !== req.auth?.organizationCategory) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create organization - Anyone can create during signup, but this endpoint requires auth
router.post('/', [
  body('name').isLength({ min: 2 }),
  body('category').isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION']),
  body('description').optional().isLength({ max: 500 })
], audit('Organization', 'CREATE', () => null, (req, result) => result), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, description } = req.body;

    // Check if organization name already exists in this category
    const existing = await Organization.findOne({ name, category });
    if (existing) {
      return res.status(400).json({ error: 'Organization with this name already exists in this category' });
    }

    const organization = await Organization.create({
      name,
      category,
      description,
      isActive: true
    });

    res.status(201).json(organization);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization - Org Admin or Platform Admin only
router.patch('/:id', requireOrgAdminOrPlatformAdmin, [
  body('name').optional().isLength({ min: 2 }),
  body('description').optional().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
], audit('Organization', 'UPDATE', async (req) => {
  return await Organization.findById(req.params.id).lean();
}, async (req) => {
  return await Organization.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check access: Platform Admin or own organization admin
    if (req.auth?.role !== 'PLATFORM_ADMIN' && (organization._id as any).toString() !== req.auth?.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow category change
    if (req.body.category) {
      return res.status(400).json({ error: 'Organization category cannot be changed' });
    }

    const updates = {
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.isActive !== undefined && req.auth?.role === 'PLATFORM_ADMIN' && { isActive: req.body.isActive })
    };

    const updated = await Organization.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    res.json(updated);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete/deactivate organization - Platform Admin only
router.delete('/:id', requirePlatformAdmin, audit('Organization', 'DELETE', async (req) => {
  return await Organization.findById(req.params.id).lean();
}, () => null), async (req: AuthRequest, res: Response) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ message: 'Organization deactivated successfully', organization });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default router;
