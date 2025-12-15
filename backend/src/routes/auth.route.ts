import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController.js';

const router = Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], AuthController.login);

router.post('/signup', [
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ORG_ADMIN', 'ORG_USER']),
  body('organizationCategory').isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION']),
  body('organizationId').optional().isMongoId(),
  body('organizationName').optional().isLength({ min: 2 }),
  body('organizationDescription').optional().isLength({ max: 500 })
], AuthController.signup);

router.get('/me', AuthController.getCurrentUser);

router.post('/logout', AuthController.logout);

export default router;
