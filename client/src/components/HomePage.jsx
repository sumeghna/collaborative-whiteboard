// client/src/components/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper 
} from '@mui/material';

const HomePage = () => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    
    const finalRoomId = roomId.trim() || generateRoomId();
    navigate(`/whiteboard/${finalRoomId}`, { 
      state: { username } 
    });
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, p: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            🎨 Collaborative Whiteboard
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Your Name"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter your display name"
            />
            
            <TextField
              fullWidth
              label="Room ID (Optional)"
              variant="outlined"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="Leave empty to create new room"
              helperText="Share this ID with others to collaborate"
            />
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleJoinRoom}
              disabled={!username.trim()}
            >
              {roomId.trim() ? 'Join Room' : 'Create New Room'}
            </Button>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
            Draw together in real-time with friends or colleagues!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default HomePage;