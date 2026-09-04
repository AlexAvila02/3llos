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

// Efectos de ondas de agua (canvas con fisica: chorro, gravedad, anillos amortiguados)
let rippleCanvas = null;
let rippleCtx = null;
let rippleSystems = [];
let rippleRaf = 0;
let rippleLastTime = 0;

function getRippleColor() {
  const raw = getComputedStyle(document.body).getPropertyValue('--ripple-color').trim();
  return raw || '100, 180, 255';
}

function getRippleCanvas() {
  if (rippleCanvas) return rippleCanvas;
  rippleCanvas = document.createElement('canvas');
  rippleCanvas.id = 'water-ripple-canvas';
  rippleCanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2000;';
  document.body.appendChild(rippleCanvas);
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    rippleCanvas.width = Math.floor(window.innerWidth * dpr);
    rippleCanvas.height = Math.floor(window.innerHeight * dpr);
    rippleCtx = rippleCanvas.getContext('2d');
    rippleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);
  return rippleCanvas;
}

function createWaterRipple(x, y) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  getRippleCanvas();
  if (rippleSystems.length > 6) rippleSystems.shift();

  const drops = [];
  for (let i = 0; i < 26; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.85);
    const speed = 2 + Math.random() * 5.2;
    drops.push({
      x, y: y - 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      r: 1.4 + Math.random() * 3,
      age: -Math.floor(Math.random() * 6),
      maxAge: 70 + Math.random() * 30
    });
  }
  for (let i = 0; i < 6; i++) {
    drops.push({
      x: x + (Math.random() - 0.5) * 8, y: y - 4,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -(5.5 + Math.random() * 3.5),
      r: 1.2 + Math.random() * 1.8,
      age: -Math.floor(Math.random() * 3),
      maxAge: 60 + Math.random() * 20
    });
  }
  const mist = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.4 + Math.random() * 1.1;
    mist.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.4, r: 4 + Math.random() * 7, age: 0, maxAge: 40 + Math.random() * 25 });
  }
  const rings = [
    { maxR: 62, dur: 46, w: 3, a: 0.6, delay: 0 },
    { maxR: 105, dur: 64, w: 2.2, a: 0.45, delay: 5 },
    { maxR: 150, dur: 84, w: 1.5, a: 0.32, delay: 10 }
  ];
  rippleSystems.push({ x, y, age: 0, drops, mist, rings, color: getRippleColor() });
  if (!rippleRaf) {
    rippleLastTime = performance.now();
    rippleRaf = requestAnimationFrame(rippleFrame);
  }
}

function rippleFrame(now) {
  const dt = Math.min(3, Math.max(1, (now - rippleLastTime) / 16.67));
  rippleLastTime = now;
  const W = window.innerWidth, H = window.innerHeight;
  rippleCtx.clearRect(0, 0, W, H);

  rippleSystems = rippleSystems.filter(s => s.age < 120);
  if (!rippleSystems.length) {
    rippleRaf = 0;
    rippleCtx.clearRect(0, 0, W, H);
    return;
  }

  for (const s of rippleSystems) {
    s.age += dt;
    const c = s.color;

    if (s.age < 14) {
      const t = 1 - s.age / 14;
      const g = rippleCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 44);
      g.addColorStop(0, `rgba(255,255,255,${0.75 * t})`);
      g.addColorStop(0.35, `rgba(${c},${0.5 * t})`);
      g.addColorStop(1, `rgba(${c},0)`);
      rippleCtx.fillStyle = g;
      rippleCtx.beginPath();
      rippleCtx.arc(s.x, s.y, 44, 0, Math.PI * 2);
      rippleCtx.fill();
    }

    for (const r of s.rings) {
      const t = (s.age - r.delay) / r.dur;
      if (t < 0 || t > 1) continue;
      const e = 1 - Math.pow(1 - t, 3);
      const rad = 6 + e * r.maxR;
      rippleCtx.strokeStyle = `rgba(${c},${(r.a * (1 - t)).toFixed(3)})`;
      rippleCtx.lineWidth = Math.max(0.4, r.w * (1 - t));
      rippleCtx.beginPath();
      rippleCtx.ellipse(s.x, s.y, rad, rad * 0.72, 0, 0, Math.PI * 2);
      rippleCtx.stroke();
      if (t < 0.5) {
        rippleCtx.strokeStyle = `rgba(255,255,255,${(0.25 * (1 - t * 2)).toFixed(3)})`;
        rippleCtx.lineWidth = 1;
        rippleCtx.beginPath();
        rippleCtx.ellipse(s.x, s.y, rad * 0.55, rad * 0.4, 0, 0, Math.PI * 2);
        rippleCtx.stroke();
      }
    }

    for (const m of s.mist) {
      m.age += dt;
      if (m.age > m.maxAge) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx *= 0.97; m.vy *= 0.97;
      const t = m.age / m.maxAge;
      const g = rippleCtx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(${c},${(0.22 * (1 - t)).toFixed(3)})`);
      g.addColorStop(1, `rgba(${c},0)`);
      rippleCtx.fillStyle = g;
      rippleCtx.beginPath();
      rippleCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      rippleCtx.fill();
    }

    for (const d of s.drops) {
      d.age += dt;
      if (d.age < 0 || d.age > d.maxAge) continue;
      d.vy += 0.22 * dt;
      d.vx *= 0.992; d.vy *= 0.998;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > s.y + 110) continue;
      const fade = d.age > d.maxAge * 0.7 ? 1 - (d.age - d.maxAge * 0.7) / (d.maxAge * 0.3) : 1;
      const stretch = Math.min(2.2, 1 + Math.hypot(d.vx, d.vy) * 0.12);
      const ang = Math.atan2(d.vy, d.vx);
      rippleCtx.save();
      rippleCtx.translate(d.x, d.y);
      rippleCtx.rotate(ang);
      rippleCtx.globalAlpha = Math.max(0, fade);
      const g = rippleCtx.createRadialGradient(0, 0, 0, 0, 0, d.r * 1.6);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, `rgba(${c},0.85)`);
      g.addColorStop(1, `rgba(${c},0.15)`);
      rippleCtx.fillStyle = g;
      rippleCtx.beginPath();
      rippleCtx.ellipse(0, 0, d.r * 1.6 * stretch, d.r * 1.1, 0, 0, Math.PI * 2);
      rippleCtx.fill();
      rippleCtx.fillStyle = 'rgba(255,255,255,0.9)';
      rippleCtx.beginPath();
      rippleCtx.arc(-d.r * 0.35, -d.r * 0.35, d.r * 0.28, 0, Math.PI * 2);
      rippleCtx.fill();
      rippleCtx.restore();
    }
  }
  rippleCtx.globalAlpha = 1;
  rippleRaf = requestAnimationFrame(rippleFrame);
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
