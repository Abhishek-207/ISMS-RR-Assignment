import { Router } from 'express';
import { requireAuthAndActive } from '../middleware/auth.js';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/availability', AnalyticsController.getAvailability);

router.get('/transfers', AnalyticsController.getTransfers);

router.get('/conditions', AnalyticsController.getConditions);

export default router;
