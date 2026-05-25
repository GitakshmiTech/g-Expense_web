import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: localStorage.getItem('gt_dark') === 'true',
    sidebarOpen: true,
    userMode: localStorage.getItem('gt_user_mode') || null
  },
  reducers: {
    toggleDark(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('gt_dark', String(state.darkMode));
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setUserMode(state, action) {
      state.userMode = action.payload;
      if (action.payload) {
        localStorage.setItem('gt_user_mode', action.payload);
      } else {
        localStorage.removeItem('gt_user_mode');
      }
    }
  }
});

export const { toggleDark, toggleSidebar, setUserMode } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
