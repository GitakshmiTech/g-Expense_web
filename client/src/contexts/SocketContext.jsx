import { createContext, useContext, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const user = useSelector((state) => state.auth.user);
  const socket = useMemo(() => io('/', { autoConnect: false }), []);

  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit('session:join', { userId: user.id, companyId: user.companyId });
    return () => socket.disconnect();
  }, [socket, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
