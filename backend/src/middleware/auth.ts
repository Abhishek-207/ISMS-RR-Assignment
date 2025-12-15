import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User.model.js';
import { OrganizationCategory } from '../models/Organization.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    organizationId: string;
    organizationCategory: OrganizationCategory;
    role: UserRole;
    email: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      throw ApiError.unauthorized('Authentication required', ErrorCodes.UNAUTHORIZED.code);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Your session has expired. Please login again.', ErrorCodes.TOKEN_EXPIRED.code);
      }
      throw ApiError.unauthorized('Invalid token', ErrorCodes.TOKEN_INVALID.code);
    }
    
    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid or inactive user', ErrorCodes.USER_INACTIVE.code);
    }

    req.auth = {
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      organizationCategory: user.organizationCategory,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
    }
    return ApiResponse.error(res, 'Authentication failed', 401, undefined, ErrorCodes.UNAUTHORIZED.code);
  }
}

export async function requireAuthAndActive(req: AuthRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, next);
}

export function requireRole(roles: UserRole | UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return ApiResponse.error(res, 'Authentication required', 401, undefined, ErrorCodes.UNAUTHORIZED.code);
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.auth.role)) {
      return ApiResponse.error(res, 'Insufficient permissions', 403, undefined, ErrorCodes.FORBIDDEN.code);
    }

    next();
  };
}

export function requirePlatformAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole('PLATFORM_ADMIN')(req, res, next);
}

export function requireOrgAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole('ORG_ADMIN')(req, res, next);
}

export function requireOrgAdminOrPlatformAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole(['PLATFORM_ADMIN', 'ORG_ADMIN'])(req, res, next);
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireOrgAdmin(req, res, next);
}

export function requireProjectManagerOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireOrgAdminOrPlatformAdmin(req, res, next);
}
