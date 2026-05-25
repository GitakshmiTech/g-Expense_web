import { Budget } from '../models/Budget.js';
import { EnterprisePolicy } from '../models/EnterprisePolicy.js';
import { Travel } from '../models/Travel.js';
import { Workflow } from '../models/Workflow.js';
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

export class EnterpriseService {
  constructor(moduleName) {
    const config = getModuleConfig(moduleName);
    if (!config) throw new Error(`Unknown module: ${moduleName}`);
    this.config = config;
    this.repository = new BaseRepository(config.Model);
  }

  async list(filter, query) {
    const { page = 1, limit = 100, search } = query;
    const [items, total] = await Promise.all([
      this.repository.list(filter, { page, limit, search, searchFields: this.config.searchFields }),
      this.repository.count(filter, search, this.config.searchFields)
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  create(filter, payload, user) {
    return this.repository.create({
      ...payload,
      companyId: filter.companyId || payload.companyId,
      createdBy: user?._id,
      updatedBy: user?._id
    });
  }

  update(filter, id, payload, user) {
    return this.repository.update({ ...filter, _id: id }, { ...payload, updatedBy: user?._id });
  }

  remove(filter, id) {
    return this.repository.remove({ ...filter, _id: id });
  }
}
