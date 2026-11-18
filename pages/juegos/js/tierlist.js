/**
 * Lógica del creador de Tier List con persistencia en localStorage y exportación PNG.
 * Depende de ../../js/shared-ui.js y html2canvas.
 */
let rowCount = 0;
let currentPool = [];

const defaultColors = ['tier-s', 'tier-a', 'tier-b', 'tier-c', 'tier-d', 'tier-e', 'tier-f'];
const defaultLabels = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

let saveTimeout = null;
let isProcessing = false;
const isLoadingData = false;
let isSaving = false;
let isSelectMode = false;
const selectedImages = new Set();
let currentDraggedElement = null;

function initTierList() {
  const savedData = localStorage.getItem('tierlistData');

  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      if (data && data.rows && data.rows.length > 0) {
        loadTierListData(data);
        return;
      }
    } catch (err) {
      console.error('Error al cargar desde localStorage:', err);
    }
  }
  createDefaultRows();
}

function createDefaultRows() {
  document.getElementById('tierlist').innerHTML = '';
  document.getElementById('imagePool').innerHTML = '';
  currentPool = [];
  rowCount = 0;

  for (let i = 0; i < 4; i++) {
    createRow(defaultLabels[i], defaultColors[i]);
  }

  setTimeout(() => saveTierList(), 100);
}

function debouncedSave() {
  if (isLoadingData) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTierList();
    saveTimeout = null;
  }, 300);
}

function addRow() {
  const nextIndex = rowCount % defaultLabels.length;
  createRow(defaultLabels[nextIndex], defaultColors[nextIndex]);
  saveTierList();
}

function removeLastRow() {
  if (isProcessing) return;

  const tierlist = document.getElementById('tierlist');
  if (tierlist.lastChild && tierlist.children.length > 1) {
    isProcessing = true;
    tierlist.removeChild(tierlist.lastChild);
    rowCount--;
    debouncedSave();

    setTimeout(() => {
      isProcessing = false;
    }, 100);
  }
}

function createRow(label, colorClass = 'tier-s') {
  rowCount++;
  const tierlist = document.getElementById('tierlist');

  const row = document.createElement('div');
  row.className = 'tier-row';
  row.dataset.rowId = rowCount;

  const labelDiv = document.createElement('div');
  labelDiv.className = `tier-label ${colorClass}`;
  labelDiv.textContent = label;
  labelDiv.dataset.originalText = label;
  labelDiv.title = 'Clic para editar texto • Clic derecho para cambiar color';

  labelDiv.onclick = () => {
    if (!labelDiv.isEditing) {
      editLabelText(labelDiv);
    }
  };

  labelDiv.oncontextmenu = (e) => {
    e.preventDefault();
    changeLabelColor(labelDiv);
  };

  const contentDiv = document.createElement('div');
  contentDiv.className = 'tier-content';
  contentDiv.dataset.rowId = rowCount;

  contentDiv.addEventListener('dragover', handleDragOver);
  contentDiv.addEventListener('dragleave', handleDragLeave);
  contentDiv.addEventListener('drop', handleDrop);

  row.appendChild(labelDiv);
  row.appendChild(contentDiv);
  tierlist.appendChild(row);
}

function changeLabelColor(labelDiv) {
  let currentIndex = 0;

  defaultColors.forEach((cls, index) => {
    if (labelDiv.classList.contains(cls)) {
      currentIndex = index;
      labelDiv.classList.remove(cls);
    }
  });

  const nextIndex = (currentIndex + 1) % defaultColors.length;
  labelDiv.classList.add(defaultColors[nextIndex]);
  debouncedSave();
}

function editLabelText(labelDiv) {
  if (labelDiv.isEditing) return;

  labelDiv.isEditing = true;
  const currentText = labelDiv.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.style.cssText = `
    width: 44px;
    height: 30px;
    font-size: 14px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-weight: bold;
    outline: none;
  `;
  input.maxLength = 3;

  labelDiv.textContent = '';
  labelDiv.appendChild(input);
  input.focus();
  input.select();

  const saveEdit = () => {
    const newText = input.value.toUpperCase().trim();
    if (newText) {
      labelDiv.textContent = newText;
      labelDiv.dataset.originalText = newText;
    } else {
      labelDiv.textContent = labelDiv.dataset.originalText || '?';
    }
    labelDiv.isEditing = false;
    debouncedSave();
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      labelDiv.textContent = labelDiv.dataset.originalText || currentText;
      labelDiv.isEditing = false;
    }
  });
}

function handleImageUpload(event) {
  const files = event.target.files;
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      addImageToPool(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Crea un elemento `.pool-item` respetando si el modo selección está activo.
 */
function createPoolItem(imageData, index) {
  const item = document.createElement('div');
  item.className = 'pool-item';
  item.dataset.imageId = index;

  if (isSelectMode) {
    item.draggable = false;
    item.onclick = (e) => toggleImageSelection(e, item);
  } else {
    item.draggable = true;
    item.ondragstart = handleDragStart;
    item.ondragend = handleDragEnd;
  }

  const img = document.createElement('img');
  img.src = imageData;
  img.draggable = false;

  item.appendChild(img);
  return item;
}

/**
 * Crea un elemento `.tier-item` con botón de borrado.
 */
function createTierItem(imageSrc, imageId, useDebouncedSave) {
  const item = document.createElement('div');
  item.className = 'tier-item';
  item.draggable = true;
  item.dataset.imageId = imageId;

  const img = document.createElement('img');
  img.src = imageSrc;
  img.draggable = false;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => {
    item.remove();
    if (useDebouncedSave) debouncedSave();
    else saveTierList();
  };

  item.appendChild(img);
  item.appendChild(removeBtn);
  item.ondragstart = handleDragStart;
  item.ondragend = handleDragEnd;
  return item;
}

function addImageToPool(imageData) {
  const existingIndex = currentPool.indexOf(imageData);
  if (existingIndex !== -1) return;

  currentPool.push(imageData);
  const newIndex = currentPool.length - 1;
  const pool = document.getElementById('imagePool');
  pool.appendChild(createPoolItem(imageData, newIndex));
  saveTierList();
}

function handleDragStart(e) {
  const item = e.target.closest('.pool-item') || e.target.closest('.tier-item');
  if (!item) return;

  currentDraggedElement = item;
  e.dataTransfer.setData('text/plain', item.dataset.imageId);
  e.dataTransfer.setData('source', item.parentElement.id);
  e.dataTransfer.effectAllowed = 'move';
  item.classList.add('dragging');
}

function handleDragEnd(e) {
  const item = e.target.closest('.pool-item') || e.target.closest('.tier-item');
  if (item) item.classList.remove('dragging');
  currentDraggedElement = null;
  document.querySelectorAll('.drag-over').forEach((el) => {
    el.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  if (e.currentTarget.dataset.dropProcessing === 'true') return;
  e.currentTarget.dataset.dropProcessing = 'true';

  const imageId = e.dataTransfer.getData('text/plain');
  const source = e.dataTransfer.getData('source');

  let draggedElement = null;
  let imageData = null;

  if (source === 'imagePool') {
    const poolItems = document.querySelectorAll('#imagePool .pool-item');
    draggedElement = (currentDraggedElement && currentDraggedElement.classList.contains('pool-item'))
      ? currentDraggedElement
      : poolItems[imageId];
    if (draggedElement) {
      const img = draggedElement.querySelector('img');
      if (img) imageData = img.src;
    }
  } else {
    if (currentDraggedElement && currentDraggedElement.classList.contains('tier-item')) {
      draggedElement = currentDraggedElement;
      const img = draggedElement.querySelector('img');
      if (img) imageData = img.src;
    } else {
      document.querySelectorAll('.tier-item').forEach((item) => {
        if (item.dataset.imageId === imageId) {
          draggedElement = item;
          const img = item.querySelector('img');
          if (img) imageData = img.src;
        }
      });
    }
  }

  if (imageData) {
    const targetRow = e.currentTarget.closest('.tier-row');
    const sourceRow = draggedElement ? draggedElement.closest('.tier-row') : null;

    if (targetRow && sourceRow && targetRow === sourceRow) {
      e.currentTarget.dataset.dropProcessing = 'false';
      return;
    }

    e.currentTarget.appendChild(createTierItem(imageData, imageId, true));

    if (source && source !== 'imagePool' && draggedElement) {
      draggedElement.remove();
    }

    debouncedSave();
  }

  setTimeout(() => {
    e.currentTarget.dataset.dropProcessing = 'false';
  }, 100);
}

function clearAllImages() {
  document.getElementById('imagePool').innerHTML = '';
  document.querySelectorAll('.tier-content').forEach((content) => {
    content.innerHTML = '';
  });
  currentPool = [];
  saveTierList();
  localStorage.removeItem('tierlistData');
}

function saveTierList() {
  if (isSaving) return;

  try {
    isSaving = true;

    const data = {
      rows: [],
      pool: currentPool,
      timestamp: Date.now()
    };

    document.querySelectorAll('.tier-row').forEach((row) => {
      const label = row.querySelector('.tier-label').textContent;
      const colorClass = row.querySelector('.tier-label').className;
      const images = [];

      row.querySelectorAll('.tier-item img').forEach((img) => {
        images.push(img.src);
      });

      data.rows.push({ label, colorClass, images });
    });

    try {
      const dataString = JSON.stringify(data);
      const dataSize = new Blob([dataString]).size;

      if (dataSize > 5 * 1024 * 1024) {
        console.warn('Advertencia: Los datos son muy grandes (' + (dataSize / 1024 / 1024).toFixed(2) + ' MB)');
      }

      localStorage.setItem('tierlistData', dataString);
    } catch (storageErr) {
      console.error('Error al guardar en localStorage:', storageErr);
      if (storageErr.name === 'QuotaExceededError') {
        alert('Has alcanzado el límite de almacenamiento. Intenta eliminar algunas imágenes.');
      }
    }

    isSaving = false;
  } catch (err) {
    console.error('Error en saveTierList:', err);
    isSaving = false;
  }
}

function loadTierListData(data) {
  document.getElementById('tierlist').innerHTML = '';
  document.getElementById('imagePool').innerHTML = '';
  currentPool = data.pool || [];
  rowCount = 0;

  if (data.rows && data.rows.length > 0) {
    data.rows.forEach((rowData) => {
      let colorClass = 'tier-s';
      if (rowData.colorClass && typeof rowData.colorClass === 'string') {
        const parts = rowData.colorClass.split(' ');
        if (parts.length > 1) colorClass = parts[1];
      }
      createRow(rowData.label, colorClass);
      const lastRow = document.querySelector('.tier-row:last-child .tier-content');

      if (rowData.images) {
        rowData.images.forEach((imageSrc) => {
          const imageId = currentPool.indexOf(imageSrc);
          lastRow.appendChild(createTierItem(imageSrc, imageId >= 0 ? imageId : 0, false));
        });
      }
    });
  }

  const pool = document.getElementById('imagePool');
  currentPool.forEach((imageData, index) => {
    pool.appendChild(createPoolItem(imageData, index));
  });
}

function resetToDefault() {
  localStorage.removeItem('tierlistData');
  createDefaultRows();
}

function exportTierList() {
  try {
    const container = document.querySelector('.tierlist-container');
    if (!container) {
      alert('Error: No se encontró el contenedor de la tier list');
      return;
    }

    html2canvas(container, {
      backgroundColor: null,
      scale: 2
    }).then((canvas) => {
      const link = document.createElement('a');
      link.download = 'tierlist.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch((err) => {
      console.error('Error al exportar:', err);
      alert('Error al exportar la imagen');
    });
  } catch (err) {
    console.error('Error en exportTierList:', err);
    alert('Error al exportar: ' + err.message);
  }
}

function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  const btn = document.getElementById('selectModeBtn');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const body = document.body;

  if (isSelectMode) {
    btn.textContent = 'Cancelar selección';
    btn.classList.add('active');
    deleteBtn.style.display = 'inline-block';
    body.classList.add('select-mode');

    document.querySelectorAll('.pool-item, .tier-item').forEach((item) => {
      item.onclick = (e) => toggleImageSelection(e, item);
      item.draggable = false;
    });

    alert('Modo selección activado. Haz clic en las imágenes para seleccionarlas.');
  } else {
    exitSelectMode();
  }
}

function exitSelectMode() {
  isSelectMode = false;
  selectedImages.clear();

  const btn = document.getElementById('selectModeBtn');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const body = document.body;

  btn.textContent = 'Seleccionar';
  btn.classList.remove('active');
  deleteBtn.style.display = 'none';
  body.classList.remove('select-mode');

  document.querySelectorAll('.pool-item.selected, .tier-item.selected').forEach((item) => {
    item.classList.remove('selected');
  });

  document.querySelectorAll('.pool-item, .tier-item').forEach((item) => {
    item.onclick = null;
    item.draggable = true;
    item.ondragstart = handleDragStart;
    item.ondragend = handleDragEnd;
  });
}

function toggleImageSelection(event, item) {
  event.preventDefault();
  event.stopPropagation();

  const imgSrc = item.querySelector('img').src;

  if (selectedImages.has(imgSrc)) {
    selectedImages.delete(imgSrc);
    item.classList.remove('selected');
  } else {
    selectedImages.add(imgSrc);
    item.classList.add('selected');
  }
}

function deleteSelectedImages() {
  if (selectedImages.size === 0) {
    alert('No hay imágenes seleccionadas');
    return;
  }

  if (!confirm(`¿Eliminar ${selectedImages.size} imagen(es) seleccionada(s)?`)) {
    return;
  }

  document.querySelectorAll('.pool-item').forEach((item) => {
    const imgSrc = item.querySelector('img').src;
    if (selectedImages.has(imgSrc)) {
      item.remove();
      const index = currentPool.indexOf(imgSrc);
      if (index > -1) currentPool.splice(index, 1);
    }
  });

  // Re-sincronizar los índices del pool tras eliminar elementos
  const pool = document.getElementById('imagePool');
  pool.innerHTML = '';
  currentPool.forEach((imageData, index) => {
    pool.appendChild(createPoolItem(imageData, index));
  });

  document.querySelectorAll('.tier-item').forEach((item) => {
    const imgSrc = item.querySelector('img').src;
    if (selectedImages.has(imgSrc)) {
      item.remove();
    }
  });

  saveTierList();
  exitSelectMode();
  alert('Imágenes eliminadas correctamente');
}

function createFloatingParticles() {
  const container = document.getElementById('particlesContainer');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDuration = (10 + Math.random() * 20) + 's';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

try {
  initTierList();
  createFloatingParticles();
} catch (err) {
  console.error('Error al inicializar Tier List:', err);
}

initThemeControls({ sound: 'slide' });

window.addEventListener('beforeunload', () => {
  saveTierList();
});
