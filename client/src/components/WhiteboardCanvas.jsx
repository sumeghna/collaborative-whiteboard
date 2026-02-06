// client/src/components/WhiteboardCanvas.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useSocketContext } from '../context/SocketContext';
import { Box, Paper, Slider, IconButton, ButtonGroup, Button } from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

const WhiteboardCanvas = ({ roomId, username }) => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [drawingMode, setDrawingMode] = useState('pencil');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(5);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const { socket } = useSocketContext();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: window.innerWidth * 0.9,
      height: window.innerHeight * 0.7,
      backgroundColor: '#ffffff',
    });

    const drawingBrush = new fabric.PencilBrush(initCanvas);
    drawingBrush.width = brushWidth;
    drawingBrush.color = brushColor;
    initCanvas.freeDrawingBrush = drawingBrush;

    setCanvas(initCanvas);

    // Handle window resize
    const handleResize = () => {
      initCanvas.setDimensions({
        width: window.innerWidth * 0.9,
        height: window.innerHeight * 0.7
      });
      initCanvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      initCanvas.dispose();
    };
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !canvas) return;

    const handleDrawing = (drawingData) => {
      fabric.util.enlivenObjects([drawingData], (objects) => {
        objects.forEach((obj) => {
          canvas.add(obj);
          canvas.renderAll();
        });
      });
    };

    const handleClearCanvas = () => {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      setHistory([]);
      setHistoryIndex(-1);
    };

    const handleLoadDrawings = (drawings) => {
      fabric.util.enlivenObjects(drawings, (objects) => {
        canvas.clear();
        objects.forEach((obj) => {
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    };

    socket.on('drawing', handleDrawing);
    socket.on('canvas-cleared', handleClearCanvas);
    socket.on('load-drawings', handleLoadDrawings);

    return () => {
      socket.off('drawing', handleDrawing);
      socket.off('canvas-cleared', handleClearCanvas);
      socket.off('load-drawings', handleLoadDrawings);
    };
  }, [socket, canvas]);

  // Handle canvas changes for undo/redo
  useEffect(() => {
    if (!canvas) return;

    const saveState = () => {
      const state = canvas.toJSON();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(state);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    };

    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    return () => {
      canvas.off('object:added', saveState);
      canvas.off('object:modified', saveState);
      canvas.off('object:removed', saveState);
    };
  }, [canvas, history, historyIndex]);

  // Send drawing data to server
  const sendDrawing = useCallback((event) => {
    if (!socket || !canvas) return;

    const path = event.path;
    const pathData = path.toObject(['stroke', 'strokeWidth', 'path']);
    
    socket.emit('draw', {
      roomId,
      ...pathData
    });
  }, [socket, canvas, roomId]);

  // Setup canvas event listeners
  useEffect(() => {
    if (!canvas) return;

    canvas.on('path:created', sendDrawing);

    return () => {
      canvas.off('path:created', sendDrawing);
    };
  }, [canvas, sendDrawing]);

  // Update brush properties
  useEffect(() => {
    if (!canvas) return;

    canvas.freeDrawingBrush.width = brushWidth;
    canvas.freeDrawingBrush.color = brushColor;
    canvas.isDrawingMode = drawingMode === 'pencil';
  }, [canvas, brushWidth, brushColor, drawingMode]);

  const handleClear = () => {
    if (!socket || !canvas) return;
    socket.emit('clear-canvas', roomId);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      canvas.loadFromJSON(prevState, () => {
        canvas.renderAll();
      });
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
      });
      setHistoryIndex(historyIndex + 1);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Toolbar */}
      <Box sx={{ 
        mb: 2, 
        p: 2, 
        backgroundColor: 'background.paper',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap'
      }}>
        <ButtonGroup variant="outlined" size="small">
          <Button 
            onClick={() => setDrawingMode('pencil')}
            variant={drawingMode === 'pencil' ? 'contained' : 'outlined'}
            startIcon={<BrushIcon />}
          >
            Draw
          </Button>
          <Button 
            onClick={() => setDrawingMode('select')}
            variant={drawingMode === 'select' ? 'contained' : 'outlined'}
          >
            Select
          </Button>
        </ButtonGroup>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormatColorFillIcon />
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
          />
        </Box>

        <Box sx={{ minWidth: 200 }}>
          <Slider
            value={brushWidth}
            onChange={(e, value) => setBrushWidth(value)}
            min={1}
            max={50}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}px`}
          />
        </Box>

        <ButtonGroup>
          <IconButton onClick={handleUndo} disabled={historyIndex <= 0}>
            <UndoIcon />
          </IconButton>
          <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
            <RedoIcon />
          </IconButton>
        </ButtonGroup>

        <IconButton 
          onClick={handleClear} 
          color="error"
          title="Clear Canvas"
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* Canvas */}
      <Paper elevation={3} sx={{ 
        width: '100%', 
        height: '70vh', 
        border: '1px solid #ccc',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <canvas ref={canvasRef} />
      </Paper>
    </Box>
  );
};

export default WhiteboardCanvas;