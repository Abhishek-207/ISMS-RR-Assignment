import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import { MaterialCategory, MaterialStatus } from '../models/Masters.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

function paginateParams(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  return { page, pageSize };
}

export class MastersController {
  /**
   * Get material categories
   */
  static async getMaterialCategories(req: AuthRequest, res: Response) {
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

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get material categories error:', error);
      return ApiResponse.error(res, 'Failed to fetch material categories', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create material category
   */
  static async createMaterialCategory(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const existing = await MaterialCategory.findOne({
        organizationId: req.auth?.organizationId,
        name: { $regex: `^${req.body.name}$`, $options: 'i' }
      });
      
      if (existing) {
        throw ApiError.conflict('Category with this name already exists');
      }

      const category = await MaterialCategory.create({
        organizationId: req.auth?.organizationId,
        name: req.body.name,
        isActive: true
      });

      return ApiResponse.created(res, category, 'Material category created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create material category error:', error);
      return ApiResponse.error(res, 'Failed to create material category', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Update material category
   */
  static async updateMaterialCategory(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const category = await MaterialCategory.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.auth?.organizationId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!category) {
        throw ApiError.notFound('Material category not found');
      }

      return ApiResponse.updated(res, category, 'Material category updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Update material category error:', error);
      return ApiResponse.error(res, 'Failed to update material category', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete material category
   */
  static async deleteMaterialCategory(req: AuthRequest, res: Response) {
    try {
      const category = await MaterialCategory.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.auth?.organizationId },
        { isActive: false },
        { new: true }
      );

      if (!category) {
        throw ApiError.notFound('Material category not found');
      }

      return ApiResponse.deleted(res, 'Material category deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Delete material category error:', error);
      return ApiResponse.error(res, 'Failed to delete material category', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get material statuses
   */
  static async getMaterialStatuses(req: AuthRequest, res: Response) {
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

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get material statuses error:', error);
      return ApiResponse.error(res, 'Failed to fetch material statuses', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create material status
   */
  static async createMaterialStatus(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const existing = await MaterialStatus.findOne({
        organizationId: req.auth?.organizationId,
        name: { $regex: `^${req.body.name}$`, $options: 'i' }
      });
      
      if (existing) {
        throw ApiError.conflict('Status with this name already exists');
      }

      const status = await MaterialStatus.create({
        organizationId: req.auth?.organizationId,
        name: req.body.name,
        isActive: true
      });

      return ApiResponse.created(res, status, 'Material status created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create material status error:', error);
      return ApiResponse.error(res, 'Failed to create material status', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Update material status
   */
  static async updateMaterialStatus(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const status = await MaterialStatus.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.auth?.organizationId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!status) {
        throw ApiError.notFound('Material status not found');
      }

      return ApiResponse.updated(res, status, 'Material status updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Update material status error:', error);
      return ApiResponse.error(res, 'Failed to update material status', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete material status
   */
  static async deleteMaterialStatus(req: AuthRequest, res: Response) {
    try {
      const status = await MaterialStatus.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.auth?.organizationId },
        { isActive: false },
        { new: true }
      );

      if (!status) {
        throw ApiError.notFound('Material status not found');
      }

      return ApiResponse.deleted(res, 'Material status deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Delete material status error:', error);
      return ApiResponse.error(res, 'Failed to delete material status', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
