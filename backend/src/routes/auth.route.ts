import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController.js';

const router = Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], AuthController.login);

router.post('/signup', [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),
  body('role').isIn(['ORG_ADMIN', 'ORG_USER']).withMessage('Role must be either ORG_ADMIN or ORG_USER'),
  body('organizationCategory')
    .isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION'])
    .withMessage('Please select a valid organization category'),
  body('organizationId').optional().isMongoId().withMessage('Invalid organization ID'),
  body('organizationName').optional().isLength({ min: 2 }).withMessage('Organization name must be at least 2 characters'),
  body('organizationDescription').optional().isLength({ max: 500 }).withMessage('Organization description must not exceed 500 characters')
], AuthController.signup);

// Public endpoint to fetch organizations by category (for signup)
router.get('/organizations', AuthController.getOrganizationsByCategory);

router.get('/me', AuthController.getCurrentUser);

router.post('/logout', AuthController.logout);

export default router;
