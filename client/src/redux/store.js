import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';
import { rbacApi } from './rbacApi';
import { uiReducer } from './uiSlice';

const toastMiddleware = () => (next) => (action) => {
  if (action?.type?.startsWith('rbacApi/executeMutation/fulfilled')) {
    const endpointName = action.meta?.arg?.endpointName;
    let message = 'Action completed successfully!';
    if (endpointName === 'upsertEmployeeAccess') {
      message = 'Employee access saved successfully!';
    } else if (endpointName === 'createRbacRole') {
      message = 'Role created successfully!';
    } else if (endpointName === 'updateRbacRole') {
      message = 'Role updated successfully!';
    } else if (endpointName === 'deleteRbacRole') {
      message = 'Role deleted successfully!';
    }
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'success' } }));
  } else if (action?.type?.startsWith('rbacApi/executeMutation/rejected')) {
    const errorMsg = action.payload?.data?.message || 'Action failed';
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: errorMsg, type: 'error' } }));
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [rbacApi.reducerPath]: rbacApi.reducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(rbacApi.middleware, toastMiddleware)
});
