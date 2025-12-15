import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Organization, OrganizationCategory } from '../models/Organization.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Login
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

    // Update last login
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
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

// Signup - with organization selection/creation
router.post('/signup', [
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ORG_ADMIN', 'ORG_USER']), // Can't directly create PLATFORM_ADMIN
  body('organizationCategory').isIn(['ENTERPRISE', 'MANUFACTURING_CLUSTER', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_NETWORK', 'INFRASTRUCTURE_CONSTRUCTION']),
  body('organizationId').optional().isMongoId(), // If joining existing org
  body('organizationName').optional().isLength({ min: 2 }), // If creating new org
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    let organization;

    // Determine organization: join existing or create new
    if (organizationId) {
      // Join existing organization
      organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Verify category matches
      if (organization.category !== organizationCategory) {
        return res.status(400).json({ error: 'Organization category does not match' });
      }
    } else {
      // Create new organization
      if (!organizationName) {
        return res.status(400).json({ error: 'Organization name is required when creating a new organization' });
      }

      // Check if organization name already exists in this category
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
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

// Get current user
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

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
