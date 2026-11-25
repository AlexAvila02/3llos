/**
 * Lógica de la página de descarga e instrucciones de PerfMods (Mods de Rendimiento).
 * Script clásico compatible tanto con file:// como con servidor HTTP.
 */
(function initPerfModsPage() {
  const PERF_FILES = [
    {
      filename: 'Instalar mods de rendimiento.bat',
      tag: 'INSTALADOR',
      badgeClass: 'badge-obl',
      icon: '▶',
      size: '138 B',
      description: 'Doble clic para instalar los mods de rendimiento en tus packs de CurseForge (Forge 1.20.1).'
    },
    {
      filename: 'Quitar mods de rendimiento.bat',
      tag: 'DESINSTALADOR',
      badgeClass: 'badge-opt',
      icon: '✕',
      size: '138 B',
      description: 'Quita los mods agregados por el instalador en el pack que elijas.'
    },
    {
      filename: 'Revisar pack.bat',
      tag: 'DIAGNÓSTICO',
      badgeClass: 'badge-opt',
      icon: '🔍',
      size: '139 B',
      description: 'Revisa incompatibilidades y dependencias faltantes dentro de un pack.'
    },
    {
      filename: 'PerfMods.ps1',
      tag: 'SCRIPT',
      badgeClass: 'badge-srv',
      icon: '⚙',
      size: '25.3 KB',
      description: 'Script principal en PowerShell que descarga y verifica los mods desde Modrinth y CurseForge.'
    },
    {
      filename: 'mods.txt',
      tag: 'LISTA',
      badgeClass: 'badge-srv',
      icon: '📄',
      size: '2.3 KB',
      description: 'Lista editable de los 27 mods de rendimiento incluidos (puedes agregar o comentar líneas con #).'
    }
  ];

  const PERF_MODS_LIST = [
    { name: 'Embeddium', source: 'Modrinth' },
    { name: 'Oculus', source: 'Modrinth' },
    { name: 'Embeddium (Rubidium) Extra', source: 'Modrinth' },
    { name: "TexTrue's Embeddium Options", source: 'Modrinth' },
    { name: 'EntityCulling', source: 'Modrinth' },
    { name: 'ImmediatelyFast', source: 'Modrinth' },
    { name: 'ModernFix', source: 'Modrinth' },
    { name: 'FerriteCore', source: 'Modrinth' },
    { name: 'AllTheLeaks', source: 'CurseForge' },
    { name: 'Radium Reforged', source: 'Modrinth' },
    { name: 'BadOptimizations', source: 'Modrinth' },
    { name: 'Noisium', source: 'Modrinth' },
    { name: 'Alternate Current', source: 'Modrinth' },
    { name: 'ServerCore', source: 'Modrinth' },
    { name: 'Clumps', source: 'Modrinth' },
    { name: 'AI Improvements', source: 'Modrinth' },
    { name: 'FastSuite', source: 'Modrinth' },
    { name: 'FastFurnace', source: 'Modrinth' },
    { name: 'Placebo', source: 'Modrinth' },
    { name: 'Smooth Chunk Save', source: 'CurseForge' },
    { name: 'Connectivity', source: 'CurseForge' },
    { name: 'Cupboard', source: 'CurseForge' },
    { name: 'CullLessLeaves Reforged', source: 'Modrinth' },
    { name: 'Particle Core', source: 'Modrinth' },
    { name: 'Dynamic FPS', source: 'Modrinth' },
    { name: 'Chunky', source: 'Modrinth' },
    { name: 'Sodium/Embeddium Dynamic Lights', source: 'Modrinth' }
  ];

  /** Escapa texto dinámico para evitar inyección HTML. */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Renderiza las tarjetas de los 5 archivos individuales de PerfMods. */
  function renderFilesGrid() {
    const grid = document.getElementById('perfFilesGrid');
    if (!grid) return;

    grid.innerHTML = PERF_FILES.map((file) => {
      const safeName = escapeHtml(file.filename);
      const safeTag = escapeHtml(file.tag);
      const safeBadgeClass = escapeHtml(file.badgeClass);
      const safeIcon = escapeHtml(file.icon);
      const safeSize = escapeHtml(file.size);
      const safeDesc = escapeHtml(file.description);
      const href = `../assets/perfmods/${encodeURIComponent(file.filename)}`;

      return `<div class="card">
        <h3>${safeName}</h3>
        <div><span class="badge ${safeBadgeClass}">[ ${safeTag} ]</span></div>
        <div class="mc-inv">
          <div class="slot">${safeIcon}</div>
          <span class="meta">${safeName}<br>${safeSize}</span>
        </div>
        <p class="perf-card-desc">${safeDesc}</p>
        <a class="download-mc" href="${href}" download="${safeName}">DESCARGAR</a>
      </div>`;
    }).join('');
  }

  /** Renderiza el listado de los 27 mods de rendimiento incluidos en mods.txt. */
  function renderModsList() {
    const container = document.getElementById('perfModsList');
    if (!container) return;

    container.innerHTML = PERF_MODS_LIST.map((mod) => {
      const sourceClass = mod.source.toLowerCase() === 'curseforge' ? 'curseforge' : 'modrinth';
      return `<div class="perf-mod-item">
        <span>${escapeHtml(mod.name)}</span>
        <span class="perf-mod-source ${sourceClass}">${escapeHtml(mod.source)}</span>
      </div>`;
    }).join('');
  }

  /** Configura el botón para mostrar u ocultar la lista de 27 mods. */
  function bindToggleModsList() {
    const btn = document.getElementById('toggleModsListBtn');
    const panel = document.getElementById('perfModsPanel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.textContent = isOpen ? '▲ OCULTAR 27 MODS' : '📋 VER 27 MODS INCLUIDOS';
    });
  }

  function bootstrap() {
    renderFilesGrid();
    renderModsList();
    bindToggleModsList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
