/**
 * Gestión de capas, miniaturas, almacenamiento local e historial undo/redo de Pintucalipso.
 */
(function (global) {
  const PaintApp = global.PaintApp;
  const s = PaintApp.state;

  function createInitialLayer() {
    const canvasEl = document.getElementById('paint-canvas');
    const layer = {
      id: s.layerCounter++,
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
    s.layers.push(layer);
    s.activeLayerIndex = 0;
    s.canvas = canvasEl;
    s.ctx = layer.ctx;
    saveLayerState(0);
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) {
      undoBtn.disabled = true;
      redoBtn.disabled = true;
      return;
    }

    const layer = s.layers[s.activeLayerIndex];
    undoBtn.disabled = layer.undoStack.length <= 1;
    redoBtn.disabled = layer.redoStack.length === 0;
  }

  function renderLayers() {
    const container = document.getElementById('canvas-layers-container');
    const layersList = document.getElementById('layers-container');

    container.innerHTML = '';
    layersList.innerHTML = '';

    s.layers.forEach((layer, index) => {
      if (!layer.canvas) {
        layer.canvas = document.createElement('canvas');
        layer.canvas.width = 800;
        layer.canvas.height = 600;
        layer.canvas.className = 'canvas-layer';
        layer.ctx = layer.canvas.getContext('2d');
        layer.ctx.lineCap = 'round';
        layer.ctx.lineJoin = 'round';
      }

      if (index === s.activeLayerIndex) {
        layer.canvas.classList.add('active-layer');
        layer.canvas.style.pointerEvents = 'auto';
        s.canvas = layer.canvas;
        s.ctx = layer.ctx;
        s.undoStack = layer.undoStack;
        s.redoStack = layer.redoStack;
      } else {
        layer.canvas.classList.remove('active-layer');
        layer.canvas.style.pointerEvents = 'none';
      }

      layer.canvas.style.opacity = layer.visible ? (layer.opacity || 1) : '0';
      layer.canvas.style.zIndex = index;
      container.appendChild(layer.canvas);

      const layerItem = document.createElement('div');
      layerItem.className = `layer-item ${index === s.activeLayerIndex ? 'active' : ''} ${!layer.visible ? 'hidden-layer' : ''}`;
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
    if (index >= 0 && index < s.layers.length) {
      s.activeLayerIndex = index;
      renderLayers();
    }
  }

  function toggleLayerVisibility(index) {
    if (index >= 0 && index < s.layers.length) {
      s.layers[index].visible = !s.layers[index].visible;
      renderLayers();
      saveLayersToStorage();
    }
  }

  function addLayer() {
    let layerNumber = 1;
    const usedNumbers = s.layers.map((l) => {
      const match = l.name.match(/Capa (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    while (usedNumbers.includes(layerNumber)) {
      layerNumber++;
    }

    const newLayer = {
      id: s.layerCounter++,
      name: `Capa ${layerNumber}`,
      visible: true,
      opacity: 1,
      canvas: null,
      ctx: null,
      undoStack: [],
      redoStack: []
    };

    s.layers.push(newLayer);
    s.activeLayerIndex = s.layers.length - 1;
    renderLayers();
    saveLayerState(s.activeLayerIndex);
    saveLayersToStorage();
  }

  function deleteLayer() {
    if (s.layers.length <= 1) {
      alert('No puedes eliminar la última capa');
      return;
    }

    s.layers.splice(s.activeLayerIndex, 1);
    if (s.activeLayerIndex >= s.layers.length) {
      s.activeLayerIndex = s.layers.length - 1;
    }
    renderLayers();
    saveLayersToStorage();
  }

  function moveLayerUp() {
    if (s.activeLayerIndex < s.layers.length - 1) {
      const temp = s.layers[s.activeLayerIndex];
      s.layers[s.activeLayerIndex] = s.layers[s.activeLayerIndex + 1];
      s.layers[s.activeLayerIndex + 1] = temp;
      s.activeLayerIndex++;
      renderLayers();
      saveLayersToStorage();
    }
  }

  function moveLayerDown() {
    if (s.activeLayerIndex > 0) {
      const temp = s.layers[s.activeLayerIndex];
      s.layers[s.activeLayerIndex] = s.layers[s.activeLayerIndex - 1];
      s.layers[s.activeLayerIndex - 1] = temp;
      s.activeLayerIndex--;
      renderLayers();
      saveLayersToStorage();
    }
  }

  function saveLayerState(layerIndex) {
    if (s.isUndoing || layerIndex < 0 || layerIndex >= s.layers.length) return;

    const layer = s.layers[layerIndex];
    const dataUrl = layer.canvas.toDataURL();
    layer.undoStack.push(dataUrl);
    if (layer.undoStack.length > s.maxHistory) {
      layer.undoStack.shift();
    }
    layer.redoStack = [];
    renderLayers();
    saveLayersToStorage();
  }

  function saveLayersToStorage() {
    const layersData = s.layers.map((layer) => ({
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
    s.layers.forEach((layer) => {
      if (layer.undoStack.length > 0) {
        const lastState = layer.undoStack[layer.undoStack.length - 1];
        const img = new Image();
        img.onload = function () {
          layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          layer.ctx.drawImage(img, 0, 0);
        };
        img.src = lastState;
      }
    });
  }

  function saveState() {
    if (s.isUndoing || s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) return;
    saveLayerState(s.activeLayerIndex);
  }

  function restoreState(dataUrl) {
    if (s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) return;

    const layer = s.layers[s.activeLayerIndex];
    const img = new Image();
    img.onload = function () {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  function undo() {
    if (s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) return;

    const layer = s.layers[s.activeLayerIndex];
    if (layer.undoStack.length <= 1) return;

    s.isUndoing = true;
    layer.redoStack.push(layer.undoStack.pop());
    const previousState = layer.undoStack[layer.undoStack.length - 1];
    restoreState(previousState);
    s.isUndoing = false;
    updateUndoRedoButtons();
    renderLayers();
    saveLayersToStorage();
  }

  function redo() {
    if (s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) return;

    const layer = s.layers[s.activeLayerIndex];
    if (layer.redoStack.length === 0) return;

    s.isUndoing = true;
    const nextState = layer.redoStack.pop();
    layer.undoStack.push(nextState);
    restoreState(nextState);
    s.isUndoing = false;
    updateUndoRedoButtons();
    renderLayers();
    saveLayersToStorage();
  }

  PaintApp.layers = {
    createInitialLayer,
    renderLayers,
    selectLayer,
    toggleLayerVisibility,
    addLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    saveLayerState,
    saveLayersToStorage,
    loadLayersData,
    saveState,
    restoreState,
    undo,
    redo,
    updateUndoRedoButtons
  };

  // Funciones globales invocadas desde atributos onclick en index.html
  global.addLayer = addLayer;
  global.deleteLayer = deleteLayer;
  global.moveLayerUp = moveLayerUp;
  global.moveLayerDown = moveLayerDown;
  global.undo = undo;
  global.redo = redo;
})(window);
