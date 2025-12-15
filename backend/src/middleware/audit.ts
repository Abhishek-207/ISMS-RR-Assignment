import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.model.js';
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

      try {
        before = await readBefore(req);
      } catch (error) {
        console.warn('Failed to read before state for audit:', error);
      }

      const originalJson = res.json;

      res.json = function(body: any) {
        
        Promise.resolve(readAfter(req, body))
          .then((afterData: any) => {
            after = afterData;
            
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
          })
          .catch((error: any) => {
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
