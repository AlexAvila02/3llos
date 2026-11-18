/**
 * Renderizador dinámico de la ficha de detalle de una PC a partir de PCS_DATA.
 * Lee el identificador desde `data-pc-id` en <body> o desde `?id=...` en la URL.
 */
(function () {
  const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getPcHref(pc) {
    return pc.page || `pc.html?id=${encodeURIComponent(pc.id)}`;
  }

  function renderPcDetail() {
    if (typeof PCS_DATA === 'undefined' || !Array.isArray(PCS_DATA) || !PCS_DATA.length) return;

    const sorted = [...PCS_DATA].sort((a, b) => a.rank - b.rank);
    const params = new URLSearchParams(window.location.search);
    const targetId = document.body.dataset.pcId || params.get('id') || sorted[0].id;
    const idx = sorted.findIndex((p) => p.id === targetId);
    const pc = idx >= 0 ? sorted[idx] : sorted[0];
    const currentIndex = idx >= 0 ? idx : 0;

    // Aplicar variables de color del miembro
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--c', pc.color || '#667eea');
    rootStyle.setProperty('--c2', pc.color2 || '#312e81');
    rootStyle.setProperty('--bar-mid', pc.barMidColor || pc.color2 || '#c7d2fe');
    if (pc.specBg) rootStyle.setProperty('--spec-bg', pc.specBg);

    document.title = `${pc.nombre} — PC #${pc.rank} · Papu Banda`;

    const medal = MEDALS[pc.rank] || `#${pc.rank}`;
    const prevPc = currentIndex > 0 ? sorted[currentIndex - 1] : null;
    const nextPc = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

    // Enlaces de navegación superior: mantiene enlaces directos a otros puestos
    const topbarLinks = [
      '<a href="../../index.html">← Inicio</a>',
      '<a href="index.html">🏆 Top PCs</a>'
    ];
    sorted.forEach((other) => {
      if (other.id !== pc.id) {
        const arrow = other.rank < pc.rank ? '← ' : '';
        const tail = other.rank > pc.rank ? ' →' : '';
        topbarLinks.push(`<a href="${escapeHtml(getPcHref(other))}">${arrow}#${other.rank} ${escapeHtml(other.nombre)}${tail}</a>`);
      }
    });

    const tierInlineStyle = pc.tierStyle
      ? `style="background:${pc.tierStyle.bg};border-color:${pc.tierStyle.border};color:${pc.tierStyle.color}"`
      : '';

    const pct = (pts, max) => Math.max(0, Math.min(100, Math.round((pts / max) * 100)));

    const barsData = [
      { label: pc.cpu.shortLabel || `CPU — ${pc.cpu.nombre}`, pts: pc.cpu.puntos, max: 40 },
      { label: pc.ram.shortLabel || `RAM — ${pc.ram.cantidad}`, pts: pc.ram.puntos, max: 25 },
      { label: pc.gpu.shortLabel || `GPU — ${pc.gpu.cantidad}`, pts: pc.gpu.puntos, max: 25 },
      { label: pc.almacenamiento.shortLabel || `Disco — ${pc.almacenamiento.cantidad}`, pts: pc.almacenamiento.puntos, max: 10 }
    ];

    const vsHtml = Array.isArray(pc.vs) && pc.vs.length
      ? `<div class="vs">${pc.vs.map((v) => `<b>${escapeHtml(v.label)}</b> ${escapeHtml(v.texto)}`).join('<br>')}</div>`
      : '';

    const loveHtml = pc.love ? `<div class="love">${pc.love}</div>` : '';

    const bottomNav = ['<a href="index.html">🏆 Volver al Top</a>'];
    if (prevPc) bottomNav.push(`<a href="${escapeHtml(getPcHref(prevPc))}">← Ver #${prevPc.rank} ${escapeHtml(prevPc.nombre)}</a>`);
    if (nextPc) bottomNav.push(`<a href="${escapeHtml(getPcHref(nextPc))}">Ver #${nextPc.rank} ${escapeHtml(nextPc.nombre)} →</a>`);
    if (pc.showHomeHot) bottomNav.push('<a class="hot" href="../../index.html">← Papubanda</a>');

    document.body.innerHTML = `
      <div class="bg"></div>
      <div class="topbar">${topbarLinks.join('')}</div>
      <div class="wrap">
        <div class="hero">
          <div class="rank rank-${pc.rank}">${medal} PUESTO #${pc.rank} · SCORE ${pc.score}/100</div>
          <div class="avatar">${escapeHtml(pc.avatarEmoji)}</div>
          <h1><span>${escapeHtml(pc.nombre)}</span></h1>
          <div class="meta">${escapeHtml(pc.tag)} · ${escapeHtml(pc.fecha)}${pc.subtitulo ? ` · ${escapeHtml(pc.subtitulo)}` : ''}</div>
          <div class="tier" ${tierInlineStyle}>${escapeHtml(pc.tier)}</div>
          <div class="frase">“${escapeHtml(pc.frase)}”</div>
        </div>

        <div class="score-big rank-${pc.rank}"><b>${pc.score}/100</b>puntaje total del equipo</div>

        <div class="grid4">
          <div class="spec"><small>⚙️ Procesador</small><div class="big">${escapeHtml(pc.cpu.nombre)}</div><div class="det">${escapeHtml(pc.cpu.detalle)}</div></div>
          <div class="spec"><small>🧠 RAM instalada</small><div class="big">${escapeHtml(pc.ram.cantidad)}</div><div class="det">${escapeHtml(pc.ram.detalle)}</div></div>
          <div class="spec${pc.gpu.alert ? ' alert' : ''}"><small>🎮 Tarjeta gráfica</small><div class="big">${escapeHtml(pc.gpu.cantidad)} — ${escapeHtml(pc.gpu.nombre)}</div><div class="det">${escapeHtml(pc.gpu.detalle)}</div></div>
          <div class="spec"><small>💾 Almacenamiento</small><div class="big">${escapeHtml(pc.almacenamiento.cantidad)}</div><div class="det">${escapeHtml(pc.almacenamiento.detalle)}</div></div>
        </div>

        <div class="bars">
          <h3>📈 Desglose de potencia</h3>
          ${barsData.map((b) => `
            <div class="bar">
              <div class="lbl"><span>${escapeHtml(b.label)}</span><b>${b.pts}/${b.max}</b></div>
              <div class="track"><div class="fill" style="width:${pct(b.pts, b.max)}%"></div></div>
            </div>`).join('')}
        </div>

        ${vsHtml}

        <div class="cols">
          <div class="pros"><b>✅ Puntos fuertes</b><br>${pc.pros.map((p) => `✔ ${escapeHtml(p)}`).join('<br>')}</div>
          <div class="contras"><b>⚠️ A mejorar</b><br>${pc.contras.map((c) => `✘ ${escapeHtml(c)}`).join('<br>')}</div>
        </div>

        ${loveHtml}

        <div class="verdict"><b>🎙️ Veredicto de la Papu Banda:</b><br>${escapeHtml(pc.veredicto)}</div>

        <div class="nav">${bottomNav.join('')}</div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPcDetail);
  } else {
    renderPcDetail();
  }
})();
