import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { invalidateQueries } from '../lib/useQuery';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socket?.disconnect();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const newSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    // Real-time cache invalidation: when server pushes events, auto-refetch related data
    newSocket.on('newMessage', () => {
      invalidateQueries('chat');
    });
    newSocket.on('notification', () => {
      invalidateQueries('notifications');
    });
    newSocket.on('sessionUpdated', () => {
      invalidateQueries('sessions');
      invalidateQueries('dashboard');
      invalidateQueries('credits');
      invalidateQueries('profile');
    });
    newSocket.on('creditUpdate', () => {
      invalidateQueries('credits');
      invalidateQueries('dashboard');
      invalidateQueries('profile');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  return useContext(SocketContext);
}
