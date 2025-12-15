import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { File } from '../models/File.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import { cloudinaryService } from '../utils/cloudinaryService.js';

export class FilesController {
  /**
   * Upload file to Cloudinary
   */
  static async upload(req: AuthRequest, res: Response) {
    try {
      console.log('Upload request received');
      console.log('req.file:', req.file ? 'Present' : 'Missing');
      
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded', ErrorCodes.FILE_UPLOAD_ERROR.code);
      }

      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      });

      // Validate image type
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedImageTypes.includes(req.file.mimetype)) {
        throw ApiError.badRequest('Only image files are allowed', ErrorCodes.FILE_UPLOAD_ERROR.code);
      }

      // Validate file size (3MB max)
      const maxSize = 3 * 1024 * 1024; // 3MB
      if (req.file.size > maxSize) {
        throw ApiError.badRequest('File size must not exceed 3MB', ErrorCodes.FILE_UPLOAD_ERROR.code);
      }

      // Check if buffer exists
      if (!req.file.buffer) {
        console.error('File buffer is missing!');
        throw ApiError.internal('File buffer is missing', ErrorCodes.FILE_UPLOAD_ERROR.code);
      }

      console.log('Uploading to Cloudinary...');
      // Upload to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadImage(req.file.buffer, {
        folder: 'inventory-attachments',
        tags: ['inventory', req.auth?.organizationId || '']
      });
      console.log('Cloudinary upload successful:', cloudinaryResult.public_id);

      // Save file metadata to database
      const file = await File.create({
        organizationId: req.auth?.organizationId,
        originalName: req.file.originalname,
        filename: cloudinaryResult.public_id,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: cloudinaryResult.secure_url,
        uploadedBy: req.auth?.userId
      });

      console.log('File metadata saved to database:', file._id);

      return ApiResponse.created(res, {
        id: file._id,
        originalName: file.originalName,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        thumbnail: cloudinaryService.getThumbnailUrl(cloudinaryResult.public_id, 200, 200),
        uploadedAt: file.uploadedAt
      }, 'File uploaded successfully');
    } catch (error) {
      console.error('File upload error details:', error);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      return ApiResponse.error(res, 'Failed to upload file', 500, undefined, ErrorCodes.FILE_UPLOAD_ERROR.code);
    }
  }

  /**
   * Get/Download file
   */
  static async download(req: AuthRequest, res: Response) {
    try {
      const file = await File.findById(req.params.id);
      if (!file) {
        throw ApiError.notFound('File not found', ErrorCodes.FILE_NOT_FOUND.code);
      }

      // Since files are stored on Cloudinary, redirect to the Cloudinary URL
      // The file.path contains the secure_url from Cloudinary
      return res.redirect(file.path);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('File download error:', error);
      return ApiResponse.error(res, 'Failed to download file', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete file from Cloudinary
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      const file = await File.findById(req.params.id);
      if (!file) {
        throw ApiError.notFound('File not found', ErrorCodes.FILE_NOT_FOUND.code);
      }

      // Delete from Cloudinary using public_id (stored in filename field)
      try {
        await cloudinaryService.deleteFile(file.filename, 'image');
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue to delete from database even if Cloudinary deletion fails
      }

      // Delete from database
      await File.findByIdAndDelete(req.params.id);

      return ApiResponse.deleted(res, 'File deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('File deletion error:', error);
      return ApiResponse.error(res, 'Failed to delete file', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }
}
