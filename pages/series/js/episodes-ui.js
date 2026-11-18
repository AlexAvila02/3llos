/**
 * Renderizado de estadísticas KPI, pestañas de series/temporadas y lista de capítulos.
 */
(function (global) {
  const model = global.SeriesTracker.model;

  /**
   * Actualiza las tarjetas KPI y la cabecera del gráfico.
   */
  function renderStats(ctx, stats, series, activeSeason) {
    const { el, state } = ctx;
    const isSeriesScope = state.chartScope === 'series';

    el.statSeasonAvg.textContent = stats.seasonAvg !== null ? stats.seasonAvg.toFixed(2) : '—';
    el.statSeasonAvgSub.textContent = `${stats.seasonRated.length} / ${stats.seasonTotalEpisodes} caps en Temp ${activeSeason.number}`;

    el.statSeriesAvg.textContent = stats.seriesAvg !== null ? stats.seriesAvg.toFixed(2) : '—';
    el.statSeriesAvgSub.textContent = `${stats.allRated.length} / ${stats.totalSeriesEpisodes} caps en ${series.seasons.length} temp.`;

    if (stats.maxScore !== null) {
      el.statMaxEp.textContent = model.formatScore(stats.maxScore);
      el.statMaxEpSub.textContent = model.formatExtremumLabels(stats.maxEpisodes, isSeriesScope || series.seasons.length > 1);
    } else {
      el.statMaxEp.textContent = '—';
      el.statMaxEpSub.textContent = 'Sin puntuaciones';
    }

    if (stats.minScore !== null) {
      el.statMinEp.textContent = model.formatScore(stats.minScore);
      el.statMinEpSub.textContent = model.formatExtremumLabels(stats.minEpisodes, isSeriesScope || series.seasons.length > 1);
    } else {
      el.statMinEp.textContent = '—';
      el.statMinEpSub.textContent = 'Sin puntuaciones';
    }

    const done = stats.scopeRated.length;
    const total = stats.scopeTotalEpisodes;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    el.statProgress.textContent = `${done} / ${total}`;
    el.statProgressBar.style.width = `${pct}%`;
    el.statProgressSub.textContent = `${pct}% · ${isSeriesScope ? 'Toda la serie' : `Temporada ${activeSeason.number}`}`;

    el.chartSubtitle.textContent = isSeriesScope
      ? `Evolución completa de la serie (${stats.allRated.length} capítulos puntuados)`
      : `Temporada ${activeSeason.number} · evolución capítulo a capítulo (0 a 10)`;

    const showSeasonAvg = stats.seasonAvg !== null && !isSeriesScope;
    const showSeriesAvg = stats.seriesAvg !== null && (series.seasons.length > 1 || isSeriesScope);
    if (el.legendSeasonAvgItem) {
      el.legendSeasonAvgItem.style.display = showSeasonAvg ? 'inline-flex' : 'none';
    }
    if (el.legendSeriesAvgItem) {
      el.legendSeriesAvgItem.style.display = showSeriesAvg ? 'inline-flex' : 'none';
    }
  }

  /**
   * Renderiza las pestañas de series y temporadas.
   */
  function renderSeriesAndSeasons(ctx, series, activeSeason) {
    const { el, state } = ctx;

    el.seriesTabs.innerHTML = '';
    state.seriesList.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-btn series-tab-btn${item.id === series.id ? ' active' : ''}`;
      btn.textContent = item.title.trim() || 'Serie sin título';
      btn.addEventListener('click', () => {
        if (state.activeSeriesId !== item.id) {
          ctx.playUiPop();
          state.activeSeriesId = item.id;
          ctx.hoveredPointIndex = -1;
          if (!ctx.isReadOnly()) ctx.saveState();
          ctx.renderAll();
        }
      });
      el.seriesTabs.appendChild(btn);
    });

    if (el.seriesTitleInput.value !== series.title && document.activeElement !== el.seriesTitleInput) {
      el.seriesTitleInput.value = series.title;
    }

    el.deleteSeriesBtn.disabled = state.seriesList.length <= 1;

    el.seasonTabs.innerHTML = '';
    series.seasons.forEach((sea) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-btn${sea.id === activeSeason.id ? ' active' : ''}`;
      btn.textContent = `Temporada ${sea.number}`;
      btn.addEventListener('click', () => {
        if (series.activeSeasonId !== sea.id) {
          ctx.playUiPop();
          series.activeSeasonId = sea.id;
          ctx.hoveredPointIndex = -1;
          if (!ctx.isReadOnly()) ctx.saveState();
          ctx.renderAll();
        }
      });
      el.seasonTabs.appendChild(btn);
    });

    el.deleteSeasonBtn.disabled = series.seasons.length <= 1;

    el.scopeSeasonBtn.classList.toggle('active', state.chartScope === 'season');
    el.scopeSeriesBtn.classList.toggle('active', state.chartScope === 'series');
  }

  /**
   * Actualiza los estilos y badges de las filas de capítulos existentes sin recrear el DOM.
   */
  function syncEpisodeRowsVisualState(ctx, stats, activeSeason) {
    const { el } = ctx;
    const hasDistinctExtremes = stats.maxScore !== null && stats.minScore !== null && stats.maxScore > stats.minScore;
    const rows = el.episodesList.querySelectorAll('.episode-row');

    rows.forEach((row) => {
      const epId = row.dataset.episodeId;
      const ep = activeSeason.episodes.find((item) => item.id === epId);
      if (!ep) return;

      const rated = model.isRated(ep.score);
      const isMax = rated && hasDistinctExtremes && ep.score === stats.maxScore;
      const isMin = rated && hasDistinctExtremes && ep.score === stats.minScore;

      row.classList.toggle('is-max', isMax);
      row.classList.toggle('is-min', isMin);

      const extremumBadge = row.querySelector('.ep-extremum-badge');
      if (extremumBadge) {
        if (isMax) {
          extremumBadge.className = 'ep-extremum-badge max';
          extremumBadge.textContent = '🏆 MÁX';
          extremumBadge.hidden = false;
        } else if (isMin) {
          extremumBadge.className = 'ep-extremum-badge min';
          extremumBadge.textContent = '📉 MÍN';
          extremumBadge.hidden = false;
        } else {
          extremumBadge.hidden = true;
        }
      }

      const scorePill = row.querySelector('.score-pill');
      if (scorePill) {
        scorePill.className = `score-pill ${model.getScoreColorClass(ep.score)}`;
        scorePill.textContent = rated ? model.formatScore(ep.score) : 'Sin ver';
      }

      const clearBtn = row.querySelector('.btn-clear-ep');
      if (clearBtn) {
        clearBtn.disabled = !rated;
      }

      const quickBtns = row.querySelectorAll('.quick-score-btn');
      quickBtns.forEach((qBtn) => {
        const val = Number(qBtn.dataset.score);
        const isExact = rated && ep.score === val;
        const isBase = rated && !isExact && Math.floor(ep.score) === val;
        qBtn.classList.toggle('active', isExact);
        qBtn.classList.toggle('active-base', isBase);
      });
    });
  }

  /**
   * Crea el elemento DOM de una fila de capítulo (solo lectura o editable según permisos).
   */
  function createEpisodeRow(ctx, ep) {
    const { state } = ctx;
    const ro = ctx.isReadOnly();
    const row = document.createElement('div');
    row.className = 'episode-row';
    row.dataset.episodeId = ep.id;

    // Columna 1: Información del capítulo
    const infoCol = document.createElement('div');
    infoCol.className = 'episode-info';

    const head = document.createElement('div');
    head.className = 'episode-head';

    const numBadge = document.createElement('span');
    numBadge.className = 'ep-number-badge';
    numBadge.textContent = `Cap ${ep.number}`;

    const extremumBadge = document.createElement('span');
    extremumBadge.className = 'ep-extremum-badge';
    extremumBadge.hidden = true;

    head.appendChild(numBadge);
    head.appendChild(extremumBadge);
    infoCol.appendChild(head);

    if (ro) {
      if (ep.title && ep.title.trim()) {
        const titleReadonly = document.createElement('p');
        titleReadonly.className = 'ep-title-readonly';
        titleReadonly.textContent = ep.title.trim();
        infoCol.appendChild(titleReadonly);
      }

      const actionsCol = document.createElement('div');
      actionsCol.className = 'episode-actions';

      const scorePill = document.createElement('span');
      scorePill.className = 'score-pill';
      actionsCol.appendChild(scorePill);

      row.appendChild(infoCol);
      row.appendChild(actionsCol);
      return row;
    }

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'ep-title-input';
    titleInput.placeholder = 'Título o comentario del cap (opcional)';
    titleInput.maxLength = 100;
    titleInput.value = ep.title || '';
    titleInput.addEventListener('input', (e) => {
      if (ctx.isReadOnly()) return;
      ep.title = e.target.value;
      ctx.saveState();
    });
    infoCol.appendChild(titleInput);

    // Columna 2: Controles de puntuación 0-10
    const ratingCol = document.createElement('div');
    ratingCol.className = 'episode-rating-controls';

    const quickBtnsWrap = document.createElement('div');
    quickBtnsWrap.className = 'quick-score-buttons';

    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.className = 'ep-range';
    rangeInput.min = '0';
    rangeInput.max = '10';
    rangeInput.step = '0.1';
    rangeInput.value = model.isRated(ep.score) ? String(ep.score) : '0';
    rangeInput.setAttribute('aria-label', `Deslizador de puntuación capítulo ${ep.number}`);

    const numberInput = document.createElement('input');
    numberInput.type = 'text';
    numberInput.inputMode = 'decimal';
    numberInput.className = 'ep-number-input';
    numberInput.placeholder = 'Ej: 8.5';
    numberInput.maxLength = 5;
    numberInput.value = model.isRated(ep.score) ? String(ep.score) : '';
    numberInput.setAttribute('aria-label', `Puntuación decimal capítulo ${ep.number}`);

    const applyScore = (newScore, source) => {
      if (ctx.isReadOnly()) return;
      ep.score = newScore;
      if (source !== 'range') {
        rangeInput.value = model.isRated(newScore) ? String(newScore) : '0';
      }
      if (source !== 'number') {
        numberInput.value = model.isRated(newScore) ? String(newScore) : '';
      }
      ctx.saveState();
      ctx.refreshAnalyticsAndVisuals();
    };

    for (let val = 0; val <= 10; val += 1) {
      const qBtn = document.createElement('button');
      qBtn.type = 'button';
      qBtn.className = 'quick-score-btn';
      qBtn.dataset.score = String(val);
      qBtn.textContent = String(val);
      qBtn.addEventListener('click', () => {
        if (ctx.isReadOnly()) return;
        ctx.playUiPop();
        applyScore(val, 'quick');
        if (state.episodeFilter === 'unrated') {
          renderEpisodesList(ctx);
        }
      });
      quickBtnsWrap.appendChild(qBtn);
    }

    rangeInput.addEventListener('input', (e) => {
      if (ctx.isReadOnly()) return;
      const val = model.normalizeScore(e.target.value);
      applyScore(val, 'range');
    });

    numberInput.addEventListener('input', (e) => {
      if (ctx.isReadOnly()) return;
      const raw = e.target.value.trim();
      if (raw === '') {
        applyScore(null, 'number');
        return;
      }
      const normalizedText = raw.replace(',', '.');
      if (normalizedText === '.') return;
      const val = model.normalizeScore(normalizedText);
      if (val !== null) {
        applyScore(val, 'number');
      }
    });

    numberInput.addEventListener('blur', () => {
      numberInput.value = model.isRated(ep.score) ? String(ep.score) : '';
      if (state.episodeFilter !== 'all') {
        renderEpisodesList(ctx);
      }
    });

    const decimalGroup = document.createElement('div');
    decimalGroup.className = 'decimal-step-group';
    [-0.5, -0.1, 0.1, 0.5].forEach((delta) => {
      const stepBtn = document.createElement('button');
      stepBtn.type = 'button';
      stepBtn.className = 'decimal-step-btn';
      stepBtn.textContent = delta > 0 ? `+${delta}` : `${delta}`;
      stepBtn.title = `Ajustar nota (${delta > 0 ? `+${delta}` : delta})`;
      stepBtn.addEventListener('click', () => {
        if (ctx.isReadOnly()) return;
        ctx.playUiPop();
        const baseScore = model.isRated(ep.score) ? ep.score : 0;
        const nextScore = model.normalizeScore(baseScore + delta);
        applyScore(nextScore, 'step');
        if (state.episodeFilter === 'unrated') {
          renderEpisodesList(ctx);
        }
      });
      decimalGroup.appendChild(stepBtn);
    });

    const sliderRow = document.createElement('div');
    sliderRow.className = 'slider-number-row';
    sliderRow.appendChild(rangeInput);
    sliderRow.appendChild(decimalGroup);
    sliderRow.appendChild(numberInput);

    ratingCol.appendChild(quickBtnsWrap);
    ratingCol.appendChild(sliderRow);

    // Columna 3: Badge de nota + limpiar + eliminar
    const actionsCol = document.createElement('div');
    actionsCol.className = 'episode-actions';

    const scorePill = document.createElement('span');
    scorePill.className = 'score-pill';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-clear-ep';
    clearBtn.textContent = 'Sin ver';
    clearBtn.title = 'Quitar puntuación';
    clearBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      ctx.playUiPop();
      applyScore(null, 'clear');
      if (state.episodeFilter === 'rated') {
        renderEpisodesList(ctx);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-ep';
    removeBtn.textContent = '×';
    removeBtn.title = 'Eliminar capítulo';
    removeBtn.setAttribute('aria-label', `Eliminar capítulo ${ep.number}`);
    removeBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      const { season } = ctx.getActiveContext();
      season.episodes = season.episodes.filter((item) => item.id !== ep.id);
      season.episodes.forEach((item, idx) => {
        item.number = idx + 1;
      });
      ctx.hoveredPointIndex = -1;
      ctx.saveState();
      ctx.renderAll();
    });

    actionsCol.appendChild(scorePill);
    actionsCol.appendChild(clearBtn);
    actionsCol.appendChild(removeBtn);

    row.appendChild(infoCol);
    row.appendChild(ratingCol);
    row.appendChild(actionsCol);

    return row;
  }

  /**
   * Renderiza la lista de capítulos de la temporada activa aplicando el filtro actual.
   */
  function renderEpisodesList(ctx) {
    const { el, state } = ctx;
    const { series, season } = ctx.getActiveContext();
    const stats = model.computeStats(series, season, state.chartScope);

    el.episodesSectionTitle.textContent = `🎬 Capítulos · Temporada ${season.number}`;
    el.episodesCountBadge.textContent = `${season.episodes.length} ${season.episodes.length === 1 ? 'capítulo' : 'capítulos'}`;

    el.filterBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === state.episodeFilter);
    });

    const filtered = season.episodes.filter((ep) => {
      if (state.episodeFilter === 'rated') return model.isRated(ep.score);
      if (state.episodeFilter === 'unrated') return !model.isRated(ep.score);
      return true;
    });

    el.episodesList.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'episodes-empty';
      empty.textContent = season.episodes.length === 0
        ? (ctx.isReadOnly()
          ? 'Esta temporada aún no tiene capítulos cargados.'
          : 'Esta temporada aún no tiene capítulos. Usa "+ Añadir Capítulo" o el generador rápido.')
        : 'No hay capítulos que coincidan con el filtro seleccionado.';
      el.episodesList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((ep) => {
      fragment.appendChild(createEpisodeRow(ctx, ep));
    });
    el.episodesList.appendChild(fragment);

    syncEpisodeRowsVisualState(ctx, stats, season);
  }

  global.SeriesTracker = global.SeriesTracker || {};
  global.SeriesTracker.episodesUi = {
    renderStats,
    renderSeriesAndSeasons,
    syncEpisodeRowsVisualState,
    createEpisodeRow,
    renderEpisodesList
  };
})(window);
