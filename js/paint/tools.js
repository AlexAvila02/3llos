/**
 * Herramientas de dibujo (pincel, borrador, formas, balde, limpieza y descarga) de Pintucalipso.
 */
(function (global) {
  const PaintApp = global.PaintApp;
  const s = PaintApp.state;

  const TOOL_MODES = [
    { key: 'isEraser', btnId: 'eraser-btn' },
    { key: 'isCircleMode', btnId: 'circle-btn' },
    { key: 'isLineMode', btnId: 'line-btn' },
    { key: 'isBucketMode', btnId: 'bucket-btn' }
  ];

  function setExclusiveTool(targetKey) {
    const nextActive = !s[targetKey];
    TOOL_MODES.forEach(({ key, btnId }) => {
      s[key] = key === targetKey ? nextActive : false;
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', s[key]);
    });
  }

  function getCanvasCoords(e) {
    const rect = s.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (s.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (s.canvas.height / rect.height)
    };
  }

  function startDrawing(e) {
    const { x: clickX, y: clickY } = getCanvasCoords(e);

    if (s.isBucketMode) {
      floodFill(clickX, clickY, s.currentColor);
      return;
    }

    s.isDrawing = true;
    s.startX = clickX;
    s.startY = clickY;
    s.lastX = s.startX;
    s.lastY = s.startY;

    s.tempCanvas = document.createElement('canvas');
    s.tempCanvas.width = s.canvas.width;
    s.tempCanvas.height = s.canvas.height;
    const tempCtx = s.tempCanvas.getContext('2d');
    tempCtx.drawImage(s.canvas, 0, 0);
  }

  function draw(e) {
    if (!s.isDrawing) return;

    const { x: currentX, y: currentY } = getCanvasCoords(e);

    s.ctx.lineWidth = s.brushSize;
    s.ctx.strokeStyle = s.isEraser ? '#FFFFFF' : s.currentColor;
    s.ctx.fillStyle = s.isEraser ? '#FFFFFF' : s.currentColor;

    if (s.isCircleMode) {
      if (s.tempCanvas) {
        s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
        s.ctx.drawImage(s.tempCanvas, 0, 0);
      }
      const radius = Math.sqrt(Math.pow(currentX - s.startX, 2) + Math.pow(currentY - s.startY, 2));
      const originalLineWidth = s.ctx.lineWidth;
      s.ctx.lineWidth = Math.max(s.brushSize * 1.5, 5);

      for (let i = 0; i < 3; i++) {
        s.ctx.beginPath();
        s.ctx.arc(s.startX, s.startY, radius, 0, Math.PI * 2);
        s.ctx.stroke();
      }

      s.ctx.lineWidth = originalLineWidth;
    } else if (s.isLineMode) {
      if (s.tempCanvas) {
        s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
        s.ctx.drawImage(s.tempCanvas, 0, 0);
      }

      const originalLineWidth = s.ctx.lineWidth;
      s.ctx.lineWidth = Math.max(s.brushSize * 1.5, 5);

      for (let i = 0; i < 3; i++) {
        s.ctx.beginPath();
        s.ctx.moveTo(s.startX, s.startY);
        s.ctx.lineTo(currentX, currentY);
        s.ctx.stroke();
      }

      s.ctx.lineWidth = originalLineWidth;
    } else {
      const distance = Math.sqrt(Math.pow(currentX - s.lastX, 2) + Math.pow(currentY - s.lastY, 2));
      const stepSize = s.brushSize * 0.3;
      const steps = Math.max(1, Math.ceil(distance / stepSize));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = s.lastX + (currentX - s.lastX) * t;
        const y = s.lastY + (currentY - s.lastY) * t;

        s.ctx.beginPath();
        s.ctx.arc(x, y, s.brushSize / 2, 0, Math.PI * 2);
        s.ctx.fill();
      }

      s.lastX = currentX;
      s.lastY = currentY;
    }
  }

  function stopDrawing() {
    if (s.isDrawing) {
      s.isDrawing = false;
      s.tempCanvas = null;
      if (PaintApp.sync) PaintApp.sync.saveCanvasToFirebase();
    }
  }

  function stopDrawingAndSave() {
    if (s.isDrawing) {
      s.isDrawing = false;
      s.tempCanvas = null;
      PaintApp.layers.saveState();
      if (PaintApp.sync) PaintApp.sync.saveCanvasToFirebase();
    }
  }

  function setColor(color) {
    s.currentColor = color;
    document.getElementById('color-picker').value = color;

    document.querySelectorAll('.color-preset').forEach((preset) => {
      preset.classList.remove('active');
      const onclick = preset.getAttribute('onclick') || '';
      if (onclick.includes(`'${color}'`)) {
        preset.classList.add('active');
      }
    });

    s.isEraser = false;
    document.getElementById('eraser-btn').classList.remove('active');
  }

  function toggleEraser() {
    setExclusiveTool('isEraser');
  }

  function toggleCircleMode() {
    setExclusiveTool('isCircleMode');
  }

  function toggleLineMode() {
    setExclusiveTool('isLineMode');
  }

  function toggleBucketMode() {
    setExclusiveTool('isBucketMode');
  }

  function clearCanvas() {
    if (s.activeLayerIndex < 0 || s.activeLayerIndex >= s.layers.length) return;
    const layer = s.layers[s.activeLayerIndex];
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    PaintApp.layers.saveState();
  }

  function downloadDrawing() {
    const temp = document.createElement('canvas');
    temp.width = 800;
    temp.height = 600;
    const tempCtx = temp.getContext('2d');
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, 800, 600);

    s.layers.forEach((layer) => {
      if (layer.visible && layer.canvas) {
        tempCtx.globalAlpha = layer.opacity || 1;
        tempCtx.drawImage(layer.canvas, 0, 0);
      }
    });

    const link = document.createElement('a');
    link.download = 'pintucalipso-dibujo.png';
    link.href = temp.toDataURL();
    link.click();
  }

  function floodFill(startX, startY, fillColor) {
    const imageData = s.ctx.getImageData(0, 0, s.canvas.width, s.canvas.height);
    const data = imageData.data;
    const width = s.canvas.width;
    const height = s.canvas.height;

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

    const fillRgb = PaintApp.hexToRgb(fillColor);
    if (!fillRgb) return;

    if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b && startA === 255) {
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
    const queue = [startXInt, startYInt];
    let head = 0;
    visited[startYInt * width + startXInt] = 1;

    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
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
          queue.push(nx, ny);
        }
      }
    }

    s.ctx.putImageData(imageData, 0, 0);
    PaintApp.layers.saveState();
  }

  PaintApp.tools = {
    getCanvasCoords,
    startDrawing,
    draw,
    stopDrawing,
    stopDrawingAndSave,
    setColor,
    toggleEraser,
    toggleCircleMode,
    toggleLineMode,
    toggleBucketMode,
    clearCanvas,
    downloadDrawing,
    floodFill
  };

  // Funciones globales invocadas desde atributos onclick en index.html
  global.setColor = setColor;
  global.toggleEraser = toggleEraser;
  global.toggleCircleMode = toggleCircleMode;
  global.toggleLineMode = toggleLineMode;
  global.toggleBucketMode = toggleBucketMode;
  global.clearCanvas = clearCanvas;
  global.downloadDrawing = downloadDrawing;
})(window);
