import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuthAndActive, requirePlatformAdmin, requireOrgAdminOrPlatformAdmin } from '../middleware/auth.js';
import { OrganizationsController } from '../controllers/organizationsController.js';
import { audit } from '../middleware/audit.js';
import { Organization } from '../models/Organization.model.js';

const router = Router();

router.use(requireAuthAndActive);

router.get('/', OrganizationsController.getAll);

router.get('/:id', OrganizationsController.getById);

router.post('/', [
  body('name').isLength({ min: 2 }),
  body('category').isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION']),
  body('description').optional().isLength({ max: 500 })
], audit('Organization', 'CREATE', () => null, (req, result) => result), OrganizationsController.create);

router.patch('/:id', requireOrgAdminOrPlatformAdmin, [
  body('name').optional().isLength({ min: 2 }),
  body('description').optional().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
], audit('Organization', 'UPDATE', async (req) => {
  return await Organization.findById(req.params.id).lean();
}, async (req) => {
  return await Organization.findById(req.params.id).lean();
}), OrganizationsController.update);

router.delete('/:id', requirePlatformAdmin, audit('Organization', 'DELETE', async (req) => {
  return await Organization.findById(req.params.id).lean();
}, () => null), OrganizationsController.delete);

export default router;
