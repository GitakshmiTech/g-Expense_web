import { asyncHandler } from '../helpers/asyncHandler.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { Notification } from '../models/Notification.js';

const currentUserFilter = (req) => ({
  ...tenantFilter(req),
  userId: req.user._id
});

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  const unreadOnly = req.query.unread === 'true';
  const filter = currentUserFilter(req);
  if (unreadOnly) filter.readAt = { $exists: false };
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ ...currentUserFilter(req), readAt: { $exists: false } })
  ]);
  res.json({ items, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...currentUserFilter(req) },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  res.json(notification);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { ...currentUserFilter(req), readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  res.json({ updated: result.modifiedCount });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, ...currentUserFilter(req) });
  res.status(204).end();
});
