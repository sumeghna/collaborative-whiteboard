// client/src/components/WhiteboardRoom.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WhiteboardCanvas from './WhiteboardCanvas';
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
    alert('Room ID copied to clipboard!');
  };

  const handleBack = () => {
    disconnectSocket();
    navigate('/');
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
            size="small"
          >
            Back
          </Button>
          
          <Typography variant="h5">
            Room: {roomId}
          </Typography>
          
          <Chip 
            label={isConnected ? 'Connected' : 'Connecting...'}
            color={isConnected ? 'success' : 'warning'}
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={copyRoomId} title="Copy Room ID">
            <ContentCopyIcon />
          </IconButton>
          
          <Chip 
            icon={<PeopleIcon />} 
            label={`${users.length} user${users.length !== 1 ? 's' : ''}`}
            color="primary"
          />
        </Box>
      </Box>

      {/* User list */}
      {users.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {users.map(user => (
            <Chip
              key={user.id}
              label={user.username}
              sx={{ 
                backgroundColor: user.color || '#1976d2',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          ))}
        </Box>
      )}

      {/* Whiteboard */}
      <WhiteboardCanvas 
        roomId={roomId} 
        username={username}
      />
    </Box>
  );
};

export default WhiteboardRoom;