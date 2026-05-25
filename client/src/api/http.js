import axios from 'axios';
import { logout, setCredentials } from '../redux/authSlice';
import { store } from '../redux/store';

export const http = axios.create({
  baseURL: '/api'
});

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
    if (['post', 'put', 'patch', 'delete'].includes(method?.toLowerCase())) {
      if (!url?.includes('/auth/refresh') && !url?.includes('/auth/login')) {
        let message = 'Action completed successfully!';
        if (url?.includes('/approve') || url?.includes('/action')) {
          message = 'Approved successfully!';
        } else if (url?.includes('/reject')) {
          message = 'Rejected successfully!';
        } else if (method.toLowerCase() === 'delete') {
          message = 'Deleted successfully!';
        } else if (method.toLowerCase() === 'post') {
          message = 'Created successfully!';
        } else if (method.toLowerCase() === 'put' || method.toLowerCase() === 'patch') {
          message = 'Saved successfully!';
        }
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'success' } }));
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error('[HTTP Interceptor] Response error status:', error.response?.status, 'URI:', originalRequest?.url);

    const isTokenRetry = error.response?.status === 401 && originalRequest && !originalRequest._retry;
    if (!isTokenRetry && originalRequest && !originalRequest.url?.includes('/auth/refresh')) {
      const message = error.response?.data?.message || error.message || 'Something went wrong';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'error' } }));
    }

    try {
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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



