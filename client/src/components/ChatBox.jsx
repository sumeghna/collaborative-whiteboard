// client/src/components/ChatBox.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Paper,
  Typography,
  Avatar,
  Badge,
  Collapse,
  Button,
  CircularProgress,
  Fade
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoodIcon from '@mui/icons-material/Mood';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { useSocketContext } from '../context/SocketContext';

const ChatBox = ({ roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { socket, isConnected } = useSocketContext();

  // Load existing messages and setup socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      setMessages(prev => [...prev, message]);
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
      // Auto-scroll to new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    };

    const handleLoadMessages = (loadedMessages) => {
      setMessages(loadedMessages || []);
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    };

    const handleUserTyping = (data) => {
      const { userId, username: typingUsername, isTyping: typing } = data;
      if (userId !== socket.id) { // Don't show self typing
        if (typing) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.userId === userId);
            if (!existing) {
              return [...prev, { userId, username: typingUsername }];
            }
            return prev;
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }
      }
    };

    const handleTypingTimeout = () => {
      setTypingUsers([]);
    };

    // Listen for events
    socket.on('receive-message', handleReceiveMessage);
    socket.on('load-messages', handleLoadMessages);
    socket.on('user-typing', handleUserTyping);
    socket.on('typing-timeout', handleTypingTimeout);

    // Cleanup
    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('load-messages', handleLoadMessages);
      socket.off('user-typing', handleUserTyping);
      socket.off('typing-timeout', handleTypingTimeout);
    };
  }, [socket, isOpen]);

  // Handle typing indicator
  useEffect(() => {
    if (!socket || !roomId) return;

    let typingTimeout;

    const handleInputChange = () => {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing', { roomId, username });
      }

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        socket.emit('stop-typing', { roomId, username });
      }, 1000);
    };

    if (inputRef.current) {
      inputRef.current.addEventListener('input', handleInputChange);
    }

    return () => {
      if (inputRef.current) {
        inputRef.current.removeEventListener('input', handleInputChange);
      }
      clearTimeout(typingTimeout);
    };
  }, [socket, roomId, username, isTyping]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) {
      return;
    }

    const messageData = {
      roomId,
      message: newMessage.trim()
    };

    socket.emit('send-message', messageData);
    setNewMessage('');
    setIsTyping(false);
    socket.emit('stop-typing', { roomId, username });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleToggleChat = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      setUnreadCount(0);
      // Focus input when opening chat
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDetailedTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (str) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
      '#EF476F', '#1B9AAA', '#FF9A76', '#7BC950', '#9D4EDD'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isSameSender = (currentMsg, previousMsg) => {
    return previousMsg && 
           currentMsg.username === previousMsg.username &&
           (new Date(currentMsg.timestamp) - new Date(previousMsg.timestamp)) < 600000; // 10 minutes
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    }
    return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      {/* Chat Toggle Button (when closed) */}
      {!isOpen && (
        <Badge 
          badgeContent={unreadCount} 
          color="error" 
          sx={{ mb: 1 }}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Button
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={handleToggleChat}
            sx={{
              borderRadius: '20px',
              boxShadow: 3,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.3s ease'
            }}
          >
            Chat {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </Badge>
      )}

      {/* Chat Box */}
      <Collapse in={isOpen} timeout={300}>
        <Paper 
          elevation={8} 
          sx={{ 
            width: 350, 
            height: 500,
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Chat Header */}
          <Box sx={{ 
            p: 2, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'relative'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ChatIcon sx={{ fontSize: 24 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  Group Chat
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </Typography>
              </Box>
            </Box>
            
            <IconButton 
              size="small" 
              onClick={handleToggleChat}
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          {/* Messages Area */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            bgcolor: 'background.default',
            backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            {messages.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
                textAlign: 'center'
              }}>
                <EmojiEmotionsIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                  No messages yet
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Start the conversation with your collaborators!
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messages.map((msg, index) => {
                  const isCurrentUser = msg.username === username;
                  const showAvatar = !isSameSender(msg, messages[index - 1]);
                  const showTimestamp = index === messages.length - 1 || 
                    (new Date(messages[index + 1].timestamp) - new Date(msg.timestamp)) > 300000; // 5 minutes

                  return (
                    <Box key={msg.id} sx={{ mb: showTimestamp ? 2 : 1 }}>
                      {/* Date separator */}
                      {index === 0 || (
                        new Date(msg.timestamp).toDateString() !== 
                        new Date(messages[index - 1].timestamp).toDateString()
                      ) && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          my: 2 
                        }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              bgcolor: 'action.hover',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1,
                              color: 'text.secondary'
                            }}
                          >
                            {new Date(msg.timestamp).toLocaleDateString([], { 
                              weekday: 'long',
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: 1
                      }}>
                        {/* Other user's avatar */}
                        {!isCurrentUser && showAvatar && (
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              fontSize: '0.75rem',
                              bgcolor: msg.color || getRandomColor(msg.username),
                              mb: 0.5
                            }}
                          >
                            {getInitials(msg.username)}
                          </Avatar>
                        )}

                        {/* Spacer for current user */}
                        {isCurrentUser && <Box sx={{ width: 32 }} />}

                        <Box sx={{ 
                          maxWidth: '70%',
                          position: 'relative'
                        }}>
                          {/* Sender name */}
                          {!isCurrentUser && showAvatar && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                ml: 1,
                                mb: 0.5,
                                fontWeight: 600,
                                color: msg.color || getRandomColor(msg.username)
                              }}
                            >
                              {msg.username}
                            </Typography>
                          )}

                          {/* Message bubble */}
                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              borderRadius: 3,
                              borderBottomRightRadius: isCurrentUser ? 4 : 3,
                              borderBottomLeftRadius: isCurrentUser ? 3 : 4,
                              bgcolor: isCurrentUser ? 
                                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                'background.paper',
                              color: isCurrentUser ? 'white' : 'text.primary',
                              position: 'relative',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            <Typography variant="body2">
                              {msg.message}
                            </Typography>
                            
                            {/* Message time */}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                textAlign: 'right',
                                mt: 0.5,
                                opacity: 0.7,
                                fontSize: '0.7rem'
                              }}
                            >
                              {formatDetailedTime(msg.timestamp)}
                            </Typography>
                          </Paper>
                        </Box>

                        {/* Current user's avatar */}
                        {isCurrentUser && showAvatar && (
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              fontSize: '0.75rem',
                              bgcolor: getRandomColor(msg.username),
                              mb: 0.5
                            }}
                          >
                            {getInitials(msg.username)}
                          </Avatar>
                        )}
                      </Box>

                      {/* Time stamp below message */}
                      {showTimestamp && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            textAlign: isCurrentUser ? 'right' : 'left',
                            mt: 0.5,
                            mr: isCurrentUser ? 5 : 0,
                            ml: isCurrentUser ? 0 : 5,
                            color: 'text.secondary',
                            fontSize: '0.7rem'
                          }}
                        >
                          {formatTime(msg.timestamp)}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 2,
                    ml: 1
                  }}>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        fontSize: '0.6rem',
                        bgcolor: getRandomColor(typingUsers[0].username)
                      }}
                    >
                      {getInitials(typingUsers[0].username)}
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        maxWidth: '70%'
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <CircularProgress size={8} sx={{ color: 'text.secondary' }} />
                        <CircularProgress size={8} sx={{ color: 'text.secondary', animationDelay: '0.2s' }} />
                        <CircularProgress size={8} sx={{ color: 'text.secondary', animationDelay: '0.4s' }} />
                      </Box>
                    </Paper>
                  </Box>
                )}
                
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          {/* Message Input Area */}
          <Box sx={{ 
            p: 1.5, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'relative'
          }}>
            {/* Typing indicator text */}
            {getTypingText() && (
              <Fade in={!!getTypingText()}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    position: 'absolute',
                    top: -20,
                    left: 12,
                    color: 'primary.main',
                    fontSize: '0.7rem',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  {getTypingText()}
                </Typography>
              </Fade>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              {/* Emoji button (placeholder) */}
              <IconButton 
                size="small" 
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <MoodIcon />
              </IconButton>

              {/* Attach button (placeholder) */}
              <IconButton 
                size="small" 
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <AttachFileIcon />
              </IconButton>

              {/* Message input */}
              <TextField
                inputRef={inputRef}
                fullWidth
                size="small"
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={3}
                disabled={!isConnected}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'background.default',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'background.paper',
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)'
                    }
                  }
                }}
              />

              {/* Send button */}
              <IconButton 
                color="primary" 
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                sx={{ 
                  alignSelf: 'flex-end',
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.1)'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled'
                  },
                  transition: 'all 0.2s ease',
                  mb: 0.5
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ChatBox;