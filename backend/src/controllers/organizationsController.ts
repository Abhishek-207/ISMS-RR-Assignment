import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import { Organization } from '../models/Organization.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

export class OrganizationsController {
  /**
   * Get all organizations
   */
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      
      const filter: any = { isActive: true };
      
      if (req.auth?.role !== 'PLATFORM_ADMIN') {
        filter.category = req.auth?.organizationCategory;
      }
      
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

      return ApiResponse.paginated(res, items, page, pageSize, total);
    } catch (error) {
      console.error('Get organizations error:', error);
      return ApiResponse.error(res, 'Failed to fetch organizations', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get organization by ID
   */
  static async getById(req: AuthRequest, res: Response) {
    try {
      const organization = await Organization.findById(req.params.id).lean();

      if (!organization) {
        throw ApiError.notFound('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND.code);
      }

      if (req.auth?.role !== 'PLATFORM_ADMIN' && organization.category !== req.auth?.organizationCategory) {
        throw ApiError.forbidden('Access denied');
      }

      return ApiResponse.success(res, organization);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Get organization error:', error);
      return ApiResponse.error(res, 'Failed to fetch organization', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create organization
   */
  static async create(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { name, category, description } = req.body;

      const existing = await Organization.findOne({ name, category });
      if (existing) {
        throw ApiError.conflict('Organization with this name already exists in this category', ErrorCodes.ORGANIZATION_ALREADY_EXISTS.code);
      }

      const organization = await Organization.create({
        name,
        category,
        description,
        isActive: true
      });

      return ApiResponse.created(res, organization, 'Organization created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create organization error:', error);
      return ApiResponse.error(res, 'Failed to create organization', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Update organization
   */
  static async update(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const organization = await Organization.findById(req.params.id);
      if (!organization) {
        throw ApiError.notFound('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND.code);
      }

      if (req.auth?.role !== 'PLATFORM_ADMIN' && (organization._id as any).toString() !== req.auth?.organizationId) {
        throw ApiError.forbidden('Access denied');
      }

      if (req.body.category) {
        throw ApiError.badRequest('Organization category cannot be changed');
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

      return ApiResponse.updated(res, updated, 'Organization updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Update organization error:', error);
      return ApiResponse.error(res, 'Failed to update organization', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete organization (deactivate)
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      const organization = await Organization.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!organization) {
        throw ApiError.notFound('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND.code);
      }

      return ApiResponse.success(res, organization, 'Organization deactivated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Delete organization error:', error);
      return ApiResponse.error(res, 'Failed to delete organization', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
