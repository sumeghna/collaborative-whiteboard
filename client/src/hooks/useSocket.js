// client/src/hooks/useSocket.js
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectSocket = useCallback((roomId, username) => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', newSocket.id);
      
      if (roomId && username) {
        newSocket.emit('join-room', roomId, username);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    setSocket(newSocket);
    return newSocket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket
  };
};