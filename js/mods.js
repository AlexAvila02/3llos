/**
 * Lógica del gestor de mods de Minecraft (filtrado, ordenamiento, descarga directa/ZIP y estado del servidor).
 */
const SERVER_KW = ['chunky', 'ftbbackups', 'ftb-ranks', 'ftb-essentials', 'spark', 'skinrestorer', 'daytimecontrol', 'madeinsleep'];
const OPTIONAL_KW = ['xaerominimap', 'xaeroworldmap', 'mousetweaks', 'jade', 'enhanced_boss_bars', 'emotecraft'];

let currentFilter = 'necesarios';
let cachedMods = [];
let dirHandle = null;
const selected = new Set();
let sortMode = localStorage.getItem('modsSort') || 'newest';
let zipCancelled = false;

function classify(filename) {
  const n = filename.toLowerCase();
  if (SERVER_KW.some((k) => n.includes(k))) return 'servidor';
  if (OPTIONAL_KW.some((k) => n.includes(k))) return 'opcional';
  return 'obligatorio';
}

function badgeHtml(type) {
  if (type === 'servidor') return '<span class="badge badge-srv">[ SERVIDOR ]</span>';
  if (type === 'opcional') return '<span class="badge badge-opt">[ OPCIONAL ]</span>';
  return '<span class="badge badge-obl">[ OBLIGATORIO ]</span>';
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('#filterBar .btn-mc').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
  render();
}

function passesFilter(type) {
  if (currentFilter === 'todos') return true;
  if (currentFilter === 'necesarios') return type === 'obligatorio';
  return type === currentFilter;
}

function getClientMods() {
  return cachedMods.filter((m) => classify(m.filename) !== 'servidor');
}

function getFilteredMods() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  return cachedMods
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q))
    .filter((m) => passesFilter(classify(m.filename)));
}

function setSort(v) {
  sortMode = v;
  localStorage.setItem('modsSort', v);
  render();
}

function sortMods(list) {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sortMode === 'newest' || sortMode === 'oldest') {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (da !== db) return sortMode === 'newest' ? db - da : da - db;
      return a.filename.localeCompare(b.filename);
    }
    if (sortMode === 'az') return a.filename.localeCompare(b.filename);
    if (sortMode === 'za') return b.filename.localeCompare(a.filename);
    return 0;
  });
  return copy;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render() {
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  const state = document.getElementById('state');
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  const filtered = sortMods(getFilteredMods());

  if (!filtered.length) {
    grid.style.display = 'none';
    if (cachedMods.length) {
      state.style.display = 'block';
      state.textContent = 'Sin resultados para "' + q + '"';
    }
    count.textContent = cachedMods.length + ' MODS';
    document.getElementById('selBar').style.display = cachedMods.length ? 'flex' : 'none';
    updateSel();
    return;
  }

  state.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = filtered.map((m) => {
    const sel = selected.has(m.filename);
    const type = classify(m.filename);
    const safeFile = escapeHtml(m.filename);
    return `<div class="card ${sel ? 'sel' : ''}">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="cb" data-file="${safeFile}" ${sel ? 'checked' : ''}><h3 style="flex:1">${escapeHtml(m.name)}</h3></label>
        ${badgeHtml(type)}
        <div class="mc-inv"><div class="slot">📦</div><span class="meta">${safeFile}<br>${escapeHtml(m.size)}</span></div>
        <a class="download-mc" href="#" data-download-file="${safeFile}">DESCARGAR</a>
      </div>`;
  }).join('');

  count.textContent = filtered.length + ' / ' + cachedMods.length + ' MODS';
  document.getElementById('selBar').style.display = 'flex';
  updateSel();
}

function toggleSel(f) {
  if (selected.has(f)) selected.delete(f);
  else selected.add(f);
  render();
}

function selectAll(v) {
  const filtered = getFilteredMods();
  if (v) {
    const clientFiltered = filtered.filter((m) => classify(m.filename) !== 'servidor');
    const toAdd = clientFiltered.length ? clientFiltered : filtered;
    toAdd.forEach((m) => selected.add(m.filename));
  } else {
    filtered.forEach((m) => selected.delete(m.filename));
  }
  render();
}

function updateSel() {
  const n = selected.size;
  const sn = document.getElementById('selNum');
  if (sn) sn.textContent = n;
  const dn = document.getElementById('dlNum');
  if (dn) dn.textContent = n;
  document.getElementById('dlSelBtn').style.display = n ? 'flex' : 'none';

  const det = document.getElementById('selDetail');
  if (!det) return;
  if (n > 0) {
    const obl = [...selected].filter((f) => classify(f) === 'obligatorio').length;
    const opt = [...selected].filter((f) => classify(f) === 'opcional').length;
    det.textContent = (obl || opt) ? `(${obl} oblig + ${opt} opc)` : '';
  } else {
    det.textContent = '';
  }
}

async function ensureWritePermission() {
  if (!dirHandle) return false;
  const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') {
    alert('No se otorgaron permisos de escritura en la carpeta.');
    return false;
  }
  return true;
}

async function writeBlobToDir(filename, blob) {
  try { await dirHandle.removeEntry(filename); } catch (e) {}
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  await writable.write(blob);
  await writable.close();
  await new Promise((resolve) => setTimeout(resolve, 100));
}

function triggerBrowserDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function fetchModBlob(filename, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`/api/download-mod?file=${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 350));
    }
  }
}

async function guardarModEnDisco(handle, mod) {
  const blob = await fetchModBlob(mod.filename, 0);
  dirHandle = handle;
  await writeBlobToDir(mod.filename, blob);
}

async function saveModWithRetry(filename) {
  try {
    const blob = await fetchModBlob(filename, 1);
    await writeBlobToDir(filename, blob);
  } catch (err) {
    console.warn(`Reintentando ${filename} por bloqueo de disco...`);
    await new Promise((r) => setTimeout(r, 300));
    const blob = await fetchModBlob(filename, 0);
    await writeBlobToDir(filename, blob);
  }
}

async function downloadSelected() {
  const list = [...selected];
  if (!list.length) return alert('Selecciona al menos 1 mod');

  if (dirHandle) {
    if (!(await ensureWritePermission())) return;
    const prog = document.getElementById('progress');
    prog.style.display = 'block';
    const modsAInstalar = list.map((fn) => cachedMods.find((m) => m.filename === fn)).filter(Boolean);
    for (let i = 0; i < modsAInstalar.length; i++) {
      const mod = modsAInstalar[i];
      prog.textContent = `Instalando ${i + 1}/${modsAInstalar.length}: ${mod.name}...`;
      try {
        await saveModWithRetry(mod.filename);
      } catch (retryErr) {
        console.error(`Error definitivo con ${mod.filename}:`, retryErr);
      }
    }
    prog.textContent = '¡Todos los mods se guardaron correctamente en la carpeta! ✓';
    setTimeout(() => { prog.style.display = 'none'; }, 3500);
    return;
  }

  if (!confirm('Descargar ' + list.length + ' mods?')) return;
  for (const f of list) {
    triggerBrowserDownload('/api/download-mod?file=' + encodeURIComponent(f), f);
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function loadMods() {
  const state = document.getElementById('state');
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  state.style.display = 'block';
  state.textContent = 'Cargando mods...';
  state.className = 'state';
  grid.style.display = 'none';
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/mods');
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(j.error || j.details || res.statusText);
    }
    const mods = await res.json();
    cachedMods = Array.isArray(mods) ? mods : [];
    selected.clear();
    if (!cachedMods.length) {
      state.textContent = 'No hay mods instalados';
      count.textContent = '';
      const zb = document.getElementById('zipBtn');
      if (zb) zb.style.display = 'none';
      document.getElementById('selBar').style.display = 'none';
      return;
    }
    const zb2 = document.getElementById('zipBtn');
    if (zb2) zb2.style.display = '';
    const sel = document.getElementById('sortSelect');
    if (sel) sel.value = sortMode;
    render();
  } catch (e) {
    state.textContent = 'Error: ' + e.message;
    state.className = 'state error';
    count.textContent = '';
  }
}

async function pickFolder() {
  if (!window.showDirectoryPicker) {
    alert('Tu navegador no soporta elegir carpeta (usa Chrome/Edge). Se usara Descargas.');
    return;
  }
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const el = document.getElementById('folderName');
    el.textContent = '📁 ' + dirHandle.name;
    el.style.display = 'block';
    el.style.color = '#2d631d';
    const btn = document.getElementById('pickFolderBtn');
    if (btn) {
      btn.textContent = '✓ CARPETA LISTA';
      btn.classList.add('green');
    }
    const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      dirHandle = null;
      if (btn) {
        btn.textContent = '📁 CARPETA';
        btn.classList.remove('green');
      }
      el.style.display = 'none';
    }
  } catch (e) {
    if (e.name !== 'AbortError') alert(e.message);
  }
}

async function downloadOne(filename) {
  if (dirHandle) {
    if (!(await ensureWritePermission())) return;
    const prog = document.getElementById('progress');
    prog.style.display = 'block';
    prog.textContent = 'Instalando en tu carpeta de Minecraft: ' + filename + '...';
    try {
      await saveModWithRetry(filename);
      prog.textContent = '¡Mod instalado en ' + dirHandle.name + '/' + filename + ' ✓';
      setTimeout(() => { prog.style.display = 'none'; }, 2500);
    } catch (e) {
      prog.textContent = 'Error: ' + e.message;
      setTimeout(() => { prog.style.display = 'none'; }, 2500);
    }
    return;
  }
  triggerBrowserDownload('/api/download-mod?file=' + encodeURIComponent(filename), filename);
}

function cancelZip() {
  zipCancelled = true;
  document.getElementById('zipModal').classList.remove('active');
}

function getTargetZipMods() {
  return selected.size
    ? [...selected].map((fn) => cachedMods.find((m) => m.filename === fn)).filter(Boolean)
    : getClientMods();
}

async function downloadZipServer() {
  const prog = document.getElementById('progress');
  const btn = document.getElementById('zipBtn');
  const orig = btn ? btn.textContent : '';
  if (btn) btn.textContent = '📦 Generando...';
  prog.style.display = 'block';
  prog.textContent = 'Generando archivo en el servidor...';

  try {
    if (dirHandle && !(await ensureWritePermission())) return;

    const modsSeleccionados = getTargetZipMods();
    if (dirHandle) prog.textContent = 'Generando ZIP en el servidor...';

    const res = await fetch('/api/download-all-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: modsSeleccionados.map((m) => m.filename) })
    });
    if (!res.ok) {
      const j = await res.json().catch(async () => ({ error: await res.text() }));
      throw new Error(j.error || j.details || JSON.stringify(j));
    }

    const blob = await res.blob();
    if (dirHandle) {
      await writeBlobToDir('mods.zip', blob);
      prog.textContent = '¡ZIP guardado en ' + dirHandle.name + '/mods.zip ✓';
      setTimeout(() => { prog.style.display = 'none'; }, 3500);
      return;
    }

    const url = URL.createObjectURL(blob);
    triggerBrowserDownload(url, 'mods.zip');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    prog.textContent = '✓ ZIP descargado';
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes('Failed to fetch')) {
      prog.textContent = 'Servidor saturado, generando ZIP local...';
      await downloadZipClientFallback();
      return;
    }
    prog.textContent = 'Error: ' + msg;
    alert('Error ZIP: ' + msg);
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.textContent = orig;
        if (prog.textContent.startsWith('✓')) prog.style.display = 'none';
      }, 3000);
    }
  }
}

async function downloadZipClientFallback(listOverride = null) {
  const list = listOverride || getTargetZipMods();
  if (!list.length) return;

  zipCancelled = false;
  const modal = document.getElementById('zipModal');
  const status = document.getElementById('zipStatus');
  const fill = document.getElementById('zipFill');
  const pct = document.getElementById('zipPct');

  modal.classList.add('active');
  status.textContent = 'Servidor ocupado, generando ZIP local...';
  fill.style.width = '0%';
  pct.textContent = '0%';

  const zip = new JSZip();
  let done = 0;
  let idx = 0;
  const total = list.length;
  const queue = [...list];

  async function worker() {
    while (queue.length && !zipCancelled) {
      const mod = queue.shift();
      const cur = ++idx;
      status.textContent = 'Descargando ' + mod.filename + ' (' + cur + '/' + total + ')';
      try {
        const b = await fetchModBlob(mod.filename, 1);
        zip.file(mod.filename, b);
      } catch (e) {
        console.warn('skip', mod.filename, e);
      }
      done++;
      const p = Math.round((done / total) * 85);
      fill.style.width = p + '%';
      pct.textContent = p + '%';
    }
  }

  await Promise.all(Array(Math.min(4, total)).fill(0).map(() => worker()));
  if (zipCancelled) {
    status.textContent = 'Cancelado';
    fill.style.width = '0%';
    return;
  }

  status.textContent = 'Comprimiendo...';
  pct.textContent = '90%';
  fill.style.width = '90%';

  try {
    const content = await zip.generateAsync({ type: 'blob', compression: 'STORE', mimeType: 'application/zip' });
    const blob = new Blob([content], { type: 'application/zip' });
    if (dirHandle) {
      await writeBlobToDir('mods.zip', blob);
      status.textContent = '¡ZIP en ' + dirHandle.name + '/mods.zip ✓';
    } else {
      const url = URL.createObjectURL(blob);
      triggerBrowserDownload(url, 'mods-servidor.zip');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      status.textContent = '✓ ZIP local listo';
    }
    fill.style.width = '100%';
    pct.textContent = '100%';
    setTimeout(() => modal.classList.remove('active'), 1500);
  } catch (e) {
    status.textContent = 'Error: ' + e.message;
    alert('Error comprimiendo: ' + e.message);
  }
}

const downloadAllSequential = downloadZipServer;
const downloadZip = downloadZipServer;

const MC_IP = 'sv21.minehost.pro:25476';
const MC_API = 'https://api.mcsrvstat.us/3/' + MC_IP;

async function refreshMc() {
  const dot = document.getElementById('mc-dot');
  const st = document.getElementById('mc-status');
  const pl = document.getElementById('mc-players');
  if (!dot) return;
  try {
    const r = await fetch(MC_API);
    const j = await r.json();
    if (j.online) {
      dot.className = 'mc-dot online';
      st.textContent = '🟢 En línea';
      const o = j.players?.online ?? 0;
      const m = j.players?.max ?? '?';
      pl.textContent = o + ' / ' + m + ' jugadores';
    } else {
      dot.className = 'mc-dot offline';
      st.textContent = '🔴 Servidor desconectado';
      pl.textContent = '';
    }
  } catch (e) {
    dot.className = 'mc-dot offline';
    st.textContent = '🔴 Servidor desconectado';
    pl.textContent = '';
  }
}

function copyMcIp() {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(MC_IP).then(() => {
    const b = document.getElementById('mc-copy');
    const prev = b.textContent;
    b.textContent = '¡COPIADO! ✓';
    setTimeout(() => { b.textContent = prev; }, 2000);
  }).catch(() => {});
}

(function initModsPage() {
  const grid = document.getElementById('grid');
  if (grid) {
    grid.addEventListener('change', (e) => {
      const cb = e.target.closest('input.cb[data-file]');
      if (cb) toggleSel(cb.dataset.file);
    });
    grid.addEventListener('click', (e) => {
      const link = e.target.closest('a.download-mc[data-download-file]');
      if (link) {
        e.preventDefault();
        downloadOne(link.dataset.downloadFile);
      }
    });
  }
  const s = document.getElementById('sortSelect');
  if (s) s.value = sortMode;
  refreshMc();
  setInterval(refreshMc, 60000);
  loadMods();
})();
