import mongoose from 'mongoose';

const objectId = (value) => new mongoose.Types.ObjectId(String(value));

export const expenseAnalyticsPipelines = {
  monthlySpend({ companyId, start, end, departmentId, employeeId }) {
    const match = {
      companyId: objectId(companyId),
      isDeleted: false,
      status: { $nin: ['draft', 'rejected', 'sent_back'] },
      expenseDate: { $gte: start, $lte: end }
    };
    if (departmentId) match.departmentId = objectId(departmentId);
    if (employeeId) match.employeeId = objectId(employeeId);

    return [
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$expenseDate' }, month: { $month: '$expenseDate' } },
          total: { $sum: '$amount.baseAmount' },
          count: { $sum: 1 },
          avg: { $avg: '$amount.baseAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, period: { $concat: [{ $toString: '$_id.year' }, '-', { $toString: '$_id.month' }] }, total: 1, count: 1, avg: 1 } }
    ];
  },

  departmentSpend({ companyId, start, end }) {
    return [
      { $match: { companyId: objectId(companyId), isDeleted: false, expenseDate: { $gte: start, $lte: end }, status: { $nin: ['draft', 'rejected'] } } },
      { $group: { _id: '$departmentId', total: { $sum: '$amount.baseAmount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      { $project: { departmentId: '$_id', department: '$department.name', total: 1, count: 1 } },
      { $sort: { total: -1 } }
    ];
  },

  topSpenders({ companyId, start, end, limit = 10 }) {
    return [
      { $match: { companyId: objectId(companyId), isDeleted: false, expenseDate: { $gte: start, $lte: end }, status: { $nin: ['draft', 'rejected'] } } },
      { $group: { _id: '$employeeId', total: { $sum: '$amount.baseAmount' }, count: { $sum: 1 }, lastExpenseAt: { $max: '$expenseDate' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
      { $unwind: '$employee' },
      { $project: { employeeId: '$_id', employee: '$employee.fullName', email: '$employee.email', total: 1, count: 1, lastExpenseAt: 1 } },
      { $sort: { total: -1 } },
      { $limit: limit }
    ];
  },

  budgetUsage({ companyId, periodStart, periodEnd }) {
    return [
      { $match: { companyId: objectId(companyId), isDeleted: false, status: 'active', 'period.start': { $lte: periodEnd }, 'period.end': { $gte: periodStart } } },
      {
        $project: {
          name: 1,
          type: 1,
          allocated: '$allocated.baseAmount',
          consumed: 1,
          committed: 1,
          utilization: { $cond: [{ $gt: ['$allocated.baseAmount', 0] }, { $multiply: [{ $divide: ['$consumed', '$allocated.baseAmount'] }, 100] }, 0] }
        }
      },
      { $sort: { utilization: -1 } }
    ];
  },

  approvalDelays({ companyId, approverId }) {
    const match = { companyId: objectId(companyId), isDeleted: false, action: 'pending', slaDueAt: { $lt: new Date() } };
    if (approverId) match.approverId = objectId(approverId);
    return [
      { $match: match },
      { $project: { module: 1, recordId: 1, approverRole: 1, slaDueAt: 1, delayHours: { $dateDiff: { startDate: '$slaDueAt', endDate: '$$NOW', unit: 'hour' } } } },
      { $sort: { delayHours: -1 } }
    ];
  },

  violationSummary({ companyId, start, end }) {
    return [
      { $match: { companyId: objectId(companyId), isDeleted: false, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { type: '$type', severity: '$severity', status: '$status' }, count: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { count: -1 } }
    ];
  },

  reimbursementAging({ companyId }) {
    return [
      { $match: { companyId: objectId(companyId), isDeleted: false, status: { $in: ['pending', 'processing', 'failed'] } } },
      { $project: { reimbursementNo: 1, employeeId: 1, amount: '$amount.baseAmount', status: 1, ageDays: { $dateDiff: { startDate: '$createdAt', endDate: '$$NOW', unit: 'day' } } } },
      { $sort: { ageDays: -1 } }
    ];
  },

  auditTrail({ companyId, entity, entityId }) {
    return [
      { $match: { companyId: objectId(companyId), entity, entityId: String(entityId) } },
      { $sort: { createdAt: -1 } },
      { $limit: 200 }
    ];
  }
};
