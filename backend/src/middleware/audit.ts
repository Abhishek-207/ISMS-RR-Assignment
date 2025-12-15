import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { AuthRequest } from './auth.js';

export function audit(
  entity: string, 
  action: string, 
  readBefore: (req: AuthRequest) => Promise<any> | any,
  readAfter: (req: AuthRequest, result: any) => Promise<any> | any
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let before = null;
      let after = null;

      // Read before state
      try {
        before = await readBefore(req);
      } catch (error) {
        console.warn('Failed to read before state for audit:', error);
      }

      // Store original res.json
      const originalJson = res.json;

      // Override res.json to capture the response
      res.json = function(body: any) {
        // Read after state
        readAfter(req, body).then((afterData: any) => {
          after = afterData;
          
          // Create audit log
          AuditLog.create({
            organizationId: req.auth?.organizationId,
            entity,
            entityId: req.params.id || body?.id || body?._id,
            action,
            changedBy: req.auth?.userId,
            changedAt: new Date(),
            before,
            after,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }).catch((error: any) => {
            console.error('Failed to create audit log:', error);
          });
        }).catch((error: any) => {
          console.error('Failed to read after state for audit:', error);
        });

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next();
    }
  };
}
