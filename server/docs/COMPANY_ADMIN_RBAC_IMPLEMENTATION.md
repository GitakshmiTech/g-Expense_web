# Company Admin RBAC Implementation

## Scope

This RBAC layer applies only to the Company Admin permission surface. Super Admin routes and other product panels keep their existing role logic.

## Folder Structure

- `server/src/rbac/companyAdmin.pages.js` - canonical Company Admin page registry, actions, module mapping, and default role grants.
- `server/src/models/Rbac.js` - MongoDB collections: `roles`, `permissions`, `employee_permissions`, `page_registry`.
- `server/src/services/permission.service.js` - registry sync, role inheritance, employee overrides, effective permission calculation, cache invalidation.
- `server/src/middleware/permission.middleware.js` - `requirePermission(page, action)` and enterprise-module route protection.
- `server/src/controllers/rbac.controller.js` - roles CRUD, page/permission listing, employee access assignment, effective access endpoint.
- `server/src/routes/rbac.routes.js` - `/api/company-admin/rbac/*`.
- `client/src/redux/rbacApi.js` - RTK Query API for effective access, roles, pages, employees, and assignments.
- `client/src/hooks/usePermissions.js` - `usePermission(page, action)`, `usePageAccess(page)`, and `<Can />`.
- `client/src/pages/roles/RolesPermissions.jsx` - production UI for roles matrix and employee-specific access.
- `client/src/routes/ProtectedRoute.jsx` - authenticated route guard and page-level guard.

## Backend Flow

1. JWT authentication loads `req.user` and `req.companyId`.
2. Tenant middleware rejects non-super-admin requests without company context.
3. RBAC middleware resolves `page:action` access.
4. Company Admin users are unrestricted inside their company panel.
5. Other users receive merged effective permissions from:
   - system default role grants,
   - assigned custom roles,
   - inherited parent roles,
   - legacy `user.permissions` entries in `page:action` format,
   - employee-specific allowed permissions,
   - employee-specific denied permissions as final override.
6. API handlers run only after permission and company isolation checks pass.

## Permission Calculation Flow

1. Sync page registry and permission catalog from `COMPANY_ADMIN_PAGES`.
2. Ensure a baseline system role exists for the user's current role.
3. Load employee access assignment.
4. Load assigned roles plus parent roles recursively.
5. Merge grants in hierarchy order.
6. Apply employee grants.
7. Apply employee denies last.
8. Return:
   - `permissions`: page/action matrix,
   - `pages`: sidebar pages where `view` or `manage` is true,
   - `roleIds`: roles used in the calculation.

## Frontend Flow

1. `rbacApi.getMyAccess` fetches `/api/company-admin/rbac/me`.
2. `AppLayout` filters or appends sidebar items from effective page access.
3. `ProtectedPage` blocks unauthorized page routes with Access Denied.
4. `usePermission(page, action)` hides action buttons such as New/Create.
5. `RolesPermissions` loads pages automatically and renders each page/action checkbox matrix.
6. Employee assignment saves role IDs plus custom page/action grants.

## Dynamic Sidebar Flow

1. Company Admin keeps full company-admin navigation.
2. Managers, finance users, and employees keep their existing panel navigation.
3. Additional Company Admin pages granted by RBAC are appended to their sidebar.
4. Unauthorized Company Admin pages are hidden.

## API Security

- Frontend hiding is convenience only.
- Backend middleware blocks direct API calls without required permission.
- Company isolation is enforced through `req.companyId`, tenant filters, and employee-company ownership validation.
- Role and employee access mutations are limited to Company Admin users.
- Soft-delete fields and compound tenant indexes support production-safe data lifecycle.
