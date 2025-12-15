import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuthAndActive } from '../middleware/auth.js';
import { MaterialsController } from '../controllers/materialsController.js';
import { audit } from '../middleware/audit.js';
import { Material } from '../models/Material.model.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', MaterialsController.getAll);

router.get('/surplus', MaterialsController.getSurplus);

router.get('/stats/overview', MaterialsController.getStats);

router.get('/:id', MaterialsController.getById);

router.post('/', [
  body('name').isLength({ min: 1 }),
  body('categoryId').isMongoId(),
  body('quantity').isNumeric().isFloat({ min: 0 }),
  body('unit').isLength({ min: 1 }),
  body('condition').isIn(['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP']),
  body('availableFrom').isISO8601(),
  body('availableUntil').isISO8601(),
  body('materialStatusId').optional().isMongoId(),
  body('estimatedCost').optional().isNumeric().isFloat({ min: 0 })
], audit('Material', 'INVENTORY_CREATED', () => null, (req, result) => result), MaterialsController.create);

router.patch('/:id/mark-surplus', audit('Material', 'MARKED_AS_SURPLUS', async (req) => {
  return await Material.findById(req.params.id).lean();
}, async (req) => {
  return await Material.findById(req.params.id).lean();
}), MaterialsController.markAsSurplus);

router.patch('/:id', [
  body('name').optional().isLength({ min: 1 }),
  body('categoryId').optional().isMongoId(),
  body('quantity').optional().isNumeric().isFloat({ min: 0 }),
  body('unit').optional().isLength({ min: 1 }),
  body('status').optional().isIn(['AVAILABLE', 'RESERVED', 'TRANSFERRED', 'ARCHIVED']),
  body('materialStatusId').optional().isMongoId(),
  body('condition').optional().isIn(['NEW', 'GOOD', 'SLIGHTLY_DAMAGED', 'NEEDS_REPAIR', 'SCRAP']),
  body('availableFrom').optional().isISO8601(),
  body('availableUntil').optional().isISO8601(),
  body('estimatedCost').optional().isNumeric().isFloat({ min: 0 })
], audit('Material', 'UPDATE', async (req) => {
  return await Material.findById(req.params.id).lean();
}, async (req, result) => {
  return await Material.findById(req.params.id).lean();
}), MaterialsController.update);

router.delete('/:id', audit('Material', 'DELETE', async (req) => {
  return await Material.findById(req.params.id).lean();
}, () => null), MaterialsController.delete);

export default router;
