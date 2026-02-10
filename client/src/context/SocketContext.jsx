// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef(null);

  const connectSocket = useCallback((roomId, username) => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset states
    setConnectionError(null);
    setReconnectAttempts(0);

    console.log('Connecting to socket server:', SOCKET_SERVER_URL);

    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      withCredentials: false,
      query: {
        roomId,
        username,
        clientType: 'whiteboard',
        timestamp: Date.now()
      }
    });

    // Connection established
    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      
      // Store socket in ref
      socketRef.current = newSocket;
      setSocket(newSocket);

      // Join room if credentials provided
      if (roomId && username) {
        console.log('Joining room:', roomId, 'as', username);
        newSocket.emit('join-room', roomId, username);
      }
    });

    // Connection error
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Disconnected
    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        console.log('Server disconnected, attempting to reconnect...');
        newSocket.connect();
      }
    });

    // Reconnecting
    newSocket.on('reconnecting', (attemptNumber) => {
      console.log(`↩️ Reconnecting attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
    });

    // Reconnection attempt
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    // Reconnected
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      
      // Rejoin room if credentials exist
      if (roomId && username) {
        newSocket.emit('join-room', roomId, username);
      }
    });

    // Reconnection failed
    newSocket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect socket');
      setConnectionError('Failed to reconnect. Please refresh the page.');
      setIsConnected(false);
    });

    // Error handler
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'Socket error occurred');
    });

    // Ping/Pong for connection monitoring
    newSocket.on('ping', () => {
      console.log('🏓 Ping received');
    });

    newSocket.on('pong', (latency) => {
      console.log(`🏓 Pong received, latency: ${latency}ms`);
    });

    return newSocket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
      setReconnectAttempts(0);
    }
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // Connection status polling (optional)
  useEffect(() => {
    if (!socket || !isConnected) return;

    const interval = setInterval(() => {
      if (socket.connected) {
        // Optional: emit a keep-alive or check connection
        socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [socket, isConnected]);

  // Reconnect logic on error
  useEffect(() => {
    if (connectionError && !isConnected && reconnectAttempts < 3) {
      const timer = setTimeout(() => {
        console.log('Attempting manual reconnect...');
        if (socketRef.current) {
          socketRef.current.connect();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [connectionError, isConnected, reconnectAttempts]);

  const emitTyping = useCallback((roomId, username) => {
    if (socket && isConnected) {
      socket.emit('typing', { roomId, username });
    }
  }, [socket, isConnected]);

  const emitStopTyping = useCallback((roomId, username) => {
    if (socket && isConnected) {
      socket.emit('stop-typing', { roomId, username });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((roomId, message) => {
    if (socket && isConnected && message.trim()) {
      socket.emit('send-message', { roomId, message: message.trim() });
      return true;
    }
    return false;
  }, [socket, isConnected]);

  const sendDrawing = useCallback((roomId, drawingData) => {
    if (socket && isConnected) {
      socket.emit('draw', { roomId, ...drawingData });
      return true;
    }
    return false;
  }, [socket, isConnected]);

  const clearCanvas = useCallback((roomId) => {
    if (socket && isConnected) {
      socket.emit('clear-canvas', roomId);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Connection status for UI
  const getConnectionStatus = () => {
    if (isConnected) return { status: 'connected', color: 'success', text: 'Connected' };
    if (connectionError) return { status: 'error', color: 'error', text: `Error: ${connectionError}` };
    if (reconnectAttempts > 0) return { status: 'reconnecting', color: 'warning', text: `Reconnecting... (${reconnectAttempts})` };
    return { status: 'disconnected', color: 'default', text: 'Disconnected' };
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    reconnectAttempts,
    connectSocket,
    disconnectSocket,
    emitTyping,
    emitStopTyping,
    sendMessage,
    sendDrawing,
    clearCanvas,
    getConnectionStatus
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