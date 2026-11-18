/**
 * Lógica de la ruleta interactiva de opciones.
 * Depende de ../../js/shared-ui.js para audio, temas y barra lateral.
 */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function loadSavedOptions() {
  try {
    const raw = JSON.parse(localStorage.getItem('rouletteOptions'));
    if (Array.isArray(raw) && raw.length >= 2) {
      return raw.slice(0, 20).map((item, idx) => String(item || `Opción ${idx + 1}`));
    }
  } catch (e) {
    console.warn('No se pudieron cargar las opciones guardadas de la ruleta:', e);
  }
  return ['Opción 1', 'Opción 2'];
}

let options = loadSavedOptions();

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52BE80', '#EC7063', '#AF7AC5',
  '#5DADE2', '#48C9B0', '#F4D03F', '#EB984E'
];

let currentRotation = 0;
let isSpinning = false;

function saveOptions() {
  localStorage.setItem('rouletteOptions', JSON.stringify(options));
}

function syncOptionCounters() {
  document.getElementById('numOptions').value = options.length;
  document.getElementById('numOptionsSelect').value = options.length;
}

/**
 * Ajusta el arreglo de opciones al tamaño indicado (entre 2 y 20) y actualiza la vista.
 */
function resizeOptions(value) {
  if (value > options.length) {
    for (let i = options.length; i < value; i++) {
      options.push(`Opción ${i + 1}`);
    }
  } else if (value < options.length) {
    options.splice(value);
  }
  saveOptions();
  updateOptions();
}

function syncFromInput() {
  const input = document.getElementById('numOptions');
  const select = document.getElementById('numOptionsSelect');
  let value = parseInt(input.value, 10);

  if (Number.isNaN(value) || value < 2) value = 2;
  if (value > 20) value = 20;

  input.value = value;
  select.value = value;
  resizeOptions(value);
}

function syncFromSelect() {
  const input = document.getElementById('numOptions');
  const select = document.getElementById('numOptionsSelect');
  const value = parseInt(select.value, 10);
  input.value = value;
  resizeOptions(value);
}

function addNewOption() {
  if (options.length >= 20) {
    alert('Máximo 20 opciones permitidas');
    return;
  }
  options.push(`Opción ${options.length + 1}`);
  syncOptionCounters();
  saveOptions();
  updateOptions();
}

function updateOptions() {
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  for (let i = 0; i < options.length; i++) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
    wrapper.style.marginBottom = '8px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'option-input';
    input.value = '';
    input.placeholder = options[i] || `Opción ${i + 1}`;
    input.style.flex = '1';
    input.style.marginBottom = '0';

    input.onchange = (e) => {
      if (!e.target.value.trim()) {
        e.target.value = '';
      } else {
        options[i] = e.target.value;
        saveOptions();
        drawWheel();
      }
    };

    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.value.trim()) {
          options[i] = input.value;
        }
        saveOptions();
        drawWheel();
        if (i === options.length - 1) {
          spin();
        } else {
          const nextInput = container.querySelectorAll('input')[i + 1];
          if (nextInput) nextInput.focus();
        }
      }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 100, 100, 0.8);
      color: white;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: all 0.2s ease;
    `;
    deleteBtn.onmouseover = () => {
      deleteBtn.style.background = 'rgba(255, 70, 70, 1)';
    };
    deleteBtn.onmouseout = () => {
      deleteBtn.style.background = 'rgba(255, 100, 100, 0.8)';
    };
    deleteBtn.onclick = () => {
      if (options.length > 2) {
        options.splice(i, 1);
        syncOptionCounters();
        saveOptions();
        updateOptions();
      } else {
        alert('Debe haber al menos 2 opciones');
      }
    };

    wrapper.appendChild(input);
    wrapper.appendChild(deleteBtn);
    container.appendChild(wrapper);
  }

  drawWheel();
}

function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;
  const numOptions = options.length;
  const anglePerOption = (2 * Math.PI) / numOptions;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < numOptions; i++) {
    const startAngle = i * anglePerOption + currentRotation;
    const endAngle = (i + 1) * anglePerOption + currentRotation;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + anglePerOption / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;

    let text = options[i];
    if (text.length > 12) {
      text = text.substring(0, 12) + '...';
    }

    ctx.fillText(text, radius - 20, 5);
    ctx.restore();
  }

  // Círculo central decorativo
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function playRouletteTick(speed) {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const baseFreq = 800 + (speed * 400);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);

    filter.type = 'highpass';
    filter.frequency.value = 1200;
    filter.Q.value = 5;

    gainNode.gain.setValueAtTime(0.15 * speed, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.03);
  } catch (e) {
    console.log('Audio error:', e);
  }
}

function spin() {
  if (isSpinning) return;

  isSpinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spinBtn').classList.add('spinning');
  document.getElementById('result').style.display = 'none';

  const spinDuration = 6400;
  const startRotation = currentRotation;
  const extraSpins = 5 + Math.random() * 5;
  const targetRotation = startRotation + (extraSpins * 2 * Math.PI);
  const startTime = performance.now();
  let lastTickAngle = Math.floor(startRotation / ((2 * Math.PI) / options.length));

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / spinDuration, 1);

    // Suavizado ease-out cúbico
    const easeOut = 1 - Math.pow(1 - progress, 3);
    currentRotation = startRotation + (targetRotation - startRotation) * easeOut;

    const anglePerOption = (2 * Math.PI) / options.length;
    const currentTick = Math.floor(currentRotation / anglePerOption);
    if (currentTick !== lastTickAngle) {
      lastTickAngle = currentTick;
      const speed = 1 - easeOut;
      playRouletteTick(speed);
    }

    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      document.getElementById('spinBtn').disabled = false;
      document.getElementById('spinBtn').classList.remove('spinning');

      const numOptions = options.length;
      const sectorAngle = (2 * Math.PI) / numOptions;
      // El puntero superior está orientado a -PI/2
      const normalizedRotation = (currentRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const pointerAngle = (3 * Math.PI / 2 - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
      const winningIndex = Math.floor(pointerAngle / sectorAngle) % numOptions;

      showResult(options[winningIndex]);
    }
  }

  requestAnimationFrame(animate);
}

function showResult(winner) {
  const resultDiv = document.getElementById('result');
  const resultText = document.getElementById('resultText');

  resultText.textContent = winner;
  resultDiv.style.display = 'flex';
  resultDiv.style.opacity = '0';
  resultDiv.style.transform = 'scale(0.8)';

  setTimeout(() => {
    resultDiv.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    resultDiv.style.opacity = '1';
    resultDiv.style.transform = 'scale(1)';
  }, 10);

  const autoDelete = document.getElementById('autoDeleteToggle').checked;
  if (autoDelete) {
    setTimeout(() => {
      if (!isSpinning && options.length > 2) {
        const winnerIndex = options.indexOf(winner);
        if (winnerIndex > -1) {
          options.splice(winnerIndex, 1);
          syncOptionCounters();
          saveOptions();
          updateOptions();
        }
      }
    }, 1000);
  }
}

initThemeControls({ sound: 'slide' });
createAmbientParticles(30, 15, 10, 0);
syncOptionCounters();
updateOptions();
