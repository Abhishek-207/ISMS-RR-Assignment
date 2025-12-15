import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Automatically forwards errors to the global error handler
 * 
 * Usage:
 * router.get('/users', asyncHandler(UsersController.getAll));
 * 
 * This eliminates the need for try-catch blocks in every controller method
 */
export const asyncHandler = (fn: (req: AuthRequest | Request, res: Response, next?: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
