import { Response } from 'express';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.js';
import { File } from '../models/File.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';

export class FilesController {
  /**
   * Upload file
   */
  static async upload(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded', ErrorCodes.FILE_UPLOAD_ERROR.code);
      }

      const file = await File.create({
        organizationId: req.auth?.organizationId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.auth?.userId
      });

      return ApiResponse.created(res, {
        id: file._id,
        originalName: file.originalName,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt
      }, 'File uploaded successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('File upload error:', error);
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

      if (!fs.existsSync(file.path)) {
        throw ApiError.notFound('File not found on disk', ErrorCodes.FILE_NOT_FOUND.code);
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, undefined, error.errorCode);
      }
      console.error('File download error:', error);
      return ApiResponse.error(res, 'Failed to download file', 500, undefined, ErrorCodes.INTERNAL_SERVER_ERROR.code);
    }
  }

  /**
   * Delete file
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      const file = await File.findById(req.params.id);
      if (!file) {
        throw ApiError.notFound('File not found', ErrorCodes.FILE_NOT_FOUND.code);
      }

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

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
