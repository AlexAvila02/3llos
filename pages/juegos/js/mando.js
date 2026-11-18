/**
 * Lógica del Test de Mando: detección mediante Gamepad API, esquema adaptable
 * (Xbox / PlayStation / Nintendo / Crudo), telemetría de sticks y gatillos,
 * botones virtuales, historial reciente y prueba de vibración.
 */
(function () {
  const STANDARD_BUTTON_COUNT = 17;
  const MAX_HISTORY_TAGS = 20;
  const MAX_STICK_TRAIL = 90;
  const SVG_STICK_RADIUS = 16;

  // Mapas de etiquetas por esquema para los 17 botones estándar (W3C Gamepad API)
  const BUTTON_LAYOUTS = {
    xbox: {
      0: { short: 'A', full: 'A' },
      1: { short: 'B', full: 'B' },
      2: { short: 'X', full: 'X' },
      3: { short: 'Y', full: 'Y' },
      4: { short: 'LB', full: 'LB' },
      5: { short: 'RB', full: 'RB' },
      6: { short: 'LT', full: 'LT' },
      7: { short: 'RT', full: 'RT' },
      8: { short: 'View', full: 'View' },
      9: { short: 'Menu', full: 'Menu' },
      10: { short: 'L3', full: 'L3 (Stick Izq.)' },
      11: { short: 'R3', full: 'R3 (Stick Der.)' },
      12: { short: '↑', full: 'Cruceta ↑' },
      13: { short: '↓', full: 'Cruceta ↓' },
      14: { short: '←', full: 'Cruceta ←' },
      15: { short: '→', full: 'Cruceta →' },
      16: { short: 'Xbox', full: 'Botón Xbox' }
    },
    playstation: {
      0: { short: '✕', full: 'Cruz (✕)' },
      1: { short: '○', full: 'Círculo (○)' },
      2: { short: '□', full: 'Cuadrado (□)' },
      3: { short: '△', full: 'Triángulo (△)' },
      4: { short: 'L1', full: 'L1' },
      5: { short: 'R1', full: 'R1' },
      6: { short: 'L2', full: 'L2' },
      7: { short: 'R2', full: 'R2' },
      8: { short: 'Share', full: 'Share / Create' },
      9: { short: 'Opts', full: 'Options' },
      10: { short: 'L3', full: 'L3 (Stick Izq.)' },
      11: { short: 'R3', full: 'R3 (Stick Der.)' },
      12: { short: '↑', full: 'Cruceta ↑' },
      13: { short: '↓', full: 'Cruceta ↓' },
      14: { short: '←', full: 'Cruceta ←' },
      15: { short: '→', full: 'Cruceta →' },
      16: { short: 'PS', full: 'Botón PS' }
    },
    nintendo: {
      0: { short: 'B', full: 'B (Abajo)' },
      1: { short: 'A', full: 'A (Derecha)' },
      2: { short: 'Y', full: 'Y (Izquierda)' },
      3: { short: 'X', full: 'X (Arriba)' },
      4: { short: 'L', full: 'L' },
      5: { short: 'R', full: 'R' },
      6: { short: 'ZL', full: 'ZL' },
      7: { short: 'ZR', full: 'ZR' },
      8: { short: '-', full: 'Menos (-)' },
      9: { short: '+', full: 'Más (+)' },
      10: { short: 'L3', full: 'Stick Izq. (L3)' },
      11: { short: 'R3', full: 'Stick Der. (R3)' },
      12: { short: '↑', full: 'Cruceta ↑' },
      13: { short: '↓', full: 'Cruceta ↓' },
      14: { short: '←', full: 'Cruceta ←' },
      15: { short: '→', full: 'Cruceta →' },
      16: { short: 'Home', full: 'Home' }
    },
    raw: {
      0: { short: 'B0', full: 'B0' },
      1: { short: 'B1', full: 'B1' },
      2: { short: 'B2', full: 'B2' },
      3: { short: 'B3', full: 'B3' },
      4: { short: 'B4', full: 'B4' },
      5: { short: 'B5', full: 'B5' },
      6: { short: 'B6', full: 'B6' },
      7: { short: 'B7', full: 'B7' },
      8: { short: 'B8', full: 'B8' },
      9: { short: 'B9', full: 'B9' },
      10: { short: 'B10', full: 'B10' },
      11: { short: 'B11', full: 'B11' },
      12: { short: 'B12', full: 'B12' },
      13: { short: 'B13', full: 'B13' },
      14: { short: 'B14', full: 'B14' },
      15: { short: 'B15', full: 'B15' },
      16: { short: 'B16', full: 'B16' }
    }
  };

  // Estado general de la prueba
  let currentLayout = 'xbox';
  let userSelectedLayout = false;
  let totalPresses = 0;
  const testedButtons = new Set();
  const virtualPressed = new Set();

  let activePadIndex = null;
  let lastPadsSignature = '';
  let lastActiveIndex = null;
  let prevPressed = [];
  let currentButtonCount = STANDARD_BUTTON_COUNT;
  let currentExtraAxisCount = 0;
  let lastRumbleTimer = null;

  const stickTrails = {
    left: [],
    right: []
  };

  // Referencias del DOM
  const statusDot = document.getElementById('statusDot');
  const gamepadNameEl = document.getElementById('gamepadName');
  const mappingBadgeEl = document.getElementById('mappingBadge');
  const gamepadSelect = document.getElementById('gamepadSelect');
  const layoutButtons = document.querySelectorAll('.layout-btn');

  const svgStickLeft = document.getElementById('svgStickLeft');
  const svgStickRight = document.getElementById('svgStickRight');
  const svgTriggerFill6 = document.getElementById('svgTriggerFill6');
  const svgTriggerFill7 = document.getElementById('svgTriggerFill7');

  const leftStickCanvas = document.getElementById('leftStickCanvas');
  const rightStickCanvas = document.getElementById('rightStickCanvas');
  const leftAxisXEl = document.getElementById('leftAxisX');
  const leftAxisYEl = document.getElementById('leftAxisY');
  const leftAxisMagEl = document.getElementById('leftAxisMag');
  const rightAxisXEl = document.getElementById('rightAxisX');
  const rightAxisYEl = document.getElementById('rightAxisY');
  const rightAxisMagEl = document.getElementById('rightAxisMag');

  const triggerBar6 = document.getElementById('triggerBar6');
  const triggerBar7 = document.getElementById('triggerBar7');
  const triggerVal6 = document.getElementById('triggerVal6');
  const triggerVal7 = document.getElementById('triggerVal7');

  const buttonsGrid = document.getElementById('buttonsGrid');
  const extraAxesSection = document.getElementById('extraAxesSection');
  const extraAxesGrid = document.getElementById('extraAxesGrid');

  const lastButtonEl = document.getElementById('lastButton');
  const pressedButtonsEl = document.getElementById('pressedButtons');
  const totalPressesEl = document.getElementById('totalPresses');
  const uniqueButtonsEl = document.getElementById('uniqueButtons');
  const connectedCountEl = document.getElementById('connectedCount');
  const rumbleBtn = document.getElementById('rumbleBtn');
  const resetBtn = document.getElementById('resetBtn');
  const rumbleStatusEl = document.getElementById('rumbleStatus');

  // Cache de elementos por índice de botón para actualizar SVG + chips sin consultar el DOM cada frame
  const svgButtonsByIndex = new Map();
  const chipButtonsByIndex = new Map();
  const extraAxisElements = [];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatAxis(value) {
    const safe = Math.abs(value) < 0.0005 ? 0 : value;
    return (safe >= 0 ? '+' : '') + safe.toFixed(3);
  }

  function getButtonLabel(index) {
    const map = BUTTON_LAYOUTS[currentLayout] || BUTTON_LAYOUTS.xbox;
    if (map[index]) {
      return map[index];
    }
    if (index === 17 && currentLayout === 'playstation') {
      return { short: 'Pad', full: 'B17 (Touchpad)' };
    }
    return { short: `B${index}`, full: `B${index}` };
  }

  function detectLayoutFromId(id) {
    const text = String(id || '');
    if (/playstation|dualsense|dualshock|wireless controller|054c/i.test(text)) {
      return 'playstation';
    }
    if (/nintendo|pro controller|joy-con|057e/i.test(text)) {
      return 'nintendo';
    }
    return 'xbox';
  }

  function applyLayoutLabels() {
    layoutButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layout === currentLayout);
    });

    document.querySelectorAll('[data-label-btn]').forEach((el) => {
      const idx = Number(el.dataset.labelBtn);
      el.textContent = getButtonLabel(idx).short;
    });

    chipButtonsByIndex.forEach((chip, idx) => {
      const labelEl = chip.querySelector('.pad-chip-label');
      if (labelEl) {
        labelEl.textContent = getButtonLabel(idx).short;
      }
    });
  }

  function setLayout(layout, isManual = true) {
    if (!BUTTON_LAYOUTS[layout]) return;
    currentLayout = layout;
    if (isManual) {
      userSelectedLayout = true;
    }
    applyLayoutLabels();
  }

  function updateUniqueCounter() {
    uniqueButtonsEl.textContent = `${testedButtons.size} / ${currentButtonCount}`;
  }

  function registerButtonPress(index) {
    totalPresses++;
    testedButtons.add(index);

    const { full } = getButtonLabel(index);
    lastButtonEl.textContent = full;
    totalPressesEl.textContent = String(totalPresses);
    updateUniqueCounter();

    const tag = document.createElement('div');
    tag.className = 'pressed-button-tag';
    tag.textContent = full;
    pressedButtonsEl.appendChild(tag);

    while (pressedButtonsEl.children.length > MAX_HISTORY_TAGS) {
      pressedButtonsEl.removeChild(pressedButtonsEl.firstChild);
    }
    pressedButtonsEl.scrollTop = pressedButtonsEl.scrollHeight;
  }

  function pressVirtualButton(index) {
    if (!virtualPressed.has(index)) {
      virtualPressed.add(index);
      registerButtonPress(index);
    }
  }

  function releaseVirtualButton(index) {
    virtualPressed.delete(index);
  }

  function clearAllVirtualButtons() {
    if (virtualPressed.size > 0) {
      virtualPressed.clear();
    }
  }

  function bindVirtualEvents(element, index) {
    element.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pressVirtualButton(index);
    });
    element.addEventListener('pointerup', () => releaseVirtualButton(index));
    element.addEventListener('pointerleave', () => releaseVirtualButton(index));
    element.addEventListener('pointercancel', () => releaseVirtualButton(index));
  }

  function registerSvgButtons() {
    document.querySelectorAll('#gamepadSvg [data-button]').forEach((el) => {
      const idx = Number(el.dataset.button);
      if (!svgButtonsByIndex.has(idx)) {
        svgButtonsByIndex.set(idx, []);
      }
      svgButtonsByIndex.get(idx).push(el);
      bindVirtualEvents(el, idx);
    });
  }

  function buildButtonsGrid(count) {
    currentButtonCount = count;
    buttonsGrid.innerHTML = '';
    chipButtonsByIndex.clear();

    for (let i = 0; i < count; i++) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pad-chip';
      chip.dataset.button = String(i);
      if (testedButtons.has(i)) {
        chip.classList.add('tested');
      }

      const labelSpan = document.createElement('span');
      labelSpan.className = 'pad-chip-label';
      labelSpan.textContent = getButtonLabel(i).short;

      const indexSpan = document.createElement('span');
      indexSpan.className = 'pad-chip-index';
      indexSpan.textContent = `B${i}`;

      chip.appendChild(labelSpan);
      chip.appendChild(indexSpan);
      bindVirtualEvents(chip, i);

      buttonsGrid.appendChild(chip);
      chipButtonsByIndex.set(i, chip);
    }

    updateUniqueCounter();
  }

  function buildExtraAxesGrid(totalAxes) {
    const extraCount = Math.max(0, totalAxes - 4);
    currentExtraAxisCount = extraCount;
    extraAxesGrid.innerHTML = '';
    extraAxisElements.length = 0;

    if (extraCount === 0) {
      extraAxesSection.hidden = true;
      return;
    }

    extraAxesSection.hidden = false;
    for (let axisIdx = 4; axisIdx < totalAxes; axisIdx++) {
      const item = document.createElement('div');
      item.className = 'extra-axis-item';

      const head = document.createElement('div');
      head.className = 'extra-axis-head';

      const title = document.createElement('span');
      title.textContent = `Eje ${axisIdx}`;

      const valueEl = document.createElement('span');
      valueEl.className = 'extra-axis-val';
      valueEl.textContent = '+0.000';

      head.appendChild(title);
      head.appendChild(valueEl);

      const track = document.createElement('div');
      track.className = 'extra-axis-track';

      const center = document.createElement('div');
      center.className = 'extra-axis-center';

      const marker = document.createElement('div');
      marker.className = 'extra-axis-marker';

      track.appendChild(center);
      track.appendChild(marker);
      item.appendChild(head);
      item.appendChild(track);
      extraAxesGrid.appendChild(item);

      extraAxisElements.push({ axisIdx, valueEl, marker });
    }
  }

  function updateExtraAxes(axes) {
    if (!axes || axes.length <= 4) {
      if (currentExtraAxisCount !== 0) {
        buildExtraAxesGrid(0);
      }
      return;
    }

    if (axes.length - 4 !== currentExtraAxisCount) {
      buildExtraAxesGrid(axes.length);
    }

    for (const entry of extraAxisElements) {
      const raw = Number(axes[entry.axisIdx] || 0);
      const clamped = clamp(raw, -1, 1);
      entry.valueEl.textContent = formatAxis(raw);
      entry.marker.style.left = `${((clamped + 1) / 2) * 100}%`;
    }
  }

  function readPadButtons(pad, previous) {
    const count = pad.buttons ? pad.buttons.length : 0;
    const pressed = new Array(count).fill(false);

    for (let i = 0; i < count; i++) {
      const btn = pad.buttons[i];
      if (!btn) continue;

      if (i === 6 || i === 7) {
        const val = clamp(Number(btn.value || 0), 0, 1);
        // Histéresis en gatillos analógicos para evitar rebotes cerca del umbral
        if (previous[i]) {
          pressed[i] = Boolean(btn.pressed || val >= 0.12);
        } else {
          pressed[i] = Boolean(btn.pressed || val >= 0.25);
        }
      } else {
        pressed[i] = Boolean(btn.pressed || btn.value > 0.5);
      }
    }

    // Compatibilidad con mandos no estándar (ejes 6/7 o hat switch en eje 9 para cruceta)
    if (pad.mapping !== 'standard' && pad.axes) {
      const a6 = pad.axes[6];
      const a7 = pad.axes[7];
      const a9 = pad.axes[9];

      if (a6 !== undefined) {
        if (a6 < -0.5) pressed[14] = true;
        if (a6 > 0.5) pressed[15] = true;
      }
      if (a7 !== undefined) {
        if (a7 < -0.5) pressed[12] = true;
        if (a7 > 0.5) pressed[13] = true;
      }
      if (a9 !== undefined && a9 >= -1.05 && a9 <= 1.05) {
        if (a9 > 0.3) pressed[14] = true;
        if (a9 < -0.2 && a9 > -0.9) pressed[15] = true;
        if (a9 < -0.6 || a9 > 0.9) pressed[12] = true;
        if (a9 > -0.3 && a9 < 0.6) pressed[13] = true;
      }
    }

    return pressed;
  }

  function getTriggerValue(pad, index) {
    if (virtualPressed.has(index)) {
      return 1;
    }
    const btn = pad && pad.buttons && pad.buttons[index];
    if (!btn) return 0;
    const val = clamp(Number(btn.value || 0), 0, 1);
    return btn.pressed && val === 0 ? 1 : val;
  }

  function drawStickCanvas(canvas, x, y, trail, clickActive) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.42;

    ctx.clearRect(0, 0, w, h);

    // Fondo circular
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();

    // Anillo de zona muerta (10%)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ejes X/Y
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Coordenada acotada dentro del círculo visual
    const rawMag = Math.hypot(x, y);
    const nx = rawMag > 1 ? x / rawMag : x;
    const ny = rawMag > 1 ? y / rawMag : y;
    const px = cx + nx * radius;
    const py = cy + ny * radius;

    if (rawMag > 0.04) {
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(px - last.x, py - last.y) > 0.5) {
        trail.push({ x: px, y: py });
        if (trail.length > MAX_STICK_TRAIL) {
          trail.shift();
        }
      }
    }

    // Rastro reciente del stick
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vector desde el centro hasta la posición actual
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = clickActive ? 'rgba(100, 200, 100, 0.85)' : 'rgba(78, 205, 196, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Punto indicador actual
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    if (clickActive) {
      ctx.fillStyle = '#4ade80';
    } else if (rawMag > 0.04) {
      ctx.fillStyle = '#4ecdc4';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    }
    ctx.fill();
  }

  function updateSticksAndTriggers(pad, physicalPressed) {
    const lx = pad && pad.axes && pad.axes.length > 0 ? Number(pad.axes[0] || 0) : 0;
    const ly = pad && pad.axes && pad.axes.length > 1 ? Number(pad.axes[1] || 0) : 0;
    const rx = pad && pad.axes && pad.axes.length > 2 ? Number(pad.axes[2] || 0) : 0;
    const ry = pad && pad.axes && pad.axes.length > 3 ? Number(pad.axes[3] || 0) : 0;

    // Desplazamiento en el SVG acotado al radio del pozo
    const lMag = Math.hypot(lx, ly);
    const lScale = lMag > 1 ? SVG_STICK_RADIUS / lMag : SVG_STICK_RADIUS;
    svgStickLeft.setAttribute(
      'transform',
      `translate(${(lx * lScale).toFixed(2)}, ${(ly * lScale).toFixed(2)})`
    );

    const rMag = Math.hypot(rx, ry);
    const rScale = rMag > 1 ? SVG_STICK_RADIUS / rMag : SVG_STICK_RADIUS;
    svgStickRight.setAttribute(
      'transform',
      `translate(${(rx * rScale).toFixed(2)}, ${(ry * rScale).toFixed(2)})`
    );

    // Lecturas numéricas
    leftAxisXEl.textContent = formatAxis(lx);
    leftAxisYEl.textContent = formatAxis(ly);
    leftAxisMagEl.textContent = `${Math.round(clamp(lMag, 0, 1) * 100)}%`;

    rightAxisXEl.textContent = formatAxis(rx);
    rightAxisYEl.textContent = formatAxis(ry);
    rightAxisMagEl.textContent = `${Math.round(clamp(rMag, 0, 1) * 100)}%`;

    const l3Active = Boolean(physicalPressed[10] || virtualPressed.has(10));
    const r3Active = Boolean(physicalPressed[11] || virtualPressed.has(11));
    drawStickCanvas(leftStickCanvas, lx, ly, stickTrails.left, l3Active);
    drawStickCanvas(rightStickCanvas, rx, ry, stickTrails.right, r3Active);

    // Gatillos analógicos
    const t6 = getTriggerValue(pad, 6);
    const t7 = getTriggerValue(pad, 7);

    svgTriggerFill6.setAttribute('width', (t6 * 120).toFixed(1));
    svgTriggerFill7.setAttribute('width', (t7 * 120).toFixed(1));

    triggerBar6.style.width = `${(t6 * 100).toFixed(1)}%`;
    triggerBar7.style.width = `${(t7 * 100).toFixed(1)}%`;
    triggerVal6.textContent = `${Math.round(t6 * 100)}% (${t6.toFixed(2)})`;
    triggerVal7.textContent = `${Math.round(t7 * 100)}% (${t7.toFixed(2)})`;
  }

  function updateButtonVisuals(physicalPressed) {
    const total = Math.max(currentButtonCount, physicalPressed.length);

    for (let i = 0; i < total; i++) {
      const isPressed = Boolean(physicalPressed[i] || virtualPressed.has(i));
      const isTested = testedButtons.has(i);

      const svgEls = svgButtonsByIndex.get(i);
      if (svgEls) {
        for (const el of svgEls) {
          el.classList.toggle('pressed', isPressed);
          el.classList.toggle('tested', isTested);
        }
      }

      const chip = chipButtonsByIndex.get(i);
      if (chip) {
        chip.classList.toggle('pressed', isPressed);
        chip.classList.toggle('tested', isTested);
      }
    }
  }

  function getConnectedPads() {
    if (!navigator.getGamepads) {
      return { supported: false, pads: [] };
    }
    try {
      const raw = navigator.getGamepads();
      const pads = [];
      if (raw) {
        for (const p of raw) {
          if (p && p.connected) pads.push(p);
        }
      }
      return { supported: true, pads };
    } catch (e) {
      return { supported: false, pads: [] };
    }
  }

  function syncGamepadSelector(pads) {
    const signature = pads.map((p) => `${p.index}:${p.id}:${p.mapping}`).join('|');
    if (signature === lastPadsSignature) {
      return;
    }
    lastPadsSignature = signature;
    connectedCountEl.textContent = String(pads.length);

    gamepadSelect.innerHTML = '';
    for (const pad of pads) {
      const opt = document.createElement('option');
      opt.value = String(pad.index);
      const cleanName = pad.id || `Mando ${pad.index + 1}`;
      opt.textContent = `#${pad.index + 1} · ${cleanName}`;
      gamepadSelect.appendChild(opt);
    }

    if (pads.length >= 2) {
      gamepadSelect.hidden = false;
      if (activePadIndex !== null && pads.some((p) => p.index === activePadIndex)) {
        gamepadSelect.value = String(activePadIndex);
      }
    } else {
      gamepadSelect.hidden = true;
    }
  }

  function updateConnectionHeader(supported, activePad) {
    if (!supported) {
      statusDot.classList.remove('connected');
      statusDot.classList.add('unsupported');
      gamepadNameEl.textContent = 'Este navegador no soporta Gamepad API';
      gamepadNameEl.title = '';
      mappingBadgeEl.hidden = true;
      return;
    }

    statusDot.classList.remove('unsupported');

    if (!activePad) {
      statusDot.classList.remove('connected');
      gamepadNameEl.textContent = 'Esperando mando... (presiona un botón para activarlo)';
      gamepadNameEl.title = '';
      mappingBadgeEl.hidden = true;
      return;
    }

    statusDot.classList.add('connected');
    const name = activePad.id || `Mando #${activePad.index + 1}`;
    gamepadNameEl.textContent = name;
    gamepadNameEl.title = name;

    mappingBadgeEl.hidden = false;
    if (activePad.mapping === 'standard') {
      mappingBadgeEl.textContent = 'Estándar';
      mappingBadgeEl.classList.remove('compat');
    } else {
      mappingBadgeEl.textContent = 'Compatibilidad';
      mappingBadgeEl.classList.add('compat');
    }
  }

  function pollLoop() {
    const { supported, pads } = getConnectedPads();

    if (!supported) {
      syncGamepadSelector([]);
      updateConnectionHeader(false, null);
      updateSticksAndTriggers(null, []);
      updateButtonVisuals([]);
      updateExtraAxes(null);
      requestAnimationFrame(pollLoop);
      return;
    }

    syncGamepadSelector(pads);

    let activePad = null;
    if (pads.length > 0) {
      activePad = pads.find((p) => p.index === activePadIndex) || pads[0];
      activePadIndex = activePad.index;
      if (!gamepadSelect.hidden) {
        gamepadSelect.value = String(activePadIndex);
      }
    } else {
      activePadIndex = null;
    }

    updateConnectionHeader(true, activePad);

    if (!activePad) {
      lastActiveIndex = null;
      prevPressed = [];
      if (currentButtonCount !== STANDARD_BUTTON_COUNT) {
        buildButtonsGrid(STANDARD_BUTTON_COUNT);
      }
      updateSticksAndTriggers(null, []);
      updateButtonVisuals([]);
      updateExtraAxes(null);
      requestAnimationFrame(pollLoop);
      return;
    }

    const desiredButtonCount = Math.max(
      STANDARD_BUTTON_COUNT,
      activePad.buttons ? activePad.buttons.length : STANDARD_BUTTON_COUNT
    );
    if (desiredButtonCount !== currentButtonCount) {
      buildButtonsGrid(desiredButtonCount);
    }

    const currentPressed = readPadButtons(activePad, prevPressed);

    // Al detectar un mando nuevo o cambiar de mando, evitar disparos fantasma iniciales
    if (lastActiveIndex !== activePad.index) {
      lastActiveIndex = activePad.index;
      prevPressed = currentPressed;
      if (!userSelectedLayout) {
        setLayout(detectLayoutFromId(activePad.id), false);
      }
    } else {
      for (let i = 0; i < currentPressed.length; i++) {
        if (currentPressed[i] && !prevPressed[i]) {
          registerButtonPress(i);
        }
      }
      prevPressed = currentPressed;
    }

    updateSticksAndTriggers(activePad, currentPressed);
    updateButtonVisuals(currentPressed);
    updateExtraAxes(activePad.axes);

    requestAnimationFrame(pollLoop);
  }

  function showRumbleMessage(msg) {
    rumbleStatusEl.textContent = msg;
    clearTimeout(lastRumbleTimer);
    lastRumbleTimer = setTimeout(() => {
      if (rumbleStatusEl.textContent === msg) {
        rumbleStatusEl.textContent = '';
      }
    }, 3500);
  }

  function testRumble() {
    const { supported, pads } = getConnectedPads();
    if (!supported) {
      showRumbleMessage('Tu navegador no soporta Gamepad API.');
      return;
    }

    const pad = pads.find((p) => p.index === activePadIndex) || pads[0];
    if (!pad) {
      showRumbleMessage('Conecta un mando físico para probar la vibración.');
      return;
    }

    if (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === 'function') {
      try {
        const result = pad.vibrationActuator.playEffect('dual-rumble', {
          duration: 400,
          strongMagnitude: 0.7,
          weakMagnitude: 0.45
        });
        if (result && typeof result.then === 'function') {
          result
            .then(() => showRumbleMessage('Vibración enviada al mando.'))
            .catch(() => showRumbleMessage('El mando o navegador rechazó la vibración.'));
        } else {
          showRumbleMessage('Vibración enviada al mando.');
        }
        return;
      } catch (e) {
        showRumbleMessage('Este mando no pudo ejecutar la vibración.');
        return;
      }
    }

    if (pad.hapticActuators && pad.hapticActuators[0] && typeof pad.hapticActuators[0].pulse === 'function') {
      try {
        pad.hapticActuators[0].pulse(0.7, 400);
        showRumbleMessage('Vibración enviada al mando.');
        return;
      } catch (e) {
        showRumbleMessage('Este mando no pudo ejecutar la vibración.');
        return;
      }
    }

    showRumbleMessage('Este mando o navegador no soporta vibración.');
  }

  function resetTest() {
    totalPresses = 0;
    testedButtons.clear();
    virtualPressed.clear();
    stickTrails.left.length = 0;
    stickTrails.right.length = 0;

    lastButtonEl.textContent = '-';
    totalPressesEl.textContent = '0';
    updateUniqueCounter();
    pressedButtonsEl.innerHTML = '';
    rumbleStatusEl.textContent = '';

    document.querySelectorAll('.pad-btn.tested, .pad-btn.pressed, .pad-chip.tested, .pad-chip.pressed').forEach((el) => {
      el.classList.remove('tested', 'pressed');
    });
  }

  // Eventos de interfaz
  layoutButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setLayout(btn.dataset.layout, true);
    });
  });

  gamepadSelect.addEventListener('change', () => {
    const chosen = Number(gamepadSelect.value);
    if (!Number.isNaN(chosen)) {
      activePadIndex = chosen;
      lastActiveIndex = null;
    }
  });

  rumbleBtn.addEventListener('click', testRumble);
  resetBtn.addEventListener('click', resetTest);

  window.addEventListener('pointerup', clearAllVirtualButtons);
  window.addEventListener('pointercancel', clearAllVirtualButtons);
  window.addEventListener('blur', clearAllVirtualButtons);

  window.addEventListener('gamepadconnected', (e) => {
    if (activePadIndex === null) {
      activePadIndex = e.gamepad.index;
    }
    if (!userSelectedLayout) {
      setLayout(detectLayoutFromId(e.gamepad.id), false);
    }
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index === activePadIndex) {
      activePadIndex = null;
      lastActiveIndex = null;
      prevPressed = [];
    }
  });

  // Inicialización
  registerSvgButtons();
  buildButtonsGrid(STANDARD_BUTTON_COUNT);
  applyLayoutLabels();

  if (typeof initThemeControls === 'function') {
    initThemeControls({ sound: 'slide' });
  }

  requestAnimationFrame(pollLoop);
})();
