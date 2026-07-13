import { Router } from 'express';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';

export const notificationRoutes = Router();

notificationRoutes.use(authenticate, enforceTenant);
notificationRoutes.get('/', listNotifications);
notificationRoutes.patch('/read-all', markAllNotificationsRead);
notificationRoutes.patch('/:id/read', markNotificationRead);
notificationRoutes.patch('/:id', markNotificationRead);
notificationRoutes.delete('/:id', deleteNotification);
