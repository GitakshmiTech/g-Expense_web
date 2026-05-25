import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: JSON.parse(localStorage.getItem('gt_user') || 'null'),
  accessToken: localStorage.getItem('gt_access_token'),
  refreshToken: localStorage.getItem('gt_refresh_token')
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || state.refreshToken;
      localStorage.setItem('gt_user', JSON.stringify(state.user));
      localStorage.setItem('gt_access_token', state.accessToken);
      if (state.refreshToken) localStorage.setItem('gt_refresh_token', state.refreshToken);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('gt_user');
      localStorage.removeItem('gt_access_token');
      localStorage.removeItem('gt_refresh_token');
    }
  }
});

export const { setCredentials, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
