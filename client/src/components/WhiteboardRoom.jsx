// client/src/components/WhiteboardRoom.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Chip, 
  IconButton, 
  Button,
  Grid,
  Paper
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WhiteboardCanvas from './WhiteboardCanvas';
import ChatBox from './ChatBox';
import { useSocketContext } from '../context/SocketContext';

const WhiteboardRoom = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || 'Anonymous';
  const { socket, connectSocket, disconnectSocket, isConnected } = useSocketContext();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    connectSocket(roomId, username);

    return () => {
      disconnectSocket();
    };
  }, [roomId, username]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUsers = (userList) => {
      setUsers(userList);
    };

    const handleUserJoined = (user) => {
      setUsers(prev => [...prev, user]);
    };

    const handleUserLeft = (userId) => {
      setUsers(prev => prev.filter(user => user.id !== userId));
    };

    socket.on('room-users', handleRoomUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('room-users', handleRoomUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard! Share it with others to collaborate.');
  };

  const handleBack = () => {
    disconnectSocket();
    navigate('/');
  };

  return (
    <Box sx={{ p: 2, minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ 
        p: 2, 
        mb: 2,
        bgcolor: 'background.default'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              variant="outlined"
              size="small"
            >
              Leave Room
            </Button>
            
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Room: {roomId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Share this ID with others to collaborate
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={isConnected ? '🟢 Connected' : '🟡 Connecting...'}
              color={isConnected ? 'success' : 'warning'}
              size="small"
              variant="outlined"
            />
            
            <IconButton 
              onClick={copyRoomId} 
              title="Copy Room ID"
              color="primary"
              size="small"
            >
              <ContentCopyIcon />
            </IconButton>
            
            <Chip 
              icon={<PeopleIcon />} 
              label={`${users.length} user${users.length !== 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* User list */}
        {users.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Online:
            </Typography>
            {users.map(user => (
              <Chip
                key={user.id}
                label={user.username}
                sx={{ 
                  backgroundColor: user.color || '#1976d2',
                  color: 'white',
                  fontWeight: 'medium',
                  fontSize: '0.8rem'
                }}
                size="small"
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Main Content - Whiteboard */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <WhiteboardCanvas 
            roomId={roomId} 
            username={username}
          />
        </Grid>
      </Grid>

      {/* Chat Box */}
      <ChatBox roomId={roomId} username={username} />

      {/* Quick Tips */}
      <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: 'info.light' }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          💡 Tips: Use different tools (Pencil, Shapes, Text) • Adjust brush size • Change colors • 
          Chat with collaborators • Undo/Redo actions • Clear canvas when needed
        </Typography>
      </Paper>
    </Box>
  );
};

export default WhiteboardRoom;