import axios from 'axios';
import { logout, setCredentials } from '../redux/authSlice';
import { store } from '../redux/store';

export const http = axios.create({
  baseURL: '/api'
});

const formatMoney = (amount, currency = 'INR') => {
  const value = Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `${currency === 'INR' ? '₹' : currency} ${value}`;
};

const expenseLabel = (expense = {}) => {
  const parts = [
    expense.category || 'Expense',
    expense.merchant ? `at ${expense.merchant}` : '',
    expense.amount ? formatMoney(expense.amount, expense.currency) : ''
  ].filter(Boolean);
  return parts.join(' · ');
};

const responseMessage = ({ method, url, data }) => {
  const verb = method?.toLowerCase();
  const expense = data?.expense || data;

  if (data?.passwordChanged || url?.includes('/users/me/password')) return 'Password changed successfully.';
  if (url?.includes('/expenses/travel-requests/') && url?.includes('/action')) return `Travel request updated: ${data?.title || data?.travelId || 'Trip'} · ${String(data?.status || '').replaceAll('_', ' ')}`;
  if (url === '/expenses/travel-requests' && verb === 'post') return `Travel request ${data?.status === 'DRAFT' ? 'saved' : 'submitted'}: ${data?.title || data?.destination || 'Trip'} · ${formatMoney(data?.budget?.amount, data?.budget?.currency)}`;
  if (url?.includes('/expenses/shared/create')) return `Shared expense created: ${expenseLabel(expense)}`;
  if (url?.match(/^\/expenses\/[^/]+\/submit$/)) return `Expense submitted: ${expenseLabel(expense)}${expense.status ? ` · ${String(expense.status).replaceAll('_', ' ')}` : ''}`;
  if (url === '/expenses' && verb === 'post') return `Expense created: ${expenseLabel(expense)}`;
  if (url?.includes('/expenses/reports') && verb === 'post') return `Expense report saved: ${data?.title || 'Report'}`;

  if (url?.includes('/approve') || url?.includes('/action')) return 'Action completed successfully.';
  if (url?.includes('/reject')) return 'Rejected successfully.';
  if (verb === 'delete') return 'Deleted successfully.';
  if (verb === 'post') return data?.message || 'Created successfully.';
  if (verb === 'put' || verb === 'patch') return data?.message || 'Saved successfully.';
  return 'Action completed successfully.';
};

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('gt_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

http.interceptors.response.use(
  (response) => {
    const { method, url } = response.config || {};
    if (!response.config?.silentToast && ['post', 'put', 'patch', 'delete'].includes(method?.toLowerCase())) {
      if (!url?.includes('/auth/refresh') && !url?.includes('/auth/login') && !url?.includes('/auth/sso-login')) {
        const message = responseMessage({ method, url, data: response.data });
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'success' } }));
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error('[HTTP Interceptor] Response error status:', error.response?.status, 'URI:', originalRequest?.url);

    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/sso-login') || originalRequest?.url?.includes('/auth/refresh');
    const isTokenRetry = error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute;
    if (!isTokenRetry && originalRequest && !originalRequest.url?.includes('/auth/refresh')) {
      const message = error.response?.data?.message || error.message || 'Something went wrong';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'error' } }));
    }

    try {
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
        console.error('[HTTP Interceptor] 401 detected, isRefreshing:', isRefreshing);
        if (isRefreshing) {
          console.error('[HTTP Interceptor] Already refreshing, queuing request:', originalRequest.url);
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              console.error('[HTTP Interceptor] Retrying queued request with new token:', originalRequest.url);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return http(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('gt_refresh_token');
        console.error('[HTTP Interceptor] Refresh token exists:', !!refreshToken);

        if (refreshToken) {
          try {
            console.error('[HTTP Interceptor] Requesting token refresh...');
            const response = await axios.post('/api/auth/refresh', { refreshToken });
            const { accessToken, user } = response.data;
            console.error('[HTTP Interceptor] Token refresh successful, new accessToken exists:', !!accessToken);

            console.error('[HTTP Interceptor] Dispatching setCredentials...');
            store.dispatch(setCredentials({ accessToken, refreshToken, user }));

            console.error('[HTTP Interceptor] Processing failed queue...');
            processQueue(null, accessToken);
            isRefreshing = false;

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            console.error('[HTTP Interceptor] Retrying original request:', originalRequest.url);
            return http(originalRequest);
          } catch (refreshError) {
            console.error('[HTTP Interceptor] Refresh failed:', refreshError);
            processQueue(refreshError, null);
            isRefreshing = false;
            console.error('[HTTP Interceptor] Dispatching logout after refresh failure...');
            store.dispatch(logout());
            return Promise.reject(refreshError);
          }
        } else {
          console.error('[HTTP Interceptor] No refresh token found, dispatching logout...');
          isRefreshing = false;
          store.dispatch(logout());
        }
      }
    } catch (interceptorError) {
      console.error('[HTTP Interceptor] Internal interceptor error:', interceptorError);
    }

    return Promise.reject(error);
  }
);
