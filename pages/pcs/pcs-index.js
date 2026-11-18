/**
 * Renderizado del podio y tabla comparativa de PCs a partir de PCS_DATA.
 */
(function () {
  const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const CARD_CLASS = { 1: 'card first', 2: 'card second', 3: 'card third' };
  const TIER_CLASS = { 1: 'tier s', 2: 'tier a', 3: 'tier c' };

  function getPcHref(pc) {
    return pc.page || `pc.html?id=${encodeURIComponent(pc.id)}`;
  }

  function renderPodium(sorted) {
    // Orden visual del podio en desktop: #2, #1, #3
    const order = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
    const podium = document.getElementById('podium');
    if (!podium) return;

    order.forEach((pc) => {
      const a = document.createElement('a');
      a.className = CARD_CLASS[pc.rank] || 'card';
      a.href = getPcHref(pc);
      a.innerHTML = `
        <div class="medal">${MEDALS[pc.rank] || `#${pc.rank}`}</div>
        <div class="avatar">${pc.avatarEmoji}</div>
        <h2>${pc.nombre}</h2>
        <div class="tag">${pc.tag} · ${pc.fecha}</div>
        <div class="${TIER_CLASS[pc.rank] || 'tier s'}">#${pc.rank} · ${pc.tier}</div>
        <div class="specs-mini">
          <div><b>⚙️ ${pc.cpu.nombre}</b><br><span>${pc.cpu.detalle}</span></div>
          <div><b>🧠 RAM ${pc.ram.cantidad}</b> <span>· ${pc.ram.detalle}</span></div>
          <div><b>🎮 GPU ${pc.gpu.cantidad}</b> <span>· ${pc.gpu.nombre}</span></div>
          <div><b>💾 ${pc.almacenamiento.cantidad}</b> <span>· ${pc.almacenamiento.detalle}</span></div>
        </div>
        <div class="scorebar"><i style="width:${pc.score}%"></i></div>
        <div class="score-label"><span>Puntaje</span><span><b>${pc.score}/100</b></span></div>
        <div class="ver">Ver página dedicada →</div>`;
      podium.appendChild(a);
    });
  }

  function renderTable(sorted) {
    const tbody = document.getElementById('tbody');
    if (!tbody) return;

    sorted.forEach((pc) => {
      const tr = document.createElement('tr');
      tr.className = 'rowlink';
      tr.onclick = () => {
        window.location.href = getPcHref(pc);
      };
      tr.innerHTML = `<td><span class="rankbadge r${pc.rank}">#${pc.rank}</span></td>
        <td><b>${pc.avatarEmoji} ${pc.nombre}</b><br><span style="opacity:.6;font-size:12px">${pc.tag}</span></td>
        <td style="max-width:220px">${pc.cpu.nombre}</td>
        <td>${pc.ram.cantidad}</td><td>${pc.gpu.cantidad}<br><span style="opacity:.6;font-size:12px">${pc.gpu.nombre}</span></td>
        <td>${pc.almacenamiento.cantidad}</td><td><b>${pc.score}</b>/100</td>`;
      tbody.appendChild(tr);
    });
  }

  function initPcsIndex() {
    if (typeof PCS_DATA === 'undefined' || !Array.isArray(PCS_DATA)) return;
    const sorted = [...PCS_DATA].sort((a, b) => a.rank - b.rank);
    const countEl = document.getElementById('count');
    if (countEl) {
      countEl.textContent = `${sorted.length} máquinas registradas · actualizado 28/9/2026`;
    }
    renderPodium(sorted);
    renderTable(sorted);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPcsIndex);
  } else {
    initPcsIndex();
  }
})();
