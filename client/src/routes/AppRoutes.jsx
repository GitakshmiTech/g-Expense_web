import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Login } from '../pages/auth/Login';
import { Approvals } from '../pages/approvals/Approvals';
import { Budgets } from '../pages/budgets/Budgets';
import { Analytics } from '../pages/dashboard/Analytics';
import { Advance } from '../pages/advance/Advance';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { Expenses } from '../pages/expense/Expenses';
import { ExpenseDetailsPage } from '../pages/expense/ExpenseDetailsPage';
import { EnterpriseModulePage } from '../pages/enterprise/EnterpriseModulePage';
import { PanelDashboard } from '../pages/panels/PanelDashboard';
import { WorkflowTablePage } from '../pages/panels/WorkflowTablePage';
import { Policy } from '../pages/policy/Policy';
import { Reports } from '../pages/reports/Reports';
import { Company } from '../pages/settings/Company';
import { Employees } from '../pages/settings/Employees';
import { Settings } from '../pages/settings/Settings';
import { Workflows } from '../pages/settings/Workflows';
import { Travel } from '../pages/travel/Travel';
import { ViolationCenter } from '../pages/violations/ViolationCenter';
import { ExpenseReports } from '../pages/reports/ExpenseReports';
import { Reimbursements } from '../pages/reimbursements/Reimbursements';
import { Support } from '../pages/support/Support';
import { AccessDenied } from '../pages/AccessDenied';
import { RolesPermissions } from '../pages/roles/RolesPermissions';
import { ProtectedPage, ProtectedRoute } from './ProtectedRoute';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <ProtectedPage page="dashboard"><Dashboard /></ProtectedPage> },
      { path: 'expenses', element: <Expenses /> },
      { path: 'expenses/:id', element: <ExpenseDetailsPage /> },
      { path: 'approvals', element: <Approvals /> },
      { path: 'departments', element: <ProtectedPage page="departments"><EnterpriseModulePage moduleKey="departments" /></ProtectedPage> },
      { path: 'roles-permissions', element: <ProtectedPage page="roles_permissions"><RolesPermissions /></ProtectedPage> },
      { path: 'expense-categories', element: <ProtectedPage page="expense_categories"><EnterpriseModulePage moduleKey="expense_categories" /></ProtectedPage> },
      { path: 'expense-reports', element: <ProtectedPage page="expense_reports"><ExpenseReports /></ProtectedPage> },
      { path: 'reimbursements', element: <ProtectedPage page="reimbursements"><Reimbursements /></ProtectedPage> },
      { path: 'ocr-receipts', element: <ProtectedPage page="ocr_receipts"><EnterpriseModulePage moduleKey="ocr_logs" /></ProtectedPage> },
      { path: 'notifications', element: <ProtectedPage page="notifications"><EnterpriseModulePage moduleKey="notifications" /></ProtectedPage> },
      { path: 'audit-logs', element: <ProtectedPage page="audit_logs"><EnterpriseModulePage moduleKey="audit_logs" /></ProtectedPage> },
      { path: 'support', element: <Support /> },
      { path: 'violation-center', element: <ProtectedPage page="violation_center"><ViolationCenter /></ProtectedPage> },
      { path: 'travel', element: <ProtectedPage page="trips"><Travel /></ProtectedPage> },
      { path: 'advances', element: <ProtectedPage page="advances"><Advance /></ProtectedPage> },
      { path: 'budgets', element: <ProtectedPage page="budgets"><Budgets /></ProtectedPage> },
      { path: 'policies', element: <ProtectedPage page="policies"><Policy /></ProtectedPage> },
      { path: 'reports', element: <Reports /> },
      { path: 'analytics', element: <ProtectedPage page="analytics"><Analytics /></ProtectedPage> },
      { path: 'settings/employees', element: <ProtectedPage page="employees"><Employees /></ProtectedPage> },
      { path: 'settings/company', element: <Company /> },
      { path: 'settings/workflows', element: <ProtectedPage page="approval_workflow"><Workflows /></ProtectedPage> },
      { path: 'settings', element: <ProtectedPage page="settings"><Settings /></ProtectedPage> },
      { path: 'access-denied', element: <AccessDenied /> }
      ,
      { path: 'manager', element: <PanelDashboard panel="manager" /> },
      { path: 'manager/team-expenses', element: <WorkflowTablePage panel="manager" type="teamExpenses" /> },
      { path: 'manager/pending-approvals', element: <WorkflowTablePage panel="manager" type="approvals" /> },
      { path: 'manager/expense-reports', element: <WorkflowTablePage panel="manager" type="reports" /> },
      { path: 'manager/trips', element: <WorkflowTablePage panel="manager" type="trips" /> },
      { path: 'manager/budgets', element: <WorkflowTablePage panel="manager" type="budgets" /> },
      { path: 'manager/policy-violations', element: <WorkflowTablePage panel="manager" type="violations" /> },
      { path: 'manager/analytics', element: <WorkflowTablePage panel="manager" type="analytics" /> },
      { path: 'manager/notifications', element: <WorkflowTablePage panel="manager" type="notifications" /> },
      { path: 'manager/settings', element: <WorkflowTablePage panel="manager" type="settings" /> },
      { path: 'finance', element: <PanelDashboard panel="finance" /> },
      { path: 'finance/verification', element: <WorkflowTablePage panel="finance" type="verification" /> },
      { path: 'finance/reimbursements', element: <WorkflowTablePage panel="finance" type="reimbursements" /> },
      { path: 'finance/expense-reports', element: <WorkflowTablePage panel="finance" type="reports" /> },
      { path: 'finance/budgets', element: <WorkflowTablePage panel="finance" type="budgets" /> },
      { path: 'finance/accounting', element: <WorkflowTablePage panel="finance" type="accounting" /> },
      { path: 'finance/audit-compliance', element: <WorkflowTablePage panel="finance" type="audit" /> },
      { path: 'finance/policy-violations', element: <WorkflowTablePage panel="finance" type="violations" /> },
      { path: 'finance/analytics', element: <WorkflowTablePage panel="finance" type="analytics" /> },
      { path: 'finance/notifications', element: <WorkflowTablePage panel="finance" type="notifications" /> },
      { path: 'finance/settings', element: <WorkflowTablePage panel="finance" type="settings" /> }
    ]
  }
]);

export const AppRoutes = () => <RouterProvider router={router} />;
