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
import { ExpenseCategoriesPage } from '../pages/enterprise/ExpenseCategoriesPage';
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
      { path: 'expense-categories', element: <ProtectedPage page="expense_categories"><ExpenseCategoriesPage /></ProtectedPage> },
      { path: 'expense-reports', element: <ProtectedPage page="expense_reports"><ExpenseReports /></ProtectedPage> },
      { path: 'reimbursements', element: <ProtectedPage page="reimbursements"><Reimbursements /></ProtectedPage> },
      { path: 'ocr-receipts', element: <ProtectedPage page="ocr_receipts"><EnterpriseModulePage moduleKey="ocr_logs" /></ProtectedPage> },
      { path: 'notifications', element: <ProtectedPage page="notifications"><EnterpriseModulePage moduleKey="notifications" /></ProtectedPage> },
      { path: 'audit-logs', element: <ProtectedPage page="audit_logs"><EnterpriseModulePage moduleKey="audit_logs" /></ProtectedPage> },
      { path: 'support', element: <ProtectedPage page="support"><Support /></ProtectedPage> },
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
      { path: 'manager', element: <ProtectedPage page="dashboard"><PanelDashboard panel="manager" /></ProtectedPage> },
      { path: 'manager/team-expenses', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="manager" type="teamExpenses" /></ProtectedPage> },
      { path: 'manager/pending-approvals', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="manager" type="approvals" /></ProtectedPage> },
      { path: 'manager/expense-reports', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="manager" type="reports" /></ProtectedPage> },
      { path: 'manager/trips', element: <ProtectedPage page="trips"><WorkflowTablePage panel="manager" type="trips" /></ProtectedPage> },
      { path: 'manager/budgets', element: <ProtectedPage page="budgets"><WorkflowTablePage panel="manager" type="budgets" /></ProtectedPage> },
      { path: 'manager/policy-violations', element: <ProtectedPage page="violation_center"><WorkflowTablePage panel="manager" type="violations" /></ProtectedPage> },
      { path: 'manager/analytics', element: <ProtectedPage page="analytics"><WorkflowTablePage panel="manager" type="analytics" /></ProtectedPage> },
      { path: 'manager/notifications', element: <ProtectedPage page="notifications"><WorkflowTablePage panel="manager" type="notifications" /></ProtectedPage> },
      { path: 'manager/settings', element: <ProtectedPage page="settings"><WorkflowTablePage panel="manager" type="settings" /></ProtectedPage> },
      { path: 'finance', element: <ProtectedPage page="dashboard"><PanelDashboard panel="finance" /></ProtectedPage> },
      { path: 'finance/verification', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="finance" type="verification" /></ProtectedPage> },
      { path: 'finance/reimbursements', element: <ProtectedPage page="reimbursements"><WorkflowTablePage panel="finance" type="reimbursements" /></ProtectedPage> },
      { path: 'finance/expense-reports', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="finance" type="reports" /></ProtectedPage> },
      { path: 'finance/budgets', element: <ProtectedPage page="budgets"><WorkflowTablePage panel="finance" type="budgets" /></ProtectedPage> },
      { path: 'finance/accounting', element: <ProtectedPage page="expense_reports"><WorkflowTablePage panel="finance" type="accounting" /></ProtectedPage> },
      { path: 'finance/audit-compliance', element: <ProtectedPage page="audit_logs"><WorkflowTablePage panel="finance" type="audit" /></ProtectedPage> },
      { path: 'finance/policy-violations', element: <ProtectedPage page="violation_center"><WorkflowTablePage panel="finance" type="violations" /></ProtectedPage> },
      { path: 'finance/analytics', element: <ProtectedPage page="analytics"><WorkflowTablePage panel="finance" type="analytics" /></ProtectedPage> },
      { path: 'finance/notifications', element: <ProtectedPage page="notifications"><WorkflowTablePage panel="finance" type="notifications" /></ProtectedPage> },
      { path: 'finance/settings', element: <ProtectedPage page="settings"><WorkflowTablePage panel="finance" type="settings" /></ProtectedPage> }
    ]
  }
]);

export const AppRoutes = () => <RouterProvider router={router} />;
