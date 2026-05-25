import mongoose from 'mongoose';
import { tenantFields } from './base.js';

const workflowSchema = new mongoose.Schema(
  {
    ...tenantFields,
    name: { type: String, required: true },
    module: { type: String, default: 'expense' },
    active: { type: Boolean, default: true },
    nodes: [
      {
        id: String,
        type: { type: String, enum: ['condition', 'approval', 'action'] },
        label: String,
        config: mongoose.Schema.Types.Mixed,
        position: { x: Number, y: Number }
      }
    ],
    edges: [{ from: String, to: String, label: String }],
    rules: [
      {
        when: { field: String, operator: String, value: mongoose.Schema.Types.Mixed },
        approvals: [{ role: String, label: String }],
        elseApprovals: [{ role: String, label: String }]
      }
    ]
  },
  { timestamps: true }
);

export const Workflow = mongoose.model('Workflow', workflowSchema);
