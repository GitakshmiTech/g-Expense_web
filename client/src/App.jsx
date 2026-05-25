import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import { store } from './redux/store';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient();

const ThemeBridge = ({ children }) => {
  const darkMode = useSelector((state) => state.ui.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  return children;
};

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeBridge>
          <SocketProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SocketProvider>
        </ThemeBridge>
      </QueryClientProvider>
    </Provider>
  );
}
