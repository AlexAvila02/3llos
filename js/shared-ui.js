/**
 * Utilidades compartidas de UI, temas y audio Web Audio API para todo el sitio.
 */
(function (global) {
  let sharedAudioCtx = null;

  function getAudioContext() {
    if (!sharedAudioCtx) {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  /**
   * Reproduce un tono sintetizado simple con rampa de frecuencia y volumen.
   */
  function playTone({ startFreq, endFreq, duration, volume = 0.2, ramp = 'linear' }) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(startFreq, now);
    if (ramp === 'exponential') {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    } else {
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playPopSound() {
    playTone({ startFreq: 800, endFreq: 400, duration: 0.1, volume: 0.3, ramp: 'exponential' });
  }

  function playErrorSound() {
    playTone({ startFreq: 300, endFreq: 150, duration: 0.8, volume: 0.3, ramp: 'exponential' });
  }

  function playSlideSound() {
    playTone({ startFreq: 400, endFreq: 600, duration: 0.15, volume: 0.2, ramp: 'linear' });
  }

  function playCloseSound() {
    playTone({ startFreq: 600, endFreq: 400, duration: 0.15, volume: 0.2, ramp: 'linear' });
  }

  /**
   * Reproduce el sonido de cierre y navega hacia `targetUrl` (o vuelve atrás si es `'back'`).
   */
  function navigateWithCloseSound(event, targetUrl, delay = 200) {
    if (event) event.preventDefault();
    playCloseSound();
    setTimeout(() => {
      if (targetUrl === 'back') {
        global.history.back();
      } else if (targetUrl) {
        global.location.href = targetUrl;
      }
    }, delay);
  }

  // Paleta unificada de temas del sitio
  const SITE_THEMES = {
    default: {
      body: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      wave1: 'rgba(100,150,255,0.4)',
      wave2: 'rgba(80,130,235,0.3)',
      wave3: 'rgba(60,110,215,0.25)',
      wave4: 'rgba(45,90,195,0.2)',
      particle: '210, 210, 255',
      ripple: '100, 180, 255'
    },
    dark: {
      body: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0a0a0a 100%)',
      wave1: 'rgba(100,100,100,0.4)',
      wave2: 'rgba(80,80,80,0.3)',
      wave3: 'rgba(60,60,60,0.25)',
      wave4: 'rgba(40,40,40,0.2)',
      particle: '220, 210, 240',
      ripple: '150, 150, 180'
    },
    purple: {
      body: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0f3d 100%)',
      wave1: 'rgba(150,100,200,0.4)',
      wave2: 'rgba(130,80,180,0.3)',
      wave3: 'rgba(110,60,160,0.25)',
      wave4: 'rgba(90,45,140,0.2)',
      particle: '220, 180, 255',
      ripple: '170, 120, 255'
    },
    green: {
      body: 'linear-gradient(135deg, #0a2e1a 0%, #1b4e2d 50%, #0f3d1a 100%)',
      wave1: 'rgba(100,200,100,0.4)',
      wave2: 'rgba(80,180,80,0.3)',
      wave3: 'rgba(60,160,60,0.25)',
      wave4: 'rgba(45,140,45,0.2)',
      particle: '180, 255, 200',
      ripple: '100, 220, 140'
    },
    red: {
      body: 'linear-gradient(135deg, #2e0a0a 0%, #4e1b1b 50%, #3d0f0f 100%)',
      wave1: 'rgba(200,80,80,0.4)',
      wave2: 'rgba(180,60,60,0.3)',
      wave3: 'rgba(160,45,45,0.25)',
      wave4: 'rgba(140,35,35,0.2)',
      particle: '255, 180, 170',
      ripple: '255, 100, 100'
    },
    orange: {
      body: 'linear-gradient(135deg, #2e1a0a 0%, #4e2d1b 50%, #3d1f0f 100%)',
      wave1: 'rgba(200,130,50,0.4)',
      wave2: 'rgba(180,110,40,0.3)',
      wave3: 'rgba(160,90,30,0.25)',
      wave4: 'rgba(140,70,25,0.2)',
      particle: '255, 210, 150',
      ripple: '255, 160, 80'
    }
  };

  /**
   * Aplica el tema elegido al fondo, ondas, partículas, ripple y botones del menú.
   */
  function setTheme(themeName, options = {}) {
    const { updateAttachment = false, persist = true } = options;
    const theme = SITE_THEMES[themeName] || SITE_THEMES.default;
    const body = document.body;

    body.style.background = theme.body;
    if (updateAttachment) {
      body.style.backgroundAttachment = 'fixed';
    }

    const waves = document.querySelectorAll('.wave');
    if (waves.length >= 4) {
      waves[0].style.background = `radial-gradient(ellipse at center, ${theme.wave1} 0%, rgba(70,120,220,0.2) 30%, rgba(50,90,180,0.1) 50%, transparent 70%)`;
      waves[1].style.background = `radial-gradient(ellipse at center, ${theme.wave2} 0%, rgba(60,100,200,0.15) 30%, rgba(40,70,150,0.08) 50%, transparent 70%)`;
      waves[2].style.background = `radial-gradient(ellipse at center, ${theme.wave3} 0%, rgba(45,85,170,0.12) 30%, rgba(30,60,130,0.06) 50%, transparent 70%)`;
      waves[3].style.background = `radial-gradient(ellipse at center, ${theme.wave4} 0%, rgba(35,70,140,0.1) 30%, rgba(20,50,100,0.05) 50%, transparent 70%)`;
    }

    const particles = document.querySelectorAll('.particle');
    if (particles.length) {
      particles.forEach((p) => p.style.setProperty('--particle-color', theme.particle));
    }

    body.style.setProperty('--ripple-color', theme.ripple);

    if (persist) {
      localStorage.setItem('selectedTheme', themeName);
    }

    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  }

  /**
   * Inicializa el tema guardado y conecta los botones `.theme-btn`.
   */
  function initThemeControls(options = {}) {
    const { sound = 'slide', updateAttachment = false } = options;
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    setTheme(savedTheme, { updateAttachment, persist: false });

    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme, { updateAttachment });
        if (sound === 'pop') playPopSound();
        else playSlideSound();
      });
    });
  }

  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!sidebar) return;

    const isOpening = !sidebar.classList.contains('active');
    if (hamburger) hamburger.classList.toggle('active');
    sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');

    if (isOpening) playSlideSound();
    else playCloseSound();
  }

  /**
   * Genera partículas ambientales dentro de `.wave-container`.
   */
  function createAmbientParticles(count = 20, minDuration = 18, durationRange = 12, driftRange = 80) {
    const container = document.querySelector('.wave-container');
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'ambient-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (minDuration + Math.random() * durationRange) + 's';
      particle.style.animationDelay = Math.random() * 20 + 's';
      if (driftRange > 0) {
        const drift = (Math.random() - 0.5) * driftRange;
        particle.style.setProperty('--drift', drift + 'px');
      }
      container.appendChild(particle);
    }
  }

  global.getAudioContext = getAudioContext;
  global.playTone = playTone;
  global.playPopSound = playPopSound;
  global.playErrorSound = playErrorSound;
  global.playSlideSound = playSlideSound;
  global.playCloseSound = playCloseSound;
  global.playCloseSoundMenu = playCloseSound;
  global.navigateWithCloseSound = navigateWithCloseSound;
  global.SITE_THEMES = SITE_THEMES;
  global.setTheme = setTheme;
  global.initThemeControls = initThemeControls;
  global.toggleSidebar = toggleSidebar;
  global.createAmbientParticles = createAmbientParticles;
})(window);
