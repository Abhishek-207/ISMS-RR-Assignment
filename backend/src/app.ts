import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from './utils/apiError.js';
import { ApiResponse } from './utils/apiResponse.js';
import { ErrorCodes } from './utils/ErrorCodes.js';

import authRoutes from './routes/auth.route.js';
import organizationsRoutes from './routes/organizations.route.js';
import mastersRoutes from './routes/masters.route.js';
import materialsRoutes from './routes/materials.route.js';
import transferRoutes from './routes/transfers.route.js';
import filesRoutes from './routes/files.route.js';
import usersRoutes from './routes/users.route.js';
import analyticsRoutes from './routes/analytics.route.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    platform: 'Inventory & Surplus Exchange Platform'
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return ApiResponse.error(
      res,
      err.message,
      err.statusCode,
      err.data,
      err.errorCode
    );
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(
        res,
        'File size exceeds limit',
        400,
        undefined,
        ErrorCodes.FILE_TOO_LARGE.code
      );
    }
    return ApiResponse.error(
      res,
      err.message,
      400,
      undefined,
      ErrorCodes.FILE_UPLOAD_ERROR.code
    );
  }

  // Handle Validation errors
  if (err.name === 'ValidationError') {
    return ApiResponse.error(
      res,
      'Validation error',
      400,
      err.errors,
      ErrorCodes.VALIDATION_ERROR.code
    );
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    return ApiResponse.error(
      res,
      'Duplicate key error',
      409,
      undefined,
      ErrorCodes.DUPLICATE_KEY_ERROR.code
    );
  }

  // Handle MongoDB CastError
  if (err.name === 'CastError') {
    return ApiResponse.error(
      res,
      'Invalid ID format',
      400,
      undefined,
      ErrorCodes.INVALID_INPUT.code
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(
      res,
      'Invalid token',
      401,
      undefined,
      ErrorCodes.TOKEN_INVALID.code
    );
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(
      res,
      'Token expired',
      401,
      undefined,
      ErrorCodes.TOKEN_EXPIRED.code
    );
  }

  // Default error response
  return ApiResponse.error(
    res,
    err.message || 'Internal server error',
    err.statusCode || 500,
    undefined,
    ErrorCodes.INTERNAL_SERVER_ERROR.code
  );
});

export default app;
