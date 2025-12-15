import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Material } from '../models/Material.model.js';
import { TransferRequest } from '../models/TransferRequest.model.js';
import { MaterialCategory, MaterialStatus } from '../models/Masters.model.js';
import { Organization } from '../models/Organization.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import mongoose from 'mongoose';

export class AnalyticsController {
  /**
   * Get availability analytics - Real data from database
   */
  static async getAvailability(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { categoryId, fromDate, toDate } = req.query;

      const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
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
            localField: 'materialStatusId',
            foreignField: '_id',
            as: 'materialStatus'
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
              status: '$status',
              materialStatus: { $arrayElemAt: ['$materialStatus.name', 0] },
              category: { $arrayElemAt: ['$category.name', 0] },
              condition: '$condition',
              isSurplus: '$isSurplus'
            },
            totalQuantity: { $sum: '$quantity' },
            totalEstimatedCost: { $sum: '$estimatedCost' },
            count: { $sum: 1 },
            materials: {
              $push: {
                name: '$name',
                quantity: '$quantity',
                unit: '$unit',
                estimatedCost: '$estimatedCost'
              }
            }
          }
        },
        { $sort: { totalQuantity: -1 as any } }
      ];

      const results = await Material.aggregate(pipeline);

      // Get summary statistics
      const summaryPipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalMaterials: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalEstimatedValue: { $sum: '$estimatedCost' },
            availableMaterials: {
              $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
            },
            reservedMaterials: {
              $sum: { $cond: [{ $eq: ['$status', 'RESERVED'] }, 1, 0] }
            },
            surplusMaterials: {
              $sum: { $cond: ['$isSurplus', 1, 0] }
            }
          }
        }
      ];

      const summary = await Material.aggregate(summaryPipeline);

      return ApiResponse.success(res, {
        details: results,
        summary: summary[0] || {
          totalMaterials: 0,
          totalQuantity: 0,
          totalEstimatedValue: 0,
          availableMaterials: 0,
          reservedMaterials: 0,
          surplusMaterials: 0
        }
      });
    } catch (error) {
      console.error('Get availability analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch availability analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get transfers analytics - Real data from database
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
            from: 'organizations',
            localField: 'fromOrganizationId',
            foreignField: '_id',
            as: 'fromOrganization'
          }
        },
        {
          $lookup: {
            from: 'organizations',
            localField: 'toOrganizationId',
            foreignField: '_id',
            as: 'toOrganization'
          }
        },
        {
          $lookup: {
            from: 'materialcategories',
            localField: 'material.categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              fromOrganization: { $arrayElemAt: ['$fromOrganization.name', 0] },
              toOrganization: { $arrayElemAt: ['$toOrganization.name', 0] },
              category: { $arrayElemAt: ['$category.name', 0] },
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
            },
            totalQuantity: { $sum: '$quantityRequested' },
            count: { $sum: 1 },
            transfers: {
              $push: {
                material: { $arrayElemAt: ['$material.name', 0] },
                quantityRequested: '$quantityRequested',
                purpose: '$purpose',
                createdAt: '$createdAt'
              }
            }
          }
        },
        { $sort: { '_id.month': -1 as any } }
      ];

      const results = await TransferRequest.aggregate(pipeline);

      // Get status summary
      const statusSummary = [
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantityRequested' }
          }
        }
      ];

      const statusResults = await TransferRequest.aggregate(statusSummary);

      return ApiResponse.success(res, {
        details: results,
        statusSummary: statusResults
      });
    } catch (error) {
      console.error('Get transfer analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch transfer analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get conditions analytics - Real data from database
   */
  static async getConditions(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { categoryId } = req.query;

      const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);

      const pipeline = [
        { $match: matchStage },
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
              condition: '$condition',
              category: { $arrayElemAt: ['$category.name', 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            totalEstimatedCost: { $sum: '$estimatedCost' },
            count: { $sum: 1 },
            materials: {
              $push: {
                name: '$name',
                quantity: '$quantity',
                unit: '$unit',
                status: '$status'
              }
            }
          }
        },
        { $sort: { totalQuantity: -1 as any } }
      ];

      const results = await Material.aggregate(pipeline);

      return ApiResponse.success(res, results);
    } catch (error) {
      console.error('Get condition analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch condition analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get categories analytics - Real data from database
   */
  static async getCategories(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;

      // Get all categories with material counts
      const categoriesWithCounts = await MaterialCategory.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), isActive: true } },
        {
          $lookup: {
            from: 'materials',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$categoryId', '$$categoryId'] },
                      { $eq: ['$organizationId', new mongoose.Types.ObjectId(organizationId)] }
                    ]
                  }
                }
              }
            ],
            as: 'materials'
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            isActive: 1,
            materialsCount: { $size: '$materials' },
            totalQuantity: { $sum: '$materials.quantity' },
            totalEstimatedValue: { $sum: '$materials.estimatedCost' },
            availableMaterials: {
              $size: {
                $filter: {
                  input: '$materials',
                  as: 'mat',
                  cond: { $eq: ['$$mat.status', 'AVAILABLE'] }
                }
              }
            },
            surplusMaterials: {
              $size: {
                $filter: {
                  input: '$materials',
                  as: 'mat',
                  cond: { $eq: ['$$mat.isSurplus', true] }
                }
              }
            }
          }
        },
        { $sort: { materialsCount: -1 } }
      ]);

      return ApiResponse.success(res, categoriesWithCounts);
    } catch (error) {
      console.error('Get categories analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch categories analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get statuses analytics - Real data from database
   */
  static async getStatuses(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;

      // Get all statuses with material counts
      const statusesWithCounts = await MaterialStatus.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), isActive: true } },
        {
          $lookup: {
            from: 'materials',
            let: { statusId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$materialStatusId', '$$statusId'] },
                      { $eq: ['$organizationId', new mongoose.Types.ObjectId(organizationId)] }
                    ]
                  }
                }
              }
            ],
            as: 'materials'
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            isActive: 1,
            materialsCount: { $size: '$materials' },
            totalQuantity: { $sum: '$materials.quantity' },
            totalEstimatedValue: { $sum: '$materials.estimatedCost' },
            byCondition: {
              $map: {
                input: ['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP'],
                as: 'cond',
                in: {
                  condition: '$$cond',
                  count: {
                    $size: {
                      $filter: {
                        input: '$materials',
                        as: 'mat',
                        cond: { $eq: ['$$mat.condition', '$$cond'] }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        { $sort: { materialsCount: -1 } }
      ]);

      return ApiResponse.success(res, statusesWithCounts);
    } catch (error) {
      console.error('Get statuses analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch statuses analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Get comprehensive dashboard analytics - Real data from database
   */
  static async getDashboard(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { fromDate, toDate, categoryId, condition, status } = req.query;

      // Build match stage with filters
      const materialMatchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (categoryId) materialMatchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      if (condition) materialMatchStage.condition = condition;
      if (status) materialMatchStage.status = status;
      
      if (fromDate || toDate) {
        materialMatchStage.availableFrom = {};
        if (fromDate) materialMatchStage.availableFrom.$gte = new Date(fromDate as string);
        if (toDate) materialMatchStage.availableFrom.$lte = new Date(toDate as string);
      }

      // Overall statistics
      const overallStats = await Material.aggregate([
        { $match: materialMatchStage },
        {
          $group: {
            _id: null,
            totalMaterials: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalEstimatedValue: { $sum: '$estimatedCost' },
            availableMaterials: {
              $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
            },
            reservedMaterials: {
              $sum: { $cond: [{ $eq: ['$status', 'RESERVED'] }, 1, 0] }
            },
            surplusMaterials: {
              $sum: { $cond: ['$isSurplus', 1, 0] }
            }
          }
        }
      ]);

      // Build transfer match stage with filters
      const transferMatchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (fromDate || toDate) {
        transferMatchStage.createdAt = {};
        if (fromDate) transferMatchStage.createdAt.$gte = new Date(fromDate as string);
        if (toDate) transferMatchStage.createdAt.$lte = new Date(toDate as string);
      }

      // Transfer statistics
      const transferStats = await TransferRequest.aggregate([
        { $match: transferMatchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantityRequested' }
          }
        }
      ]);

      // Materials by condition
      const conditionStats = await Material.aggregate([
        { $match: materialMatchStage },
        {
          $group: {
            _id: '$condition',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      // Top categories
      const topCategories = await Material.aggregate([
        { $match: materialMatchStage },
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
            _id: '$categoryId',
            categoryName: { $first: { $arrayElemAt: ['$category.name', 0] } },
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: '$estimatedCost' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      return ApiResponse.success(res, {
        overall: overallStats[0] || {},
        transfers: transferStats,
        conditions: conditionStats,
        topCategories
      });
    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      return ApiResponse.error(res, 'Failed to fetch dashboard analytics', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Export analytics report as CSV
   */
  static async exportReport(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.auth?.organizationId;
      const { fromDate, toDate, categoryId, condition, status, isSurplus } = req.query;

      const matchStage: any = {};
      
      // Handle surplus materials (from other organizations)
      if (isSurplus === 'true') {
        matchStage.isSurplus = true;
        matchStage.status = 'AVAILABLE';
        
        // Get organizations in the same category
        const sameCategOrgs = await Organization.find({ 
          category: req.auth?.organizationCategory,
          isActive: true 
        }).select('_id').lean();
        
        matchStage.organizationId = { 
          $in: sameCategOrgs.map(o => o._id),
          $ne: new mongoose.Types.ObjectId(organizationId)
        };
      } else {
        // Regular materials from user's organization
        matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);
      }
      
      if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      if (condition) matchStage.condition = condition;
      if (status && isSurplus !== 'true') matchStage.status = status;
      
      if (fromDate || toDate) {
        matchStage.availableFrom = {};
        if (fromDate) matchStage.availableFrom.$gte = new Date(fromDate as string);
        if (toDate) matchStage.availableFrom.$lte = new Date(toDate as string);
      }

      // Fetch materials with all details
      const materials = await Material.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'materialcategories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $lookup: {
            from: 'materialstatuses',
            localField: 'materialStatusId',
            foreignField: '_id',
            as: 'materialStatus'
          }
        },
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization'
          }
        },
        {
          $project: {
            name: 1,
            category: { $arrayElemAt: ['$category.name', 0] },
            materialStatus: { $arrayElemAt: ['$materialStatus.name', 0] },
            organization: { $arrayElemAt: ['$organization.name', 0] },
            quantity: 1,
            unit: 1,
            status: 1,
            condition: 1,
            isSurplus: 1,
            estimatedCost: 1,
            location: 1,
            availableFrom: 1,
            availableUntil: 1,
            notes: 1,
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 as any } }
      ]);

      // Create CSV content
      const csvHeaders = [
        'Material Name',
        'Category',
        'Organization',
        'Status',
        'Material Status',
        'Condition',
        'Quantity',
        'Unit',
        'Is Surplus',
        'Estimated Cost',
        'Location',
        'Available From',
        'Available Until',
        'Notes',
        'Created At'
      ].join(',');

      const csvRows = materials.map((material: any) => {
        return [
          `"${material.name || ''}"`,
          `"${material.category || ''}"`,
          `"${material.organization || ''}"`,
          `"${material.status || ''}"`,
          `"${material.materialStatus || ''}"`,
          `"${material.condition || ''}"`,
          material.quantity || 0,
          `"${material.unit || ''}"`,
          material.isSurplus ? 'Yes' : 'No',
          material.estimatedCost || 0,
          `"${material.location || ''}"`,
          material.availableFrom ? new Date(material.availableFrom).toISOString().split('T')[0] : '',
          material.availableUntil ? new Date(material.availableUntil).toISOString().split('T')[0] : '',
          `"${(material.notes || '').replace(/"/g, '""')}"`,
          material.createdAt ? new Date(material.createdAt).toISOString().split('T')[0] : ''
        ].join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${Date.now()}.csv`);
      
      return res.send(csvContent);
    } catch (error) {
      console.error('Export analytics report error:', error);
      return ApiResponse.error(res, 'Failed to export analytics report', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
