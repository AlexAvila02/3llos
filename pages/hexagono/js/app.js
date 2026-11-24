/**
 * Orquestador principal del Hexágono de Arquetipos: estado compartido,
 * autenticación exclusiva de @alex, sincronización en la nube y eventos.
 */
(function (global) {
  const { model, storage, view, editorUi } = global.HexagonoApp;

  function collectDom() {
    return {
      backHomeBtn: document.getElementById('back-home-btn'),
      syncStatusBadge: document.getElementById('sync-status-badge'),
      soundToggleBtn: document.getElementById('sound-toggle-btn'),
      avgToggleBtn: document.getElementById('avg-toggle-btn'),
      alexLoginBtn: document.getElementById('alex-login-btn'),
      editModeBtn: document.getElementById('edit-mode-btn'),
      saveNowBtn: document.getElementById('save-now-btn'),
      alexLogoutBtn: document.getElementById('alex-logout-btn'),

      storageNotice: document.getElementById('storage-notice'),
      storageNoticeText: document.getElementById('storage-notice-text'),
      storageNoticeClose: document.getElementById('storage-notice-close'),

      boardTitle: document.getElementById('board-title'),
      boardSubtitle: document.getElementById('board-subtitle'),
      boardUpdatedMeta: document.getElementById('board-updated-meta'),
      archetypeFilterBar: document.getElementById('archetype-filter-bar'),

      hexStage: document.getElementById('hex-stage'),
      hexTiltLayer: document.getElementById('hex-tilt-layer'),
      hexFxCanvas: document.getElementById('hex-fx-canvas'),
      hexSvg: document.getElementById('hex-svg'),
      hexTooltip: document.getElementById('hex-tooltip'),

      inspectorSection: document.getElementById('inspector-section'),
      inspectorCard: document.getElementById('inspector-card'),
      directorySearchInput: document.getElementById('directory-search-input'),
      directoryCountBadge: document.getElementById('directory-count-badge'),
      peopleDirectoryList: document.getElementById('people-directory-list'),

      editorPanel: document.getElementById('editor-panel'),
      editorTabBtns: document.querySelectorAll('[data-editor-tab]'),
      editorPanePeople: document.getElementById('editor-pane-people'),
      editorPaneArchetypes: document.getElementById('editor-pane-archetypes'),
      editorPaneBoard: document.getElementById('editor-pane-board'),

      addPersonBtn: document.getElementById('add-person-btn'),
      personSelect: document.getElementById('person-select'),
      personFormWrap: document.getElementById('person-form-wrap'),
      editPersonName: document.getElementById('edit-person-name'),
      editPersonAlias: document.getElementById('edit-person-alias'),
      editPersonEmoji: document.getElementById('edit-person-emoji'),
      emojiPresetsRow: document.getElementById('emoji-presets-row'),
      editPersonAvatar: document.getElementById('edit-person-avatar'),
      editPersonColor: document.getElementById('edit-person-color'),
      personColorPresets: document.getElementById('person-color-presets'),
      editPersonColorClear: document.getElementById('edit-person-color-clear'),
      editPersonBio: document.getElementById('edit-person-bio'),
      personArchetypePresets: document.getElementById('person-archetype-presets'),
      personScoresSliders: document.getElementById('person-scores-sliders'),
      recalcPosBtn: document.getElementById('recalc-pos-btn'),
      deletePersonBtn: document.getElementById('delete-person-btn'),

      archetypeSelectorPills: document.getElementById('archetype-selector-pills'),
      editArchName: document.getElementById('edit-arch-name'),
      editArchDimension: document.getElementById('edit-arch-dimension'),
      editArchEmoji: document.getElementById('edit-arch-emoji'),
      editArchColor: document.getElementById('edit-arch-color'),
      archColorPresets: document.getElementById('arch-color-presets'),
      editArchDescription: document.getElementById('edit-arch-description'),
      editArchTraits: document.getElementById('edit-arch-traits'),
      resetArchetypesBtn: document.getElementById('reset-archetypes-btn'),

      editBoardTitle: document.getElementById('edit-board-title'),
      editBoardSubtitle: document.getElementById('edit-board-subtitle'),
      exportJsonBtn: document.getElementById('export-json-btn'),
      importJsonBtn: document.getElementById('import-json-btn'),
      importJsonInput: document.getElementById('import-json-input'),
      resetBoardBtn: document.getElementById('reset-board-btn'),

      alexAuthModal: document.getElementById('alex-auth-modal'),
      alexAuthCloseBtn: document.getElementById('alex-auth-close-btn'),
      alexAuthForm: document.getElementById('alex-auth-form'),
      alexPinInput: document.getElementById('alex-pin-input'),
      togglePinBtn: document.getElementById('toggle-pin-btn'),
      alexAuthError: document.getElementById('alex-auth-error'),
      alexAuthSubmitBtn: document.getElementById('alex-auth-submit-btn'),
      alexAuthHint: document.getElementById('alex-auth-hint'),

      toast: document.getElementById('toast')
    };
  }

  function loadSoundPreference() {
    try {
      const saved = localStorage.getItem(model.SOUND_PREF_KEY);
      return saved !== 'off';
    } catch {
      return true;
    }
  }

  function createAppContext() {
    const ctx = {
      board: model.createDefaultBoard(),
      alexSession: storage.loadAlexSession(),
      isAlex: false,
      editMode: false,
      editorTab: 'people',
      storageMode: 'cloud',
      kvUnconfigured: false,
      syncStatus: 'readonly',
      updatedAt: null,
      saveDebounceTimer: null,
      syncInFlight: false,
      pendingSync: false,
      selectedPersonId: null,
      hoveredPersonId: null,
      selectedArchetypeIndex: -1,
      hoveredArchetypeIndex: -1,
      editingPersonId: null,
      editingArchetypeIndex: 0,
      filterArchetype: 'all',
      searchQuery: '',
      showGroupAverage: false,
      soundEnabled: loadSoundPreference(),
      toastTimeout: null,
      lastTickAt: 0,
      el: collectDom(),
      api: null,
      hexView: null
    };

    ctx.showToast = function showToast(msg) {
      if (!ctx.el.toast) return;
      ctx.el.toast.textContent = msg;
      ctx.el.toast.hidden = false;
      if (ctx.toastTimeout) clearTimeout(ctx.toastTimeout);
      ctx.toastTimeout = setTimeout(() => {
        ctx.el.toast.hidden = true;
      }, 3000);
    };

    ctx.showNotice = function showNotice(htmlText) {
      if (!ctx.el.storageNotice || !ctx.el.storageNoticeText) return;
      ctx.el.storageNoticeText.innerHTML = htmlText;
      ctx.el.storageNotice.hidden = false;
    };

    ctx.playPop = function playPop() {
      if (ctx.soundEnabled && typeof global.playPopSound === 'function') {
        global.playPopSound();
      }
    };

    ctx.playHoverTick = function playHoverTick(index) {
      if (!ctx.soundEnabled || typeof global.playTone !== 'function') return;
      const now = Date.now();
      if (now - ctx.lastTickAt < 90) return;
      ctx.lastTickAt = now;
      const freqs = [392, 440, 493.88, 523.25, 587.33, 659.25];
      const base = freqs[index % freqs.length] || 440;
      global.playTone({ startFreq: base, endFreq: base * 1.12, duration: 0.08, volume: 0.06, ramp: 'exponential' });
    };

    ctx.playPersonHoverSound = function playPersonHoverSound() {
      if (!ctx.soundEnabled || typeof global.playTone !== 'function') return;
      const now = Date.now();
      if (now - ctx.lastTickAt < 90) return;
      ctx.lastTickAt = now;
      global.playTone({ startFreq: 540, endFreq: 720, duration: 0.07, volume: 0.05, ramp: 'exponential' });
    };

    ctx.setHoveredPerson = function setHoveredPerson(personId) {
      if (ctx.hoveredPersonId === personId) return;
      ctx.hoveredPersonId = personId;
      ctx.hexView.updateVisualHighlights();
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
    };

    ctx.setHoveredArchetype = function setHoveredArchetype(idx) {
      if (ctx.hoveredArchetypeIndex === idx) return;
      ctx.hoveredArchetypeIndex = idx;
      ctx.hexView.updateVisualHighlights();
      editorUi.renderInspectorCard(ctx);
    };

    ctx.selectPerson = function selectPerson(personId, options = {}) {
      const toggleOff = !options.silent && ctx.selectedPersonId === personId && !ctx.editMode;
      ctx.selectedPersonId = toggleOff ? null : personId;
      if (ctx.selectedPersonId) {
        ctx.selectedArchetypeIndex = -1;
        ctx.editingPersonId = ctx.selectedPersonId;
      }
      if (!options.silent) ctx.playPop();
      ctx.hexView.updateVisualHighlights();
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
      if (ctx.editMode && ctx.isAlex) {
        editorUi.renderEditorPanel(ctx);
      }
    };

    ctx.toggleArchetypeSelection = function toggleArchetypeSelection(idx) {
      ctx.playPop();
      ctx.selectedPersonId = null;
      ctx.selectedArchetypeIndex = ctx.selectedArchetypeIndex === idx ? -1 : idx;
      ctx.editingArchetypeIndex = idx;
      ctx.hexView.updateVisualHighlights();
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
      if (ctx.editMode && ctx.isAlex) {
        editorUi.renderEditorPanel(ctx);
      }
    };

    ctx.clearSelection = function clearSelection() {
      ctx.selectedPersonId = null;
      ctx.selectedArchetypeIndex = -1;
      ctx.hexView.updateVisualHighlights();
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
    };

    ctx.onPersonDragged = function onPersonDragged(personId) {
      ctx.selectedPersonId = personId;
      ctx.editingPersonId = personId;
      ctx.playPop();
      ctx.scheduleSave();
      ctx.hexView.updateVisualHighlights();
      editorUi.renderBoardHeader(ctx);
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
      editorUi.renderEditorPanel(ctx);
    };

    ctx.performSave = async function performSave(useKeepalive = false) {
      if (!ctx.isAlex || !ctx.alexSession) return;
      if (ctx.syncInFlight || !ctx.pendingSync) return;

      ctx.syncInFlight = true;
      try {
        while (ctx.pendingSync && ctx.isAlex && ctx.alexSession) {
          const snapshot = model.sanitizeBoard(ctx.board);
          ctx.pendingSync = false;
          const res = await ctx.api.saveBoard(ctx.alexSession.token, snapshot, useKeepalive);
          if (res.updatedAt) ctx.updatedAt = res.updatedAt;
        }
        if (!ctx.pendingSync) {
          ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : 'saved';
          editorUi.renderTopbar(ctx);
          editorUi.renderBoardHeader(ctx);
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          storage.persistAlexSession(null);
          ctx.alexSession = null;
          ctx.isAlex = false;
          ctx.editMode = false;
          ctx.pendingSync = false;
          ctx.syncStatus = 'error';
          ctx.renderAll();
          editorUi.openAlexModal(ctx, 'Tu sesión de @alex venció. Ingresa tu clave para guardar cambios.');
        } else {
          ctx.syncStatus = 'error';
          editorUi.renderTopbar(ctx);
          ctx.showToast(err.message || 'No se pudieron guardar los cambios.');
        }
      } finally {
        ctx.syncInFlight = false;
        if (ctx.pendingSync && ctx.isAlex && ctx.alexSession) {
          ctx.performSave(useKeepalive);
        }
      }
    };

    ctx.scheduleSave = function scheduleSave(immediate = false) {
      if (!ctx.isAlex || !ctx.alexSession) return;
      ctx.pendingSync = true;
      ctx.syncStatus = 'saving';
      editorUi.renderTopbar(ctx);

      if (ctx.saveDebounceTimer) clearTimeout(ctx.saveDebounceTimer);
      ctx.saveDebounceTimer = setTimeout(() => {
        ctx.saveDebounceTimer = null;
        ctx.performSave(false);
      }, immediate ? 0 : 650);
    };

    ctx.flushSave = async function flushSave(useKeepalive = false) {
      if (ctx.saveDebounceTimer) {
        clearTimeout(ctx.saveDebounceTimer);
        ctx.saveDebounceTimer = null;
      }
      if (!ctx.pendingSync || !ctx.isAlex || !ctx.alexSession) return;
      await ctx.performSave(useKeepalive);
    };

    ctx.renderAll = function renderAll() {
      editorUi.renderTopbar(ctx);
      editorUi.renderBoardHeader(ctx);
      ctx.hexView.renderBoard();
      editorUi.renderInspectorCard(ctx);
      editorUi.renderDirectory(ctx);
      editorUi.renderEditorPanel(ctx);
    };

    ctx.api = storage.createBackendClient(ctx);
    ctx.hexView = view.createHexagonView(ctx);
    return ctx;
  }

  function bindEvents(ctx) {
    const { el } = ctx;

    if (el.backHomeBtn) {
      el.backHomeBtn.addEventListener('click', (e) => {
        if (typeof global.navigateWithCloseSound === 'function') {
          global.navigateWithCloseSound(e, el.backHomeBtn.href, 160);
        }
      });
    }

    if (el.storageNoticeClose) {
      el.storageNoticeClose.addEventListener('click', () => {
        el.storageNotice.hidden = true;
      });
    }

    if (el.soundToggleBtn) {
      el.soundToggleBtn.addEventListener('click', () => {
        ctx.soundEnabled = !ctx.soundEnabled;
        try {
          localStorage.setItem(model.SOUND_PREF_KEY, ctx.soundEnabled ? 'on' : 'off');
        } catch {
          // Ignorar error de almacenamiento
        }
        editorUi.renderTopbar(ctx);
        if (ctx.soundEnabled) ctx.playPop();
      });
    }

    if (el.avgToggleBtn) {
      el.avgToggleBtn.addEventListener('click', () => {
        ctx.playPop();
        ctx.showGroupAverage = !ctx.showGroupAverage;
        editorUi.renderTopbar(ctx);
        ctx.hexView.renderGroupAveragePolygon();
      });
    }

    if (el.alexLoginBtn) {
      el.alexLoginBtn.addEventListener('click', () => {
        ctx.playPop();
        editorUi.openAlexModal(ctx);
      });
    }

    if (el.editModeBtn) {
      el.editModeBtn.addEventListener('click', () => {
        if (!ctx.isAlex) return;
        ctx.playPop();
        ctx.editMode = !ctx.editMode;
        if (ctx.editMode && !ctx.editingPersonId && ctx.board.people.length) {
          ctx.editingPersonId = ctx.selectedPersonId || ctx.board.people[0].id;
        }
        ctx.renderAll();
      });
    }

    if (el.saveNowBtn) {
      el.saveNowBtn.addEventListener('click', async () => {
        if (!ctx.isAlex) return;
        ctx.playPop();
        ctx.pendingSync = true;
        await ctx.flushSave(false);
        ctx.showToast('Tablero guardado');
      });
    }

    if (el.alexLogoutBtn) {
      el.alexLogoutBtn.addEventListener('click', async () => {
        ctx.playPop();
        await ctx.flushSave(false);
        const oldToken = ctx.alexSession?.token;
        storage.persistAlexSession(null);
        ctx.alexSession = null;
        ctx.isAlex = false;
        ctx.editMode = false;
        ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : 'readonly';
        if (oldToken) {
          ctx.api.logoutAlex(oldToken);
        }
        ctx.renderAll();
        ctx.showToast('Sesión de @alex cerrada');
      });
    }

    // Filtros por arquetipo
    if (el.archetypeFilterBar) {
      el.archetypeFilterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        ctx.playPop();
        ctx.filterArchetype = btn.dataset.filter || 'all';
        editorUi.renderBoardHeader(ctx);
        ctx.hexView.updateVisualHighlights();
        editorUi.renderDirectory(ctx);
      });
    }

    // Inspector y directorio
    if (el.inspectorCard) {
      el.inspectorCard.addEventListener('click', (e) => {
        const clearBtn = e.target.closest('[data-action="clear-selection"]');
        if (clearBtn) {
          ctx.playPop();
          ctx.clearSelection();
          return;
        }
        const memberBtn = e.target.closest('[data-person-id]');
        if (memberBtn) {
          ctx.selectPerson(memberBtn.dataset.personId);
        }
      });
    }

    if (el.directorySearchInput) {
      el.directorySearchInput.addEventListener('input', (e) => {
        ctx.searchQuery = e.target.value;
        ctx.hexView.updateVisualHighlights();
        editorUi.renderDirectory(ctx);
      });
    }

    if (el.peopleDirectoryList) {
      el.peopleDirectoryList.addEventListener('mouseover', (e) => {
        const row = e.target.closest('[data-person-id]');
        if (row) ctx.setHoveredPerson(row.dataset.personId);
      });
      el.peopleDirectoryList.addEventListener('mouseleave', () => {
        ctx.setHoveredPerson(null);
      });
      el.peopleDirectoryList.addEventListener('click', (e) => {
        const row = e.target.closest('[data-person-id]');
        if (row) ctx.selectPerson(row.dataset.personId);
      });
    }

    // Estudio de edición Alex: pestañas
    el.editorTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.playPop();
        ctx.editorTab = btn.dataset.editorTab;
        editorUi.renderEditorPanel(ctx);
      });
    });

    // Editor de personas
    if (el.addPersonBtn) {
      el.addPersonBtn.addEventListener('click', () => {
        if (!ctx.isAlex) return;
        if (ctx.board.people.length >= model.MAX_PEOPLE) {
          ctx.showToast(`Máximo de ${model.MAX_PEOPLE} personas alcanzado.`);
          return;
        }
        ctx.playPop();
        const key = ctx.board.archetypes[ctx.editingArchetypeIndex]?.key || 'O';
        const nextPerson = model.createPersonFromArchetype(key, ctx.board.archetypes);
        ctx.board.people.push(nextPerson);
        ctx.editingPersonId = nextPerson.id;
        ctx.selectedPersonId = nextPerson.id;
        ctx.scheduleSave();
        ctx.renderAll();
        if (el.editPersonName) {
          el.editPersonName.focus();
          el.editPersonName.select();
        }
      });
    }

    if (el.personSelect) {
      el.personSelect.addEventListener('change', (e) => {
        ctx.editingPersonId = e.target.value;
        ctx.selectedPersonId = e.target.value;
        ctx.hexView.updateVisualHighlights();
        editorUi.renderEditorPanel(ctx);
        editorUi.renderDirectory(ctx);
      });
    }

    const getEditingPerson = () => ctx.board.people.find((p) => p.id === ctx.editingPersonId) || null;

    const refreshPersonVisuals = () => {
      ctx.scheduleSave();
      ctx.hexView.renderBoard();
      editorUi.renderBoardHeader(ctx);
      editorUi.renderDirectory(ctx);
    };

    if (el.editPersonName) {
      el.editPersonName.addEventListener('input', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        person.name = e.target.value.slice(0, 40) || 'Sin nombre';
        refreshPersonVisuals();
      });
    }

    if (el.editPersonAlias) {
      el.editPersonAlias.addEventListener('input', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        person.alias = e.target.value.slice(0, 40);
        ctx.scheduleSave();
      });
    }

    if (el.editPersonEmoji) {
      el.editPersonEmoji.addEventListener('input', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        person.emoji = e.target.value.trim().slice(0, 8) || '✨';
        refreshPersonVisuals();
      });
    }

    if (el.emojiPresetsRow) {
      el.emojiPresetsRow.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-emoji]');
        const person = getEditingPerson();
        if (!btn || !person) return;
        ctx.playPop();
        person.emoji = btn.dataset.emoji;
        el.editPersonEmoji.value = person.emoji;
        refreshPersonVisuals();
        editorUi.renderEditorPanel(ctx);
      });
    }

    if (el.editPersonAvatar) {
      el.editPersonAvatar.addEventListener('change', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        const clean = model.sanitizeAvatarUrl(e.target.value);
        if (e.target.value.trim() && !clean) {
          ctx.showToast('URL no válida. Usa https://... o una ruta de assets.');
        }
        person.avatarUrl = clean;
        e.target.value = clean;
        refreshPersonVisuals();
      });
    }

    if (el.editPersonColor) {
      el.editPersonColor.addEventListener('input', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        person.color = model.isValidHexColor(e.target.value) ? e.target.value : '';
        refreshPersonVisuals();
      });
    }

    if (el.personColorPresets) {
      el.personColorPresets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-color]');
        const person = getEditingPerson();
        if (!btn || !person) return;
        ctx.playPop();
        person.color = btn.dataset.color;
        refreshPersonVisuals();
        editorUi.renderEditorPanel(ctx);
      });
    }

    if (el.editPersonColorClear) {
      el.editPersonColorClear.addEventListener('click', () => {
        const person = getEditingPerson();
        if (!person) return;
        ctx.playPop();
        person.color = '';
        refreshPersonVisuals();
        editorUi.renderEditorPanel(ctx);
      });
    }

    if (el.editPersonBio) {
      el.editPersonBio.addEventListener('input', (e) => {
        const person = getEditingPerson();
        if (!person) return;
        person.bio = e.target.value.slice(0, 260);
        ctx.scheduleSave();
      });
    }

    if (el.personArchetypePresets) {
      el.personArchetypePresets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset-key]');
        const person = getEditingPerson();
        if (!btn || !person) return;
        ctx.playPop();
        const key = btn.dataset.presetKey;
        model.ARCHETYPE_KEYS.forEach((k) => {
          person.scores[k] = k === key ? 90 : 48;
        });
        person.pos = model.scoresToHexPosition(person.scores);
        person.manualPos = false;
        ctx.scheduleSave();
        ctx.renderAll();
      });
    }

    if (el.personScoresSliders) {
      el.personScoresSliders.addEventListener('input', (e) => {
        const input = e.target.closest('input[data-score-key]');
        const person = getEditingPerson();
        if (!input || !person) return;
        const key = input.dataset.scoreKey;
        const val = Math.min(100, Math.max(0, Math.round(Number(input.value) || 0)));
        person.scores[key] = val;
        const readout = el.personScoresSliders.querySelector(`[data-score-readout="${key}"]`);
        if (readout) readout.textContent = `${val}%`;
        ctx.scheduleSave();
        ctx.hexView.updateVisualHighlights();
        ctx.hexView.renderGroupAveragePolygon();
        editorUi.renderBoardHeader(ctx);
        editorUi.renderDirectory(ctx);
      });
    }

    if (el.recalcPosBtn) {
      el.recalcPosBtn.addEventListener('click', () => {
        const person = getEditingPerson();
        if (!person) return;
        ctx.playPop();
        person.pos = model.scoresToHexPosition(person.scores);
        person.manualPos = false;
        ctx.scheduleSave();
        ctx.renderAll();
        ctx.showToast('Posición calculada según sus puntajes HEXACO');
      });
    }

    if (el.deletePersonBtn) {
      el.deletePersonBtn.addEventListener('click', () => {
        const person = getEditingPerson();
        if (!person) return;
        if (!global.confirm(`¿Eliminar a "${person.name}" del hexágono?`)) return;
        ctx.playPop();
        ctx.board.people = ctx.board.people.filter((p) => p.id !== person.id);
        ctx.editingPersonId = ctx.board.people[0]?.id || null;
        if (ctx.selectedPersonId === person.id) ctx.selectedPersonId = null;
        if (ctx.hoveredPersonId === person.id) ctx.hoveredPersonId = null;
        ctx.scheduleSave();
        ctx.renderAll();
        ctx.showToast('Persona eliminada');
      });
    }

    // Editor de arquetipos
    if (el.archetypeSelectorPills) {
      el.archetypeSelectorPills.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit-arch-idx]');
        if (!btn) return;
        ctx.playPop();
        ctx.editingArchetypeIndex = Number(btn.dataset.editArchIdx) || 0;
        ctx.selectedArchetypeIndex = ctx.editingArchetypeIndex;
        ctx.hexView.updateVisualHighlights();
        editorUi.renderEditorPanel(ctx);
      });
    }

    const getEditingArch = () => ctx.board.archetypes[ctx.editingArchetypeIndex] || ctx.board.archetypes[0];
    const refreshArchVisuals = () => {
      ctx.scheduleSave();
      ctx.hexView.renderBoard();
      editorUi.renderBoardHeader(ctx);
      editorUi.renderDirectory(ctx);
    };

    if (el.editArchName) {
      el.editArchName.addEventListener('input', (e) => {
        const arch = getEditingArch();
        arch.name = e.target.value.slice(0, 40) || arch.key;
        refreshArchVisuals();
      });
    }

    if (el.editArchDimension) {
      el.editArchDimension.addEventListener('input', (e) => {
        const arch = getEditingArch();
        arch.dimension = e.target.value.slice(0, 50);
        refreshArchVisuals();
      });
    }

    if (el.editArchEmoji) {
      el.editArchEmoji.addEventListener('input', (e) => {
        const arch = getEditingArch();
        arch.emoji = e.target.value.trim().slice(0, 8) || '⬡';
        refreshArchVisuals();
      });
    }

    if (el.editArchColor) {
      el.editArchColor.addEventListener('input', (e) => {
        const arch = getEditingArch();
        if (model.isValidHexColor(e.target.value)) {
          arch.color = e.target.value;
          refreshArchVisuals();
        }
      });
    }

    if (el.archColorPresets) {
      el.archColorPresets.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-arch-color]');
        if (!btn) return;
        ctx.playPop();
        const arch = getEditingArch();
        arch.color = btn.dataset.archColor;
        refreshArchVisuals();
        editorUi.renderEditorPanel(ctx);
      });
    }

    if (el.editArchDescription) {
      el.editArchDescription.addEventListener('input', (e) => {
        const arch = getEditingArch();
        arch.description = e.target.value.slice(0, 280);
        ctx.scheduleSave();
      });
    }

    if (el.editArchTraits) {
      el.editArchTraits.addEventListener('input', (e) => {
        const arch = getEditingArch();
        const traits = e.target.value
          .split(',')
          .map((t) => t.trim().slice(0, 24))
          .filter(Boolean)
          .slice(0, 6);
        arch.traits = traits.length ? traits : ['Rasgo'];
        ctx.scheduleSave();
      });
    }

    if (el.resetArchetypesBtn) {
      el.resetArchetypesBtn.addEventListener('click', () => {
        if (!global.confirm('¿Restaurar los nombres y descripciones originales del modelo HEXACO?')) return;
        ctx.playPop();
        ctx.board.archetypes = model.createDefaultArchetypes();
        ctx.scheduleSave();
        ctx.renderAll();
        ctx.showToast('Arquetipos HEXACO restaurados');
      });
    }

    // Editor del tablero (título, JSON, reset)
    if (el.editBoardTitle) {
      el.editBoardTitle.addEventListener('input', (e) => {
        ctx.board.title = e.target.value.slice(0, 80) || 'Hexágono de Arquetipos';
        ctx.scheduleSave();
        editorUi.renderBoardHeader(ctx);
      });
    }

    if (el.editBoardSubtitle) {
      el.editBoardSubtitle.addEventListener('input', (e) => {
        ctx.board.subtitle = e.target.value.slice(0, 200);
        ctx.scheduleSave();
        editorUi.renderBoardHeader(ctx);
      });
    }

    if (el.exportJsonBtn) {
      el.exportJsonBtn.addEventListener('click', () => {
        ctx.playPop();
        const blob = new Blob([JSON.stringify(ctx.board, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hexagono-arquetipos.json';
        a.click();
        URL.revokeObjectURL(url);
        ctx.showToast('JSON exportado');
      });
    }

    if (el.importJsonBtn && el.importJsonInput) {
      el.importJsonBtn.addEventListener('click', () => {
        ctx.playPop();
        el.importJsonInput.value = '';
        el.importJsonInput.click();
      });
      el.importJsonInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          ctx.board = model.sanitizeBoard(parsed);
          ctx.editingPersonId = ctx.board.people[0]?.id || null;
          ctx.scheduleSave(true);
          ctx.renderAll();
          ctx.showToast('Tablero importado y guardado');
        } catch {
          ctx.showToast('Archivo JSON inválido');
        }
      });
    }

    if (el.resetBoardBtn) {
      el.resetBoardBtn.addEventListener('click', () => {
        if (!global.confirm('¿Restaurar todo el tablero (arquetipos y miembros iniciales) a la plantilla base?')) return;
        ctx.playPop();
        ctx.board = model.createDefaultBoard();
        ctx.editingPersonId = ctx.board.people[0]?.id || null;
        ctx.selectedPersonId = null;
        ctx.scheduleSave(true);
        ctx.renderAll();
        ctx.showToast('Tablero restaurado');
      });
    }

    // Modal de acceso exclusivo @alex
    if (el.alexAuthCloseBtn) {
      el.alexAuthCloseBtn.addEventListener('click', () => editorUi.closeAlexModal(ctx));
    }
    if (el.alexAuthModal) {
      el.alexAuthModal.addEventListener('click', (e) => {
        if (e.target === el.alexAuthModal) editorUi.closeAlexModal(ctx);
      });
    }
    if (el.togglePinBtn && el.alexPinInput) {
      el.togglePinBtn.addEventListener('click', () => {
        el.alexPinInput.type = el.alexPinInput.type === 'password' ? 'text' : 'password';
      });
    }
    if (el.alexAuthForm) {
      el.alexAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.alexAuthError.hidden = true;
        const pin = el.alexPinInput.value.trim();
        if (pin.length < 4) {
          el.alexAuthError.textContent = 'Ingresa tu clave de al menos 4 caracteres.';
          el.alexAuthError.hidden = false;
          return;
        }

        el.alexAuthSubmitBtn.disabled = true;
        el.alexAuthSubmitBtn.textContent = 'Verificando...';
        try {
          const session = await ctx.api.loginAsAlex(pin);
          ctx.alexSession = session;
          storage.persistAlexSession(session);
          ctx.isAlex = true;
          ctx.editMode = true;
          ctx.editingPersonId = ctx.selectedPersonId || ctx.board.people[0]?.id || null;
          ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : 'saved';
          editorUi.closeAlexModal(ctx);
          ctx.renderAll();
          ctx.showToast('Bienvenido @alex · Modo edición activado');
        } catch (err) {
          el.alexAuthError.textContent = err.message || 'No se pudo iniciar sesión como @alex.';
          el.alexAuthError.hidden = false;
        } finally {
          el.alexAuthSubmitBtn.disabled = false;
          el.alexAuthSubmitBtn.textContent = 'Desbloquear edición';
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.alexAuthModal && !el.alexAuthModal.hidden) {
          editorUi.closeAlexModal(ctx);
        } else {
          ctx.clearSelection();
        }
      }
    });

    global.addEventListener('beforeunload', () => {
      if (ctx.pendingSync && ctx.isAlex && ctx.alexSession) {
        ctx.flushSave(true);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && ctx.pendingSync && ctx.isAlex && ctx.alexSession) {
        ctx.flushSave(true);
      }
    });
  }

  async function init() {
    const ctx = createAppContext();
    bindEvents(ctx);
    ctx.hexView.start();

    try {
      const loaded = await ctx.api.loadBoard(ctx.alexSession?.token || null);
      ctx.board = loaded.board;
      ctx.updatedAt = loaded.updatedAt;
      ctx.isAlex = Boolean(ctx.alexSession && loaded.canEdit);
      if (ctx.alexSession && !loaded.canEdit && ctx.storageMode === 'cloud') {
        storage.persistAlexSession(null);
        ctx.alexSession = null;
      }
      ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : (ctx.isAlex ? 'saved' : 'readonly');
    } catch (err) {
      ctx.showNotice(
        `<strong>No se pudo conectar con la nube:</strong> ${model.escapeHtml(err.message)}. Mostrando plantilla base.`
      );
      ctx.isAlex = false;
      ctx.syncStatus = 'error';
    }

    ctx.editingPersonId = ctx.board.people[0]?.id || null;
    ctx.renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
