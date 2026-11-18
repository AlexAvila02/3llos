// Navegación con sonido de pop respetando apertura en nueva pestaña
function navigateWithPop(event, url) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
    playPopSound();
    return;
  }
  event.preventDefault();
  playPopSound();
  setTimeout(() => {
    window.location.href = url;
  }, 100);
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
  // Crear partículas antes de aplicar el tema para que hereden --particle-color
  createFloatingParticles();
  createAmbientParticles();

  // Inicializar temas (shared-ui.js)
  initThemeControls({ sound: 'pop', updateAttachment: true });
  
  // Load dolar rates
  actualizarDolar();
  setInterval(actualizarDolar, 300000);
  
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
  }, { passive: false });
  
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
