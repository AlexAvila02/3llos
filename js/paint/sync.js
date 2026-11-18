/**
 * Inicialización del lienzo, eventos del modal y sincronización en Firebase de Pintucalipso.
 */
(function (global) {
  const PaintApp = global.PaintApp;
  const s = PaintApp.state;

  function saveCanvasToFirebase() {
    if (!s.canvas || s.isSyncing) return;
    if (typeof drawingRef === 'undefined' || !drawingRef) return;

    try {
      const imageData = s.canvas.toDataURL('image/png');
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
    if (!s.canvas) return;
    if (typeof drawingRef === 'undefined' || !drawingRef) return;

    try {
      drawingRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.image) {
          s.isSyncing = true;
          const img = new Image();
          img.onload = () => {
            s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
            s.ctx.drawImage(img, 0, 0);
            s.isSyncing = false;
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
    if (!s.canvas) {
      console.warn('Canvas no inicializado aún');
      return;
    }

    loadCanvasFromFirebase();
    console.log('Sincronización en tiempo real activada');
  }

  function initPaintCanvas() {
    const savedLayers = localStorage.getItem('paintLayers');

    if (savedLayers) {
      try {
        const parsedLayers = JSON.parse(savedLayers);
        s.layers = parsedLayers.map((layerData) => ({
          ...layerData,
          opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
          canvas: null,
          ctx: null,
          undoStack: layerData.undoStack || [],
          redoStack: []
        }));
        s.layerCounter = Math.max(...s.layers.map((l) => l.id), 0) + 1;
        s.activeLayerIndex = 0;
      } catch (e) {
        PaintApp.layers.createInitialLayer();
      }
    } else {
      PaintApp.layers.createInitialLayer();
    }

    PaintApp.layers.renderLayers();

    document.getElementById('brush-size').addEventListener('input', function (e) {
      s.brushSize = e.target.value;
      document.getElementById('size-display').textContent = s.brushSize + 'px';
    });

    document.getElementById('color-picker').addEventListener('change', function (e) {
      PaintApp.tools.setColor(e.target.value);
    });

    const wrapper = document.querySelector('.canvas-wrapper');
    const canvasContainer = document.getElementById('canvas-layers-container');

    canvasContainer.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.5, Math.min(5, s.scale * zoomFactor));

        if (newScale !== s.scale) {
          const ratio = newScale / s.scale;
          s.translateX = mouseX - (mouseX - s.translateX) * ratio;
          s.translateY = mouseY - (mouseY - s.translateY) * ratio;
          s.scale = newScale;
          wrapper.style.transform = `translate(${s.translateX}px, ${s.translateY}px) scale(${s.scale})`;
        }
      }
    }, { passive: false });

    // Delegación de eventos de dibujo sobre la capa activa (registrada una sola vez)
    canvasContainer.addEventListener('mousedown', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
        PaintApp.tools.startDrawing(e);
      }
    });
    canvasContainer.addEventListener('mousemove', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
        PaintApp.tools.draw(e);
      }
    });
    canvasContainer.addEventListener('mouseup', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
        PaintApp.tools.stopDrawingAndSave();
      }
    });
    canvasContainer.addEventListener('mouseout', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('active-layer')) {
        PaintApp.tools.stopDrawingAndSave();
      }
    });
    window.addEventListener('mouseup', () => {
      PaintApp.tools.stopDrawingAndSave();
    });

    PaintApp.layers.loadLayersData();
  }

  function openPaintModal() {
    document.getElementById('paint-modal').classList.add('active');
    localStorage.setItem('paintModalOpen', 'true');
    if (!s.canvas) {
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
    if (typeof global.playCloseSound === 'function') {
      global.playCloseSound();
    }
    document.getElementById('paint-modal').classList.remove('active');
    localStorage.removeItem('paintModalOpen');
  }

  PaintApp.sync = {
    saveCanvasToFirebase,
    loadCanvasFromFirebase,
    initFirebaseSync,
    initPaintCanvas,
    openPaintModal,
    closePaintModal
  };

  // Funciones globales invocadas desde atributos onclick en index.html
  global.openPaintModal = openPaintModal;
  global.closePaintModal = closePaintModal;
})(window);
