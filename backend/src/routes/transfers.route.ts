import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuthAndActive, requireOrgAdminOrPlatformAdmin } from '../middleware/auth.js';
import { TransfersController } from '../controllers/transfersController.js';
import { audit } from '../middleware/audit.js';
import { TransferRequest } from '../models/TransferRequest.model.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', TransfersController.getAll);

router.get('/:id', TransfersController.getById);

router.post('/', [
  body('materialId').isMongoId().withMessage('Invalid material ID'),
  body('quantityRequested').isFloat({ min: 0.01 }).withMessage('Quantity must be a positive number'),
  body('purpose').isLength({ min: 10, max: 1000 }).withMessage('Purpose must be between 10 and 1000 characters'),
  body('comment').optional().isLength({ min: 1 }).withMessage('Comment must not be empty if provided')
], audit('TransferRequest', 'PROCUREMENT_REQUEST_CREATED', () => null, (req, result) => result), TransfersController.create);

router.patch('/:id/approve', requireOrgAdminOrPlatformAdmin, [
  body('comment').optional().isLength({ min: 1 }).withMessage('Comment must not be empty if provided')
], audit('TransferRequest', 'PROCUREMENT_APPROVED', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), TransfersController.approve);

router.patch('/:id/reject', requireOrgAdminOrPlatformAdmin, [
  body('comment').isLength({ min: 1 })
], audit('TransferRequest', 'REJECT', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), TransfersController.reject);

router.patch('/:id/cancel', [
  body('comment').isLength({ min: 1 })
], audit('TransferRequest', 'CANCEL', async (req) => {
  return await TransferRequest.findById(req.params.id).lean();
}, async (req, result) => {
  return await TransferRequest.findById(req.params.id).lean();
}), TransfersController.cancel);

export default router;
