import { Budget } from '../models/Budget.js';
import { EnterprisePolicy } from '../models/EnterprisePolicy.js';
import { Travel } from '../models/Travel.js';
import { Workflow } from '../models/Workflow.js';
import { User } from '../models/User.js';
import {
  ActivityLog,
  Approval,
  Department,
  EnterpriseRole,
  ExpenseCategory,
  ExpenseReport,
  OcrLog,
  Permission,
  Project,
  Reimbursement
} from '../models/Enterprise.js';
import { BaseRepository } from '../repositories/base.repository.js';
import { ensureExpenseCategoryCatalog } from './category.service.js';
export const moduleRegistry = {
  departments: {
    Model: Department,
    label: 'Departments',
    searchFields: ['name', 'code', 'status'],
    permission: 'manage_departments'
  },
  roles: {
    Model: EnterpriseRole,
    label: 'Roles & Permissions',
    searchFields: ['name', 'code', 'description'],
    permission: 'manage_roles'
  },
  permissions: {
    Model: Permission,
    label: 'Permissions',
    searchFields: ['key', 'label', 'module'],
    permission: 'manage_roles'
  },
  expense_categories: {
    Model: ExpenseCategory,
    label: 'Expense Categories',
    searchFields: ['name', 'code', 'glCode'],
    permission: 'manage_policies'
  },
  expense_reports: {
    Model: ExpenseReport,
    label: 'Expense Reports',
    searchFields: ['title', 'status'],
    permission: 'manage_reports'
  },
  approvals: {
    Model: Approval,
    label: 'Approvals',
    searchFields: ['module', 'approverRole', 'status'],
    permission: 'approve_expense'
  },
  approval_workflows: {
    Model: Workflow,
    label: 'Approval Workflows',
    searchFields: ['name', 'module'],
    permission: 'manage_workflows'
  },
  policies: {
    Model: EnterprisePolicy,
    label: 'Policies',
    searchFields: ['name', 'code', 'status'],
    permission: 'manage_policies'
  },
  reimbursements: {
    Model: Reimbursement,
    label: 'Reimbursements',
    searchFields: ['status', 'method', 'reference'],
    permission: 'manage_reimbursements'
  },
  budgets: {
    Model: Budget,
    label: 'Budgets',
    searchFields: ['name', 'type', 'department', 'projectCode'],
    permission: 'manage_budget'
  },
  trips: {
    Model: Travel,
    label: 'Trips',
    searchFields: ['destination', 'purpose', 'status'],
    permission: 'manage_trips'
  },
  ocr_logs: {
    Model: OcrLog,
    label: 'OCR Receipt Management',
    searchFields: ['provider', 'status'],
    permission: 'manage_receipts'
  },
  projects: {
    Model: Project,
    label: 'Projects',
    searchFields: ['name', 'code', 'status'],
    permission: 'manage_projects'
  },
  activity_logs: {
    Model: ActivityLog,
    label: 'Activity Logs',
    searchFields: ['action', 'module', 'summary'],
    permission: 'view_audit'
  }
};

export const getModuleConfig = (moduleName) => moduleRegistry[moduleName];

const normalizeExpenseCategoryPayload = (payload = {}) => {
  const code = String(payload.code || payload.name || '').trim().toUpperCase().replace(/\s+/g, '_');
  return {
    ...payload,
    name: String(payload.name || '').trim(),
    code,
    active: payload.active !== false,
    defaultLimit: {
      amount: Number(payload.defaultLimit?.amount || payload.limits?.perExpense || 0),
      currency: payload.defaultLimit?.currency || 'INR'
    },
    receiptMandatoryAbove: Number(payload.receiptMandatoryAbove || 0),
    limits: {
      perExpense: Number(payload.limits?.perExpense || payload.defaultLimit?.amount || 0),
      daily: Number(payload.limits?.daily || 0),
      monthly: Number(payload.limits?.monthly || 0),
      roleBased: payload.limits?.roleBased || {},
      countryBased: payload.limits?.countryBased || {}
    },
    compliance: {
      receiptMandatory: Boolean(payload.compliance?.receiptMandatory),
      ocrMandatory: Boolean(payload.compliance?.ocrMandatory),
      gstMandatory: Boolean(payload.compliance?.gstMandatory),
      allowedMimetypes: payload.compliance?.allowedMimetypes?.length ? payload.compliance.allowedMimetypes : ['application/pdf', 'image/png', 'image/jpeg']
    },
    accounting: payload.accounting || {},
    dynamicFields: Array.isArray(payload.dynamicFields) ? payload.dynamicFields : [],
    workflow: {
      approvalChain: payload.workflow?.approvalChain?.length ? payload.workflow.approvalChain : ['Manager'],
      autoApprovalBelow: Number(payload.workflow?.autoApprovalBelow || 0)
    },
    aiSettings: {
      fraudScoreThreshold: Number(payload.aiSettings?.fraudScoreThreshold || 40),
      anomalyDetectionEnabled: payload.aiSettings?.anomalyDetectionEnabled !== false
    }
  };
};

export class EnterpriseService {
  constructor(moduleName) {
    const config = getModuleConfig(moduleName);
    if (!config) throw new Error(`Unknown module: ${moduleName}`);
    this.config = config;
    this.repository = new BaseRepository(config.Model);
  }


  async list(filter, query) {
    if (this.config.Model.modelName === 'ExpenseCategory') {
      await ensureExpenseCategoryCatalog({ companyId: filter.companyId, actorId: filter.createdBy });
    }
    const { page = 1, limit = 100, search } = query;
    
    let listPromise;
    if (this.config.Model.modelName === 'Department' || this.config.Model.modelName === 'Project') {
      listPromise = this.config.Model.find(filter)
        .populate('managerId', 'name email')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    } else {
      listPromise = this.repository.list(filter, { page, limit, search, searchFields: this.config.searchFields });
    }

    const [items, total] = await Promise.all([
      listPromise,
      this.repository.count(filter, search, this.config.searchFields)
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  create(filter, payload, user) {
    const normalizedPayload = this.config.Model.modelName === 'ExpenseCategory' ? normalizeExpenseCategoryPayload(payload) : payload;
    return this.repository.create({
      ...normalizedPayload,
      companyId: filter.companyId || normalizedPayload.companyId,
      createdBy: user?._id,
      updatedBy: user?._id
    });
  }

  async update(filter, id, payload, user) {
    const normalizedPayload = this.config.Model.modelName === 'ExpenseCategory' ? normalizeExpenseCategoryPayload(payload) : payload;
    
    let oldRecord = null;
    if (this.config.Model.modelName === 'Department') {
      oldRecord = await this.config.Model.findOne({ ...filter, _id: id });
    }
    
    const record = await this.repository.update({ ...filter, _id: id }, { ...normalizedPayload, updatedBy: user?._id });
    
    if (record && this.config.Model.modelName === 'Department' && oldRecord && oldRecord.name !== record.name) {
      const companyId = filter.companyId || record.companyId;
      const oldName = oldRecord.name;
      const newName = record.name;
      
      // Update User collection
      await User.updateMany(
        { companyId, department: oldName },
        { department: newName }
      );
      
      // Update Budget collection
      try {
        await Budget.updateMany(
          { companyId, type: 'department', department: oldName },
          { department: newName }
        );
      } catch (e) {
        console.error('Error updating budgets with new department name:', e);
      }
    }
    
    return record;
  }

  remove(filter, id) {
    return this.repository.remove({ ...filter, _id: id });
  }
}
