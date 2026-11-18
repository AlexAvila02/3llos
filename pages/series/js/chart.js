/**
 * Renderizado del gráfico interactivo en <canvas> y tooltip de capítulos.
 */
(function (global) {
  const model = global.SeriesTracker.model;

  /**
   * Dibuja un rectángulo redondeado en el contexto 2D del canvas.
   */
  function drawRoundedRect(canvasCtx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    canvasCtx.beginPath();
    canvasCtx.moveTo(x + radius, y);
    canvasCtx.arcTo(x + w, y, x + w, y + h, radius);
    canvasCtx.arcTo(x + w, y + h, x, y + h, radius);
    canvasCtx.arcTo(x, y + h, x, y, radius);
    canvasCtx.arcTo(x, y, x + w, y, radius);
    canvasCtx.closePath();
  }

  /**
   * Dibuja una insignia flotante junto a un punto destacado del gráfico.
   */
  function drawPointTag(canvasCtx, x, y, text, color, above, canvasWidth) {
    canvasCtx.font = '800 10px system-ui, sans-serif';
    const textW = canvasCtx.measureText(text).width;
    const tagW = textW + 12;
    const tagH = 19;
    const tagX = Math.max(6, Math.min(canvasWidth - tagW - 6, x - tagW / 2));
    const tagY = above ? Math.max(4, y - 32) : y + 14;

    canvasCtx.fillStyle = 'rgba(9, 13, 22, 0.92)';
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 1;
    drawRoundedRect(canvasCtx, tagX, tagY, tagW, tagH, 6);
    canvasCtx.fill();
    canvasCtx.stroke();

    canvasCtx.fillStyle = color;
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(text, tagX + tagW / 2, tagY + tagH / 2 + 0.5);
  }

  /**
   * Renderiza el gráfico de avance en <canvas> con promedio, máximos y mínimos destacados.
   */
  function renderChart(appCtx, stats, series) {
    const { el, state } = appCtx;
    const canvas = el.chartCanvas;
    const container = el.chartContainer;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const canvasCtx = canvas.getContext('2d');
    canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvasCtx.clearRect(0, 0, width, height);

    const data = stats.scopeRated;
    appCtx.chartPoints = [];

    if (data.length === 0) {
      el.chartEmpty.hidden = false;
      el.chartTooltip.hidden = true;
      return;
    }
    el.chartEmpty.hidden = true;

    const isSeriesScope = state.chartScope === 'series';
    const pad = { top: 38, right: 26, bottom: 42, left: 44 };
    const plotW = Math.max(80, width - pad.left - pad.right);
    const plotH = Math.max(80, height - pad.top - pad.bottom);

    const scoreToY = (score) => pad.top + ((10 - score) / 10) * plotH;

    // 1. Grilla horizontal y eje Y (0 a 10)
    canvasCtx.font = '600 11px system-ui, -apple-system, sans-serif';
    canvasCtx.textAlign = 'right';
    canvasCtx.textBaseline = 'middle';

    for (let tick = 0; tick <= 10; tick += 2) {
      const y = scoreToY(tick);
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = tick === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
      canvasCtx.lineWidth = 1;
      canvasCtx.moveTo(pad.left, y);
      canvasCtx.lineTo(width - pad.right, y);
      canvasCtx.stroke();

      canvasCtx.fillStyle = 'rgba(238, 242, 248, 0.5)';
      canvasCtx.fillText(String(tick), pad.left - 10, y);
    }

    const points = data.map((item, idx) => {
      const x = data.length === 1
        ? pad.left + plotW / 2
        : pad.left + (idx / (data.length - 1)) * plotW;
      const y = scoreToY(item.score);
      return { x, y, data: item, idx };
    });

    // 2. Separadores de temporada en vista "Toda la Serie"
    if (isSeriesScope && series.seasons.length > 1) {
      for (let i = 1; i < points.length; i++) {
        if (points[i].data.seasonNumber !== points[i - 1].data.seasonNumber) {
          const sepX = (points[i - 1].x + points[i].x) / 2;
          canvasCtx.save();
          canvasCtx.setLineDash([4, 5]);
          canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          canvasCtx.lineWidth = 1;
          canvasCtx.beginPath();
          canvasCtx.moveTo(sepX, pad.top);
          canvasCtx.lineTo(sepX, pad.top + plotH);
          canvasCtx.stroke();
          canvasCtx.restore();

          canvasCtx.fillStyle = 'rgba(238, 242, 248, 0.45)';
          canvasCtx.font = '700 10px system-ui, sans-serif';
          canvasCtx.textAlign = 'left';
          canvasCtx.fillText(`T${points[i].data.seasonNumber}`, sepX + 5, pad.top + 8);
        }
      }
    }

    // 3. Líneas de promedio
    const avgOverlays = [];
    const drawAvgLine = (avgValue, labelText, color, labelOnLeft) => {
      if (avgValue === null) return;
      const avgY = scoreToY(avgValue);

      canvasCtx.save();
      canvasCtx.setLineDash([6, 6]);
      canvasCtx.strokeStyle = color;
      canvasCtx.lineWidth = 1.8;
      canvasCtx.beginPath();
      canvasCtx.moveTo(pad.left, avgY);
      canvasCtx.lineTo(width - pad.right, avgY);
      canvasCtx.stroke();
      canvasCtx.restore();

      avgOverlays.push({ avgY, labelText, color, labelOnLeft });
    };

    const showSeasonAvgLine = stats.seasonAvg !== null && !isSeriesScope;
    const showSeriesAvgLine = stats.seriesAvg !== null && (isSeriesScope || series.seasons.length > 1);

    if (showSeasonAvgLine) {
      drawAvgLine(stats.seasonAvg, `Prom. Temp: ${stats.seasonAvg.toFixed(2)}`, '#38bdf8', false);
    }
    if (showSeriesAvgLine) {
      const placeLeft = showSeasonAvgLine && Math.abs(stats.seriesAvg - stats.seasonAvg) < 1.2;
      drawAvgLine(stats.seriesAvg, `Prom. Serie: ${stats.seriesAvg.toFixed(2)}`, '#c084fc', placeLeft);
    }

    // 4. Área bajo la curva y línea de avance
    if (points.length > 1) {
      const areaGrad = canvasCtx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      areaGrad.addColorStop(0.6, 'rgba(244, 114, 182, 0.08)');
      areaGrad.addColorStop(1, 'rgba(9, 13, 22, 0)');

      canvasCtx.beginPath();
      canvasCtx.moveTo(points[0].x, pad.top + plotH);
      points.forEach((p) => canvasCtx.lineTo(p.x, p.y));
      canvasCtx.lineTo(points[points.length - 1].x, pad.top + plotH);
      canvasCtx.closePath();
      canvasCtx.fillStyle = areaGrad;
      canvasCtx.fill();

      const lineGrad = canvasCtx.createLinearGradient(pad.left, 0, width - pad.right, 0);
      lineGrad.addColorStop(0, '#f472b6');
      lineGrad.addColorStop(0.5, '#c084fc');
      lineGrad.addColorStop(1, '#38bdf8');

      canvasCtx.beginPath();
      canvasCtx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        canvasCtx.lineTo(points[i].x, points[i].y);
      }
      canvasCtx.strokeStyle = lineGrad;
      canvasCtx.lineWidth = 3;
      canvasCtx.lineJoin = 'round';
      canvasCtx.lineCap = 'round';
      canvasCtx.stroke();
    }

    // 5. Etiquetas del eje X espaciadas según ancho disponible
    const maxLabels = Math.max(2, Math.floor(plotW / 58));
    const step = Math.max(1, Math.ceil(points.length / maxLabels));
    canvasCtx.font = '600 11px system-ui, sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';

    points.forEach((p, idx) => {
      if (idx % step === 0 || idx === points.length - 1) {
        const xLabel = isSeriesScope
          ? `T${p.data.seasonNumber}·C${p.data.number}`
          : `Cap ${p.data.number}`;
        canvasCtx.fillStyle = 'rgba(238, 242, 248, 0.55)';
        canvasCtx.fillText(xLabel, p.x, pad.top + plotH + 12);
      }
    });

    // 6. Dibujar puntos y destacar Máximos / Mínimos
    const hasDistinctExtremes = stats.maxScore !== null && stats.minScore !== null && stats.maxScore > stats.minScore;
    let maxTagsDrawn = 0;
    let minTagsDrawn = 0;

    points.forEach((p) => {
      const score = p.data.score;
      const isMax = hasDistinctExtremes && score === stats.maxScore;
      const isMin = hasDistinctExtremes && score === stats.minScore;
      const isHovered = p.idx === appCtx.hoveredPointIndex;

      if (isHovered) {
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        canvasCtx.fill();
      }

      if (isMax) {
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        canvasCtx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        canvasCtx.lineWidth = 1.6;
        canvasCtx.stroke();
      } else if (isMin) {
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        canvasCtx.fillStyle = 'rgba(248, 113, 113, 0.24)';
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
        canvasCtx.lineWidth = 1.6;
        canvasCtx.stroke();
      }

      const radius = isMax || isMin ? 6.5 : (isHovered ? 6 : 4.5);
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      canvasCtx.fillStyle = isMax ? '#fbbf24' : (isMin ? '#f87171' : model.getScoreHexColor(score));
      canvasCtx.fill();
      canvasCtx.strokeStyle = '#090d16';
      canvasCtx.lineWidth = 2;
      canvasCtx.stroke();

      if (isMax && maxTagsDrawn < 2) {
        maxTagsDrawn += 1;
        drawPointTag(canvasCtx, p.x, p.y, `★ MÁX ${model.formatScore(score)}`, '#fbbf24', true, width);
      } else if (isMin && minTagsDrawn < 2) {
        minTagsDrawn += 1;
        const placeAbove = score < 2.2;
        drawPointTag(canvasCtx, p.x, p.y, `▼ MÍN ${model.formatScore(score)}`, '#f87171', placeAbove, width);
      } else if (points.length === 1) {
        drawPointTag(canvasCtx, p.x, p.y, `${model.formatScore(score)} / 10`, '#38bdf8', true, width);
      }
    });

    // 7. Píldoras de promedio
    avgOverlays.forEach(({ avgY, labelText, color, labelOnLeft }) => {
      canvasCtx.font = '700 11px system-ui, sans-serif';
      const textWidth = canvasCtx.measureText(labelText).width;
      const pillW = textWidth + 14;
      const pillH = 20;
      const pillX = labelOnLeft ? pad.left + 8 : width - pad.right - pillW - 4;
      const pillY = Math.max(4, Math.min(pad.top + plotH - pillH - 2, avgY - pillH - 4));

      canvasCtx.fillStyle = 'rgba(9, 13, 22, 0.94)';
      canvasCtx.strokeStyle = color;
      canvasCtx.lineWidth = 1;
      drawRoundedRect(canvasCtx, pillX, pillY, pillW, pillH, 6);
      canvasCtx.fill();
      canvasCtx.stroke();

      canvasCtx.fillStyle = color;
      canvasCtx.textAlign = 'left';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText(labelText, pillX + 7, pillY + pillH / 2 + 0.5);
    });

    appCtx.chartPoints = points;
  }

  /**
   * Muestra el tooltip interactivo para un punto del gráfico.
   */
  function showChartTooltip(appCtx, point, stats) {
    const { el, state } = appCtx;
    const tooltip = el.chartTooltip;
    const { data, x, y } = point;
    const refAvg = state.chartScope === 'series' ? stats.seriesAvg : stats.seasonAvg;
    const diff = refAvg !== null ? data.score - refAvg : null;
    const hasDistinctExtremes = stats.maxScore > stats.minScore;
    const isMax = hasDistinctExtremes && data.score === stats.maxScore;
    const isMin = hasDistinctExtremes && data.score === stats.minScore;

    const diffLabel = diff !== null
      ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} vs promedio`
      : '';

    const titleHtml = data.title
      ? `<div class="tooltip-title">${model.escapeHtml(data.title)}</div>`
      : '';

    let extremumHtml = '';
    if (isMax) extremumHtml = '<div class="tooltip-badge max">🏆 Máximo</div>';
    else if (isMin) extremumHtml = '<div class="tooltip-badge min">📉 Mínimo</div>';

    tooltip.innerHTML = `
      <div class="tooltip-head">
        <span>T${data.seasonNumber} · Cap ${data.number}</span>
        <span class="tooltip-score" style="color:${model.getScoreHexColor(data.score)}">${model.formatScore(data.score)} / 10</span>
      </div>
      ${titleHtml}
      ${diffLabel ? `<div class="tooltip-diff">${diffLabel}</div>` : ''}
      ${extremumHtml}
    `;

    const containerW = el.chartContainer.clientWidth;
    const clampedX = Math.max(95, Math.min(containerW - 95, x));
    const clampedY = Math.max(76, y - 12);

    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${clampedY}px`;
    tooltip.hidden = false;
  }

  /**
   * Devuelve el índice del punto del gráfico más cercano al puntero dentro del radio máximo.
   */
  function findClosestChartPoint(chartPoints, px, py, maxDist = 24) {
    let closestIdx = -1;
    let closestDist = maxDist;

    chartPoints.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - px, pt.y - py);
      if (dist <= closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    return closestIdx;
  }

  global.SeriesTracker = global.SeriesTracker || {};
  global.SeriesTracker.chart = {
    drawRoundedRect,
    drawPointTag,
    renderChart,
    showChartTooltip,
    findClosestChartPoint
  };
})(window);
