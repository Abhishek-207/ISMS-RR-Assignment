import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Organization, OrganizationCategory } from '../models/Organization.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organizationId');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const token = jwt.sign(
      { 
        userId: user._id, 
        organizationId: user.organizationId,
        organizationCategory: user.organizationCategory,
        role: user.role
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organizationId._id,
          name: (user.organizationId as any).name,
          category: (user.organizationId as any).category
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/signup', [
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ORG_ADMIN', 'ORG_USER']),
  body('organizationCategory').isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION']),
  body('organizationId').optional().isMongoId(),
  body('organizationName').optional().isLength({ min: 2 }),
  body('organizationDescription').optional().isLength({ max: 500 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      email, 
      password, 
      role, 
      organizationCategory,
      organizationId,
      organizationName,
      organizationDescription
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    let organization;

    if (organizationId) {
      organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (organization.category !== organizationCategory) {
        return res.status(400).json({ error: 'Organization category does not match' });
      }
    } else {
      if (!organizationName) {
        return res.status(400).json({ error: 'Organization name is required when creating a new organization' });
      }

      const existingOrg = await Organization.findOne({ 
        name: organizationName, 
        category: organizationCategory 
      });
      
      if (existingOrg) {
        return res.status(400).json({ 
          error: 'Organization with this name already exists in this category',
          suggestion: 'You can join the existing organization instead'
        });
      }

      organization = await Organization.create({
        name: organizationName,
        category: organizationCategory,
        description: organizationDescription,
        isActive: true
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      organizationId: organization._id,
      organizationCategory: organization.category,
      name,
      email,
      passwordHash,
      role,
      isActive: true
    });

    const token = jwt.sign(
      { 
        userId: user._id, 
        organizationId: user.organizationId,
        organizationCategory: user.organizationCategory,
        role: user.role
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: organization._id,
          name: organization.name,
          category: organization.category
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    const user = await User.findById(decoded.userId).populate('organizationId').lean();
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organizationId._id,
          name: (user.organizationId as any).name,
          category: (user.organizationId as any).category
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
