/**
 * Motor visual e interactivo del Hexágono de Arquetipos:
 * SVG dinámico, morphing de radar HEXACO, partículas Canvas, inclinación 3D,
 * spotlight reactivo al cursor y arrastre de fichas en modo edición.
 */
(function (global) {
  const model = global.HexagonoApp.model;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HEX_RADIUS = 205;
  const RADAR_MAX_RADIUS = 192;
  const VIEWBOX_MIN_X = -430;
  const VIEWBOX_MIN_Y = -325;
  const VIEWBOX_W = 860;
  const VIEWBOX_H = 650;

  const ANCHOR_CONFIG = [
    { dx: 0, dy: -46, subDy: -28, anchor: 'middle' },
    { dx: 30, dy: -8, subDy: 10, anchor: 'start' },
    { dx: 30, dy: -4, subDy: 14, anchor: 'start' },
    { dx: 0, dy: 44, subDy: 61, anchor: 'middle' },
    { dx: -30, dy: -4, subDy: 14, anchor: 'end' },
    { dx: -30, dy: -8, subDy: 10, anchor: 'end' }
  ];

  function svgEl(tag, attrs = {}, textContent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined) {
        el.setAttribute(key, String(value));
      }
    }
    if (textContent !== null && textContent !== undefined) {
      el.textContent = String(textContent);
    }
    return el;
  }

  function hexToRgba(hex, alpha) {
    if (!model.isValidHexColor(hex)) {
      return `rgba(129, 140, 248, ${alpha})`;
    }
    const clean = hex.trim().slice(1);
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getVertices(radius = HEX_RADIUS) {
    return model.VERTEX_ANGLES_DEG.map((_, i) => {
      const unit = model.getVertexUnitVector(i);
      return { x: unit.x * radius, y: unit.y * radius };
    });
  }

  function getEdgeMidpoints(vertices) {
    return vertices.map((v, i) => {
      const next = vertices[(i + 1) % vertices.length];
      return { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
    });
  }

  function pointsToAttr(pts) {
    return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  /**
   * Construye el controlador de escena interactiva del hexágono.
   */
  function createHexagonView(ctx) {
    const stageEl = ctx.el.hexStage;
    const tiltLayerEl = ctx.el.hexTiltLayer;
    const svg = ctx.el.hexSvg;
    const canvas = ctx.el.hexFxCanvas;
    const tooltipEl = ctx.el.hexTooltip;
    const fxCtx = canvas ? canvas.getContext('2d') : null;

    const prefersReducedMotion = typeof global.matchMedia === 'function'
      && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const anim = {
      rafId: 0,
      width: 0,
      height: 0,
      dpr: 1,
      mouseX: 0,
      mouseY: 0,
      mouseInside: false,
      tiltX: 0,
      tiltY: 0,
      targetTiltX: 0,
      targetTiltY: 0,
      radarCurrent: [0, 0, 0, 0, 0, 0],
      radarTarget: [0, 0, 0, 0, 0, 0],
      radarOpacity: 0,
      radarTargetOpacity: 0,
      radarColor: '#818cf8',
      particles: [],
      sparks: [],
      lastTime: 0
    };

    const dragState = {
      active: false,
      pointerId: null,
      personId: null,
      startClientX: 0,
      startClientY: 0,
      moved: false,
      suppressClickUntil: 0,
      nodeEl: null
    };

    let radarPolyEl = null;
    let radarDotsGroup = null;
    let tethersGroup = null;
    let groupAvgGroup = null;
    let sectorEls = [];
    let vertexEls = [];
    let nodeMap = new Map();
    let lastStageAccent = '#818cf8';
    let lastHoverSector = -1;

    function initAmbientParticles() {
      anim.particles = [];
      const count = prefersReducedMotion ? 10 : 32;
      for (let i = 0; i < count; i += 1) {
        anim.particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.00022,
          vy: (Math.random() - 0.5) * 0.00022,
          r: 1.1 + Math.random() * 2.1,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.16 + Math.random() * 0.34
        });
      }
    }

    function resizeFxCanvas() {
      if (!canvas || !stageEl) return;
      const rect = stageEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      anim.dpr = Math.min(2, global.devicePixelRatio || 1);
      anim.width = rect.width;
      anim.height = rect.height;
      canvas.width = Math.round(rect.width * anim.dpr);
      canvas.height = Math.round(rect.height * anim.dpr);
    }

    function spawnBurst(normX, normY, color, count = 14) {
      if (prefersReducedMotion || !fxCtx || !anim.width || !anim.height) return;
      const cx = normX * anim.width;
      const cy = normY * anim.height;
      for (let i = 0; i < count; i += 1) {
        if (anim.sparks.length >= 48) anim.sparks.shift();
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const speed = 0.7 + Math.random() * 2.2;
        anim.sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.022 + Math.random() * 0.02,
          radius: 1.5 + Math.random() * 2.2,
          color: color || lastStageAccent
        });
      }
    }

    function svgNormToStageNorm(svgX, svgY) {
      return {
        x: (svgX - VIEWBOX_MIN_X) / VIEWBOX_W,
        y: (svgY - VIEWBOX_MIN_Y) / VIEWBOX_H
      };
    }

    function clientToSvgCoords(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return { x: 0, y: 0 };
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      return {
        x: VIEWBOX_MIN_X + relX * VIEWBOX_W,
        y: VIEWBOX_MIN_Y + relY * VIEWBOX_H
      };
    }

    function getActiveAccentColor() {
      const { archetypes, people } = ctx.board;
      const activePersonId = ctx.hoveredPersonId || ctx.selectedPersonId;
      if (activePersonId) {
        const person = people.find((p) => p.id === activePersonId);
        if (person) {
          const dom = model.getDominantArchetypes(person, archetypes);
          return person.color || dom.primary.color;
        }
      }

      const activeArchIdx = ctx.hoveredArchetypeIndex >= 0
        ? ctx.hoveredArchetypeIndex
        : ctx.selectedArchetypeIndex;
      if (activeArchIdx >= 0 && archetypes[activeArchIdx]) {
        return archetypes[activeArchIdx].color;
      }

      if (ctx.filterArchetype && ctx.filterArchetype !== 'all') {
        const filtered = archetypes.find((a) => a.key === ctx.filterArchetype);
        if (filtered) return filtered.color;
      }

      return '#818cf8';
    }

    function updateStageAccent() {
      const accent = getActiveAccentColor();
      lastStageAccent = accent;
      if (stageEl) {
        stageEl.style.setProperty('--active-accent', accent);
        stageEl.style.setProperty('--active-accent-soft', hexToRgba(accent, 0.24));
      }
      document.documentElement.style.setProperty('--hex-ambient-color', hexToRgba(accent, 0.22));
    }

    function updateRadarTarget() {
      const activeId = ctx.hoveredPersonId || ctx.selectedPersonId;
      const person = activeId ? ctx.board.people.find((p) => p.id === activeId) : null;
      if (!person) {
        anim.radarTargetOpacity = 0;
        anim.radarTarget = [0, 0, 0, 0, 0, 0];
        return;
      }

      const dom = model.getDominantArchetypes(person, ctx.board.archetypes);
      anim.radarColor = person.color || dom.primary.color;
      anim.radarTargetOpacity = 1;
      anim.radarTarget = ctx.board.archetypes.map((arch) => {
        const val = Number(person.scores?.[arch.key] ?? 50);
        return Math.max(0.1, Math.min(1, val / 100));
      });
    }

    function renderRadarFrame() {
      if (!radarPolyEl || !radarDotsGroup) return;
      const k = prefersReducedMotion ? 1 : 0.18;
      let changed = false;

      anim.radarOpacity += (anim.radarTargetOpacity - anim.radarOpacity) * k;
      for (let i = 0; i < 6; i += 1) {
        const diff = anim.radarTarget[i] - anim.radarCurrent[i];
        if (Math.abs(diff) > 0.001) {
          anim.radarCurrent[i] += diff * k;
          changed = true;
        } else {
          anim.radarCurrent[i] = anim.radarTarget[i];
        }
      }

      if (anim.radarOpacity < 0.01 && anim.radarTargetOpacity === 0) {
        radarPolyEl.setAttribute('opacity', '0');
        radarDotsGroup.setAttribute('opacity', '0');
        return;
      }

      const pts = anim.radarCurrent.map((ratio, idx) => {
        const unit = model.getVertexUnitVector(idx);
        const r = ratio * RADAR_MAX_RADIUS;
        return { x: unit.x * r, y: unit.y * r };
      });

      radarPolyEl.setAttribute('points', pointsToAttr(pts));
      radarPolyEl.setAttribute('stroke', anim.radarColor);
      radarPolyEl.setAttribute('fill', hexToRgba(anim.radarColor, 0.24));
      radarPolyEl.setAttribute('opacity', String(Math.min(1, anim.radarOpacity)));

      const dots = radarDotsGroup.children;
      radarDotsGroup.setAttribute('opacity', String(Math.min(1, anim.radarOpacity)));
      for (let i = 0; i < dots.length && i < pts.length; i += 1) {
        dots[i].setAttribute('cx', pts[i].x.toFixed(2));
        dots[i].setAttribute('cy', pts[i].y.toFixed(2));
        dots[i].setAttribute('fill', ctx.board.archetypes[i]?.color || anim.radarColor);
      }

      if (changed) {
        radarPolyEl.setAttribute('data-animating', '1');
      }
    }

    function renderTethers() {
      if (!tethersGroup) return;
      tethersGroup.innerHTML = '';

      const activeId = ctx.hoveredPersonId || ctx.selectedPersonId;
      const person = activeId ? ctx.board.people.find((p) => p.id === activeId) : null;
      if (!person) return;

      const dom = model.getDominantArchetypes(person, ctx.board.archetypes);
      const px = person.pos.x * HEX_RADIUS;
      const py = person.pos.y * HEX_RADIUS;
      const targets = [
        { idx: dom.primaryIndex, arch: dom.primary, primary: true },
        { idx: dom.secondaryIndex, arch: dom.secondary, primary: false }
      ];

      targets.forEach((target) => {
        const unit = model.getVertexUnitVector(target.idx);
        const vx = unit.x * HEX_RADIUS;
        const vy = unit.y * HEX_RADIUS;
        const line = svgEl('line', {
          x1: px.toFixed(2),
          y1: py.toFixed(2),
          x2: vx.toFixed(2),
          y2: vy.toFixed(2),
          stroke: target.arch.color,
          'stroke-width': target.primary ? '2.4' : '1.5',
          'stroke-opacity': target.primary ? '0.88' : '0.52',
          'stroke-dasharray': target.primary ? '7 5' : '4 6',
          class: target.primary ? 'hex-tether is-primary' : 'hex-tether'
        });
        tethersGroup.appendChild(line);
      });
    }

    function renderGroupAveragePolygon() {
      if (!groupAvgGroup) return;
      groupAvgGroup.innerHTML = '';
      if (!ctx.showGroupAverage || !ctx.board.people.length) return;

      const avg = model.computeGroupAverageScores(ctx.board.people);
      const pts = ctx.board.archetypes.map((arch, idx) => {
        const unit = model.getVertexUnitVector(idx);
        const r = (Math.max(10, avg[arch.key] ?? 50) / 100) * RADAR_MAX_RADIUS;
        return { x: unit.x * r, y: unit.y * r };
      });

      groupAvgGroup.appendChild(
        svgEl('polygon', {
          points: pointsToAttr(pts),
          fill: 'rgba(56, 189, 248, 0.11)',
          stroke: 'rgba(186, 230, 253, 0.72)',
          'stroke-width': '1.6',
          'stroke-dasharray': '5 4',
          class: 'hex-group-avg-poly'
        })
      );
    }

    function updateTooltip() {
      if (!tooltipEl || !stageEl) return;
      if (dragState.active || !ctx.hoveredPersonId) {
        tooltipEl.hidden = true;
        return;
      }

      const person = ctx.board.people.find((p) => p.id === ctx.hoveredPersonId);
      if (!person) {
        tooltipEl.hidden = true;
        return;
      }

      const dom = model.getDominantArchetypes(person, ctx.board.archetypes);
      const color = person.color || dom.primary.color;
      const stageRect = stageEl.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      if (!stageRect.width || !svgRect.width) {
        tooltipEl.hidden = true;
        return;
      }

      const svgX = person.pos.x * HEX_RADIUS;
      const svgY = person.pos.y * HEX_RADIUS;
      const norm = svgNormToStageNorm(svgX, svgY);
      const px = (svgRect.left - stageRect.left) + norm.x * svgRect.width;
      const py = (svgRect.top - stageRect.top) + norm.y * svgRect.height;

      const aliasHtml = person.alias
        ? `<span class="hex-tip-alias">${model.escapeHtml(person.alias)}</span>`
        : '';

      tooltipEl.innerHTML = `
        <div class="hex-tip-head">
          <span class="hex-tip-emoji">${model.escapeHtml(person.emoji || '✨')}</span>
          <div>
            <div class="hex-tip-name">${model.escapeHtml(person.name)}</div>
            ${aliasHtml}
          </div>
        </div>
        <div class="hex-tip-badges">
          <span class="hex-tip-pill" style="--pill-color:${model.escapeHtml(dom.primary.color)}">
            ${model.escapeHtml(dom.primary.emoji)} ${model.escapeHtml(dom.primary.name)} · ${dom.primaryScore}%
          </span>
          <span class="hex-tip-pill is-secondary" style="--pill-color:${model.escapeHtml(dom.secondary.color)}">
            ${model.escapeHtml(dom.secondary.emoji)} ${model.escapeHtml(dom.secondary.name)} · ${dom.secondaryScore}%
          </span>
        </div>
        ${ctx.editMode && ctx.isAlex ? '<div class="hex-tip-hint">Arrastra para reubicar · Click para editar</div>' : '<div class="hex-tip-hint">Click para fijar ficha</div>'}
      `;
      tooltipEl.style.setProperty('--tip-accent', color);
      tooltipEl.hidden = false;

      const tipW = tooltipEl.offsetWidth || 220;
      const tipH = tooltipEl.offsetHeight || 90;
      let left = px + 22;
      if (left + tipW > stageRect.width - 12) {
        left = Math.max(12, px - tipW - 22);
      }
      let top = py - tipH / 2;
      top = Math.max(12, Math.min(stageRect.height - tipH - 12, top));

      tooltipEl.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    }

    function updateVisualHighlights() {
      const activePersonId = ctx.hoveredPersonId || ctx.selectedPersonId;
      const activePerson = activePersonId
        ? ctx.board.people.find((p) => p.id === activePersonId)
        : null;
      const activePersonDom = activePerson
        ? model.getDominantArchetypes(activePerson, ctx.board.archetypes)
        : null;

      let activeArchIdx = ctx.hoveredArchetypeIndex >= 0
        ? ctx.hoveredArchetypeIndex
        : ctx.selectedArchetypeIndex;
      if (activeArchIdx < 0 && ctx.filterArchetype !== 'all') {
        activeArchIdx = ctx.board.archetypes.findIndex((a) => a.key === ctx.filterArchetype);
      }

      sectorEls.forEach((sectorEl, idx) => {
        const isHot = idx === activeArchIdx
          || (activePersonDom && (idx === activePersonDom.primaryIndex || idx === activePersonDom.sectorIndex));
        sectorEl.classList.toggle('is-active', Boolean(isHot));
        sectorEl.classList.toggle('is-primary-hover', idx === ctx.hoveredArchetypeIndex);
      });

      vertexEls.forEach((vertexEl, idx) => {
        const isHighlighted = idx === activeArchIdx
          || (activePersonDom && (idx === activePersonDom.primaryIndex || idx === activePersonDom.secondaryIndex));
        vertexEl.classList.toggle('is-active', Boolean(isHighlighted));
      });

      const query = ctx.searchQuery.trim().toLowerCase();
      ctx.board.people.forEach((person) => {
        const nodeEl = nodeMap.get(person.id);
        if (!nodeEl) return;
        const dom = model.getDominantArchetypes(person, ctx.board.archetypes);
        const matchesSearch = !query
          || person.name.toLowerCase().includes(query)
          || person.alias.toLowerCase().includes(query)
          || dom.primary.name.toLowerCase().includes(query);
        const matchesFilter = ctx.filterArchetype === 'all'
          || dom.primary.key === ctx.filterArchetype
          || (dom.sectorArchetype && dom.sectorArchetype.key === ctx.filterArchetype);
        const isFocused = person.id === ctx.hoveredPersonId || person.id === ctx.selectedPersonId;
        const shouldDim = !matchesSearch || !matchesFilter || (Boolean(activePersonId) && !isFocused);

        nodeEl.classList.toggle('is-hovered', person.id === ctx.hoveredPersonId);
        nodeEl.classList.toggle('is-selected', person.id === ctx.selectedPersonId);
        nodeEl.classList.toggle('is-dimmed', shouldDim);
        nodeEl.classList.toggle('is-editable', Boolean(ctx.editMode && ctx.isAlex));
      });

      updateStageAccent();
      updateRadarTarget();
      renderTethers();
      updateTooltip();
    }

    function renderBoard() {
      if (!svg) return;
      svg.innerHTML = '';
      svg.setAttribute('viewBox', `${VIEWBOX_MIN_X} ${VIEWBOX_MIN_Y} ${VIEWBOX_W} ${VIEWBOX_H}`);

      sectorEls = [];
      vertexEls = [];
      nodeMap = new Map();

      const archetypes = ctx.board.archetypes;
      const vertices = getVertices(HEX_RADIUS);
      const midpoints = getEdgeMidpoints(vertices);

      // Definiciones de gradientes y filtros luminosos
      const defs = svgEl('defs');
      const baseGrad = svgEl('radialGradient', { id: 'hex-base-grad', cx: '50%', cy: '50%', r: '60%' });
      baseGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': 'rgba(30, 41, 74, 0.72)' }));
      baseGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': 'rgba(9, 14, 28, 0.88)' }));
      defs.appendChild(baseGrad);

      const glowFilter = svgEl('filter', { id: 'hex-glow-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' });
      glowFilter.appendChild(svgEl('feGaussianBlur', { stdDeviation: '4.5', result: 'blur' }));
      const merge = svgEl('feMerge');
      merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
      merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
      glowFilter.appendChild(merge);
      defs.appendChild(glowFilter);

      archetypes.forEach((arch, idx) => {
        const grad = svgEl('radialGradient', {
          id: `hex-sector-grad-${idx}`,
          cx: '50%',
          cy: '50%',
          r: '75%'
        });
        grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': hexToRgba(arch.color, 0.08) }));
        grad.appendChild(svgEl('stop', { offset: '65%', 'stop-color': hexToRgba(arch.color, 0.28) }));
        grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': hexToRgba(arch.color, 0.54) }));
        defs.appendChild(grad);
      });

      ctx.board.people.forEach((person) => {
        if (!person.avatarUrl) return;
        const clip = svgEl('clipPath', { id: `hex-clip-${person.id}` });
        clip.appendChild(svgEl('circle', { cx: '0', cy: '0', r: '15.5' }));
        defs.appendChild(clip);
      });
      svg.appendChild(defs);

      // Capa orbital decorativa
      const orbitLayer = svgEl('g', { class: 'hex-orbit-layer' });
      orbitLayer.appendChild(svgEl('circle', {
        cx: '0',
        cy: '0',
        r: '246',
        class: 'hex-orbit-ring is-outer'
      }));
      orbitLayer.appendChild(svgEl('circle', {
        cx: '0',
        cy: '0',
        r: '226',
        class: 'hex-orbit-ring is-inner'
      }));
      svg.appendChild(orbitLayer);

      // Base hexagonal principal
      const hexBase = svgEl('polygon', {
        points: pointsToAttr(vertices),
        fill: 'url(#hex-base-grad)',
        stroke: 'rgba(255, 255, 255, 0.16)',
        'stroke-width': '1.6',
        class: 'hex-shell'
      });
      svg.appendChild(hexBase);

      // 6 Sectores territoriales centrados en cada vértice
      const sectorsLayer = svgEl('g', { id: 'hex-sectors-layer' });
      archetypes.forEach((arch, idx) => {
        const leftMid = midpoints[(idx + 5) % 6];
        const vertex = vertices[idx];
        const rightMid = midpoints[idx];
        const pts = [{ x: 0, y: 0 }, leftMid, vertex, rightMid];

        const sectorGroup = svgEl('g', {
          class: 'hex-sector',
          'data-arch-idx': String(idx),
          role: 'button',
          tabindex: '0',
          'aria-label': `Arquetipo ${arch.name} (${arch.dimension})`
        });

        const poly = svgEl('polygon', {
          points: pointsToAttr(pts),
          fill: `url(#hex-sector-grad-${idx})`,
          stroke: hexToRgba(arch.color, 0.45),
          'stroke-width': '1.2',
          class: 'hex-sector-poly'
        });

        const edgeGlow = svgEl('polyline', {
          points: pointsToAttr([leftMid, vertex, rightMid]),
          fill: 'none',
          stroke: arch.color,
          'stroke-width': '2.6',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          class: 'hex-sector-edge'
        });

        sectorGroup.appendChild(poly);
        sectorGroup.appendChild(edgeGlow);

        sectorGroup.addEventListener('pointerenter', () => {
          if (dragState.active) return;
          ctx.setHoveredArchetype(idx);
          if (lastHoverSector !== idx) {
            lastHoverSector = idx;
            const norm = svgNormToStageNorm(vertex.x * 0.65, vertex.y * 0.65);
            spawnBurst(norm.x, norm.y, arch.color, 10);
            ctx.playHoverTick(idx);
          }
        });
        sectorGroup.addEventListener('pointerleave', () => {
          if (ctx.hoveredArchetypeIndex === idx) {
            ctx.setHoveredArchetype(-1);
          }
          if (lastHoverSector === idx) {
            lastHoverSector = -1;
          }
        });
        sectorGroup.addEventListener('click', () => {
          ctx.toggleArchetypeSelection(idx);
        });
        sectorGroup.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ctx.toggleArchetypeSelection(idx);
          }
        });

        sectorsLayer.appendChild(sectorGroup);
        sectorEls.push(sectorGroup);
      });
      svg.appendChild(sectorsLayer);

      // Rejilla concéntrica y ejes
      const gridLayer = svgEl('g', { class: 'hex-grid-layer', 'pointer-events': 'none' });
      [0.25, 0.5, 0.75, 1].forEach((scale, ringIdx) => {
        const ringPts = vertices.map((v) => ({ x: v.x * scale, y: v.y * scale }));
        gridLayer.appendChild(svgEl('polygon', {
          points: pointsToAttr(ringPts),
          fill: 'none',
          stroke: ringIdx === 3 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)',
          'stroke-width': ringIdx === 3 ? '1.8' : '1',
          'stroke-dasharray': ringIdx === 1 || ringIdx === 2 ? '4 5' : null
        }));
      });

      vertices.forEach((v, idx) => {
        gridLayer.appendChild(svgEl('line', {
          x1: '0',
          y1: '0',
          x2: v.x.toFixed(2),
          y2: v.y.toFixed(2),
          stroke: hexToRgba(archetypes[idx].color, 0.28),
          'stroke-width': '1.2'
        }));
        const mid = midpoints[idx];
        gridLayer.appendChild(svgEl('line', {
          x1: '0',
          y1: '0',
          x2: mid.x.toFixed(2),
          y2: mid.y.toFixed(2),
          stroke: 'rgba(255, 255, 255, 0.08)',
          'stroke-width': '1',
          'stroke-dasharray': '3 6'
        }));
      });

      gridLayer.appendChild(svgEl('circle', {
        cx: '0',
        cy: '0',
        r: (HEX_RADIUS * 0.12).toFixed(1),
        fill: 'rgba(15, 23, 42, 0.85)',
        stroke: 'rgba(255, 255, 255, 0.24)',
        'stroke-width': '1.2'
      }));
      gridLayer.appendChild(svgEl('text', {
        x: '0',
        y: '3.5',
        'text-anchor': 'middle',
        class: 'hex-center-label'
      }, 'HEXACO'));
      svg.appendChild(gridLayer);

      // Capa de polígono promedio del grupo
      groupAvgGroup = svgEl('g', { id: 'hex-group-avg-layer', 'pointer-events': 'none' });
      svg.appendChild(groupAvgGroup);

      // Capa de radar HEXACO animado + tethers constelación
      const radarLayer = svgEl('g', { id: 'hex-radar-layer', 'pointer-events': 'none' });
      tethersGroup = svgEl('g', { id: 'hex-tethers' });
      radarPolyEl = svgEl('polygon', {
        id: 'hex-radar-poly',
        points: '0,0 0,0 0,0 0,0 0,0 0,0',
        fill: 'rgba(129, 140, 248, 0.24)',
        stroke: '#818cf8',
        'stroke-width': '2.2',
        'stroke-linejoin': 'round',
        opacity: '0',
        filter: 'url(#hex-glow-soft)'
      });
      radarDotsGroup = svgEl('g', { id: 'hex-radar-dots', opacity: '0' });
      for (let i = 0; i < 6; i += 1) {
        radarDotsGroup.appendChild(svgEl('circle', {
          cx: '0',
          cy: '0',
          r: '4.2',
          stroke: '#0b1020',
          'stroke-width': '1.5',
          fill: archetypes[i].color
        }));
      }
      radarLayer.appendChild(tethersGroup);
      radarLayer.appendChild(radarPolyEl);
      radarLayer.appendChild(radarDotsGroup);
      svg.appendChild(radarLayer);

      // Medallones y etiquetas de los 6 arquetipos en los vértices
      const verticesLayer = svgEl('g', { id: 'hex-vertices-layer' });
      archetypes.forEach((arch, idx) => {
        const v = vertices[idx];
        const cfg = ANCHOR_CONFIG[idx];
        const g = svgEl('g', {
          class: 'hex-vertex',
          'data-arch-idx': String(idx),
          role: 'button',
          tabindex: '0',
          'aria-label': `${arch.name} — ${arch.dimension}`
        });

        g.appendChild(svgEl('circle', {
          cx: v.x.toFixed(2),
          cy: v.y.toFixed(2),
          r: '22',
          fill: hexToRgba(arch.color, 0.14),
          stroke: hexToRgba(arch.color, 0.6),
          'stroke-width': '1.2',
          class: 'hex-vertex-halo'
        }));

        g.appendChild(svgEl('circle', {
          cx: v.x.toFixed(2),
          cy: v.y.toFixed(2),
          r: '16',
          fill: '#0c1324',
          stroke: arch.color,
          'stroke-width': '2.2',
          class: 'hex-vertex-core'
        }));

        g.appendChild(svgEl('text', {
          x: v.x.toFixed(2),
          y: (v.y + 5.5).toFixed(2),
          'text-anchor': 'middle',
          class: 'hex-vertex-emoji'
        }, arch.emoji));

        g.appendChild(svgEl('text', {
          x: (v.x + cfg.dx).toFixed(2),
          y: (v.y + cfg.dy).toFixed(2),
          'text-anchor': cfg.anchor,
          fill: '#f8fafc',
          class: 'hex-vertex-title'
        }, `${arch.key} · ${arch.name}`));

        g.appendChild(svgEl('text', {
          x: (v.x + cfg.dx).toFixed(2),
          y: (v.y + cfg.subDy).toFixed(2),
          'text-anchor': cfg.anchor,
          fill: arch.color,
          class: 'hex-vertex-dim'
        }, arch.dimension));

        g.addEventListener('pointerenter', () => {
          if (dragState.active) return;
          ctx.setHoveredArchetype(idx);
          const norm = svgNormToStageNorm(v.x, v.y);
          spawnBurst(norm.x, norm.y, arch.color, 14);
          ctx.playHoverTick(idx);
        });
        g.addEventListener('pointerleave', () => {
          if (ctx.hoveredArchetypeIndex === idx) {
            ctx.setHoveredArchetype(-1);
          }
        });
        g.addEventListener('click', () => {
          ctx.toggleArchetypeSelection(idx);
        });

        verticesLayer.appendChild(g);
        vertexEls.push(g);
      });
      svg.appendChild(verticesLayer);

      // Fichas de personas
      const nodesLayer = svgEl('g', { id: 'hex-nodes-layer' });
      ctx.board.people.forEach((person) => {
        const dom = model.getDominantArchetypes(person, archetypes);
        const color = person.color || dom.primary.color;
        const px = person.pos.x * HEX_RADIUS;
        const py = person.pos.y * HEX_RADIUS;

        const g = svgEl('g', {
          class: 'hex-node',
          transform: `translate(${px.toFixed(2)}, ${py.toFixed(2)})`,
          'data-person-id': person.id,
          role: 'button',
          tabindex: '0',
          'aria-label': `${person.name} (${dom.primary.name})`
        });

        g.appendChild(svgEl('circle', {
          cx: '0',
          cy: '0',
          r: '24',
          fill: hexToRgba(color, 0.16),
          stroke: hexToRgba(color, 0.55),
          'stroke-width': '1.2',
          class: 'hex-node-ring'
        }));

        g.appendChild(svgEl('circle', {
          cx: '0',
          cy: '0',
          r: '17',
          fill: '#0d1527',
          stroke: color,
          'stroke-width': '2.4',
          class: 'hex-node-circle'
        }));

        const emojiFallback = svgEl('text', {
          x: '0',
          y: '5.5',
          'text-anchor': 'middle',
          class: 'hex-node-emoji'
        }, person.emoji || '✨');
        g.appendChild(emojiFallback);

        if (person.avatarUrl) {
          const img = svgEl('image', {
            href: person.avatarUrl,
            x: '-15.5',
            y: '-15.5',
            width: '31',
            height: '31',
            preserveAspectRatio: 'xMidYMid slice',
            'clip-path': `url(#hex-clip-${person.id})`
          });
          img.addEventListener('error', () => {
            img.remove();
          });
          g.appendChild(img);
        }

        const displayName = person.name.length > 14 ? `${person.name.slice(0, 13)}…` : person.name;
        const pillWidth = Math.max(46, displayName.length * 7 + 16);
        g.appendChild(svgEl('rect', {
          x: (-pillWidth / 2).toFixed(1),
          y: '21',
          width: pillWidth.toFixed(1),
          height: '18',
          rx: '9',
          fill: 'rgba(8, 12, 24, 0.88)',
          stroke: hexToRgba(color, 0.45),
          'stroke-width': '1',
          class: 'hex-node-pill'
        }));

        g.appendChild(svgEl('text', {
          x: '0',
          y: '33',
          'text-anchor': 'middle',
          class: 'hex-node-label'
        }, displayName));

        bindNodeEvents(g, person, color);
        nodesLayer.appendChild(g);
        nodeMap.set(person.id, g);
      });
      svg.appendChild(nodesLayer);

      renderGroupAveragePolygon();
      updateVisualHighlights();
    }

    function bindNodeEvents(nodeEl, person, color) {
      nodeEl.addEventListener('pointerenter', () => {
        if (dragState.active) return;
        ctx.setHoveredPerson(person.id);
        const norm = svgNormToStageNorm(person.pos.x * HEX_RADIUS, person.pos.y * HEX_RADIUS);
        spawnBurst(norm.x, norm.y, color, 12);
        ctx.playPersonHoverSound();
      });

      nodeEl.addEventListener('pointerleave', () => {
        if (dragState.active) return;
        if (ctx.hoveredPersonId === person.id) {
          ctx.setHoveredPerson(null);
        }
      });

      nodeEl.addEventListener('pointerdown', (e) => {
        if (!ctx.editMode || !ctx.isAlex || e.button !== 0) return;
        e.stopPropagation();
        dragState.active = true;
        dragState.pointerId = e.pointerId;
        dragState.personId = person.id;
        dragState.startClientX = e.clientX;
        dragState.startClientY = e.clientY;
        dragState.moved = false;
        dragState.nodeEl = nodeEl;
        nodeEl.classList.add('is-dragging');
        if (tooltipEl) tooltipEl.hidden = true;
        if (typeof nodeEl.setPointerCapture === 'function') {
          try {
            nodeEl.setPointerCapture(e.pointerId);
          } catch {
            // Ignorar si no soporta capture
          }
        }
        ctx.selectPerson(person.id, { silent: true });
      });

      nodeEl.addEventListener('pointermove', (e) => {
        if (!dragState.active || dragState.personId !== person.id) return;
        const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
        if (!dragState.moved && dist < 5) return;
        dragState.moved = true;

        const svgPt = clientToSvgCoords(e.clientX, e.clientY);
        const clamped = model.clampToHexagon(
          svgPt.x / HEX_RADIUS,
          svgPt.y / HEX_RADIUS,
          model.HEX_POS_MAX_RADIUS
        );
        person.pos = clamped;
        person.manualPos = true;

        const px = clamped.x * HEX_RADIUS;
        const py = clamped.y * HEX_RADIUS;
        nodeEl.setAttribute('transform', `translate(${px.toFixed(2)}, ${py.toFixed(2)})`);
        renderTethers();
        updateStageAccent();
      });

      const finishDrag = (e) => {
        if (!dragState.active || dragState.personId !== person.id) return;
        nodeEl.classList.remove('is-dragging');
        const wasMoved = dragState.moved;
        if (wasMoved) {
          dragState.suppressClickUntil = Date.now() + 240;
          const norm = svgNormToStageNorm(person.pos.x * HEX_RADIUS, person.pos.y * HEX_RADIUS);
          spawnBurst(norm.x, norm.y, color, 16);
          ctx.onPersonDragged(person.id);
        }
        dragState.active = false;
        dragState.pointerId = null;
        dragState.personId = null;
        dragState.nodeEl = null;
        if (e && typeof nodeEl.releasePointerCapture === 'function') {
          try {
            nodeEl.releasePointerCapture(e.pointerId);
          } catch {
            // Ignorar si ya fue liberado
          }
        }
      };

      nodeEl.addEventListener('pointerup', finishDrag);
      nodeEl.addEventListener('pointercancel', finishDrag);

      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (Date.now() < dragState.suppressClickUntil) return;
        ctx.selectPerson(person.id);
      });

      nodeEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.selectPerson(person.id);
        }
      });
    }

    function drawFxFrame(now) {
      anim.rafId = global.requestAnimationFrame(drawFxFrame);
      if (document.hidden) return;

      // Inclinación 3D suave y spotlight
      if (tiltLayerEl && !prefersReducedMotion) {
        const factor = 0.11;
        const targetX = dragState.active ? 0 : anim.targetTiltX;
        const targetY = dragState.active ? 0 : anim.targetTiltY;
        anim.tiltX += (targetX - anim.tiltX) * factor;
        anim.tiltY += (targetY - anim.tiltY) * factor;
        tiltLayerEl.style.transform = `perspective(1100px) rotateX(${anim.tiltX.toFixed(2)}deg) rotateY(${anim.tiltY.toFixed(2)}deg)`;
      }

      renderRadarFrame();

      if (!fxCtx || !anim.width || !anim.height) return;
      const dt = anim.lastTime ? Math.min(40, now - anim.lastTime) : 16;
      anim.lastTime = now;

      fxCtx.setTransform(anim.dpr, 0, 0, anim.dpr, 0, 0);
      fxCtx.clearRect(0, 0, anim.width, anim.height);

      // Partículas constelación ambientales
      for (let i = 0; i < anim.particles.length; i += 1) {
        const p = anim.particles[i];
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.phase += 0.02;

        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        let px = p.x * anim.width;
        let py = p.y * anim.height;

        if (anim.mouseInside && !prefersReducedMotion) {
          const dx = anim.mouseX * anim.width - px;
          const dy = anim.mouseY * anim.height - py;
          const dist = Math.hypot(dx, dy);
          if (dist > 4 && dist < 135) {
            const pull = (1 - dist / 135) * 0.28;
            px += dx * pull * 0.25;
            py += dy * pull * 0.25;
            fxCtx.beginPath();
            fxCtx.moveTo(px, py);
            fxCtx.lineTo(anim.mouseX * anim.width, anim.mouseY * anim.height);
            fxCtx.strokeStyle = hexToRgba(lastStageAccent, (1 - dist / 135) * 0.18);
            fxCtx.lineWidth = 1;
            fxCtx.stroke();
          }
        }

        const pulse = 0.65 + 0.35 * Math.sin(p.phase);
        fxCtx.beginPath();
        fxCtx.arc(px, py, p.r, 0, Math.PI * 2);
        fxCtx.fillStyle = hexToRgba(lastStageAccent, p.alpha * pulse);
        fxCtx.fill();
      }

      // Chispas interactivas
      for (let i = anim.sparks.length - 1; i >= 0; i -= 1) {
        const s = anim.sparks[i];
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= s.decay * (dt / 16);
        if (s.life <= 0) {
          anim.sparks.splice(i, 1);
          continue;
        }
        fxCtx.beginPath();
        fxCtx.arc(s.x, s.y, s.radius * s.life, 0, Math.PI * 2);
        fxCtx.fillStyle = hexToRgba(s.color, s.life * 0.9);
        fxCtx.fill();
      }
    }

    function bindStageInteractions() {
      if (!stageEl) return;

      stageEl.addEventListener('pointermove', (e) => {
        const rect = stageEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        anim.mouseX = nx;
        anim.mouseY = ny;
        anim.mouseInside = true;

        stageEl.style.setProperty('--spot-x', `${(nx * 100).toFixed(1)}%`);
        stageEl.style.setProperty('--spot-y', `${(ny * 100).toFixed(1)}%`);
        stageEl.classList.add('is-pointer-inside');

        if (!prefersReducedMotion) {
          anim.targetTiltY = (nx - 0.5) * 9.5;
          anim.targetTiltX = (0.5 - ny) * 9.5;
        }
      });

      stageEl.addEventListener('pointerleave', () => {
        anim.mouseInside = false;
        anim.targetTiltX = 0;
        anim.targetTiltY = 0;
        stageEl.classList.remove('is-pointer-inside');
      });

      svg.addEventListener('click', (e) => {
        if (e.target === svg || e.target.classList.contains('hex-shell')) {
          ctx.clearSelection();
        }
      });

      global.addEventListener('resize', () => {
        resizeFxCanvas();
        updateTooltip();
      });
    }

    function start() {
      initAmbientParticles();
      resizeFxCanvas();
      bindStageInteractions();
      if (!anim.rafId) {
        anim.rafId = global.requestAnimationFrame(drawFxFrame);
      }
    }

    return {
      start,
      renderBoard,
      updateVisualHighlights,
      renderGroupAveragePolygon,
      spawnBurst
    };
  }

  global.HexagonoApp = global.HexagonoApp || {};
  global.HexagonoApp.view = {
    createHexagonView
  };
})(window);
