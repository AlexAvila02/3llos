// Web Audio API para sonidos
let audioContext;
let waterDropAudio = null;
let errorTimeout;

function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playPopSound() {
  if (!audioContext) initAudio();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

function playErrorSound() {
  if (!audioContext) initAudio();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.8);
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.8);
}

function playSlideSound() {
  if (!audioContext) initAudio();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.15);
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
}

function playCloseSound() {
  if (!audioContext) initAudio();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.15);
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
}

function initWaterDropSound() {
  if (!waterDropAudio) {
    waterDropAudio = new Audio('assets/audio/water-drop.mp3');
    waterDropAudio.volume = 0.6;
  }
}

function playWaterDropSound() {
  initWaterDropSound();
  waterDropAudio.currentTime = 0;
  waterDropAudio.play().catch(e => console.log('Audio play failed:', e));
}

// Funciones de error y animación
function shakeText() {
  const editor = document.getElementById('editor');
  editor.classList.add('shake');
  setTimeout(() => editor.classList.remove('shake'), 500);
}

function playError() {
  playErrorSound();
  shakeText();
  const editor = document.getElementById('editor');
  editor.classList.add('error-border');
  setTimeout(() => editor.classList.remove('error-border'), 800);
  
  const modal = document.getElementById('error-modal');
  if (modal.style.display !== 'block') {
    const rect = editor.getBoundingClientRect();
    modal.style.top = (rect.top - 70) + 'px';
    modal.style.left = (rect.left + rect.width / 2) + 'px';
    modal.style.transform = 'translateX(-50%)';
    modal.style.display = 'block';
    setTimeout(() => modal.style.opacity = '1', 10);
  }
  
  clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => {
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 500);
  }, 3000);
}

// Efectos de ondas de agua
let rippleCooldown = false;
let activeRipples = 0;
const MAX_RIPPLES = 12;

function createWaterRipple(x, y) {
  if (rippleCooldown) return;
  rippleCooldown = true;
  setTimeout(() => rippleCooldown = false, 60);

  if (activeRipples >= MAX_RIPPLES) return;

  // 1. Splash central - el agua que explota
  const splash = document.createElement('div');
  splash.className = 'water-splash';
  splash.style.left = x + 'px';
  splash.style.top = y + 'px';
  document.body.appendChild(splash);
  setTimeout(() => splash.remove(), 700);

  // 2. Bounce/rebound effect - la gota se aplasta
  const bounce = document.createElement('div');
  bounce.className = 'water-bounce';
  bounce.style.left = x + 'px';
  bounce.style.top = y + 'px';
  bounce.style.width = '24px';
  bounce.style.height = '12px';
  document.body.appendChild(bounce);
  setTimeout(() => bounce.remove(), 500);

  // 3. Gotas dispersas con forma de lágrima - salen disparadas
  const dropletCount = 10;
  for (let d = 0; d < dropletCount; d++) {
    const droplet = document.createElement('div');
    droplet.className = 'water-droplet';
    droplet.style.left = x + 'px';
    droplet.style.top = y + 'px';
    
    // Distribución angular más natural (más arriba y a los lados)
    const baseAngle = -Math.PI / 2; // hacia arriba
    const spread = Math.PI * 0.9; // arco amplio
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const dist = 50 + Math.random() * 70;
    const dx = Math.cos(angle) * dist + 'px';
    const dy = Math.sin(angle) * dist + 'px';
    
    droplet.style.setProperty('--dx', dx);
    droplet.style.setProperty('--dy', dy);
    
    const size = 4 + Math.random() * 5;
    droplet.style.width = size + 'px';
    droplet.style.height = (size * 1.3) + 'px';
    
    // Delay escalonado para que salgan progresivamente
    const delay = d * 25;
    droplet.style.animationDelay = delay + 'ms';
    
    document.body.appendChild(droplet);
    setTimeout(() => droplet.remove(), 1000 + delay);
  }

  // 4. Anillos de ondas principales - el agua que se expande
  for (let i = 0; i < 4; i++) {
    if (activeRipples >= MAX_RIPPLES) break;
    activeRipples++;

    setTimeout(() => {
      const ripple = document.createElement('div');
      ripple.className = 'water-ripple';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.style.width = '90px';
      ripple.style.height = '90px';

      for (let j = 0; j < 4; j++) {
        const ring = document.createElement('div');
        ring.className = 'water-ripple-ring';
        ring.style.animationDelay = (j * 0.12) + 's';
        ripple.appendChild(ring);
      }

      document.body.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
        activeRipples--;
      }, 1900);
    }, i * 100);
  }
}

// Función para obtener cotización del dólar
async function actualizarDolar() {
  const oficialEl = document.getElementById('dolar-oficial');
  const blueEl = document.getElementById('dolar-blue');
  
  if (oficialEl) oficialEl.textContent = 'Cargando...';
  if (blueEl) blueEl.textContent = 'Cargando...';
  
  try {
    const responseOficial = await fetch('https://dolarapi.com/v1/dolares/oficial');
    const dataOficial = await responseOficial.json();
    
    const responseBlue = await fetch('https://dolarapi.com/v1/dolares/blue');
    const dataBlue = await responseBlue.json();
    
    if (oficialEl) {
      oficialEl.textContent = `$${dataOficial.venta.toLocaleString('es-AR')}`;
    }
    
    if (blueEl) {
      blueEl.textContent = `$${dataBlue.venta.toLocaleString('es-AR')}`;
    }
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    if (oficialEl) oficialEl.textContent = 'Error';
    if (blueEl) blueEl.textContent = 'Error';
  }
}

// Crear partículas flotantes mejoradas
function createFloatingParticles() {
  const container = document.getElementById('particlesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const types = ['circle', 'star', 'diamond', 'ring', 'sparkle', 'halo'];
  
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    const type = types[Math.floor(Math.random() * types.length)];
    particle.className = `particle particle-${type}`;
    
    // Posición y timing
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    const duration = 12 + Math.random() * 22;
    particle.style.animationDuration = duration + 's';
    particle.style.animationDelay = (Math.random() * 20 - 10) + 's';
    
    // Tamaño variable por tipo
    let size;
    if (type === 'sparkle') {
      size = 6 + Math.random() * 8;
    } else if (type === 'ring') {
      size = 8 + Math.random() * 10;
    } else if (type === 'star') {
      size = 10 + Math.random() * 8;
    } else if (type === 'halo') {
      size = 12 + Math.random() * 14;
    } else {
      size = 3 + Math.random() * 5;
    }
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Drift horizontal único por partícula
    const drift = (Math.random() - 0.5) * 120;
    particle.style.setProperty('--drift', drift + 'px');
    
    // Opacidad máxima variable
    const maxOpacity = 0.4 + Math.random() * 0.5;
    particle.style.setProperty('--max-opacity', maxOpacity);
    
    container.appendChild(particle);
  }
}

// Crear partículas ambientales
function createAmbientParticles() {
  const container = document.querySelector('.wave-container');
  if (!container) return;
  
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'ambient-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (18 + Math.random() * 12) + 's';
    particle.style.animationDelay = Math.random() * 20 + 's';
    const drift = (Math.random() - 0.5) * 80;
    particle.style.setProperty('--drift', drift + 'px');
    container.appendChild(particle);
  }
}
