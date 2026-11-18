/**
 * Estado compartido y utilidades de color para Pintucalipso.
 */
(function (global) {
  const PaintApp = global.PaintApp || (global.PaintApp = {});

  PaintApp.state = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    currentColor: '#000000',
    brushSize: 5,
    isEraser: false,
    isBucketMode: false,
    isCircleMode: false,
    isLineMode: false,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    tempCanvas: null,

    // Zoom y paneo
    scale: 1,
    translateX: 0,
    translateY: 0,

    // Sistema de capas
    layers: [],
    activeLayerIndex: 0,
    layerCounter: 1,

    // Historial para deshacer / rehacer
    undoStack: [],
    redoStack: [],
    maxHistory: 20,
    isUndoing: false,
    isSyncing: false
  };

  PaintApp.hexToRgb = function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
})(window);
