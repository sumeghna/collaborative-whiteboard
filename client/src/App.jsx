// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HomePage from './components/HomePage';
import WhiteboardRoom from './components/WhiteboardRoom';
import { SocketProvider } from './context/SocketContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/whiteboard/:roomId" element={<WhiteboardRoom />} />
          </Routes>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;