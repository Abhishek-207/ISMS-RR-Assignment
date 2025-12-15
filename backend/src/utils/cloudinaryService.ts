import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from './apiError.js';
import { ErrorCodes } from './ErrorCodes.js';
import streamifier from 'streamifier';

// Delay configuration until first use
let isConfigured = false;

function ensureConfigured() {
  if (!isConfigured) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Log configuration status (without secrets)
    console.log('Cloudinary Configuration:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET',
    });

    isConfigured = true;
  }
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  public_id?: string;
  transformation?: any;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  width?: number;
  height?: number;
  bytes: number;
  created_at: string;
}

class CloudinaryService {
  /**
   * Upload file buffer to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
   
      ensureConfigured();
      
      console.log('uploadBuffer called with buffer size:', buffer?.length || 'undefined');
      console.log('Upload options:', options);
      
      const defaultOptions = {
        folder: options.folder || 'uploads',
        resource_type: options.resource_type || 'auto',
        tags: options.tags || [],
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { ...defaultOptions, ...options },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload_stream error:', error);
              reject(
                ApiError.internal(
                  `Failed to upload file to Cloudinary: ${error.message}`,
                  ErrorCodes.FILE_UPLOAD_ERROR.code
                )
              );
            } else {
              console.log('Cloudinary upload successful:', result?.public_id);
              resolve(result as CloudinaryUploadResult);
            }
          }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      throw ApiError.internal(
        `Failed to upload file to Cloudinary: ${error.message || 'Unknown error'}`,
        ErrorCodes.FILE_UPLOAD_ERROR.code
      );
    }
  }

  /**
   * Upload image with transformations
   */
  async uploadImage(
    buffer: Buffer,
    options: CloudinaryUploadOptions & {
      width?: number;
      height?: number;
      crop?: string;
    } = {}
  ): Promise<CloudinaryUploadResult> {
    const transformation: any = {};

    if (options.width) transformation.width = options.width;
    if (options.height) transformation.height = options.height;
    if (options.crop) transformation.crop = options.crop;

    return this.uploadBuffer(buffer, {
      ...options,
      resource_type: 'image',
      transformation: Object.keys(transformation).length > 0 ? transformation : undefined,
    });
  }

  /**
   * Upload document (PDF, Word, etc.)
   */
  async uploadDocument(
    buffer: Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    return this.uploadBuffer(buffer, {
      ...options,
      resource_type: 'raw',
      folder: options.folder || 'documents',
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw ApiError.internal('Failed to delete file from Cloudinary');
    }
  }

  /**
   * Delete multiple files from Cloudinary
   */
  async deleteFiles(publicIds: string[], resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
    } catch (error) {
      console.error('Cloudinary bulk delete error:', error);
      throw ApiError.internal('Failed to delete files from Cloudinary');
    }
  }

  /**
   * Get file details from Cloudinary
   */
  async getFileDetails(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId, { resource_type: resourceType });
    } catch (error) {
      console.error('Cloudinary get file details error:', error);
      throw ApiError.notFound('File not found', ErrorCodes.FILE_NOT_FOUND.code);
    }
  }

  /**
   * Generate optimized URL for image
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      ...options,
      fetch_format: 'auto',
      quality: options.quality || 'auto',
    });
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(publicId: string, width = 200, height = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto',
    });
  }
}

export const cloudinaryService = new CloudinaryService();
