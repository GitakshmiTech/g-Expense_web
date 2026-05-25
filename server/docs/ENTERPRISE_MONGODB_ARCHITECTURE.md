# Enterprise Expense MongoDB Architecture

This architecture uses tenant-scoped collections with `companyId`, soft delete, audit actor fields, lifecycle histories, and status enums on every workflow record.

## Core Relationships

- `companies` 1:N `departments`, `roles`, `users`, `policies`, `expenses`, `expense_reports`, `trips`, `budgets`
- `departments` 1:N `users`, `expenses`, `budgets`
- `roles` N:M `users`
- `users.managerId` supports manager-team hierarchy
- `expenses.employeeId` -> `users`
- `expenses.departmentId` -> `departments`
- `expenses.reportId` -> `expense_reports`
- `expenses.tripId` -> `trips`
- `expenses.receiptIds[]` -> `receipts`
- `expense_reports.expenseIds[]` -> `expenses`
- `approval_history.recordId` references `expenses`, `expense_reports`, `trips`, or `reimbursements`
- `violations.expenseId` -> `expenses`
- `violations.policyId` -> `policies`
- `reimbursements.reportId` -> `expense_reports`
- `audit_logs.entity/entityId` tracks all mutable business entities

## High-Value Indexes

- Tenant isolation: `{ companyId: 1, isDeleted: 1, createdAt: -1 }`
- Expense analytics: `{ companyId: 1, departmentId: 1, status: 1, expenseDate: -1 }`
- Duplicate detection: `{ companyId: 1, merchant: 1, "amount.amount": 1, expenseDate: 1 }`
- Receipt duplicate detection: `{ companyId: 1, fileHash: 1, isDeleted: 1 }`
- Approval queues: `{ companyId: 1, approverId: 1, action: 1, slaDueAt: 1 }`
- Budget dashboards: `{ companyId: 1, type: 1, departmentId: 1, employeeId: 1, category: 1, "period.start": 1, "period.end": 1 }`
- Violation center: `{ companyId: 1, employeeId: 1, status: 1, severity: 1 }`
- Reimbursement tracking: `{ companyId: 1, employeeId: 1, status: 1, createdAt: -1 }`
- Audit trail: `{ companyId: 1, entity: 1, entityId: 1, createdAt: -1 }`

## Collections

- `users`: identity, manager hierarchy, RBAC roles, MFA, status
- `roles`: permission matrix by module/action/scope
- `departments`: budget owner, manager, cost center
- `policies`: effective-dated dynamic policy rules
- `expenses`: expense lifecycle, tax snapshot, receipt links, risk score
- `receipts`: Cloudinary/S3 metadata, file hash, OCR data, duplicate score
- `expense_reports`: grouped expense submission and approval state
- `approval_history`: immutable approval steps and SLA tracking
- `trips`: trip approval, estimate, actual spend, lifecycle
- `budgets`: period budgets with thresholds and consumption
- `violations`: normalized policy/fraud/tax findings
- `reimbursements`: payment lifecycle and retry state
- `notifications`: in-app/email/push/socket delivery state
- `audit_logs`: immutable before/after mutation trail

## Aggregation APIs

The app exposes optimized analytics pipelines at:

- `GET /api/enterprise-analytics/monthlySpend`
- `GET /api/enterprise-analytics/departmentSpend`
- `GET /api/enterprise-analytics/topSpenders`
- `GET /api/enterprise-analytics/budgetUsage`
- `GET /api/enterprise-analytics/approvalDelays`
- `GET /api/enterprise-analytics/violationSummary`
- `GET /api/enterprise-analytics/reimbursementAging`
- `GET /api/enterprise-analytics/auditTrail?entity=Expense&entityId=<id>`

All routes are JWT, tenant, and RBAC protected.
