import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const notificationSchema = new mongoose.Schema(
  {
    ...tenantFields,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['email', 'in_app', 'sms', 'socket'], default: 'in_app' },
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    readAt: Date,
    deliveredAt: Date
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
