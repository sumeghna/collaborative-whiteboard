// server/src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {}
});

// Store rooms and users
const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId, username) => {
    socket.join(roomId);
    
    // Initialize room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        drawings: [],
        messages: []
      });
    }
    
    const room = rooms.get(roomId);
    const userColor = getRandomColor();
    
    // Add user to room
    room.users.set(socket.id, {
      id: socket.id,
      username,
      color: userColor
    });
    
    // Store user info
    users.set(socket.id, { roomId, username, color: userColor });
    
    // Notify room about new user
    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      username,
      color: userColor
    });
    
    // Send existing users to new user
    const userList = Array.from(room.users.values());
    socket.emit('room-users', userList);
    
    // Send existing drawings to new user
    socket.emit('load-drawings', room.drawings);
    
    // Send existing messages to new user
    socket.emit('load-messages', room.messages);
    
    console.log(`👤 ${username} joined room ${roomId}`);
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    const { roomId, ...drawingData } = data;
    const room = rooms.get(roomId);
    
    if (room) {
      // Add metadata
      drawingData.timestamp = Date.now();
      drawingData.userId = socket.id;
      drawingData.id = uuidv4();
      
      // Store drawing
      room.drawings.push(drawingData);
      
      // Broadcast to other users in room
      socket.to(roomId).emit('drawing', drawingData);
    }
  });

  // Handle clear canvas
  socket.on('clear-canvas', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      io.to(roomId).emit('canvas-cleared');
      console.log(`🗑️ Canvas cleared in room ${roomId}`);
    }
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { roomId, message } = data;
    const user = users.get(socket.id);
    
    if (user && message && message.trim()) {
      const chatMessage = {
        id: uuidv4(),
        userId: socket.id,
        username: user.username,
        message: message.trim(),
        timestamp: Date.now(),
        color: user.color
      };
      
      const room = rooms.get(roomId);
      if (room) {
        // Store message
        room.messages.push(chatMessage);
        
        // Keep only last 100 messages
        if (room.messages.length > 100) {
          room.messages = room.messages.slice(-100);
        }
      }
      
      // Broadcast to all users in room including sender
      io.to(roomId).emit('receive-message', chatMessage);
      
      console.log(`💬 Chat message from ${user.username} in room ${roomId}: ${message}`);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { roomId, username } = data;
    const user = users.get(socket.id);
    
    if (user) {
      socket.to(roomId).emit('user-typing', {
        userId: socket.id,
        username,
        isTyping: true
      });
    }
  });

  socket.on('stop-typing', (data) => {
    const { roomId, username } = data;
    const user = users.get(socket.id);
    
    if (user) {
      socket.to(roomId).emit('user-typing', {
        userId: socket.id,
        username,
        isTyping: false
      });
      
      // Clear typing after timeout
      setTimeout(() => {
        socket.to(roomId).emit('typing-timeout');
      }, 2000);
    }
  });

  // Heartbeat handler
  socket.on('heartbeat', (data) => {
    // Just acknowledge the heartbeat
    socket.emit('heartbeat-ack', { timestamp: data.timestamp });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      const { roomId, username } = user;
      const room = rooms.get(roomId);
      
      if (room) {
        room.users.delete(socket.id);
        
        // Notify room
        socket.to(roomId).emit('user-left', socket.id);
        
        // Remove room if empty
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`🚪 Room ${roomId} deleted (empty)`);
        }
        
        console.log(`👋 ${username} left room ${roomId}`);
      }
      
      users.delete(socket.id);
    }
    
    console.log('❌ Client disconnected:', socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Helper function to generate random color
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
    '#EF476F', '#1B9AAA', '#FF9A76', '#7BC950', '#9D4EDD'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    users: users.size,
    uptime: process.uptime()
  });
});

app.get('/api/rooms', (req, res) => {
  const roomsInfo = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    userCount: room.users.size,
    users: Array.from(room.users.values()).map(u => u.username),
    drawingCount: room.drawings.length,
    messageCount: room.messages.length
  }));
  res.json(roomsInfo);
});

app.get('/api/room/:id', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  
  if (room) {
    res.json({
      id: roomId,
      userCount: room.users.size,
      users: Array.from(room.users.values()),
      drawingCount: room.drawings.length,
      messageCount: room.messages.length
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 API available at http://localhost:${PORT}/api/health`);
  console.log(`🔄 Server started at: ${new Date().toLocaleString()}`);
});