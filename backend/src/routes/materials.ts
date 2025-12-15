import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireAuthAndActive, AuthRequest } from '../middleware/auth.js';
import { Material } from '../models/Material.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { audit } from '../middleware/audit.js';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuthAndActive);

// Get inventory items with filtering and pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    
    const filter: any = { organizationId: req.auth?.organizationId };
    
    // Apply filters
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.condition) filter.condition = req.query.condition;
    if (req.query.isSurplus !== undefined) filter.isSurplus = req.query.isSurplus === 'true';
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };
    
    // Date range filters
    if (req.query.fromDate || req.query.toDate) {
      filter.availableFrom = {} as any;
      if (req.query.fromDate) (filter.availableFrom as any).$gte = new Date(String(req.query.fromDate));
      if (req.query.toDate) (filter.availableFrom as any).$lte = new Date(String(req.query.toDate));
    }

    const [items, total] = await Promise.all([
      Material.find(filter)
        .populate('categoryId', 'name')
        .populate('createdBy', 'name')
        .populate('attachments')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .lean(),
      Material.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get surplus items from OTHER organizations in the SAME category
router.get('/surplus', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    
    // CRITICAL: Surplus visibility rule - same category, different organization
    const filter: any = {
      isSurplus: true,
      status: 'AVAILABLE',
      organizationId: { $ne: req.auth?.organizationId } // Not own organization
    };
    
    // Get all organizations in same category
    const sameCategOrgs = await Organization.find({ 
      category: req.auth?.organizationCategory,
      isActive: true 
    }).select('_id').lean();
    
    filter.organizationId = { 
      $in: sameCategOrgs.map(o => o._id),
      $ne: new mongoose.Types.ObjectId(req.auth?.organizationId)
    };
    
    // Apply additional filters
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.condition) filter.condition = req.query.condition;
    if (req.query.minQuantity) filter.quantity = { $gte: parseFloat(String(req.query.minQuantity)) };
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };

    const [items, total] = await Promise.all([
      Material.find(filter)
        .populate('categoryId', 'name')
        .populate('organizationId', 'name category')
        .populate('createdBy', 'name')
        .populate('attachments')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .lean(),
      Material.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get surplus items error:', error);
    res.status(500).json({ error: 'Failed to fetch surplus items' });
  }
});

// Get single inventory item
router.get('/:id', async (req: Request, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('organizationId', 'name category')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('attachments')
      .populate('allocationHistory.procurementRequestId')
      .populate('allocationHistory.allocatedBy', 'name')
      .lean();

    if (!material) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json(material);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Create inventory item
router.post('/', [
  body('name').isLength({ min: 1 }),
  body('categoryId').isMongoId(),
  body('quantity').isNumeric().isFloat({ min: 0 }),
  body('unit').isLength({ min: 1 }),
  body('condition').isIn(['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP']),
  body('availableFrom').isISO8601(),
  body('availableUntil').isISO8601(),
  body('estimatedCost').optional().isNumeric().isFloat({ min: 0 })
], audit('Material', 'INVENTORY_CREATED', () => null, (req, result) => result), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const materialData = {
      ...req.body,
      organizationId: req.auth?.organizationId,
      status: 'AVAILABLE',
      isSurplus: false,
      createdBy: req.auth?.userId,
      availableFrom: new Date(req.body.availableFrom),
      availableUntil: new Date(req.body.availableUntil)
    };

    const material = await Material.create(materialData);
    
    const populatedMaterial = await Material.findById(material._id)
      .populate('categoryId', 'name')
      .populate('organizationId', 'name category')
      .populate('createdBy', 'name')
      .populate('attachments')
      .lean();

    res.status(201).json(populatedMaterial);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Mark inventory item as surplus - CRITICAL FEATURE
router.patch('/:id/mark-surplus', audit('Material', 'MARKED_AS_SURPLUS', async (req) => {
  return await Material.findById(req.params.id).lean();
}, async (req) => {
  return await Material.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Only owning organization can mark as surplus
    if (material.organizationId.toString() !== req.auth?.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate quantity
    if (material.quantity <= 0) {
      return res.status(400).json({ error: 'Cannot mark item with zero quantity as surplus' });
    }

    // Mark as surplus
    material.isSurplus = true;
    material.status = 'AVAILABLE';
    await material.save();

    const updated = await Material.findById(material._id)
      .populate('categoryId', 'name')
      .populate('organizationId', 'name category')
      .populate('createdBy', 'name')
      .lean();

    res.json(updated);
  } catch (error) {
    console.error('Mark as surplus error:', error);
    res.status(500).json({ error: 'Failed to mark as surplus' });
  }
});

// Update inventory item
router.patch('/:id', [
  body('name').optional().isLength({ min: 1 }),
  body('categoryId').optional().isMongoId(),
  body('quantity').optional().isNumeric().isFloat({ min: 0 }),
  body('unit').optional().isLength({ min: 1 }),
  body('status').optional().isIn(['AVAILABLE', 'RESERVED', 'TRANSFERRED', 'ARCHIVED']),
  body('condition').optional().isIn(['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP']),
  body('availableFrom').optional().isISO8601(),
  body('availableUntil').optional().isISO8601(),
  body('estimatedCost').optional().isNumeric().isFloat({ min: 0 })
], audit('Material', 'UPDATE', async (req) => {
  return await Material.findById(req.params.id).lean();
}, async (req, result) => {
  return await Material.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Only owning organization can update
    if (material.organizationId.toString() !== req.auth?.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.auth?.userId
    };

    // Convert dates if provided
    if (req.body.availableFrom) updateData.availableFrom = new Date(req.body.availableFrom);
    if (req.body.availableUntil) updateData.availableUntil = new Date(req.body.availableUntil);

    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name')
      .populate('organizationId', 'name category')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('attachments')
      .lean();

    res.json(updated);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/:id', audit('Material', 'DELETE', async (req) => {
  return await Material.findById(req.params.id).lean();
}, () => null), async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Only owning organization can delete
    if (material.organizationId.toString() !== req.auth?.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Material.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Get inventory statistics (organization-level)
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;
    
    const [
      totalItems,
      availableItems,
      surplusItems,
      reservedItems,
      transferredItems,
      itemsByCondition,
      itemsByCategory,
      totalEstimatedValue
    ] = await Promise.all([
      Material.countDocuments({ organizationId }),
      Material.countDocuments({ organizationId, status: 'AVAILABLE' }),
      Material.countDocuments({ organizationId, isSurplus: true }),
      Material.countDocuments({ organizationId, status: 'RESERVED' }),
      Material.countDocuments({ organizationId, status: 'TRANSFERRED' }),
      Material.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        { $group: { _id: '$condition', count: { $sum: 1 } } }
      ]),
      Material.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        { $lookup: { from: 'materialcategories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $group: { _id: '$category.name', count: { $sum: 1 } } }
      ]),
      Material.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), estimatedCost: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$estimatedCost' } } }
      ])
    ]);

    res.json({
      totalItems,
      availableItems,
      surplusItems,
      reservedItems,
      transferredItems,
      itemsByCondition,
      itemsByCategory,
      totalEstimatedValue: totalEstimatedValue[0]?.total || 0
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory statistics' });
  }
});

export default router;
