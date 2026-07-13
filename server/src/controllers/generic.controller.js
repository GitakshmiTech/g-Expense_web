import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { tenantFilter } from '../middleware/tenant.middleware.js';
import { Budget } from '../models/Budget.js';
import { Policy } from '../models/Policy.js';
import { Travel } from '../models/Travel.js';
import { Workflow } from '../models/Workflow.js';
import { Expense } from '../models/Expense.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { Approval } from '../models/Enterprise.js';

export const crud = (Model) => ({
  list: asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const page = Math.max(Number(req.query.page || 1), 1);
    const rows = await Model.find(tenantFilter(req)).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.json(rows);
  }),
  create: asyncHandler(async (req, res) => res.status(201).json(await Model.create({ ...req.body, companyId: req.companyId || req.body.companyId }))),
  update: asyncHandler(async (req, res) => res.json(await Model.findOneAndUpdate({ _id: req.params.id, ...tenantFilter(req) }, req.body, { new: true }))),
  remove: asyncHandler(async (req, res) => {
    await Model.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
    res.status(204).end();
  })
});

export const budgets = crud(Budget);
export const policies = crud(Policy);
export const travels = crud(Travel);
export const workflows = crud(Workflow);

export const analytics = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  const [byStatus, byDepartment, byCategory, totals, monthlySpend, budgetUsage, approvalSla] = await Promise.all([
    Expense.aggregate([{ $match: filter }, { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Expense.aggregate([{ $match: filter }, { $lookup: { from: 'users', localField: 'employeeId', foreignField: '_id', as: 'employee' } }, { $unwind: '$employee' }, { $group: { _id: '$employee.department', total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: filter }, { $group: { _id: '$category', total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, totalSpend: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } }]),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]),
    Budget.find({ ...filter, status: 'active' }).sort({ createdAt: -1 }).limit(10).lean(),
    Approval.aggregate([
      { $match: filter },
      {
        $project: {
          hours: {
            $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60]
          }
        }
      },
      { $group: { _id: null, averageHours: { $avg: '$hours' } } }
    ])
  ]);
  res.json({
    byStatus,
    byDepartment,
    byCategory,
    monthlySpend,
    budgetUsage,
    approvalSla: approvalSla[0] || { averageHours: 0 },
    totals: totals[0] || { totalSpend: 0, count: 0, avg: 0 }
  });
});

export const auditLogs = asyncHandler(async (req, res) => {
  res.json(await AuditLog.find(tenantFilter(req)).sort({ createdAt: -1 }).limit(200));
});

export const notifications = asyncHandler(async (req, res) => {
  res.json(await Notification.find({ ...tenantFilter(req), userId: req.user._id }).sort({ createdAt: -1 }).limit(100));
});

export const exportReport = asyncHandler(async (req, res) => {
  const rows = await Expense.find(tenantFilter(req)).populate('employeeId', 'name department').lean();
  const data = rows.map((row) => ({
    employee: row.employeeId?.name,
    department: row.employeeId?.department,
    category: row.category,
    merchant: row.merchant,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    date: row.expenseDate
  }));
  if (req.params.format === 'csv') {
    res.header('Content-Type', 'text/csv');
    return res.send(stringify(data, { header: true }));
  }
  if (req.params.format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expenses');
    sheet.columns = Object.keys(data[0] || { employee: '', department: '', category: '', merchant: '', amount: '', currency: '', status: '', date: '' }).map((key) => ({ header: key, key, width: 18 }));
    sheet.addRows(data);
    const buffer = await workbook.xlsx.writeBuffer();
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  }
  const doc = new PDFDocument({ margin: 36 });
  res.header('Content-Type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(18).text('GT Expense Report');
  data.forEach((row) => {
    const dateStr = row.date ? new Date(row.date).toISOString().slice(0, 10) : 'N/A';
    doc.fontSize(10).text(`${dateStr} | ${row.employee || 'N/A'} | ${row.category || 'N/A'} | ${row.amount || 0} ${row.currency || 'INR'} | ${row.status || 'Draft'}`);
  });
  doc.end();
});
