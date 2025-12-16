import { Router } from 'express';
import { requireAuthAndActive } from '../middleware/auth.js';
import { NotificationsController } from '../controllers/notificationsController.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuthAndActive);

// Get all notifications for current user
router.get('/', NotificationsController.getAll);

// Get unread count
router.get('/unread-count', NotificationsController.getUnreadCount);

// Mark all as read
router.patch('/mark-all-read', NotificationsController.markAllAsRead);

// Delete all read notifications
router.delete('/delete-read', NotificationsController.deleteAllRead);

// Mark single notification as read
router.patch('/:id/read', NotificationsController.markAsRead);

// Delete single notification
router.delete('/:id', NotificationsController.deleteNotification);

export default router;
