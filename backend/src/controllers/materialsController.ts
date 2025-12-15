import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import { Material } from '../models/Material.model.js';
import { Organization } from '../models/Organization.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import mongoose from 'mongoose';

export class MaterialsController {
  /**
   * Get all materials for organization
   */
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      
      const filter: any = { organizationId: req.auth?.organizationId };
      
      if (req.query.categoryId) filter.categoryId = req.query.categoryId;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.condition) filter.condition = req.query.condition;
      if (req.query.isSurplus !== undefined) filter.isSurplus = req.query.isSurplus === 'true';
      if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };
      
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

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get inventory items error:', error);
      return ApiResponse.error(res, 'Failed to fetch inventory items', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get surplus materials from other organizations
   */
  static async getSurplus(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      
      const filter: any = {
        isSurplus: true,
        status: 'AVAILABLE',
        organizationId: { $ne: req.auth?.organizationId }
      };
      
      const sameCategOrgs = await Organization.find({ 
        category: req.auth?.organizationCategory,
        isActive: true 
      }).select('_id').lean();
      
      filter.organizationId = { 
        $in: sameCategOrgs.map(o => o._id),
        $ne: new mongoose.Types.ObjectId(req.auth?.organizationId)
      };
      
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

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get surplus items error:', error);
      return ApiResponse.error(res, 'Failed to fetch surplus items', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get material by ID
   */
  static async getById(req: Request, res: Response) {
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
        throw ApiError.notFound('Inventory item not found', ErrorCodes.MATERIAL_NOT_FOUND.code);
      }

      return ApiResponse.success(res, material);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Get inventory item error:', error);
      return ApiResponse.error(res, 'Failed to fetch inventory item', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create material
   */
  static async create(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
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

      return ApiResponse.created(res, populatedMaterial, 'Inventory item created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create inventory item error:', error);
      return ApiResponse.error(res, 'Failed to create inventory item', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Mark material as surplus
   */
  static async markAsSurplus(req: AuthRequest, res: Response) {
    try {
      const material = await Material.findById(req.params.id);
      
      if (!material) {
        throw ApiError.notFound('Inventory item not found', ErrorCodes.MATERIAL_NOT_FOUND.code);
      }

      if (material.organizationId.toString() !== req.auth?.organizationId) {
        throw ApiError.forbidden('Access denied');
      }

      if (material.quantity <= 0) {
        throw ApiError.badRequest('Cannot mark item with zero quantity as surplus');
      }

      material.isSurplus = true;
      material.status = 'AVAILABLE';
      await material.save();

      const updated = await Material.findById(material._id)
        .populate('categoryId', 'name')
        .populate('organizationId', 'name category')
        .populate('createdBy', 'name')
        .lean();

      return ApiResponse.updated(res, updated, 'Item marked as surplus successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Mark as surplus error:', error);
      return ApiResponse.error(res, 'Failed to mark as surplus', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Update material
   */
  static async update(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const material = await Material.findById(req.params.id);
      if (!material) {
        throw ApiError.notFound('Inventory item not found', ErrorCodes.MATERIAL_NOT_FOUND.code);
      }

      if (material.organizationId.toString() !== req.auth?.organizationId) {
        throw ApiError.forbidden('Access denied');
      }

      const updateData: any = {
        ...req.body,
        updatedBy: req.auth?.userId
      };

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

      return ApiResponse.updated(res, updated, 'Inventory item updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Update inventory item error:', error);
      return ApiResponse.error(res, 'Failed to update inventory item', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete material
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      const material = await Material.findById(req.params.id);
      
      if (!material) {
        throw ApiError.notFound('Inventory item not found', ErrorCodes.MATERIAL_NOT_FOUND.code);
      }

      if (material.organizationId.toString() !== req.auth?.organizationId) {
        throw ApiError.forbidden('Access denied');
      }

      await Material.findByIdAndDelete(req.params.id);
      
      return ApiResponse.deleted(res, 'Inventory item deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Delete inventory item error:', error);
      return ApiResponse.error(res, 'Failed to delete inventory item', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get material statistics
   */
  static async getStats(req: AuthRequest, res: Response) {
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

      return ApiResponse.success(res, {
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
      return ApiResponse.error(res, 'Failed to fetch inventory statistics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
