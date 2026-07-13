import mongoose from 'mongoose';
import { auditStamp, tenantFields } from './base.js';

const commentSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: String,
    body: { type: String, required: true, trim: true },
    internal: { type: Boolean, default: false },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ...tenantFields,
    ...auditStamp,
    ticketNo: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low', index: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
    assignedRole: { type: String, enum: ['manager', 'finance', 'company_admin'], default: 'company_admin', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [commentSchema],
    resolvedAt: Date,
    closedAt: Date
  },
  { timestamps: true }
);

supportTicketSchema.index({ companyId: 1, ticketNo: 1 }, { unique: true });
supportTicketSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });
supportTicketSchema.index({ companyId: 1, assignedRole: 1, status: 1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
