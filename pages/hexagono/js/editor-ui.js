/**
 * Interfaz del panel lateral: Inspector científico HEXACO, directorio interactivo,
 * estudio de edición exclusivo de @alex y modal de acceso.
 */
(function (global) {
  const model = global.HexagonoApp.model;

  function renderTopbar(ctx) {
    const { el } = ctx;
    const isEditing = Boolean(ctx.isAlex && ctx.editMode);

    document.body.classList.toggle('is-alex-editing', isEditing);

    if (el.alexLoginBtn) el.alexLoginBtn.hidden = Boolean(ctx.isAlex);
    if (el.editModeBtn) {
      el.editModeBtn.hidden = !ctx.isAlex;
      el.editModeBtn.classList.toggle('is-active', isEditing);
      el.editModeBtn.textContent = isEditing ? '👁️ Ver en vivo' : '✏️ Editar como Alex';
    }
    if (el.saveNowBtn) el.saveNowBtn.hidden = !isEditing;
    if (el.alexLogoutBtn) el.alexLogoutBtn.hidden = !ctx.isAlex;
    if (el.avgToggleBtn) el.avgToggleBtn.classList.toggle('is-active', Boolean(ctx.showGroupAverage));
    if (el.soundToggleBtn) {
      el.soundToggleBtn.classList.toggle('is-active', Boolean(ctx.soundEnabled));
      el.soundToggleBtn.textContent = ctx.soundEnabled ? '🔊 Sonido' : '🔇 Silencio';
    }

    if (el.syncStatusBadge) {
      const badge = el.syncStatusBadge;
      badge.className = 'sync-badge';
      if (ctx.syncStatus === 'saving') {
        badge.classList.add('is-saving');
        badge.textContent = '● Guardando...';
      } else if (ctx.syncStatus === 'saved') {
        badge.classList.add('is-saved');
        badge.textContent = '● Guardado en nube';
      } else if (ctx.syncStatus === 'error') {
        badge.classList.add('is-error');
        badge.textContent = '● Error al guardar';
      } else if (ctx.storageMode === 'local') {
        badge.classList.add('is-local');
        badge.textContent = ctx.isAlex ? '● Modo local (Alex)' : '● Modo local';
      } else {
        badge.classList.add('is-readonly');
        badge.textContent = ctx.isAlex ? '● Sesión @alex lista' : '● Solo lectura';
      }
    }
  }

  function renderBoardHeader(ctx) {
    const { el, board } = ctx;
    if (el.boardTitle) el.boardTitle.textContent = board.title;
    if (el.boardSubtitle) el.boardSubtitle.textContent = board.subtitle;

    if (el.boardUpdatedMeta) {
      const countText = `${board.people.length} ${board.people.length === 1 ? 'persona' : 'personas'}`;
      if (ctx.updatedAt) {
        const d = new Date(ctx.updatedAt);
        const dateStr = Number.isNaN(d.getTime())
          ? ''
          : ` · Última edición de @alex: ${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
        el.boardUpdatedMeta.textContent = `${countText} clasificadas · Base científica HEXACO${dateStr}`;
      } else {
        el.boardUpdatedMeta.textContent = `${countText} clasificadas · Base científica HEXACO`;
      }
    }

    if (el.archetypeFilterBar) {
      const allBtn = `
        <button type="button" class="filter-pill ${ctx.filterArchetype === 'all' ? 'is-active' : ''}" data-filter="all">
          ⬡ Todos (${board.people.length})
        </button>
      `;
      const archBtns = board.archetypes.map((arch) => {
        const count = board.people.filter((p) => {
          const dom = model.getDominantArchetypes(p, board.archetypes);
          return dom.primary.key === arch.key || (dom.sectorArchetype && dom.sectorArchetype.key === arch.key);
        }).length;
        const active = ctx.filterArchetype === arch.key ? 'is-active' : '';
        return `
          <button
            type="button"
            class="filter-pill ${active}"
            data-filter="${model.escapeHtml(arch.key)}"
            style="--pill-accent:${model.escapeHtml(arch.color)}"
          >
            <span>${model.escapeHtml(arch.emoji)}</span>
            <span>${model.escapeHtml(arch.name)}</span>
            <small>${count}</small>
          </button>
        `;
      }).join('');
      el.archetypeFilterBar.innerHTML = allBtn + archBtns;
    }
  }

  function renderInspectorCard(ctx) {
    const container = ctx.el.inspectorCard;
    if (!container) return;

    const { archetypes, people } = ctx.board;
    const personId = ctx.hoveredPersonId || ctx.selectedPersonId;
    const person = personId ? people.find((p) => p.id === personId) : null;

    if (person) {
      const dom = model.getDominantArchetypes(person, archetypes);
      const accent = person.color || dom.primary.color;
      const avatarHtml = person.avatarUrl
        ? `<img src="${model.escapeHtml(person.avatarUrl)}" alt="${model.escapeHtml(person.name)}" class="inspector-avatar-img">`
        : `<span>${model.escapeHtml(person.emoji || '✨')}</span>`;

      const barsHtml = dom.ordered.map((entry) => `
        <div class="score-bar-row">
          <div class="score-bar-meta">
            <span>${model.escapeHtml(entry.arch.emoji)} ${model.escapeHtml(entry.arch.name)} <small>(${model.escapeHtml(entry.arch.key)})</small></span>
            <strong>${entry.score}%</strong>
          </div>
          <div class="score-track">
            <div class="score-fill" style="width:${entry.score}%; --bar-color:${model.escapeHtml(entry.arch.color)}"></div>
          </div>
        </div>
      `).join('');

      const sectorText = dom.sectorArchetype
        ? `${dom.sectorArchetype.emoji} Sector: ${dom.sectorArchetype.name}`
        : '⬡ Zona central equilibrada';

      container.innerHTML = `
        <div class="inspector-person-head" style="--card-accent:${model.escapeHtml(accent)}">
          <div class="inspector-avatar">${avatarHtml}</div>
          <div class="inspector-person-titles">
            <h3>${model.escapeHtml(person.name)}</h3>
            ${person.alias ? `<p class="inspector-alias">${model.escapeHtml(person.alias)}</p>` : ''}
          </div>
          ${ctx.selectedPersonId === person.id ? '<button type="button" class="btn-mini-ghost" data-action="clear-selection">Soltar</button>' : ''}
        </div>
        <div class="inspector-badges">
          <span class="arch-chip" style="--chip-color:${model.escapeHtml(dom.primary.color)}">
            ${model.escapeHtml(dom.primary.emoji)} Primario: ${model.escapeHtml(dom.primary.name)} (${dom.primaryScore}%)
          </span>
          <span class="arch-chip is-secondary" style="--chip-color:${model.escapeHtml(dom.secondary.color)}">
            ${model.escapeHtml(dom.secondary.emoji)} Secundario: ${model.escapeHtml(dom.secondary.name)} (${dom.secondaryScore}%)
          </span>
          <span class="arch-chip is-zone">${model.escapeHtml(sectorText)}</span>
        </div>
        ${person.bio ? `<p class="inspector-bio">${model.escapeHtml(person.bio)}</p>` : ''}
        <div class="score-bars-list">${barsHtml}</div>
      `;
      return;
    }

    const archIdx = ctx.hoveredArchetypeIndex >= 0
      ? ctx.hoveredArchetypeIndex
      : ctx.selectedArchetypeIndex;
    const arch = archIdx >= 0 ? archetypes[archIdx] : null;

    if (arch) {
      const aligned = people.filter((p) => {
        const dom = model.getDominantArchetypes(p, archetypes);
        return dom.primary.key === arch.key || (dom.sectorArchetype && dom.sectorArchetype.key === arch.key);
      });

      const traitsHtml = arch.traits
        .map((t) => `<span class="trait-tag" style="--chip-color:${model.escapeHtml(arch.color)}">${model.escapeHtml(t)}</span>`)
        .join('');

      const membersHtml = aligned.length
        ? aligned.map((p) => `
            <button type="button" class="member-mini-btn" data-person-id="${model.escapeHtml(p.id)}">
              <span>${model.escapeHtml(p.emoji || '✨')}</span>
              <span>${model.escapeHtml(p.name)}</span>
            </button>
          `).join('')
        : '<span class="muted-empty">Todavía no hay integrantes ubicados en este sector.</span>';

      container.innerHTML = `
        <div class="inspector-arch-head" style="--card-accent:${model.escapeHtml(arch.color)}">
          <div class="inspector-arch-badge">${model.escapeHtml(arch.emoji)}</div>
          <div>
            <span class="arch-kicker">Eje ${model.escapeHtml(arch.key)} · ${model.escapeHtml(arch.dimension)}</span>
            <h3>${model.escapeHtml(arch.name)}</h3>
          </div>
          ${ctx.selectedArchetypeIndex === archIdx ? '<button type="button" class="btn-mini-ghost" data-action="clear-selection">Soltar</button>' : ''}
        </div>
        <p class="inspector-bio">${model.escapeHtml(arch.description)}</p>
        <div class="traits-row">${traitsHtml}</div>
        <div class="inspector-subblock">
          <span class="subblock-label">Integrantes en este arquetipo (${aligned.length})</span>
          <div class="mini-members-grid">${membersHtml}</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="inspector-overview-head">
        <span class="arch-kicker">Psicometría científica · 6 dimensiones</span>
        <h3>¿Por qué el modelo HEXACO?</h3>
      </div>
      <p class="inspector-bio">
        El modelo <strong>HEXACO</strong> (Ashton &amp; Lee) es la evolución científica de 6 factores del célebre
        <strong>Big Five (OCEAN)</strong>, el test de personalidad con mayor validez empírica en psicología.
        Añade el eje <strong>Honestidad-Humildad (H)</strong> y forma un hexágono exacto para mapear arquetipos reales.
      </p>
      <div class="overview-tips">
        <div>✨ <strong>Pasa el mouse</strong> sobre cualquier persona para ver su radar HEXACO animado.</div>
        <div>⬡ <strong>Explora los 6 sectores</strong> para descubrir rasgos e integrantes de cada arquetipo.</div>
        ${ctx.isAlex ? '<div>✏️ <strong>Modo @alex activo:</strong> toca “Editar como Alex” para arrastrar fichas y personalizar todo.</div>' : '<div>🔐 <strong>Edición exclusiva:</strong> solo el usuario <code>@alex</code> puede editar arquetipos, nombres y posiciones.</div>'}
      </div>
    `;
  }

  function renderDirectory(ctx) {
    const listEl = ctx.el.peopleDirectoryList;
    const countEl = ctx.el.directoryCountBadge;
    if (!listEl) return;

    const query = ctx.searchQuery.trim().toLowerCase();
    const filtered = ctx.board.people.filter((p) => {
      const dom = model.getDominantArchetypes(p, ctx.board.archetypes);
      const matchesFilter = ctx.filterArchetype === 'all'
        || dom.primary.key === ctx.filterArchetype
        || (dom.sectorArchetype && dom.sectorArchetype.key === ctx.filterArchetype);
      const matchesQuery = !query
        || p.name.toLowerCase().includes(query)
        || p.alias.toLowerCase().includes(query)
        || dom.primary.name.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });

    if (countEl) countEl.textContent = `${filtered.length}/${ctx.board.people.length}`;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="muted-empty">No hay personas que coincidan con el filtro.</div>';
      return;
    }

    listEl.innerHTML = filtered.map((person) => {
      const dom = model.getDominantArchetypes(person, ctx.board.archetypes);
      const color = person.color || dom.primary.color;
      const isSelected = ctx.selectedPersonId === person.id;
      const isHovered = ctx.hoveredPersonId === person.id;
      return `
        <button
          type="button"
          class="dir-person-row ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}"
          data-person-id="${model.escapeHtml(person.id)}"
          style="--row-accent:${model.escapeHtml(color)}"
        >
          <span class="dir-emoji">${model.escapeHtml(person.emoji || '✨')}</span>
          <span class="dir-main">
            <strong>${model.escapeHtml(person.name)}</strong>
            <small>${model.escapeHtml(dom.primary.emoji)} ${model.escapeHtml(dom.primary.name)} · ${dom.primaryScore}%</small>
          </span>
          <span class="dir-badge">${model.escapeHtml(dom.primary.key)}</span>
        </button>
      `;
    }).join('');
  }

  function renderEditorPanel(ctx) {
    const { el, board } = ctx;
    const showEditor = Boolean(ctx.isAlex && ctx.editMode);
    if (el.editorPanel) el.editorPanel.hidden = !showEditor;
    if (el.inspectorSection) el.inspectorSection.hidden = showEditor;
    if (!showEditor) return;

    const tab = ctx.editorTab || 'people';
    el.editorTabBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.editorTab === tab);
    });
    if (el.editorPanePeople) el.editorPanePeople.hidden = tab !== 'people';
    if (el.editorPaneArchetypes) el.editorPaneArchetypes.hidden = tab !== 'archetypes';
    if (el.editorPaneBoard) el.editorPaneBoard.hidden = tab !== 'board';

    // 1. Editor de personas
    if (el.personSelect) {
      el.personSelect.innerHTML = board.people
        .map((p) => {
          const dom = model.getDominantArchetypes(p, board.archetypes);
          const selected = p.id === ctx.editingPersonId ? 'selected' : '';
          return `<option value="${model.escapeHtml(p.id)}" ${selected}>${model.escapeHtml(p.emoji || '✨')} ${model.escapeHtml(p.name)} (${model.escapeHtml(dom.primary.name)})</option>`;
        })
        .join('');
    }

    const activePerson = board.people.find((p) => p.id === ctx.editingPersonId) || board.people[0] || null;
    if (activePerson) {
      ctx.editingPersonId = activePerson.id;
    }

    if (el.personFormWrap) {
      el.personFormWrap.hidden = !activePerson;
    }

    if (activePerson) {
      el.editPersonName.value = activePerson.name;
      el.editPersonAlias.value = activePerson.alias;
      el.editPersonEmoji.value = activePerson.emoji;
      el.editPersonAvatar.value = activePerson.avatarUrl;
      el.editPersonBio.value = activePerson.bio;

      const dom = model.getDominantArchetypes(activePerson, board.archetypes);
      el.editPersonColor.value = activePerson.color || dom.primary.color;

      if (el.emojiPresetsRow) {
        el.emojiPresetsRow.innerHTML = model.EMOJI_PRESETS
          .map((em) => `<button type="button" class="mini-preset-btn ${activePerson.emoji === em ? 'is-active' : ''}" data-emoji="${model.escapeHtml(em)}">${model.escapeHtml(em)}</button>`)
          .join('');
      }

      if (el.personColorPresets) {
        el.personColorPresets.innerHTML = model.COLOR_PRESETS
          .map((col) => `<button type="button" class="color-swatch ${activePerson.color === col ? 'is-active' : ''}" data-color="${col}" style="background:${col}" aria-label="Color ${col}"></button>`)
          .join('');
      }

      if (el.personArchetypePresets) {
        el.personArchetypePresets.innerHTML = board.archetypes
          .map((arch) => `
            <button type="button" class="arch-preset-btn" data-preset-key="${model.escapeHtml(arch.key)}" style="--pill-accent:${model.escapeHtml(arch.color)}">
              ${model.escapeHtml(arch.emoji)} ${model.escapeHtml(arch.name)}
            </button>
          `)
          .join('');
      }

      if (el.personScoresSliders) {
        el.personScoresSliders.innerHTML = board.archetypes
          .map((arch) => {
            const val = activePerson.scores?.[arch.key] ?? 50;
            return `
              <label class="slider-row" style="--slider-color:${model.escapeHtml(arch.color)}">
                <span class="slider-head">
                  <span>${model.escapeHtml(arch.emoji)} ${model.escapeHtml(arch.name)} <small>(${model.escapeHtml(arch.key)})</small></span>
                  <strong data-score-readout="${model.escapeHtml(arch.key)}">${val}%</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value="${val}"
                  data-score-key="${model.escapeHtml(arch.key)}"
                >
              </label>
            `;
          })
          .join('');
      }
    }

    // 2. Editor de arquetipos
    if (el.archetypeSelectorPills) {
      el.archetypeSelectorPills.innerHTML = board.archetypes
        .map((arch, idx) => `
          <button
            type="button"
            class="arch-edit-tab ${ctx.editingArchetypeIndex === idx ? 'is-active' : ''}"
            data-edit-arch-idx="${idx}"
            style="--pill-accent:${model.escapeHtml(arch.color)}"
          >
            <span>${model.escapeHtml(arch.emoji)}</span>
            <span>${model.escapeHtml(arch.key)}</span>
          </button>
        `)
        .join('');
    }

    const activeArch = board.archetypes[ctx.editingArchetypeIndex] || board.archetypes[0];
    if (activeArch) {
      el.editArchName.value = activeArch.name;
      el.editArchDimension.value = activeArch.dimension;
      el.editArchEmoji.value = activeArch.emoji;
      el.editArchColor.value = activeArch.color;
      el.editArchDescription.value = activeArch.description;
      el.editArchTraits.value = activeArch.traits.join(', ');

      if (el.archColorPresets) {
        el.archColorPresets.innerHTML = model.COLOR_PRESETS
          .map((col) => `<button type="button" class="color-swatch ${activeArch.color === col ? 'is-active' : ''}" data-arch-color="${col}" style="background:${col}" aria-label="Color ${col}"></button>`)
          .join('');
      }
    }

    // 3. Editor del tablero
    if (el.editBoardTitle) el.editBoardTitle.value = board.title;
    if (el.editBoardSubtitle) el.editBoardSubtitle.value = board.subtitle;
  }

  function openAlexModal(ctx, errorMsg = '') {
    const { el } = ctx;
    if (!el.alexAuthModal) return;
    el.alexAuthModal.hidden = false;
    if (el.alexAuthError) {
      el.alexAuthError.textContent = errorMsg;
      el.alexAuthError.hidden = !errorMsg;
    }
    if (el.alexAuthHint) {
      el.alexAuthHint.textContent = ctx.storageMode === 'local'
        ? 'Modo prueba local: ingresa tu clave o una clave de al menos 4 caracteres para editar.'
        : 'Usa la misma clave/PIN de tu cuenta @alex en el Series Tracker.';
    }
    if (el.alexPinInput) {
      el.alexPinInput.value = '';
      el.alexPinInput.type = 'password';
      setTimeout(() => el.alexPinInput.focus(), 40);
    }
  }

  function closeAlexModal(ctx) {
    if (ctx.el.alexAuthModal) {
      ctx.el.alexAuthModal.hidden = true;
    }
  }

  global.HexagonoApp = global.HexagonoApp || {};
  global.HexagonoApp.editorUi = {
    renderTopbar,
    renderBoardHeader,
    renderInspectorCard,
    renderDirectory,
    renderEditorPanel,
    openAlexModal,
    closeAlexModal
  };
})(window);
