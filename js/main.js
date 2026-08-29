// Menu sidebar toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const isOpening = !sidebar.classList.contains('active');
  
  document.querySelector('.hamburger-menu').classList.toggle('active');
  sidebar.classList.toggle('active');
  document.querySelector('.sidebar-overlay').classList.toggle('active');
  
  if (isOpening) {
    playSlideSound();
  } else {
    playCloseSound();
  }
}

// Theme management
const themes = {
  default: {
    body: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    wave1: 'rgba(100,150,255,0.4)',
    wave2: 'rgba(80,130,235,0.3)',
    wave3: 'rgba(60,110,215,0.25)',
    wave4: 'rgba(45,90,195,0.2)'
  },
  dark: {
    body: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0a0a0a 100%)',
    wave1: 'rgba(100,100,100,0.4)',
    wave2: 'rgba(80,80,80,0.3)',
    wave3: 'rgba(60,60,60,0.25)',
    wave4: 'rgba(40,40,40,0.2)'
  },
  purple: {
    body: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0f3d 100%)',
    wave1: 'rgba(150,100,200,0.4)',
    wave2: 'rgba(130,80,180,0.3)',
    wave3: 'rgba(110,60,160,0.25)',
    wave4: 'rgba(90,45,140,0.2)'
  },
  green: {
    body: 'linear-gradient(135deg, #0a2e1a 0%, #1b4e2d 50%, #0f3d1a 100%)',
    wave1: 'rgba(100,200,100,0.4)',
    wave2: 'rgba(80,180,80,0.3)',
    wave3: 'rgba(60,160,60,0.25)',
    wave4: 'rgba(45,140,45,0.2)'
  },
  red: {
    body: 'linear-gradient(135deg, #2e0a0a 0%, #4e1b1b 50%, #3d0f0f 100%)',
    wave1: 'rgba(200,80,80,0.4)',
    wave2: 'rgba(180,60,60,0.3)',
    wave3: 'rgba(160,45,45,0.25)',
    wave4: 'rgba(140,35,35,0.2)'
  },
  orange: {
    body: 'linear-gradient(135deg, #2e1a0a 0%, #4e2d1b 50%, #3d1f0f 100%)',
    wave1: 'rgba(200,130,50,0.4)',
    wave2: 'rgba(180,110,40,0.3)',
    wave3: 'rgba(160,90,30,0.25)',
    wave4: 'rgba(140,70,25,0.2)'
  }
};

function setTheme(themeName) {
  const theme = themes[themeName];
  const body = document.body;
  body.style.background = theme.body;
  body.style.backgroundAttachment = 'fixed';
  
  // Update wave colors
  const waves = document.querySelectorAll('.wave');
  if (waves.length >= 4) {
    waves[0].style.background = `radial-gradient(ellipse at center, ${theme.wave1} 0%, rgba(70,120,220,0.2) 30%, rgba(50,90,180,0.1) 50%, transparent 70%)`;
    waves[1].style.background = `radial-gradient(ellipse at center, ${theme.wave2} 0%, rgba(60,100,200,0.15) 30%, rgba(40,70,150,0.08) 50%, transparent 70%)`;
    waves[2].style.background = `radial-gradient(ellipse at center, ${theme.wave3} 0%, rgba(45,85,170,0.12) 30%, rgba(30,60,130,0.06) 50%, transparent 70%)`;
    waves[3].style.background = `radial-gradient(ellipse at center, ${theme.wave4} 0%, rgba(35,70,140,0.1) 30%, rgba(20,50,100,0.05) 50%, transparent 70%)`;
  }
  
  // Update particle colors
  const particles = document.querySelectorAll('.particle');
  const particleColors = {
    default: '210, 210, 255',
    dark: '220, 210, 240',
    purple: '220, 180, 255',
    green: '180, 255, 200',
    red: '255, 180, 170',
    orange: '255, 210, 150'
  };
  const color = particleColors[themeName] || '180, 210, 255';
  particles.forEach(p => {
    p.style.setProperty('--particle-color', color);
  });
  
  // Update ripple colors
  const rippleColors = {
    default: '100, 180, 255',
    dark: '150, 150, 180',
    purple: '170, 120, 255',
    green: '100, 220, 140',
    red: '255, 100, 100',
    orange: '255, 160, 80'
  };
  const rippleColor = rippleColors[themeName] || '100, 180, 255';
  document.body.style.setProperty('--ripple-color', rippleColor);
  
  localStorage.setItem('selectedTheme', themeName);
  
  // Update active button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.theme === themeName) {
      btn.classList.add('active');
    }
  });
}

// Handle form submission
function handleSubmit(event) {
  const btn = document.querySelector('.submit-btn');
  const rect = btn.getBoundingClientRect();
  createWaterRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
  playWaterDropSound();
  
  const text = document.getElementById('editor').value.toLowerCase();
  
  // Lista de nombres prohibidos
  const forbiddenNames = [
    '33', 'arroz', 'calipso', 'primito', 'pinguino', 'pablito', 
    'latipica', 'noaplicable', 'godtorias', 'arroz negro', 
    'patito', 'fama', 'famamoso', 'famamoso33'
  ];
  
  if (forbiddenNames.some(name => text.includes(name))) {
    playError();
    return;
  }
  
  // Redirecciones de personajes
  const redirects = [
    { pattern: /emilio/, url: 'pages/personajes/emilio.html' },
    { pattern: /danilo/, url: 'pages/personajes/arroz.html' },
    { pattern: /gio|giovanny/, url: 'pages/personajes/calipso.html' },
    { pattern: /tobi|tobias/, url: 'pages/personajes/primito.html' },
    { pattern: /fede|federico|pinguipollo/, url: 'pages/personajes/pinguino.html' },
    { pattern: /tomi|tomas/, url: 'pages/personajes/pablito.html' },
    { pattern: /geronimo|gerito|gero|el ficticio/, url: 'pages/personajes/latipica.html' },
    { pattern: /dylan/, url: 'assets/videos/tenna bailando xd.mp4', newTab: true },
    { pattern: /mau|mauricio/, url: 'pages/personajes/godtorias.html' },
    { pattern: /andres/, url: 'pages/personajes/laura.html' },
    { pattern: /andy/, url: 'pages/personajes/andres.html' },
    { pattern: /alex/, url: 'pages/personajes/alex.html' },
    { pattern: /lau|laura|laurita/, url: 'pages/personajes/andres.html' }
  ];
  
  for (const redirect of redirects) {
    if (redirect.pattern.test(text)) {
      playPopSound();
      if (redirect.newTab) {
        window.open(redirect.url, '_blank');
      } else {
        window.location.href = redirect.url;
      }
      return;
    }
  }
  
  playPopSound();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  const savedTheme = localStorage.getItem('selectedTheme') || 'default';
  setTheme(savedTheme);
  
  // Create particles
  createFloatingParticles();
  createAmbientParticles();
  
  // Load dolar rates
  actualizarDolar();
  setInterval(actualizarDolar, 300000);
  
  // Add click handlers to theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      playPopSound();
    });
  });
  
  // Form handlers
  document.querySelector('.submit-btn').addEventListener('click', handleSubmit);
  
  document.getElementById('editor').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const rect = document.querySelector('.submit-btn').getBoundingClientRect();
      createWaterRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
      handleSubmit();
    }
  });
  
  document.getElementById('editor').addEventListener('input', function(event) {
    const textarea = event.target;
    let value = textarea.value;
    if (value.length > 0 && value[0] !== value[0].toUpperCase()) {
      textarea.value = value[0].toUpperCase() + value.slice(1);
    }
  });
  
  // Smooth scroll
  document.addEventListener('wheel', function(event) {
    event.preventDefault();
    window.scrollBy({
      top: event.deltaY * 0.85
    });
  });
  
  // Intersection observer for animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, {
    threshold: 0.3
  });
  
  document.querySelectorAll('.godtorias-container').forEach((el) => observer.observe(el));
});
