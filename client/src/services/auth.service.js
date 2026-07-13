import axios from 'axios';
import { http } from '../api/http';

export const authService = {
  login: async (payload) => (await http.post('/auth/login', payload)).data,
  refresh: async (refreshToken) => (await http.post('/auth/refresh', { refreshToken })).data,
  forgotPassword: async (email) => (await http.post('/auth/forgot-password', { email })).data,
  resetPassword: async (payload) => (await http.post('/auth/reset-password', payload)).data,
  sessions: async () => (await http.get('/auth/sessions')).data
};
