import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

export class UsersController {
  /**
   * Get all users
   */
  static async getAll(req: AuthRequest, res: Response) {
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

      return ApiResponse.paginated(res, sanitizedItems, page, pageSize, total);
    } catch (error) {
      console.error('Get users error:', error);
      return ApiResponse.error(res, 'Failed to fetch users', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get user by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const user = await User.findById(req.params.id)
        .populate('organizationId', 'name category')
        .lean();

      if (!user) {
        throw ApiError.notFound('User not found', ErrorCodes.USER_NOT_FOUND.code);
      }

      const { passwordHash, ...userWithoutPassword } = user;

      return ApiResponse.success(res, userWithoutPassword);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Get user error:', error);
      return ApiResponse.error(res, 'Failed to fetch user', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Create user
   */
  static async create(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { name, email, password, role } = req.body;

      const existingUser = await User.findOne({ email, organizationId: req.auth?.organizationId });
      if (existingUser) {
        throw ApiError.conflict('User already exists', ErrorCodes.USER_ALREADY_EXISTS.code);
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

      return ApiResponse.created(res, userWithoutPassword, 'User created successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Create user error:', error);
      return ApiResponse.error(res, 'Failed to create user', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Update user
   */
  static async update(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const updateData = { ...req.body };

      if (updateData.role && req.params.id !== req.auth?.userId && req.auth?.role !== 'PLATFORM_ADMIN') {
        throw ApiError.forbidden('Only platform admins can change user roles');
      }

      if (updateData.email) {
        const existingUser = await User.findOne({ 
          email: updateData.email, 
          organizationId: req.auth?.organizationId,
          _id: { $ne: req.params.id }
        });
        if (existingUser) {
          throw ApiError.conflict('Email already exists');
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
        throw ApiError.notFound('User not found', ErrorCodes.USER_NOT_FOUND.code);
      }

      const { passwordHash, ...userWithoutPassword } = user;

      return ApiResponse.updated(res, userWithoutPassword, 'User updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Update user error:', error);
      return ApiResponse.error(res, 'Failed to update user', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { currentPassword, newPassword } = req.body;

      if (req.params.id !== req.auth?.userId && req.auth?.role !== 'PLATFORM_ADMIN') {
        throw ApiError.forbidden('You can only change your own password');
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        throw ApiError.notFound('User not found', ErrorCodes.USER_NOT_FOUND.code);
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw ApiError.badRequest('Current password is incorrect', ErrorCodes.INVALID_PASSWORD.code);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await User.findByIdAndUpdate(req.params.id, { passwordHash: newPasswordHash });

      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Change password error:', error);
      return ApiResponse.error(res, 'Failed to change password', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete user
   */
  static async delete(req: Request, res: Response) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      
      if (!user) {
        throw ApiError.notFound('User not found', ErrorCodes.USER_NOT_FOUND.code);
      }

      return ApiResponse.deleted(res, 'User deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Delete user error:', error);
      return ApiResponse.error(res, 'Failed to delete user', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
