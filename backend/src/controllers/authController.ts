import { Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { Organization } from '../models/Organization.model.js';
import { AuthRequest } from '../middleware/auth.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

export class AuthController {
  /**
   * User login
   */
  static async login(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).populate('organizationId');
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS.code);
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw ApiError.unauthorized('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS.code);
      }

      await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

      const token = jwt.sign(
        { 
          userId: user._id, 
          organizationId: user.organizationId,
          organizationCategory: user.organizationCategory,
          role: user.role
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return ApiResponse.success(res, {
        token,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId._id,
          organizationCategory: (user.organizationId as any).category,
          organization: {
            _id: user.organizationId._id,
            id: user.organizationId._id,
            name: (user.organizationId as any).name,
            category: (user.organizationId as any).category
          }
        }
      }, 'Login successful');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Login error:', error);
      return ApiResponse.error(res, 'Login failed', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * User registration
   */
  static async signup(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validationError('Validation failed', errors.array());
      }

      const { 
        name, 
        email, 
        password, 
        role, 
        organizationCategory,
        organizationId,
        organizationName,
        organizationDescription
      } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw ApiError.conflict('User with this email already exists', ErrorCodes.USER_ALREADY_EXISTS.code);
      }

      let organization;

      if (organizationId) {
        organization = await Organization.findById(organizationId);
        if (!organization) {
          throw ApiError.notFound('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND.code);
        }
        
        if (organization.category !== organizationCategory) {
          throw ApiError.badRequest('Organization category does not match');
        }
      } else {
        if (!organizationName) {
          throw ApiError.badRequest('Organization name is required when creating a new organization');
        }

        const existingOrg = await Organization.findOne({ 
          name: organizationName, 
          category: organizationCategory 
        });
        
        if (existingOrg) {
          throw ApiError.conflict('Organization with this name already exists in this category', ErrorCodes.ORGANIZATION_ALREADY_EXISTS.code);
        }

        organization = await Organization.create({
          name: organizationName,
          category: organizationCategory,
          description: organizationDescription,
          isActive: true
        });
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = await User.create({
        organizationId: organization._id,
        organizationCategory: organization.category,
        name,
        email,
        passwordHash,
        role,
        isActive: true
      });

      const token = jwt.sign(
        { 
          userId: user._id, 
          organizationId: user.organizationId,
          organizationCategory: user.organizationCategory,
          role: user.role
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return ApiResponse.created(res, {
        token,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: organization._id,
          organizationCategory: organization.category,
          organization: {
            _id: organization._id,
            id: organization._id,
            name: organization.name,
            category: organization.category
          }
        }
      }, 'Registration successful');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Registration error:', error);
      return ApiResponse.error(res, 'Registration failed', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
      
      if (!token) {
        throw ApiError.unauthorized('Authentication required', ErrorCodes.UNAUTHORIZED.code);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      const user = await User.findById(decoded.userId).populate('organizationId').lean();
      
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('Invalid or inactive user', ErrorCodes.USER_INACTIVE.code);
      }

      return ApiResponse.success(res, {
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId._id,
          organizationCategory: (user.organizationId as any).category,
          organization: {
            _id: user.organizationId._id,
            id: user.organizationId._id,
            name: (user.organizationId as any).name,
            category: (user.organizationId as any).category
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('Get user error:', error);
      return ApiResponse.error(res, 'Failed to get user', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * User logout
   */
  static async logout(req: AuthRequest, res: Response) {
    try {
      res.clearCookie('token');
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      return ApiResponse.error(res, 'Logout failed', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
