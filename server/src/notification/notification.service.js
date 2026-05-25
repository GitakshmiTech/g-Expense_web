import { Notification } from '../models/Notification.js';
import { sendEmail } from '../services/email.service.js';
import { getIo } from '../sockets/socket.js';

export const notifyUser = async ({ companyId, userId, title, message, data, email }) => {
  const notification = await Notification.create({ companyId, userId, title, message, data, type: 'in_app', deliveredAt: new Date() });
  getIo()?.to(`user:${userId}`).emit('notification:new', notification);
  if (email) await sendEmail({ to: email, subject: title, html: `<p>${message}</p>` });
  return notification;
};
