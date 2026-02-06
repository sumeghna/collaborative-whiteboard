const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {}
});

//store active rooms and users

const rooms=new Map();
const users=new Map();

io.on('connection', (socket) => {
    console.log("New client connected:",socket.id);

    //Join a room
    socket.on("join room",(roomId,username)=>{
        socket.join(roomId);

        if(!rooms.has (roomId)){
            roomId.set(roomId,{
                users: new Map(),
                drawings:[]
            });
        }
        const room=rooms.get(roomId);
        room.users.set(socket.id,{
            id: socket.id,
            username,
            color: `#$(Math.floor(Math.random()*16777215).toString(16)}`
        });
        //notify room about new user
        socket.io(roomId).emit(socket.id).color
        });
    
  // Handle clear canvas
  socket.on('clear-canvas', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      io.to(roomId).emit('canvas-cleared');
    }
  });

  // Handle user leaving
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        // Notify room
        socket.to(roomId).emit('user-left', socket.id);
        
        // Remove room if empty
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    console.log('Client disconnected:', socket.id);
  });
});

// REST API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
  const roomsInfo = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    userCount: room.users.size
  }));
  res.json(roomsInfo);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
