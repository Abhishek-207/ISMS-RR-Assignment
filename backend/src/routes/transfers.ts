import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireAuthAndActive, requireOrgAdminOrPlatformAdmin, AuthRequest } from '../middleware/auth.js';
import { TransferRequest } from '../models/TransferRequest.js';
import { Material } from '../models/Material.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { audit } from '../middleware/audit.js';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    
    const filter: any = {
      $or: [
        { fromOrganizationId: req.auth?.organizationId },
        { toOrganizationId: req.auth?.organizationId }
      ]
    };
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.materialId) filter.materialId = req.query.materialId;
    if (req.query.requestedBy) filter.requestedBy = req.query.requestedBy;

    const [items, total] = await Promise.all([
      TransferRequest.find(filter)
        .populate('materialId', 'name quantity unit condition')
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .lean(),
      TransferRequest.countDocuments(filter)
    ]);

    res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Get procurement requests error:', error);
    res.status(500).json({ error: 'Failed to fetch procurement requests' });
  }
});

router.get('/:id', async (req: Request, res) => {
  try {
    const transferRequest = await TransferRequest.findById(req.params.id)
      .populate('materialId')
      .populate('fromOrganizationId', 'name category')
      .populate('toOrganizationId', 'name category')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('comments.createdBy', 'name')
      .lean();

    if (!transferRequest) {
      return res.status(404).json({ error: 'Procurement request not found' });
    }

    res.json(transferRequest);
  } catch (error) {
    console.error('Get procurement request error:', error);
    res.status(500).json({ error: 'Failed to fetch procurement request' });
  }
});

router.post('/', [
  body('materialId').isMongoId(),
  body('quantityRequested').isNumeric().isFloat({ min: 0 }),
  body('purpose').isLength({ min: 10, max: 1000 }),
  body('comment').optional().isLength({ min: 1 })
], audit('TransferRequest', 'PROCUREMENT_REQUEST_CREATED', () => null, (req, result) => result), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { materialId, quantityRequested, purpose, comment } = req.body;

    const material = await Material.findById(materialId).populate('organizationId');
    if (!material) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    if (!material.isSurplus) {
      return res.status(400).json({ error: 'Item is not marked as surplus' });
    }

    if (material.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Item is not available' });
    }

    if (material.quantity < quantityRequested) {
      return res.status(400).json({ error: 'Insufficient item quantity' });
    }

    const fromOrg = material.organizationId as any;
    const requestingUser = await User.findById(req.auth?.userId);
    
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (fromOrg.category !== requestingUser.organizationCategory) {
      return res.status(403).json({ 
        error: 'Cannot request items from organizations in different categories',
        details: 'You can only request surplus items from organizations in the same category as yours'
      });
    }

    if (material.organizationId.toString() === req.auth?.organizationId) {
      return res.status(400).json({ error: 'Cannot request your own organization\'s items' });
    }

    const procurementRequest = await TransferRequest.create({
      organizationId: req.auth?.organizationId,
      materialId,
      fromOrganizationId: material.organizationId,
      toOrganizationId: req.auth?.organizationId,
      quantityRequested,
      purpose,
      status: 'PENDING',
      comments: [{
        comment: comment || purpose,
        createdBy: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : new mongoose.Types.ObjectId(),
        type: 'REQUEST'
      }],
      requestedBy: req.auth?.userId
    });

    const populatedRequest = await TransferRequest.findById(procurementRequest._id)
      .populate('materialId', 'name quantity unit condition')
      .populate('fromOrganizationId', 'name category')
      .populate('toOrganizationId', 'name category')
      .populate('requestedBy', 'name email')
      .populate('comments.createdBy', 'name')
      .lean();

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Create procurement request error:', error);
    res.status(500).json({ error: 'Failed to create procurement request' });
  }
});

router.patch('/:id/approve', requireOrgAdminOrPlatformAdmin, [
  body('comment').isLength({ min: 1 })
], audit('TransferRequest', 'PROCUREMENT_APPROVED', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const procurementRequest = await TransferRequest.findById(req.params.id);
    if (!procurementRequest) {
      return res.status(404).json({ error: 'Procurement request not found' });
    }

    if (procurementRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Procurement request is not pending' });
    }

    if (procurementRequest.fromOrganizationId.toString() !== req.auth?.organizationId && req.auth?.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Only the owning organization admin can approve this request' });
    }

    procurementRequest.status = 'APPROVED';
    procurementRequest.approvedBy = req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : undefined;
    procurementRequest.approvedAt = new Date();
    procurementRequest.comments.push({
      comment: req.body.comment,
      createdAt: new Date(),
      createdBy: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : new mongoose.Types.ObjectId(),
      type: 'APPROVAL'
    });

    await procurementRequest.save();

    const material = await Material.findById(procurementRequest.materialId);
    if (material) {
      material.quantity -= procurementRequest.quantityRequested;
      
      material.allocationHistory.push({
        procurementRequestId: procurementRequest._id as mongoose.Types.ObjectId,
        quantityAllocated: procurementRequest.quantityRequested,
        allocatedAt: new Date(),
        allocatedBy: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : new mongoose.Types.ObjectId(),
        notes: req.body.comment
      });

      if (material.quantity <= 0) {
        material.status = 'TRANSFERRED';
        material.isSurplus = false;
      }

      await material.save();

      const newMaterial = await Material.create({
        organizationId: procurementRequest.toOrganizationId,
        name: material.name,
        categoryId: material.categoryId,
        quantity: procurementRequest.quantityRequested,
        unit: material.unit,
        status: 'AVAILABLE',
        condition: material.condition,
        isSurplus: false,
        availableFrom: new Date(),
        availableUntil: material.availableUntil,
        notes: `Transferred from ${(await Organization.findById(material.organizationId))?.name}`,
        estimatedCost: material.estimatedCost,
        attachments: material.attachments,
        createdBy: req.auth?.userId,
        allocationHistory: []
      });
    }

    const populatedRequest = await TransferRequest.findById(procurementRequest._id)
      .populate('materialId', 'name quantity unit condition')
      .populate('fromOrganizationId', 'name category')
      .populate('toOrganizationId', 'name category')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('comments.createdBy', 'name')
      .lean();

    res.json(populatedRequest);
  } catch (error) {
    console.error('Approve procurement request error:', error);
    res.status(500).json({ error: 'Failed to approve procurement request' });
  }
});

router.patch('/:id/reject', requireOrgAdminOrPlatformAdmin, [
  body('comment').isLength({ min: 1 })
], audit('TransferRequest', 'REJECT', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const procurementRequest = await TransferRequest.findById(req.params.id);
    if (!procurementRequest) {
      return res.status(404).json({ error: 'Procurement request not found' });
    }

    if (procurementRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Procurement request is not pending' });
    }

    if (procurementRequest.fromOrganizationId.toString() !== req.auth?.organizationId && req.auth?.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Only the owning organization admin can reject this request' });
    }

    procurementRequest.status = 'REJECTED';
    procurementRequest.comments.push({
      comment: req.body.comment,
      createdAt: new Date(),
      createdBy: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : new mongoose.Types.ObjectId(),
      type: 'REJECTION'
    });

    await procurementRequest.save();

    const populatedRequest = await TransferRequest.findById(procurementRequest._id)
      .populate('materialId', 'name quantity unit condition')
      .populate('fromOrganizationId', 'name category')
      .populate('toOrganizationId', 'name category')
      .populate('requestedBy', 'name email')
      .populate('comments.createdBy', 'name')
      .lean();

    res.json(populatedRequest);
  } catch (error) {
    console.error('Reject procurement request error:', error);
    res.status(500).json({ error: 'Failed to reject procurement request' });
  }
});

router.patch('/:id/cancel', [
  body('comment').isLength({ min: 1 })
], audit('TransferRequest', 'CANCEL', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const procurementRequest = await TransferRequest.findById(req.params.id);
    if (!procurementRequest) {
      return res.status(404).json({ error: 'Procurement request not found' });
    }

    if (procurementRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    if (procurementRequest.requestedBy.toString() !== req.auth?.userId) {
      return res.status(403).json({ error: 'Only the requester can cancel this request' });
    }

    procurementRequest.status = 'CANCELLED';
    procurementRequest.comments.push({
      comment: req.body.comment,
      createdAt: new Date(),
      createdBy: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : new mongoose.Types.ObjectId(),
      type: 'CANCELLATION'
    });

    await procurementRequest.save();

    const populatedRequest = await TransferRequest.findById(procurementRequest._id)
      .populate('materialId', 'name quantity unit condition')
      .populate('fromOrganizationId', 'name category')
      .populate('toOrganizationId', 'name category')
      .populate('requestedBy', 'name email')
      .populate('comments.createdBy', 'name')
      .lean();

    res.json(populatedRequest);
  } catch (error) {
    console.error('Cancel procurement request error:', error);
    res.status(500).json({ error: 'Failed to cancel procurement request' });
  }
});

export default router;
