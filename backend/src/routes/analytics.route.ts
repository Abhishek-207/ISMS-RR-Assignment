import { Router } from 'express';
import { requireAuthAndActive } from '../middleware/auth.js';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/availability', AnalyticsController.getAvailability);

router.get('/transfers', AnalyticsController.getTransfers);

router.get('/conditions', AnalyticsController.getConditions);

router.get('/categories', AnalyticsController.getCategories);

router.get('/statuses', AnalyticsController.getStatuses);

router.get('/dashboard', AnalyticsController.getDashboard);

router.get('/export', AnalyticsController.exportReport);

export default router;
