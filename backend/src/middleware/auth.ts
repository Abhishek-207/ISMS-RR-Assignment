import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User.js';
import { OrganizationCategory } from '../models/Organization.js';

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
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
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
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAuthAndActive(req: AuthRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, next);
}

export function requireRole(roles: UserRole | UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
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

// Backward compatibility aliases (deprecated)
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireOrgAdmin(req, res, next);
}

export function requireProjectManagerOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireOrgAdminOrPlatformAdmin(req, res, next);
}
