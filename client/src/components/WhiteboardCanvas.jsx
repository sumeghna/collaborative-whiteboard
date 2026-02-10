// client/src/components/WhiteboardCanvas.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useSocketContext } from '../context/SocketContext';
import { 
  Box, Paper, Slider, IconButton, ButtonGroup, Button, 
  ToggleButton, ToggleButtonGroup, Tooltip 
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import CircleIcon from '@mui/icons-material/Circle';
import SquareIcon from '@mui/icons-material/Square';
import StraightenIcon from '@mui/icons-material/Straighten';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BackspaceIcon from '@mui/icons-material/Backspace';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import FormatSizeIcon from '@mui/icons-material/FormatSize';

const WhiteboardCanvas = ({ roomId, username }) => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(5);
  const [text, setText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { socket } = useSocketContext();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth * 0.9,
      height: window.innerHeight * 0.7,
      backgroundColor: '#ffffff',
    });

    // Setup drawing brush
    const pencilBrush = new fabric.PencilBrush(initCanvas);
    pencilBrush.width = brushWidth;
    pencilBrush.color = color;
    initCanvas.freeDrawingBrush = pencilBrush;

    // Setup eraser brush
    const eraserBrush = new fabric.PencilBrush(initCanvas);
    eraserBrush.width = 20;
    eraserBrush.color = '#ffffff';

    initCanvas.on('mouse:down', () => setIsDrawing(true));
    initCanvas.on('mouse:up', () => setIsDrawing(false));

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

  // Tool change effect
  useEffect(() => {
    if (!canvas) return;

    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushWidth;
        canvas.freeDrawingBrush.color = color;
        canvas.selection = false;
        break;

      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushWidth;
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.selection = false;
        break;

      case 'rectangle':
      case 'circle':
      case 'line':
      case 'text':
        canvas.isDrawingMode = false;
        canvas.selection = true;
        break;

      default:
        canvas.isDrawingMode = false;
        canvas.selection = true;
    }
  }, [canvas, tool, brushWidth, color]);

  // Handle canvas mouse events for shapes
  useEffect(() => {
    if (!canvas || tool === 'pencil' || tool === 'eraser') return;

    let isDrawingShape = false;
    let startX, startY;
    let shape = null;

    const mouseDown = (opt) => {
      isDrawingShape = true;
      const pointer = canvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (tool === 'text') {
        shape = new fabric.IText('Double click to edit', {
          left: startX,
          top: startY,
          fontSize: 20,
          fill: color,
          fontFamily: 'Arial'
        });
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
        saveState();
        sendObject(shape);
        return;
      }

      switch (tool) {
        case 'rectangle':
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushWidth
          });
          break;

        case 'circle':
          shape = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: color,
            strokeWidth: brushWidth
          });
          break;

        case 'line':
          shape = new fabric.Line([startX, startY, startX, startY], {
            stroke: color,
            strokeWidth: brushWidth
          });
          break;
      }

      if (shape) {
        canvas.add(shape);
        canvas.renderAll();
      }
    };

    const mouseMove = (opt) => {
      if (!isDrawingShape || !shape || tool === 'text') return;

      const pointer = canvas.getPointer(opt.e);

      switch (tool) {
        case 'rectangle':
          shape.set({
            width: Math.abs(pointer.x - startX),
            height: Math.abs(pointer.y - startY)
          });
          break;

        case 'circle':
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          ) / 2;
          shape.set({
            radius: radius,
            left: startX - radius,
            top: startY - radius
          });
          break;

        case 'line':
          shape.set({
            x2: pointer.x,
            y2: pointer.y
          });
          break;
      }

      canvas.renderAll();
    };

    const mouseUp = () => {
      if (!isDrawingShape || !shape) return;

      isDrawingShape = false;
      saveState();
      sendObject(shape);
      shape = null;
    };

    canvas.on('mouse:down', mouseDown);
    canvas.on('mouse:move', mouseMove);
    canvas.on('mouse:up', mouseUp);

    return () => {
      canvas.off('mouse:down', mouseDown);
      canvas.off('mouse:move', mouseMove);
      canvas.off('mouse:up', mouseUp);
    };
  }, [canvas, tool, color, brushWidth]);

  // Send object to server
  const sendObject = useCallback((obj) => {
    if (!socket) return;

    const objData = obj.toObject();
    socket.emit('draw', {
      roomId,
      ...objData
    });
  }, [socket, roomId]);

  // Handle pencil drawing
  useEffect(() => {
    if (!canvas || tool !== 'pencil' && tool !== 'eraser') return;

    const handlePathCreated = (event) => {
      const path = event.path;
      saveState();
      sendObject(path);
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [canvas, tool, sendObject]);

  // Save state for undo/redo
  const saveState = useCallback(() => {
    if (!canvas) return;

    const state = canvas.toJSON();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [canvas, history, historyIndex]);

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      canvas.loadFromJSON(prevState, () => {
        canvas.renderAll();
      });
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
      });
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleClear = () => {
    if (!socket || !canvas) return;
    socket.emit('clear-canvas', roomId);
  };

  const handleTextAdd = () => {
    if (!canvas) return;
    
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: color,
      fontFamily: 'Arial'
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveState();
    sendObject(text);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Toolbar */}
      <Paper elevation={3} sx={{ 
        mb: 2, 
        p: 2, 
        backgroundColor: 'background.paper',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap'
      }}>
        {/* Tool Selection */}
        <ToggleButtonGroup
          value={tool}
          exclusive
          onChange={(e, newTool) => newTool && setTool(newTool)}
          size="small"
        >
          <ToggleButton value="pencil" title="Pencil">
            <Tooltip title="Pencil">
              <BrushIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="eraser" title="Eraser">
            <Tooltip title="Eraser">
              <BackspaceIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="rectangle" title="Rectangle">
            <Tooltip title="Rectangle">
              <SquareIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="circle" title="Circle">
            <Tooltip title="Circle">
              <CircleIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="line" title="Line">
            <Tooltip title="Line">
              <StraightenIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="text" title="Text">
            <Tooltip title="Text">
              <TextFieldsIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Color Picker */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ColorLensIcon />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ 
              width: '40px', 
              height: '40px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer' 
            }}
            title="Select Color"
          />
        </Box>

        {/* Brush Size */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
          <FormatSizeIcon />
          <Slider
            value={brushWidth}
            onChange={(e, value) => setBrushWidth(value)}
            min={1}
            max={50}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}px`}
            sx={{ ml: 1 }}
          />
        </Box>

        {/* Undo/Redo */}
        <ButtonGroup>
          <Tooltip title="Undo">
            <IconButton onClick={handleUndo} disabled={historyIndex <= 0}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        {/* Clear Canvas */}
        <Tooltip title="Clear Canvas">
          <IconButton 
            onClick={handleClear} 
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>

        {/* Quick Text Add Button */}
        {tool === 'text' && (
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleTextAdd}
          >
            Add Text Box
          </Button>
        )}
      </Paper>

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

      {/* Tool Status */}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: color,
            border: '1px solid #ccc'
          }} />
          <span>Current Tool: <strong>{tool.charAt(0).toUpperCase() + tool.slice(1)}</strong></span>
          <span>•</span>
          <span>Brush Size: <strong>{brushWidth}px</strong></span>
        </Box>
        <span>History: {historyIndex + 1}/{history.length}</span>
      </Box>
    </Box>
  );
};

export default WhiteboardCanvas;