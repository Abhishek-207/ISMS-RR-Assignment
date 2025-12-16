import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Notification } from '../models/Notification.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { ErrorCodes } from '../utils/ErrorCodes.js';
import mongoose from 'mongoose';

export class NotificationsController {
  /**
   * Get all notifications for the current user
   */
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'), 10)));
      
      const filter: any = { 
        userId: req.auth?.userId,
        deleted: false
      };
      
      // Filter by read/unread status
      if (req.query.read !== undefined) {
        filter.read = req.query.read === 'true';
      }
      
      // Filter by type
      if (req.query.type) {
        filter.type = req.query.type;
      }
      
      // Filter by priority
      if (req.query.priority) {
        filter.priority = req.query.priority;
      }

      const [items, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort({ createdAt: -1 })
          .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ 
          userId: req.auth?.userId, 
          deleted: false, 
          read: false 
        })
      ]);

      return res.status(200).json({
        message: 'Success',
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          unreadCount
        },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return ApiResponse.error(
        res, 
        'Failed to fetch notifications', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid notification ID', ErrorCodes.INVALID_INPUT.code);
      }

      const notification = await Notification.findOne({
        _id: id,
        userId: req.auth?.userId,
        deleted: false
      });

      if (!notification) {
        throw new ApiError(404, 'Notification not found', ErrorCodes.RESOURCE_NOT_FOUND.code);
      }

      notification.read = true;
      await notification.save();

      return ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Mark notification as read error:', error);
      return ApiResponse.error(
        res, 
        'Failed to mark notification as read', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const result = await Notification.updateMany(
        { 
          userId: req.auth?.userId, 
          deleted: false,
          read: false
        },
        { $set: { read: true } }
      );

      return ApiResponse.success(
        res, 
        { modifiedCount: result.modifiedCount }, 
        `${result.modifiedCount} notification(s) marked as read`
      );
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return ApiResponse.error(
        res, 
        'Failed to mark all notifications as read', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Delete a notification (soft delete)
   */
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid notification ID', ErrorCodes.INVALID_INPUT.code);
      }

      const notification = await Notification.findOne({
        _id: id,
        userId: req.auth?.userId,
        deleted: false
      });

      if (!notification) {
        throw new ApiError(404, 'Notification not found', ErrorCodes.RESOURCE_NOT_FOUND.code);
      }

      notification.deleted = true;
      await notification.save();

      return ApiResponse.success(res, null, 'Notification deleted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data, error.errorCode);
      }
      console.error('Delete notification error:', error);
      return ApiResponse.error(
        res, 
        'Failed to delete notification', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Delete all read notifications for current user
   */
  static async deleteAllRead(req: AuthRequest, res: Response) {
    try {
      const result = await Notification.updateMany(
        { 
          userId: req.auth?.userId, 
          deleted: false,
          read: true
        },
        { $set: { deleted: true } }
      );

      return ApiResponse.success(
        res, 
        { deletedCount: result.modifiedCount }, 
        `${result.modifiedCount} notification(s) deleted`
      );
    } catch (error) {
      console.error('Delete all read notifications error:', error);
      return ApiResponse.error(
        res, 
        'Failed to delete notifications', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const unreadCount = await Notification.countDocuments({ 
        userId: req.auth?.userId, 
        deleted: false, 
        read: false 
      });

      return ApiResponse.success(res, { unreadCount }, 'Unread count fetched successfully');
    } catch (error) {
      console.error('Get unread count error:', error);
      return ApiResponse.error(
        res, 
        'Failed to fetch unread count', 
        500, 
        undefined, 
        ErrorCodes.INTERNAL_SERVER_ERROR.code
      );
    }
  }

  /**
   * Helper method to create a notification (to be called from other controllers)
   */
  static async createNotification(data: {
    userId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    priority?: 'low' | 'medium' | 'high';
    relatedEntityType?: 'transfer' | 'material' | 'user';
    relatedEntityId?: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
  }) {
    try {
      const notification = await Notification.create({
        userId: data.userId,
        organizationId: data.organizationId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        priority: data.priority || 'medium',
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        metadata: data.metadata,
        read: false,
        deleted: false
      });

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * Helper method to create notifications for multiple users
   */
  static async createBulkNotifications(notifications: Array<{
    userId: mongoose.Types.ObjectId;
    organizationId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    priority?: 'low' | 'medium' | 'high';
    relatedEntityType?: 'transfer' | 'material' | 'user';
    relatedEntityId?: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
  }>) {
    try {
      const notificationsToCreate = notifications.map(n => ({
        userId: n.userId,
        organizationId: n.organizationId,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        priority: n.priority || 'medium',
        relatedEntityType: n.relatedEntityType,
        relatedEntityId: n.relatedEntityId,
        metadata: n.metadata,
        read: false,
        deleted: false
      }));

      await Notification.insertMany(notificationsToCreate);
    } catch (error) {
      console.error('Create bulk notifications error:', error);
      throw error;
    }
  }
}
