import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import { TransferRequest } from '../models/TransferRequest.model.js';
import { Material } from '../models/Material.model.js';
import { Organization } from '../models/Organization.model.js';
import { User } from '../models/User.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import { NotificationsController } from './notificationsController.js';
import mongoose from 'mongoose';

export class TransfersController {
  /**
   * Get all transfer requests
   */
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      
      const filter: any = {};
      
      // Handle incoming/outgoing filter
      const incoming = String(req.query.incoming) === 'true';
      const outgoing = String(req.query.outgoing) === 'true';
      
      if (incoming && outgoing) {
        // If both are true, show all (same as default behavior)
        filter.$or = [
          { fromOrganizationId: req.auth?.organizationId },
          { toOrganizationId: req.auth?.organizationId }
        ];
      } else if (incoming) {
        // Incoming: requests where user's org is the sender (needs to approve)
        filter.fromOrganizationId = req.auth?.organizationId;
      } else if (outgoing) {
        // Outgoing: requests where user's org is the receiver (made the request)
        filter.toOrganizationId = req.auth?.organizationId;
      } else {
        // Default: show all requests for the user's organization
        filter.$or = [
          { fromOrganizationId: req.auth?.organizationId },
          { toOrganizationId: req.auth?.organizationId }
        ];
      }
      
      if (req.query.status) filter.status = req.query.status;
      if (req.query.materialId) filter.materialId = req.query.materialId;
      if (req.query.requestedBy) filter.requestedBy = req.query.requestedBy;

      // Handle search query
      let query = TransferRequest.find(filter)
        .populate({
          path: 'materialId',
          select: 'name quantity unit condition attachments',
          populate: { path: 'attachments' }
        })
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 });

      // Execute query and get items
      let items = await query.lean();

      // Apply search filter on populated fields (client-side filtering after population)
      if (req.query.q && typeof req.query.q === 'string') {
        const searchTerm = req.query.q.toLowerCase().trim();
        items = items.filter((item: any) => {
          const materialName = item.materialId?.name?.toLowerCase() || '';
          const fromOrgName = item.fromOrganizationId?.name?.toLowerCase() || '';
          const toOrgName = item.toOrganizationId?.name?.toLowerCase() || '';
          const purpose = item.purpose?.toLowerCase() || '';
          const condition = item.materialId?.condition?.toLowerCase().replace(/_/g, ' ') || '';
          
          return (
            materialName.includes(searchTerm) ||
            fromOrgName.includes(searchTerm) ||
            toOrgName.includes(searchTerm) ||
            purpose.includes(searchTerm) ||
            condition.includes(searchTerm)
          );
        });
      }

      const total = req.query.q ? items.length : await TransferRequest.countDocuments(filter);

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get procurement requests error:', error);
      return ApiResponse.error(res, 'Failed to fetch procurement requests', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get transfer request by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const transferRequest = await TransferRequest.findById(req.params.id)
        .populate({
          path: 'materialId',
          populate: { path: 'attachments' }
        })
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .lean();

      if (!transferRequest) {
        throw ApiError.notFound('Procurement request not found', ErrorCodes.TRANSFER_NOT_FOUND.code);
      }

      return ApiResponse.success(res, transferRequest);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Get procurement request error:', error);
      return ApiResponse.error(res, 'Failed to fetch procurement request', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create transfer request
   */
  static async create(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { materialId, quantityRequested, purpose, comment } = req.body;

      const material = await Material.findById(materialId).populate('organizationId');
      if (!material) {
        throw ApiError.notFound('Inventory item not found', ErrorCodes.MATERIAL_NOT_FOUND.code);
      }

      if (!material.isSurplus) {
        throw ApiError.badRequest('Item is not marked as surplus');
      }

      if (material.status !== 'AVAILABLE') {
        throw ApiError.badRequest('Item is not available', ErrorCodes.MATERIAL_UNAVAILABLE.code);
      }

      if (material.quantity < quantityRequested) {
        throw ApiError.badRequest('Insufficient item quantity', ErrorCodes.INSUFFICIENT_QUANTITY.code);
      }

      const fromOrg = material.organizationId as any;
      const requestingUser = await User.findById(req.auth?.userId);
      
      if (!requestingUser) {
        throw ApiError.unauthorized('User not found', ErrorCodes.USER_NOT_FOUND.code);
      }

      if (fromOrg.category !== requestingUser.organizationCategory) {
        throw ApiError.forbidden('Cannot request items from organizations in different categories');
      }

      if (material.organizationId.toString() === req.auth?.organizationId) {
        throw ApiError.badRequest('Cannot request your own organization\'s items');
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
        .populate({
          path: 'materialId',
          select: 'name quantity unit condition attachments',
          populate: { path: 'attachments' }
        })
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .lean();

      // Create notifications for users in the source organization (who need to approve)
      try {
        const sourceOrgUsers = await User.find({
          organizationId: material.organizationId,
          isActive: true,
          role: { $in: ['ORG_ADMIN', 'PLATFORM_ADMIN'] }
        });

        const materialName = (populatedRequest as any).materialId?.name || 'Material';
        const toOrgName = (populatedRequest as any).toOrganizationId?.name || 'Organization';
        
        await NotificationsController.createBulkNotifications(
          sourceOrgUsers.map(user => ({
            userId: user._id as mongoose.Types.ObjectId,
            organizationId: user.organizationId,
            title: 'New Procurement Request',
            message: `${toOrgName} requested ${quantityRequested} ${material.unit} of ${materialName}`,
            type: 'warning',
            priority: 'high',
            relatedEntityType: 'transfer',
            relatedEntityId: procurementRequest._id as mongoose.Types.ObjectId,
            metadata: { transferId: procurementRequest._id }
          }))
        );
      } catch (notifError) {
        console.error('Failed to create notifications:', notifError);
        // Don't fail the request if notification creation fails
      }

      return ApiResponse.created(res, populatedRequest, 'Procurement request created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create procurement request error:', error);
      return ApiResponse.error(res, 'Failed to create procurement request', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Approve transfer request
   */
  static async approve(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const procurementRequest = await TransferRequest.findById(req.params.id);
      if (!procurementRequest) {
        throw ApiError.notFound('Procurement request not found', ErrorCodes.TRANSFER_NOT_FOUND.code);
      }

      if (procurementRequest.status !== 'PENDING') {
        throw ApiError.badRequest('Procurement request is not pending', ErrorCodes.TRANSFER_ALREADY_PROCESSED.code);
      }

      if (procurementRequest.fromOrganizationId.toString() !== req.auth?.organizationId && req.auth?.role !== 'PLATFORM_ADMIN') {
        throw ApiError.forbidden('Only the owning organization admin can approve this request');
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

        await Material.create({
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
        .populate({
          path: 'materialId',
          select: 'name quantity unit condition attachments',
          populate: { path: 'attachments' }
        })
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .lean();

      // Create notification for the requester and their org users
      try {
        const targetOrgUsers = await User.find({
          organizationId: procurementRequest.toOrganizationId,
          isActive: true
        });

        const materialName = (populatedRequest as any).materialId?.name || 'Material';
        const fromOrgName = (populatedRequest as any).fromOrganizationId?.name || 'Organization';
        
        await NotificationsController.createBulkNotifications(
          targetOrgUsers.map(user => ({
            userId: user._id as mongoose.Types.ObjectId,
            organizationId: user.organizationId,
            title: 'Procurement Request Approved',
            message: `Your request for ${procurementRequest.quantityRequested} ${material?.unit || 'units'} of ${materialName} from ${fromOrgName} has been approved`,
            type: 'success',
            priority: 'medium',
            relatedEntityType: 'transfer',
            relatedEntityId: procurementRequest._id as mongoose.Types.ObjectId,
            metadata: { transferId: procurementRequest._id }
          }))
        );
      } catch (notifError) {
        console.error('Failed to create notifications:', notifError);
      }

      return ApiResponse.updated(res, populatedRequest, 'Procurement request approved successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Approve procurement request error:', error);
      return ApiResponse.error(res, 'Failed to approve procurement request', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Reject transfer request
   */
  static async reject(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const procurementRequest = await TransferRequest.findById(req.params.id);
      if (!procurementRequest) {
        throw ApiError.notFound('Procurement request not found', ErrorCodes.TRANSFER_NOT_FOUND.code);
      }

      if (procurementRequest.status !== 'PENDING') {
        throw ApiError.badRequest('Procurement request is not pending', ErrorCodes.TRANSFER_ALREADY_PROCESSED.code);
      }

      if (procurementRequest.fromOrganizationId.toString() !== req.auth?.organizationId && req.auth?.role !== 'PLATFORM_ADMIN') {
        throw ApiError.forbidden('Only the owning organization admin can reject this request');
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
        .populate({
          path: 'materialId',
          select: 'name quantity unit condition attachments',
          populate: { path: 'attachments' }
        })
        .populate('fromOrganizationId', 'name category')
        .populate('toOrganizationId', 'name category')
        .populate('requestedBy', 'name email')
        .populate('comments.createdBy', 'name')
        .lean();

      // Create notification for the requester and their org users
      try {
        const targetOrgUsers = await User.find({
          organizationId: procurementRequest.toOrganizationId,
          isActive: true
        });

        const material = await Material.findById(procurementRequest.materialId);
        const materialName = (populatedRequest as any).materialId?.name || 'Material';
        const fromOrgName = (populatedRequest as any).fromOrganizationId?.name || 'Organization';
        
        await NotificationsController.createBulkNotifications(
          targetOrgUsers.map(user => ({
            userId: user._id as mongoose.Types.ObjectId,
            organizationId: user.organizationId,
            title: 'Procurement Request Rejected',
            message: `Your request for ${procurementRequest.quantityRequested} ${material?.unit || 'units'} of ${materialName} from ${fromOrgName} has been rejected`,
            type: 'error',
            priority: 'medium',
            relatedEntityType: 'transfer',
            relatedEntityId: procurementRequest._id as mongoose.Types.ObjectId,
            metadata: { transferId: procurementRequest._id }
          }))
        );
      } catch (notifError) {
        console.error('Failed to create notifications:', notifError);
      }

      return ApiResponse.updated(res, populatedRequest, 'Procurement request rejected');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Reject procurement request error:', error);
      return ApiResponse.error(res, 'Failed to reject procurement request', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Cancel transfer request
   */
  static async cancel(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const procurementRequest = await TransferRequest.findById(req.params.id);
      if (!procurementRequest) {
        throw ApiError.notFound('Procurement request not found', ErrorCodes.TRANSFER_NOT_FOUND.code);
      }

      if (procurementRequest.status !== 'PENDING') {
        throw ApiError.badRequest('Can only cancel pending requests', ErrorCodes.INVALID_TRANSFER_STATUS.code);
      }

      if (procurementRequest.requestedBy.toString() !== req.auth?.userId) {
        throw ApiError.forbidden('Only the requester can cancel this request');
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

      return ApiResponse.updated(res, populatedRequest, 'Procurement request cancelled');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Cancel procurement request error:', error);
      return ApiResponse.error(res, 'Failed to cancel procurement request', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
