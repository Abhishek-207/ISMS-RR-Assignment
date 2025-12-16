import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuthAndActive, requireOrgAdmin } from '../middleware/auth.js';
import { MastersController } from '../controllers/mastersController.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/material-categories', MastersController.getMaterialCategories);
router.get('/material-categories-surplus', MastersController.getCategoriesForSurplus);

router.post('/material-categories', requireOrgAdmin, [
  body('name').isLength({ min: 1 }).trim()
], MastersController.createMaterialCategory);

router.patch('/material-categories/:id', requireOrgAdmin, [
  body('name').optional().isLength({ min: 1 }).trim(),
  body('isActive').optional().isBoolean()
], MastersController.updateMaterialCategory);

router.delete('/material-categories/:id', requireOrgAdmin, MastersController.deleteMaterialCategory);

router.get('/material-statuses', MastersController.getMaterialStatuses);

router.post('/material-statuses', requireOrgAdmin, [
  body('name').isLength({ min: 1 }).trim()
], MastersController.createMaterialStatus);

router.patch('/material-statuses/:id', requireOrgAdmin, [
  body('name').optional().isLength({ min: 1 }).trim(),
  body('isActive').optional().isBoolean()
], MastersController.updateMaterialStatus);

router.delete('/material-statuses/:id', requireOrgAdmin, MastersController.deleteMaterialStatus);

export default router;
