/**
 * Renderizado dinámico de la página del equipo T2 a partir de T2_DATA (pages/t2/t2-data.js).
 */
(function () {
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTeamHeader(d) {
    document.getElementById('t-name').textContent = d.team.name;
    document.getElementById('t-region').textContent = `${d.team.region} · ${d.team.tag}`;
    document.getElementById('t-temp').textContent = d.team.temporada;
    document.getElementById('t-lema').textContent = `“${d.team.lema}”`;
    document.getElementById('t-desc').textContent = d.team.descripcion;
  }

  function renderTeamStats(d) {
    const tot = d.team.wins + d.team.losses;
    const wr = tot ? Math.round((d.team.wins / tot) * 100) + '%' : '—';
    let k = 0;
    let dd = 0;
    let a = 0;
    d.players.forEach((p) => {
      k += p.kills;
      dd += p.deaths;
      a += p.assists;
    });
    const teamKda = dd ? ((k + a) / dd).toFixed(2) : '—';

    const items = [
      [`${d.team.wins}W - ${d.team.losses}L`, 'Récord'],
      [wr, 'Winrate'],
      [teamKda, 'KDA equipo'],
      [d.team.racha, 'Racha'],
      [String(d.players.length), 'Jugadores'],
      [d.team.ranking, 'Ranking']
    ];

    document.getElementById('team-stats').innerHTML = items
      .map(([val, label]) => `<div class="stat-card"><b>${escapeHtml(val)}</b><span>${escapeHtml(label)}</span></div>`)
      .join('');
  }

  function formatPlayerMetrics(p) {
    const g = (p.wins + p.losses) || p.games;
    const pwr = g ? Math.round((p.wins / g) * 100) + '%' : '—';
    const kda = p.deaths ? ((p.kills + p.assists) / p.deaths).toFixed(2) : '—';
    const cs = p.csProm ? p.csProm : '—';
    const vis = p.visionProm ? p.visionProm : '—';
    return { g, pwr, kda, cs, vis };
  }

  function renderRoster(d) {
    document.getElementById('roster').innerHTML = d.players.map((p) => {
      const { g, pwr, kda, cs, vis } = formatPlayerMetrics(p);
      const mainsHtml = p.mains.map((m) => `<span class="main">${escapeHtml(m)}</span>`).join('');
      const opggHtml = p.opgg
        ? `<a class="opgg" href="${escapeHtml(p.opgg)}" target="_blank" rel="noopener noreferrer">op.gg ↗</a>`
        : '<span class="opgg empty">op.gg —</span>';

      return `<div class="pcard"><div class="prole">${escapeHtml(p.role)}</div><div class="pbody">` +
        `<div class="sum">${escapeHtml(p.summoner)}</div><div class="real">${escapeHtml(p.realName)}</div>` +
        `<div class="prank">${escapeHtml(p.rank)} · ${escapeHtml(p.lp)}</div>` +
        `<div class="mains">${mainsHtml}</div>` +
        `<div class="pkda">KDA <b>${kda}</b> · ${p.kills}/${p.deaths}/${p.assists}</div></div>` +
        `<div class="pfooter"><div><b>${g}</b><span>PJ</span></div><div><b>${pwr}</b><span>WR</span></div><div><b>${cs}</b><span>CS</span></div><div><b>${vis}</b><span>Vis</span></div></div>` +
        `${opggHtml}</div>`;
    }).join('');
  }

  function renderStatsTable(d) {
    document.getElementById('stats-table').innerHTML = d.players.map((p) => {
      const { g, pwr, kda, cs, vis } = formatPlayerMetrics(p);
      return `<tr><td style="text-align:left;font-weight:700">${escapeHtml(p.summoner)}</td>` +
        `<td>${escapeHtml(p.role)}</td><td>${g}</td><td>${p.wins}-${p.losses}</td>` +
        `<td>${pwr}</td><td><b>${kda}</b></td><td>${p.kills} / ${p.deaths} / ${p.assists}</td>` +
        `<td>${cs}</td><td>${vis}</td></tr>`;
    }).join('');
  }

  function renderChamps(d) {
    document.getElementById('champs').innerHTML = d.champs.length
      ? d.champs.map((c) => {
        const cwr = c.games ? Math.round((c.wins / c.games) * 100) + '%' : '—';
        return `<div class="champ"><b>${escapeHtml(c.name)}</b> · ${c.games} PJ · ${cwr} WR · KDA ${escapeHtml(c.kda)}</div>`;
      }).join('')
      : '<div class="empty-box">Sin datos aún — pasame los picks y los cargo.</div>';
  }

  function renderMatches(d) {
    document.getElementById('matches').innerHTML = d.matches.length
      ? d.matches.map((m) => {
        const win = m.resultado === 'W';
        const picksHtml = m.picks
          ? `<span class="meta" style="width:100%">Picks: ${escapeHtml(m.picks)}</span>`
          : '';
        return `<div class="match ${win ? 'win' : 'loss'}"><span class="badge">${win ? 'VICTORIA' : 'DERROTA'}</span>` +
          `<span class="vs">T2 vs ${escapeHtml(m.vs)}</span>` +
          `<span class="meta">${escapeHtml(m.marcador)} · ${escapeHtml(m.duracion)} · ${escapeHtml(m.torneo)} · ${escapeHtml(m.fecha)}</span>` +
          `<span class="meta">MVP: <b style="color:#c8aa6e">${escapeHtml(m.mvp)}</b></span>${picksHtml}</div>`;
      }).join('')
      : '<div class="empty-box">Sin partidas cargadas — pasame fecha, rival, resultado y MVP.</div>';
  }

  function initT2Page() {
    if (typeof T2_DATA === 'undefined') return;
    renderTeamHeader(T2_DATA);
    renderTeamStats(T2_DATA);
    renderRoster(T2_DATA);
    renderStatsTable(T2_DATA);
    renderChamps(T2_DATA);
    renderMatches(T2_DATA);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initT2Page);
  } else {
    initT2Page();
  }
})();
