import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Material } from '../models/Material.model.js';
import { TransferRequest } from '../models/TransferRequest.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import mongoose from 'mongoose';

export class AnalyticsController {
  /**
   * Get availability analytics
   */
  static async getAvailability(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { siteId, projectId, categoryId, fromDate, toDate } = req.query;

      const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (siteId) matchStage.siteId = new mongoose.Types.ObjectId(siteId as string);
      if (projectId) matchStage.projectId = new mongoose.Types.ObjectId(projectId as string);
      if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      
      if (fromDate || toDate) {
        matchStage.availableFrom = {};
        if (fromDate) matchStage.availableFrom.$gte = new Date(fromDate as string);
        if (toDate) matchStage.availableFrom.$lte = new Date(toDate as string);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'materialstatuses',
            localField: 'statusId',
            foreignField: '_id',
            as: 'status'
          }
        },
        {
          $lookup: {
            from: 'sites',
            localField: 'siteId',
            foreignField: '_id',
            as: 'site'
          }
        },
        {
          $lookup: {
            from: 'materialcategories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $group: {
            _id: {
              status: { $arrayElemAt: ['$status.name', 0] },
              site: { $arrayElemAt: ['$site.name', 0] },
              category: { $arrayElemAt: ['$category.name', 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ];

      const results = await Material.aggregate(pipeline);

      return ApiResponse.success(res, results);
    } catch (error) {
      console.error('Get availability analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch availability analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get transfers analytics
   */
  static async getTransfers(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { fromDate, toDate, status } = req.query;

      const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (status) matchStage.status = status;
      
      if (fromDate || toDate) {
        matchStage.createdAt = {};
        if (fromDate) matchStage.createdAt.$gte = new Date(fromDate as string);
        if (toDate) matchStage.createdAt.$lte = new Date(toDate as string);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'materials',
            localField: 'materialId',
            foreignField: '_id',
            as: 'material'
          }
        },
        {
          $lookup: {
            from: 'sites',
            localField: 'fromSiteId',
            foreignField: '_id',
            as: 'fromSite'
          }
        },
        {
          $lookup: {
            from: 'sites',
            localField: 'toSiteId',
            foreignField: '_id',
            as: 'toSite'
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              fromSite: { $arrayElemAt: ['$fromSite.name', 0] },
              toSite: { $arrayElemAt: ['$toSite.name', 0] },
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
            },
            totalQuantity: { $sum: '$quantityRequested' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.month': 1 as any } }
      ];

      const results = await TransferRequest.aggregate(pipeline);

      return ApiResponse.success(res, results);
    } catch (error) {
      console.error('Get transfer analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch transfer analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get conditions analytics
   */
  static async getConditions(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { siteId, categoryId } = req.query;

      const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (siteId) matchStage.siteId = new mongoose.Types.ObjectId(siteId as string);
      if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$condition',
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ];

      const results = await Material.aggregate(pipeline);

      return ApiResponse.success(res, results);
    } catch (error) {
      console.error('Get condition analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch condition analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
