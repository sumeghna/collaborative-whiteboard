// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectSocket = useCallback((roomId, username) => {
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

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

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket]);

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

  const value = {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
};