import { Router, Request, Response } from 'express';
import { requireAuth, requireAuthAndActive, AuthRequest } from '../middleware/auth.js';
import { Material } from '../models/Material.js';
import { TransferRequest } from '../models/TransferRequest.js';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuthAndActive);

// Get material availability overview
router.get('/availability', async (req: AuthRequest, res: Response) => {
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

    res.json(results);
  } catch (error) {
    console.error('Get availability analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch availability analytics' });
  }
});

// Get transfer trends
router.get('/transfers', async (req: AuthRequest, res: Response) => {
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

    res.json(results);
  } catch (error) {
    console.error('Get transfer analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch transfer analytics' });
  }
});

// Get material condition distribution
router.get('/conditions', async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;
    const { siteId, categoryId } = req.query;

    const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    
    if (siteId) matchStage.siteId = new mongoose.Types.ObjectId(siteId as string);
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
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Material.aggregate(pipeline);

    res.json(results);
  } catch (error) {
    console.error('Get condition analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch condition analytics' });
  }
});

// Get site-wise material distribution
router.get('/sites', async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;

    const pipeline = [
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
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
            site: { $arrayElemAt: ['$site.name', 0] },
            category: { $arrayElemAt: ['$category.name', 0] }
          },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Material.aggregate(pipeline);

    res.json(results);
  } catch (error) {
    console.error('Get site analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch site analytics' });
  }
});

// Get utilization trends
router.get('/utilization', async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;
    const { fromDate, toDate } = req.query;

    const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    
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
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            status: '$status'
          },
          totalQuantity: { $sum: '$quantityRequested' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 as any } }
    ];

    const results = await TransferRequest.aggregate(pipeline);

    res.json(results);
  } catch (error) {
    console.error('Get utilization analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch utilization analytics' });
  }
});

// Export analytics report
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.auth?.organizationId;
    const { 
      fromDate, 
      toDate, 
      siteId, 
      categoryId, 
      status,
      format = 'csv' 
    } = req.query;

    // Build match stage for filtering
    const matchStage: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    
    if (siteId) matchStage.siteId = new mongoose.Types.ObjectId(siteId as string);
    if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId as string);
    if (status) matchStage.status = status;
    
    if (fromDate || toDate) {
      matchStage.createdAt = {};
      if (fromDate) matchStage.createdAt.$gte = new Date(fromDate as string);
      if (toDate) matchStage.createdAt.$lte = new Date(toDate as string);
    }

    // Get comprehensive analytics data
    const [availabilityData, transferData, conditionData, siteData, utilizationData, statsData] = await Promise.all([
      // Material availability by status
      Material.aggregate([
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
          $group: {
            _id: {
              status: { $arrayElemAt: ['$status.name', 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Transfer trends
      TransferRequest.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
            },
            totalQuantity: { $sum: '$quantityRequested' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.month': 1 as any } }
      ]),

      // Material condition distribution
      Material.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              condition: '$condition'
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Site-wise distribution
      Material.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        {
          $lookup: {
            from: 'sites',
            localField: 'siteId',
            foreignField: '_id',
            as: 'site'
          }
        },
        {
          $group: {
            _id: {
              site: { $arrayElemAt: ['$site.name', 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Utilization trends
      TransferRequest.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
            },
            totalQuantity: { $sum: '$quantityRequested' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.month': 1 as any } }
      ]),

      // Summary statistics
      Material.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
        {
          $lookup: {
            from: 'materialstatuses',
            localField: 'statusId',
            foreignField: '_id',
            as: 'status'
          }
        },
        {
          $group: {
            _id: {
              status: { $arrayElemAt: ['$status.name', 0] }
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate summary stats
    const totalMaterials = statsData.reduce((sum: number, item: any) => sum + item.totalQuantity, 0);
    const availableMaterials = statsData.find((item: any) => item._id.status === 'AVAILABLE')?.totalQuantity || 0;
    const reservedMaterials = statsData.find((item: any) => item._id.status === 'RESERVED')?.totalQuantity || 0;
    const inUseMaterials = statsData.find((item: any) => item._id.status === 'IN_USE')?.totalQuantity || 0;
    const transferredMaterials = statsData.find((item: any) => item._id.status === 'TRANSFERRED')?.totalQuantity || 0;

    const exportData = {
      generatedAt: new Date().toISOString(),
      filters: {
        fromDate: fromDate || null,
        toDate: toDate || null,
        siteId: siteId || null,
        categoryId: categoryId || null,
        status: status || null
      },
      stats: {
        totalMaterials,
        availableMaterials,
        reservedMaterials,
        inUseMaterials,
        transferredMaterials
      },
      availabilityData,
      transferData,
      conditionData,
      siteData,
      utilizationData
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } else {
      // Generate CSV
      const csvContent = generateCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Helper function to generate CSV content
function generateCSV(data: any): string {
  let csv = 'Analytics Report\n';
  csv += `Generated on: ${new Date(data.generatedAt).toLocaleString()}\n\n`;
  
  // Summary Statistics
  csv += 'SUMMARY STATISTICS\n';
  csv += 'Metric,Value,Percentage\n';
  csv += `Total Materials,${data.stats.totalMaterials},100%\n`;
  csv += `Available Materials,${data.stats.availableMaterials},${data.stats.totalMaterials > 0 ? Math.round((data.stats.availableMaterials / data.stats.totalMaterials) * 100) : 0}%\n`;
  csv += `Reserved Materials,${data.stats.reservedMaterials},${data.stats.totalMaterials > 0 ? Math.round((data.stats.reservedMaterials / data.stats.totalMaterials) * 100) : 0}%\n`;
  csv += `In Use Materials,${data.stats.inUseMaterials},${data.stats.totalMaterials > 0 ? Math.round((data.stats.inUseMaterials / data.stats.totalMaterials) * 100) : 0}%\n`;
  csv += `Transferred Materials,${data.stats.transferredMaterials},${data.stats.totalMaterials > 0 ? Math.round((data.stats.transferredMaterials / data.stats.totalMaterials) * 100) : 0}%\n\n`;
  
  // Material Availability by Status
  csv += 'MATERIAL AVAILABILITY BY STATUS\n';
  csv += 'Status,Total Quantity,Count\n';
  data.availabilityData.forEach((item: any) => {
    csv += `${item._id.status || 'Unknown'},${item.totalQuantity},${item.count}\n`;
  });
  csv += '\n';
  
  // Material Condition Distribution
  csv += 'MATERIAL CONDITION DISTRIBUTION\n';
  csv += 'Condition,Total Quantity,Count\n';
  data.conditionData.forEach((item: any) => {
    csv += `${item._id.condition || 'Unknown'},${item.totalQuantity},${item.count}\n`;
  });
  csv += '\n';
  
  // Transfer Trends
  csv += 'TRANSFER TRENDS\n';
  csv += 'Month,Total Quantity,Count\n';
  data.transferData.forEach((item: any) => {
    csv += `${item._id.month},${item.totalQuantity},${item.count}\n`;
  });
  csv += '\n';
  
  // Site-wise Distribution
  csv += 'SITE-WISE MATERIAL DISTRIBUTION\n';
  csv += 'Site,Total Quantity,Count\n';
  data.siteData.forEach((item: any) => {
    csv += `${item._id.site || 'Unknown'},${item.totalQuantity},${item.count}\n`;
  });
  csv += '\n';
  
  // Utilization Trends
  csv += 'MATERIAL UTILIZATION TRENDS\n';
  csv += 'Month,Total Quantity,Count\n';
  data.utilizationData.forEach((item: any) => {
    csv += `${item._id.month},${item.totalQuantity},${item.count}\n`;
  });
  
  return csv;
}

export default router;
