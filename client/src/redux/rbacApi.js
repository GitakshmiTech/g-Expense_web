import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const rbacApi = createApi({
  reducerPath: 'rbacApi',
  tagTypes: ['RbacAccess', 'RbacPages', 'RbacRoles', 'RbacEmployees'],
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/company-admin/rbac',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('gt_access_token');
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    }
  }),
  endpoints: (builder) => ({
    getMyAccess: builder.query({
      query: () => '/me',
      providesTags: ['RbacAccess']
    }),
    getRbacPages: builder.query({
      query: () => '/pages',
      providesTags: ['RbacPages']
    }),
    getRbacPermissions: builder.query({
      query: () => '/permissions',
      providesTags: ['RbacPages']
    }),
    getRbacRoles: builder.query({
      query: () => '/roles',
      providesTags: ['RbacRoles']
    }),
    createRbacRole: builder.mutation({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      invalidatesTags: ['RbacRoles', 'RbacAccess']
    }),
    updateRbacRole: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/roles/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['RbacRoles', 'RbacAccess']
    }),
    deleteRbacRole: builder.mutation({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['RbacRoles', 'RbacAccess']
    }),
    getEmployeeAccessList: builder.query({
      query: () => '/employee-access',
      providesTags: ['RbacEmployees']
    }),
    getEmployeeAccess: builder.query({
      query: (employeeId) => `/employee-access/${employeeId}`,
      providesTags: (_result, _error, employeeId) => [{ type: 'RbacEmployees', id: employeeId }]
    }),
    upsertEmployeeAccess: builder.mutation({
      query: ({ employeeId, ...body }) => ({ url: `/employee-access/${employeeId}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, arg) => ['RbacAccess', 'RbacEmployees', { type: 'RbacEmployees', id: arg.employeeId }]
    })
  })
});

export const {
  useCreateRbacRoleMutation,
  useDeleteRbacRoleMutation,
  useGetEmployeeAccessListQuery,
  useGetEmployeeAccessQuery,
  useGetMyAccessQuery,
  useGetRbacPagesQuery,
  useGetRbacPermissionsQuery,
  useGetRbacRolesQuery,
  useUpdateRbacRoleMutation,
  useUpsertEmployeeAccessMutation
} = rbacApi;
