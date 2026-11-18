/**
 * Lógica de la Línea de Tiempo: partículas de fondo, buscador, modales y lightbox.
 */
(function initParticles() {
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = Math.random() * window.innerHeight + 'px';
    particle.style.animationDuration = (Math.random() * 10 + 12) + 's';
    particle.style.animationDelay = Math.random() * 15 + 's';
    document.body.appendChild(particle);
  }

  setInterval(() => {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = window.innerHeight + 20 + 'px';
    particle.style.animationDuration = (Math.random() * 10 + 12) + 's';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 25000);
  }, 400);
})();

function searchTimeline() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!searchTerm) return;

  document.querySelectorAll('.timeline-content').forEach((item) => {
    item.classList.remove('highlight');
  });

  const items = document.querySelectorAll('.timeline-item');
  for (const item of items) {
    const content = (item.getAttribute('data-content') || '') + ' ' + item.textContent.toLowerCase();
    if (content.includes(searchTerm)) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.querySelector('.timeline-content').classList.add('highlight');
      return;
    }
  }

  alert('No se encontró la palabra: ' + searchTerm);
}

// Manejo unificado de modales de galería/imágenes
function openTimelineModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeTimelineModal(event, id) {
  if (event.target.id === id) {
    closeTimelineModalBtn(id);
  }
}

function closeTimelineModalBtn(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// Aliases compatibles por si algo los invoca por su nombre previo
const openModal = () => openTimelineModal('calipsoModal');
const closeModal = (e) => closeTimelineModal(e, 'calipsoModal');
const closeModalBtn = () => closeTimelineModalBtn('calipsoModal');
const openClashModal = () => openTimelineModal('clashModal');
const closeClashModal = (e) => closeTimelineModal(e, 'clashModal');
const closeClashModalBtn = () => closeTimelineModalBtn('clashModal');
const openGradModal = () => openTimelineModal('gradModal');
const closeGradModal = (e) => closeTimelineModal(e, 'gradModal');
const closeGradModalBtn = () => closeTimelineModalBtn('gradModal');
const openJuntaModal = () => openTimelineModal('juntaModal');
const closeJuntaModal = (e) => closeTimelineModal(e, 'juntaModal');
const closeJuntaModalBtn = () => closeTimelineModalBtn('juntaModal');
const openChillModal = () => openTimelineModal('chillModal');
const closeChillModal = (e) => closeTimelineModal(e, 'chillModal');
const closeChillModalBtn = () => closeTimelineModalBtn('chillModal');

// Lightbox de fotos
let lbImages = [];
let lbIndex = 0;

function openLightbox(src) {
  let targetImg = null;
  document.querySelectorAll('.grad-grid img').forEach((el) => {
    if (el.src === src) targetImg = el;
  });

  if (targetImg) {
    const grid = targetImg.closest('.grad-grid');
    lbImages = Array.from(grid.querySelectorAll('img')).map((i) => i.src);
    lbIndex = lbImages.indexOf(src);
  } else {
    lbImages = [src];
    lbIndex = 0;
  }
  updateLightbox();
  document.getElementById('lightbox').classList.add('active');
}

function updateLightbox() {
  document.getElementById('lightbox-img').src = lbImages[lbIndex];
  document.getElementById('lightbox-counter').textContent = (lbIndex + 1) + ' / ' + lbImages.length;
}

function lightboxPrev() {
  lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
  updateLightbox();
}

function lightboxNext() {
  lbIndex = (lbIndex + 1) % lbImages.length;
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.getElementById('lightbox-img').src = '';
}

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('lightbox').classList.contains('active')) return;
  if (e.key === 'ArrowLeft') lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
  if (e.key === 'Escape') closeLightbox();
});

document.addEventListener('click', (e) => {
  if (e.target.matches('.grad-grid img')) {
    e.stopPropagation();
    openLightbox(e.target.src);
  }
}, true);

initThemeControls();
