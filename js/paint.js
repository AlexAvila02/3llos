// Variables del paint
let canvas, ctx;
let isDrawing = false;
let currentColor = '#000000';
let brushSize = 5;
let isEraser = false;
let isBucketMode = false;
let isCircleMode = false;
let isLineMode = false;
let lastX = 0;
let lastY = 0;
let startX = 0;
let startY = 0;
let tempCanvas = null;

// Variables para zoom y pan
let scale = 1;
let translateX = 0;
let translateY = 0;

// Sistema de capas
let layers = [];
let activeLayerIndex = 0;
let layerCounter = 1;

// Historial para undo/redo
let undoStack = [];
let redoStack = [];
let maxHistory = 20;
let isUndoing = false;

let isSyncing = false;

function initPaintCanvas() {
  const savedLayers = localStorage.getItem('paintLayers');
  
  if (savedLayers) {
    try {
      const parsedLayers = JSON.parse(savedLayers);
      layers = parsedLayers.map(layerData => ({
        ...layerData,
        opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
        canvas: null,
        ctx: null,
        undoStack: layerData.undoStack || [],
        redoStack: []
      }));
      layerCounter = Math.max(...layers.map(l => l.id), 0) + 1;
      activeLayerIndex = 0;
    } catch (e) {
      createInitialLayer();
    }
  } else {
    createInitialLayer();
  }
  
  renderLayers();
  
  document.getElementById('brush-size').addEventListener('input', function(e) {
    brushSize = e.target.value;
    document.getElementById('size-display').textContent = brushSize + 'px';
  });
  
  document.getElementById('color-picker').addEventListener('change', function(e) {
    setColor(e.target.value);
  });
  
  const wrapper = document.querySelector('.canvas-wrapper');
  
  document.getElementById('canvas-layers-container').addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(5, scale * zoomFactor));
      
      if (newScale !== scale) {
        const ratio = newScale / scale;
        translateX = mouseX - (mouseX - translateX) * ratio;
        translateY = mouseY - (mouseY - translateY) * ratio;
        scale = newScale;
        wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      }
    }
  }, { passive: false });
  
  // Set up event delegation on the container (added once, not per render)
  const canvasContainer = document.getElementById('canvas-layers-container');
  canvasContainer.addEventListener('mousedown', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
      startDrawing(e);
    }
  });
  canvasContainer.addEventListener('mousemove', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
      draw(e);
    }
  });
  canvasContainer.addEventListener('mouseup', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
      stopDrawingAndSave();
    }
  });
  canvasContainer.addEventListener('mouseout', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
      stopDrawing();
    }
  });
  
  loadLayersData();
}

function createInitialLayer() {
  const canvasEl = document.getElementById('paint-canvas');
  const layer = {
    id: layerCounter++,
    name: 'Capa 1',
    visible: true,
    opacity: 1,
    canvas: canvasEl,
    ctx: canvasEl.getContext('2d'),
    undoStack: [],
    redoStack: []
  };
  layer.ctx.lineCap = 'round';
  layer.ctx.lineJoin = 'round';
  layers.push(layer);
  activeLayerIndex = 0;
  canvas = canvasEl;
  ctx = layer.ctx;
  saveLayerState(0);
}

function renderLayers() {
  const container = document.getElementById('canvas-layers-container');
  const layersList = document.getElementById('layers-container');
  
  container.innerHTML = '';
  layersList.innerHTML = '';
  
  layers.forEach((layer, index) => {
    if (!layer.canvas) {
      layer.canvas = document.createElement('canvas');
      layer.canvas.width = 800;
      layer.canvas.height = 600;
      layer.canvas.className = 'canvas-layer';
      layer.ctx = layer.canvas.getContext('2d');
      layer.ctx.lineCap = 'round';
      layer.ctx.lineJoin = 'round';
    }
    
    if (index === activeLayerIndex) {
      layer.canvas.classList.add('active-layer');
      layer.canvas.style.pointerEvents = 'auto';
      canvas = layer.canvas;
      ctx = layer.ctx;
      undoStack = layer.undoStack;
      redoStack = layer.redoStack;
    } else {
      layer.canvas.classList.remove('active-layer');
      layer.canvas.style.pointerEvents = 'none';
    }
    
    layer.canvas.style.opacity = layer.visible ? (layer.opacity || 1) : '0';
    layer.canvas.style.zIndex = index;
    container.appendChild(layer.canvas);
    
    const layerItem = document.createElement('div');
    layerItem.className = `layer-item ${index === activeLayerIndex ? 'active' : ''} ${!layer.visible ? 'hidden-layer' : ''}`;
    layerItem.onclick = () => selectLayer(index);
    
    const thumbnail = document.createElement('canvas');
    thumbnail.className = 'layer-thumbnail';
    thumbnail.width = 40;
    thumbnail.height = 30;
    const thumbCtx = thumbnail.getContext('2d');
    thumbCtx.fillStyle = '#ffffff';
    thumbCtx.fillRect(0, 0, 40, 30);
    
    if (layer.undoStack.length > 0) {
      const img = new Image();
      img.onload = () => {
        thumbCtx.drawImage(img, 0, 0, 40, 30);
      };
      img.src = layer.undoStack[layer.undoStack.length - 1];
    }
    
    const info = document.createElement('div');
    info.className = 'layer-info';
    
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;
    info.appendChild(name);
    
    const controls = document.createElement('div');
    controls.className = 'layer-controls';
    
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = `layer-control-btn ${layer.visible ? 'active' : ''}`;
    visibilityBtn.innerHTML = layer.visible ? '👁' : '👁‍🗨';
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      toggleLayerVisibility(index);
    };
    controls.appendChild(visibilityBtn);
    
    layerItem.appendChild(thumbnail);
    layerItem.appendChild(info);
    layerItem.appendChild(controls);
    layersList.appendChild(layerItem);
  });
  
  updateUndoRedoButtons();
}

function selectLayer(index) {
  if (index >= 0 && index < layers.length) {
    activeLayerIndex = index;
    renderLayers();
  }
}

function toggleLayerVisibility(index) {
  if (index >= 0 && index < layers.length) {
    layers[index].visible = !layers[index].visible;
    renderLayers();
    saveLayersToStorage();
  }
}

function addLayer() {
  let layerNumber = 1;
  const usedNumbers = layers.map(l => {
    const match = l.name.match(/Capa (\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  
  while (usedNumbers.includes(layerNumber)) {
    layerNumber++;
  }
  
  const newLayer = {
    id: layerCounter++,
    name: `Capa ${layerNumber}`,
    visible: true,
    opacity: 1,
    canvas: null,
    ctx: null,
    undoStack: [],
    redoStack: []
  };
  
  layers.push(newLayer);
  activeLayerIndex = layers.length - 1;
  renderLayers();
  saveLayerState(activeLayerIndex);
  saveLayersToStorage();
}

function deleteLayer() {
  if (layers.length <= 1) {
    alert('No puedes eliminar la última capa');
    return;
  }
  
  layers.splice(activeLayerIndex, 1);
  if (activeLayerIndex >= layers.length) {
    activeLayerIndex = layers.length - 1;
  }
  renderLayers();
  saveLayersToStorage();
}

function moveLayerUp() {
  if (activeLayerIndex < layers.length - 1) {
    const temp = layers[activeLayerIndex];
    layers[activeLayerIndex] = layers[activeLayerIndex + 1];
    layers[activeLayerIndex + 1] = temp;
    activeLayerIndex++;
    renderLayers();
    saveLayersToStorage();
  }
}

function moveLayerDown() {
  if (activeLayerIndex > 0) {
    const temp = layers[activeLayerIndex];
    layers[activeLayerIndex] = layers[activeLayerIndex - 1];
    layers[activeLayerIndex - 1] = temp;
    activeLayerIndex--;
    renderLayers();
    saveLayersToStorage();
  }
}

function saveLayerState(layerIndex) {
  if (isUndoing || layerIndex < 0 || layerIndex >= layers.length) return;
  
  const layer = layers[layerIndex];
  const dataUrl = layer.canvas.toDataURL();
  layer.undoStack.push(dataUrl);
  if (layer.undoStack.length > maxHistory) {
    layer.undoStack.shift();
  }
  layer.redoStack = [];
  renderLayers();
  saveLayersToStorage();
}

function saveLayersToStorage() {
  const layersData = layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity || 1,
    undoStack: layer.undoStack,
    redoStack: layer.redoStack
  }));
  localStorage.setItem('paintLayers', JSON.stringify(layersData));
}

function loadLayersData() {
  layers.forEach((layer, index) => {
    if (layer.undoStack.length > 0) {
      const lastState = layer.undoStack[layer.undoStack.length - 1];
      const img = new Image();
      img.onload = function() {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(img, 0, 0);
      };
      img.src = lastState;
    }
  });
}

function saveState() {
  if (isUndoing || activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
  saveLayerState(activeLayerIndex);
}

function restoreState(dataUrl) {
  if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
  
  const layer = layers[activeLayerIndex];
  const img = new Image();
  img.onload = function() {
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

function undo() {
  if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
  
  const layer = layers[activeLayerIndex];
  if (layer.undoStack.length <= 1) return;
  
  isUndoing = true;
  layer.redoStack.push(layer.undoStack.pop());
  const previousState = layer.undoStack[layer.undoStack.length - 1];
  restoreState(previousState);
  isUndoing = false;
  updateUndoRedoButtons();
  renderLayers();
  saveLayersToStorage();
}

function redo() {
  if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
  
  const layer = layers[activeLayerIndex];
  if (layer.redoStack.length === 0) return;
  
  isUndoing = true;
  const nextState = layer.redoStack.pop();
  layer.undoStack.push(nextState);
  restoreState(nextState);
  isUndoing = false;
  updateUndoRedoButtons();
  renderLayers();
  saveLayersToStorage();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  
  if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) {
    undoBtn.disabled = true;
    redoBtn.disabled = true;
    return;
  }
  
  const layer = layers[activeLayerIndex];
  undoBtn.disabled = layer.undoStack.length <= 1;
  redoBtn.disabled = layer.redoStack.length === 0;
}

function stopDrawingAndSave() {
  if (isDrawing) {
    isDrawing = false;
    tempCanvas = null;
    saveState();
    saveCanvasToFirebase();
  }
}

function openPaintModal() {
  document.getElementById('paint-modal').classList.add('active');
  localStorage.setItem('paintModalOpen', 'true');
  if (!canvas) {
    initPaintCanvas();
  }
  try {
    if (!window._firebaseSyncInitialized) {
      initFirebaseSync();
      window._firebaseSyncInitialized = true;
    }
  } catch (error) {
    console.warn('Error al inicializar sync:', error.message);
  }
}

function closePaintModal() {
  playCloseSound();
  document.getElementById('paint-modal').classList.remove('active');
  localStorage.removeItem('paintModalOpen');
}

function startDrawing(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left - translateX) / scale;
  const clickY = (e.clientY - rect.top - translateY) / scale;
  
  if (isBucketMode) {
    floodFill(clickX, clickY, currentColor);
    return;
  }
  
  isDrawing = true;
  startX = clickX;
  startY = clickY;
  lastX = startX;
  lastY = startY;
  
  tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);
}

function draw(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const currentX = (e.clientX - rect.left - translateX) / scale;
  const currentY = (e.clientY - rect.top - translateY) / scale;
  
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = isEraser ? '#FFFFFF' : currentColor;
  ctx.fillStyle = isEraser ? '#FFFFFF' : currentColor;
  
  if (isCircleMode) {
    if (tempCanvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
    const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
    const originalLineWidth = ctx.lineWidth;
    ctx.lineWidth = Math.max(brushSize * 1.5, 5);
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.lineWidth = originalLineWidth;
  } else if (isLineMode) {
    if (tempCanvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
    
    const originalLineWidth = ctx.lineWidth;
    ctx.lineWidth = Math.max(brushSize * 1.5, 5);
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    }
    
    ctx.lineWidth = originalLineWidth;
  } else {
    const distance = Math.sqrt(Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2));
    const stepSize = brushSize * 0.3;
    const steps = Math.max(1, Math.ceil(distance / stepSize));
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = lastX + (currentX - lastX) * t;
      const y = lastY + (currentY - lastY) * t;
      
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    lastX = currentX;
    lastY = currentY;
  }
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    tempCanvas = null;
    saveCanvasToFirebase();
  }
}

function setColor(color) {
  currentColor = color;
  document.getElementById('color-picker').value = color;
  
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.classList.remove('active');
    const onclick = preset.getAttribute('onclick') || '';
    if (onclick.includes(`'${color}'`)) {
      preset.classList.add('active');
    }
  });
  
  isEraser = false;
  document.getElementById('eraser-btn').classList.remove('active');
}

function toggleEraser() {
  isEraser = !isEraser;
  const btn = document.getElementById('eraser-btn');
  
  if (isEraser) {
    isCircleMode = false;
    isLineMode = false;
    isBucketMode = false;
    document.getElementById('circle-btn').classList.remove('active');
    document.getElementById('line-btn').classList.remove('active');
    document.getElementById('bucket-btn').classList.remove('active');
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

function toggleCircleMode() {
  isCircleMode = !isCircleMode;
  const btn = document.getElementById('circle-btn');
  
  if (isCircleMode) {
    isLineMode = false;
    isBucketMode = false;
    isEraser = false;
    document.getElementById('line-btn').classList.remove('active');
    document.getElementById('bucket-btn').classList.remove('active');
    document.getElementById('eraser-btn').classList.remove('active');
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

function toggleLineMode() {
  isLineMode = !isLineMode;
  const btn = document.getElementById('line-btn');
  
  if (isLineMode) {
    isCircleMode = false;
    isBucketMode = false;
    isEraser = false;
    document.getElementById('circle-btn').classList.remove('active');
    document.getElementById('bucket-btn').classList.remove('active');
    document.getElementById('eraser-btn').classList.remove('active');
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

function toggleBucketMode() {
  isBucketMode = !isBucketMode;
  const btn = document.getElementById('bucket-btn');
  
  if (isBucketMode) {
    isCircleMode = false;
    isLineMode = false;
    isEraser = false;
    document.getElementById('circle-btn').classList.remove('active');
    document.getElementById('line-btn').classList.remove('active');
    document.getElementById('eraser-btn').classList.remove('active');
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

function clearCanvas() {
  if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;
  const layer = layers[activeLayerIndex];
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  saveState();
}


function downloadDrawing() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 800;
  tempCanvas.height = 600;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, 800, 600);
  
  layers.forEach(layer => {
    if (layer.visible && layer.canvas) {
      tempCtx.globalAlpha = layer.opacity || 1;
      tempCtx.drawImage(layer.canvas, 0, 0);
    }
  });
  
  const link = document.createElement('a');
  link.download = 'pintucalipso-dibujo.png';
  link.href = tempCanvas.toDataURL();
  link.click();
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function floodFill(startX, startY, fillColor) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const startXInt = Math.floor(startX);
  const startYInt = Math.floor(startY);
  
  if (startXInt < 0 || startXInt >= width || startYInt < 0 || startYInt >= height) {
    return;
  }
  
  const startPos = (startYInt * width + startXInt) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];
  
  const fillRgb = hexToRgb(fillColor);
  if (!fillRgb) return;
  
  if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b) {
    return;
  }
  
  const tolerance = 15;
  function shouldFill(pos) {
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    const a = data[pos + 3];
    
    return Math.abs(r - startR) <= tolerance &&
           Math.abs(g - startG) <= tolerance &&
           Math.abs(b - startB) <= tolerance &&
           Math.abs(a - startA) <= tolerance;
  }
  
  const visited = new Uint8Array(width * height);
  const queue = [[startXInt, startYInt]];
  visited[startYInt * width + startXInt] = 1;
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const pos = (y * width + x) * 4;
    
    data[pos] = fillRgb.r;
    data[pos + 1] = fillRgb.g;
    data[pos + 2] = fillRgb.b;
    data[pos + 3] = 255;
    
    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      
      const nPos = nIdx * 4;
      
      if (shouldFill(nPos)) {
        visited[nIdx] = 1;
        queue.push([nx, ny]);
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  saveState();
}

// Firebase Sync
function saveCanvasToFirebase() {
  if (!canvas || isSyncing) return;
  if (typeof drawingRef === 'undefined' || !drawingRef) return;
  
  try {
    const imageData = canvas.toDataURL('image/png');
    drawingRef.set({
      image: imageData,
      timestamp: Date.now(),
      user: 'anon-' + Math.random().toString(36).substring(2, 11)
    });
  } catch (error) {
    console.warn('No se pudo guardar en Firebase:', error.message);
  }
}

function loadCanvasFromFirebase() {
  if (!canvas) return;
  if (typeof drawingRef === 'undefined' || !drawingRef) return;
  
  try {
    drawingRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.image) {
        isSyncing = true;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          isSyncing = false;
        };
        img.src = data.image;
      }
    });
  } catch (error) {
    console.warn('No se pudo cargar de Firebase:', error.message);
  }
}

function initFirebaseSync() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK no cargado');
    return;
  }
  if (typeof drawingRef === 'undefined' || !drawingRef) {
    console.warn('Firebase no inicializado (credenciales no válidas)');
    return;
  }
  if (!canvas) {
    console.warn('Canvas no inicializado aún');
    return;
  }
  
  loadCanvasFromFirebase();
  console.log('Sincronización en tiempo real activada');
}
