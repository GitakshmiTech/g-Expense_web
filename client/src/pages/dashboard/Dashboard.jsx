import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock3, CreditCard, IndianRupee, Users, WalletCards, Plane, Settings, Check, FileText, Building, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { AnalyticsCard } from '../../components/common/AnalyticsCard';
import { FilterBar } from '../../components/common/FilterBar';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { ApprovalQueue } from '../../components/dashboard/ApprovalQueue';
import { CategoryBarChart, StatusPieChart, TrendLineChart } from '../../components/charts/ExpenseCharts';
import { api } from '../../services/platform.service';

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const Dashboard = () => {
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const rawUserMode = useSelector((state) => state.ui.userMode);
  const userMode = rawUserMode || user?.role || 'employee';
  
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics, enabled: userMode !== 'employee' });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => api.expenses({}) });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.users, enabled: userMode !== 'employee' });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: api.budgets, enabled: userMode !== 'employee' });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: api.companies, enabled: userMode === 'super_admin' });
  
  const action = useMutation({ mutationFn: ({ id, payload }) => api.actExpense(id, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }) });
  
  const totalBudget = budgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const consumedBudget = budgets.reduce((sum, budget) => sum + Number(budget.consumed || 0), 0);
  const flags = expenses.reduce((sum, expense) => sum + (expense.policyViolations?.length || 0) + (expense.fraudFlags?.length || 0), 0);

  if (userMode === 'employee') {
    const thisMonthExpenses = expenses.filter(e => {
      if (!e.expenseDate) return false;
      const d = new Date(e.expenseDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const approvedTotal = expenses.filter(e => ['approved', 'reimbursed', 'closed', 'paid'].includes(e.status)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingTotal = expenses.filter(e => ['submitted', 'manager_review', 'finance_review'].includes(e.status)).reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingApprovalsCount = expenses.filter(e => ['submitted', 'manager_review', 'finance_review'].includes(e.status)).length;
    const rejectedCount = expenses.filter(e => e.status === 'rejected').length;
    const sentBackCount = expenses.filter(e => e.status === 'sent_back').length;

    const pendingReimbursement = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidReimbursement = expenses.filter(e => ['reimbursed', 'paid', 'closed'].includes(e.status)).reduce((sum, e) => sum + (e.amount || 0), 0);

    // Timeline activities extraction
    const activities = [];
    expenses.forEach(e => {
      (e.timeline || e.lifecycle || []).forEach(t => {
        activities.push({
          id: e._id,
          category: e.category,
          merchant: e.merchant,
          amount: e.amount,
          action: t.action || t.status,
          note: t.note,
          at: t.at ? new Date(t.at) : new Date(e.updatedAt || e.createdAt)
        });
      });
    });
    activities.sort((a, b) => b.at - a.at);
    const recentActivities = activities.slice(0, 5);

    return (
      <>
        <PageHeader title="Employee Spend Portal" description="Track your business expenses, submit receipts for reimbursement, and monitor approvals." />
        
        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <AnalyticsCard title="Expense Summary" value={`₹${Math.round(thisMonthTotal).toLocaleString()}`} caption="Total submitted this month">
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Approved: ₹{Math.round(approvedTotal).toLocaleString()}</span>
              <span>Pending: ₹{Math.round(pendingTotal).toLocaleString()}</span>
            </div>
          </AnalyticsCard>
          
          <AnalyticsCard title="Approval Summary" value={`${pendingApprovalsCount} Pending`} caption="Active review queue">
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-semibold">
              <span className="text-rose-600">Rejected: {rejectedCount}</span>
              <span className="text-amber-600 font-semibold">Sent Back: {sentBackCount}</span>
            </div>
          </AnalyticsCard>
          
          <AnalyticsCard title="Reimbursement Summary" value={`₹${Math.round(paidReimbursement).toLocaleString()}`} caption="Total settled payments">
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Pending: ₹{Math.round(pendingReimbursement).toLocaleString()}</span>
              <span className="text-emerald-600 font-semibold">Ready for Transfer</span>
            </div>
          </AnalyticsCard>
        </div>

        {/* Dashboard bottom area */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* Recent Activity Feed */}
          <section className="panel rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Recent Activity Feed</h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-brand-600 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-slate-200">
                        Expense of <b>{money(act.amount)}</b> for <b>{act.category}</b> at {act.merchant || 'Acme'} was <span className="font-semibold capitalize text-brand-600">{act.action}</span>.
                      </p>
                      {act.note && <p className="text-xs text-slate-400 mt-0.5">Note: "{act.note}"</p>}
                      <span className="text-[10px] text-slate-400 block mt-1">{act.at.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-6">No recent activity logs. Submit an expense to get started.</div>
            )}
          </section>

          {/* Quick Actions Panel */}
          <section className="panel rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Portal Quick Actions</h3>
              <p className="text-xs text-slate-500 mb-4">Easily upload bills, link them to reports, and track your travel budgets.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href="/expenses" className="btn-secondary py-2.5 text-center flex flex-col items-center gap-2">
                <CreditCard className="h-6 w-6 text-brand-600" />
                <span className="font-semibold text-xs">My Expenses</span>
              </a>
              <a href="/expense-reports" className="btn-secondary py-2.5 text-center flex flex-col items-center gap-2">
                <FileText className="h-6 w-6 text-brand-600" />
                <span className="font-semibold text-xs">My Reports</span>
              </a>
              <a href="/travel" className="btn-secondary py-2.5 text-center flex flex-col items-center gap-2">
                <Plane className="h-6 w-6 text-brand-600" />
                <span className="font-semibold text-xs">My Trips</span>
              </a>
              <a href="/settings" className="btn-secondary py-2.5 text-center flex flex-col items-center gap-2">
                <Settings className="h-6 w-6 text-brand-600" />
                <span className="font-semibold text-xs">My Settings</span>
              </a>
            </div>
          </section>
        </div>
      </>
    );
  }

  if (!analytics) return <LoadingSkeleton cards={4} rows={6} />;

  return (
    <>
      {userMode === 'super_admin' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Companies" value={companies.length} icon={Building2} />
          <StatCard label="Active Companies" value={companies.filter(c => c.status === 'active').length} icon={Building} tone="green" />
          <StatCard label="Inactive Companies" value={companies.filter(c => c.status !== 'active').length} icon={Building2} tone="rose" />
          <StatCard label="Global Active Users" value={users.filter(u => u.status === 'active').length} icon={Users} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Spend" value={`₹${Math.round(analytics?.totals?.totalSpend || 0).toLocaleString()}`} icon={IndianRupee} />
          <StatCard label="Expenses" value={analytics?.totals?.count || 0} icon={CreditCard} tone="green" />
          <StatCard label="Pending Approvals" value={expenses.filter((item) => !['UNDER_VERIFICATION', 'REIMBURSED', 'CLOSED', 'REJECTED', 'DRAFT', 'approved', 'rejected', 'draft'].includes(item.status)).length} icon={Clock3} tone="amber" />
          <StatCard label="Active Employees" value={users.filter((item) => item.status === 'active').length} icon={Users} />
          <StatCard label="Shared Expenses" value={expenses.filter((item) => item.isSharedExpense).length} icon={WalletCards} tone="green" />
        </motion.div>
      )}
      {userMode !== 'super_admin' && (
        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <AnalyticsCard title="Budget Consumption" value={`${Math.round((consumedBudget / (totalBudget || 1)) * 100)}%`} caption={`${Math.round(consumedBudget).toLocaleString()} consumed of ${Math.round(totalBudget).toLocaleString()}`}>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min((consumedBudget / (totalBudget || 1)) * 100, 100)}%` }} /></div>
          </AnalyticsCard>
          <AnalyticsCard title="Reimbursement Summary" value="Ready" caption="Finance queue, paid reimbursements, and settlement workload.">
            <div className="grid grid-cols-3 gap-2 text-center text-sm"><span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">Ready<br /><b>{expenses.filter((item) => ['UNDER_VERIFICATION', 'PAYMENT_PROCESSING', 'approved'].includes(item.status)).length}</b></span><span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">Paid<br /><b>{expenses.filter((item) => ['REIMBURSED', 'paid'].includes(item.status)).length}</b></span><span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">Flags<br /><b>{flags}</b></span></div>
          </AnalyticsCard>
          <AnalyticsCard title="Policy Health" value={flags ? 'Review' : 'Clean'} caption="Soft warnings, hard blocks, duplicates, and escalation signals.">
            <div className="flex items-center gap-3"><WalletCards className="h-10 w-10 text-brand-600" /><p className="text-sm text-slate-500">Controls are active across policy, OCR, fraud, budget, and approval rules.</p></div>
          </AnalyticsCard>
        </section>
      )}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <AnalyticsCard title="Expense Trends" caption="Department and period trend view."><TrendLineChart data={analytics?.byDepartment || []} /></AnalyticsCard>
          {userMode !== 'super_admin' && (
            <AnalyticsCard title="Department Analysis" caption="Budget owners and team-level spend."><CategoryBarChart data={analytics?.byDepartment || []} /></AnalyticsCard>
          )}
        </div>
        <div className="grid gap-5">
          {userMode !== 'super_admin' && (
            <ApprovalQueue expenses={expenses} onAction={(id, payload) => action.mutate({ id, payload })} />
          )}
          <AnalyticsCard title="Status Mix" caption="Lifecycle distribution."><StatusPieChart data={analytics?.byStatus || []} /></AnalyticsCard>
        </div>
      </div>
    </>
  );
};
