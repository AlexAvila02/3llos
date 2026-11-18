/**
 * Orquestador principal de Series Tracker: estado compartido, sincronización en la nube,
 * eventos de interfaz e inicialización.
 */
(function (global) {
  const { model, storage, chart, episodesUi, modalsUi } = global.SeriesTracker;

  /**
   * Recolecta todas las referencias del DOM utilizadas por la aplicación.
   */
  function collectDom() {
    return {
      seriesTabs: document.getElementById('series-tabs'),
      addSeriesBtn: document.getElementById('add-series-btn'),
      seriesTitleInput: document.getElementById('series-title-input'),
      deleteSeriesBtn: document.getElementById('delete-series-btn'),
      seasonTabs: document.getElementById('season-tabs'),
      addSeasonBtn: document.getElementById('add-season-btn'),
      deleteSeasonBtn: document.getElementById('delete-season-btn'),
      scopeSeasonBtn: document.getElementById('scope-season-btn'),
      scopeSeriesBtn: document.getElementById('scope-series-btn'),

      statSeasonAvg: document.getElementById('stat-season-avg'),
      statSeasonAvgSub: document.getElementById('stat-season-avg-sub'),
      statSeriesAvg: document.getElementById('stat-series-avg'),
      statSeriesAvgSub: document.getElementById('stat-series-avg-sub'),
      statMaxEp: document.getElementById('stat-max-ep'),
      statMaxEpSub: document.getElementById('stat-max-ep-sub'),
      statMinEp: document.getElementById('stat-min-ep'),
      statMinEpSub: document.getElementById('stat-min-ep-sub'),
      statProgress: document.getElementById('stat-progress'),
      statProgressBar: document.getElementById('stat-progress-bar'),
      statProgressSub: document.getElementById('stat-progress-sub'),

      chartSubtitle: document.getElementById('chart-subtitle'),
      legendSeasonAvgItem: document.getElementById('legend-season-avg-item'),
      legendSeriesAvgItem: document.getElementById('legend-series-avg-item'),
      chartContainer: document.getElementById('chart-container'),
      chartCanvas: document.getElementById('ratings-chart'),
      chartTooltip: document.getElementById('chart-tooltip'),
      chartEmpty: document.getElementById('chart-empty'),
      chartEmptyHint: document.getElementById('chart-empty-hint'),

      episodesSectionTitle: document.getElementById('episodes-section-title'),
      episodesCountBadge: document.getElementById('episodes-count-badge'),
      filterBtns: document.querySelectorAll('.filter-btn'),
      batchCountInput: document.getElementById('batch-count-input'),
      batchAddBtn: document.getElementById('batch-add-btn'),
      addEpisodeBtn: document.getElementById('add-episode-btn'),
      episodesList: document.getElementById('episodes-list'),

      syncStatusBadge: document.getElementById('sync-status-badge'),
      openUsersBtn: document.getElementById('open-users-btn'),
      usersCountBadge: document.getElementById('users-count-badge'),
      shareProfileBtn: document.getElementById('share-profile-btn'),
      accountDropdown: document.getElementById('account-dropdown'),
      accountBtn: document.getElementById('account-btn'),
      accountBtnLabel: document.getElementById('account-btn-label'),
      accountMenu: document.getElementById('account-menu'),
      accountMenuHeader: document.getElementById('account-menu-header'),
      accountMenuName: document.getElementById('account-menu-name'),
      accountMenuSlug: document.getElementById('account-menu-slug'),
      goMyTrackerBtn: document.getElementById('go-my-tracker-btn'),
      openAuthBtn: document.getElementById('open-auth-btn'),
      logoutBtn: document.getElementById('logout-btn'),

      storageNotice: document.getElementById('storage-notice'),
      storageNoticeText: document.getElementById('storage-notice-text'),
      storageNoticeClose: document.getElementById('storage-notice-close'),

      profileBanner: document.getElementById('profile-banner'),
      profileBannerBadge: document.getElementById('profile-banner-badge'),
      profileBannerTitle: document.getElementById('profile-banner-title'),
      profileBannerSub: document.getElementById('profile-banner-sub'),
      bannerMyTrackerBtn: document.getElementById('banner-my-tracker-btn'),
      bannerAuthBtn: document.getElementById('banner-auth-btn'),
      bannerUsersBtn: document.getElementById('banner-users-btn'),
      bannerShareBtn: document.getElementById('banner-share-btn'),

      authModal: document.getElementById('auth-modal'),
      authCloseBtn: document.getElementById('auth-close-btn'),
      authTabRegister: document.getElementById('auth-tab-register'),
      authTabLogin: document.getElementById('auth-tab-login'),
      registerForm: document.getElementById('register-form'),
      regUsername: document.getElementById('reg-username'),
      regSlugPreview: document.getElementById('reg-slug-preview'),
      regPin: document.getElementById('reg-pin'),
      regPinConfirm: document.getElementById('reg-pin-confirm'),
      regMigrateWrap: document.getElementById('reg-migrate-wrap'),
      regMigrateCheckbox: document.getElementById('reg-migrate-checkbox'),
      regError: document.getElementById('reg-error'),
      regSubmitBtn: document.getElementById('reg-submit-btn'),

      loginForm: document.getElementById('login-form'),
      loginUsername: document.getElementById('login-username'),
      loginPin: document.getElementById('login-pin'),
      loginError: document.getElementById('login-error'),
      loginSubmitBtn: document.getElementById('login-submit-btn'),
      browseOthersBtn: document.getElementById('browse-others-btn'),
      authQuickProfiles: document.getElementById('auth-quick-profiles'),

      usersModal: document.getElementById('users-modal'),
      usersCloseBtn: document.getElementById('users-close-btn'),
      usersSearchInput: document.getElementById('users-search-input'),
      usersRefreshBtn: document.getElementById('users-refresh-btn'),
      usersDirectoryList: document.getElementById('users-directory-list'),
      usersEmptyState: document.getElementById('users-empty-state'),
      usersEmptyText: document.getElementById('users-empty-text'),
      usersCreateCtaBtn: document.getElementById('users-create-cta-btn'),

      exportBtn: document.getElementById('export-btn'),
      importBtn: document.getElementById('import-btn'),
      importFileInput: document.getElementById('import-file-input'),
      backHomeBtn: document.getElementById('back-home-btn'),
      trackerFooter: document.getElementById('tracker-footer'),
      toast: document.getElementById('toast')
    };
  }

  /**
   * Construye el contexto compartido entre todos los módulos de la vista.
   */
  function createAppContext() {
    const ctx = {
      state: null,
      session: null,
      viewedProfile: null,
      directoryUsers: [],
      storageMode: 'cloud',
      kvUnconfigured: false,
      syncStatus: 'local',
      saveDebounceTimer: null,
      syncInFlight: false,
      pendingSync: false,
      unsavedRecovery: null,
      chartPoints: [],
      hoveredPointIndex: -1,
      toastTimeout: null,
      el: collectDom(),
      api: null
    };

    ctx.playUiPop = function playUiPop() {
      if (typeof global.playPopSound === 'function') {
        global.playPopSound();
      }
    };

    ctx.showToast = function showToast(message) {
      if (!ctx.el.toast) return;
      ctx.el.toast.textContent = message;
      ctx.el.toast.hidden = false;
      if (ctx.toastTimeout) clearTimeout(ctx.toastTimeout);
      ctx.toastTimeout = setTimeout(() => {
        ctx.el.toast.hidden = true;
      }, 3000);
    };

    ctx.showStorageNotice = function showStorageNotice(htmlText) {
      if (!ctx.el.storageNotice || !ctx.el.storageNoticeText) return;
      ctx.el.storageNoticeText.innerHTML = htmlText;
      ctx.el.storageNotice.hidden = false;
    };

    ctx.isReadOnly = function isReadOnly() {
      return !ctx.session || !ctx.viewedProfile || ctx.viewedProfile.slug !== ctx.session.slug;
    };

    ctx.getActiveContext = function getActiveContext() {
      const series = ctx.state.seriesList.find((s) => s.id === ctx.state.activeSeriesId) || ctx.state.seriesList[0];
      const season = series.seasons.find((sea) => sea.id === series.activeSeasonId) || series.seasons[0];
      return { series, season };
    };

    ctx.updateSummaryInDirectory = function updateSummaryInDirectory(summary) {
      if (!summary || !summary.slug) return;
      const idx = ctx.directoryUsers.findIndex((u) => u.slug === summary.slug);
      if (idx >= 0) {
        ctx.directoryUsers[idx] = summary;
      } else {
        ctx.directoryUsers.unshift(summary);
      }
      if (ctx.el.usersCountBadge) {
        ctx.el.usersCountBadge.textContent = String(ctx.directoryUsers.length);
      }
    };

    ctx.handleSessionExpiredDuringSave = function handleSessionExpiredDuringSave(slug, displayName, dataToRecover) {
      ctx.unsavedRecovery = { slug, data: model.sanitizeState(dataToRecover) };
      storage.persistSession(ctx, null);
      ctx.pendingSync = false;
      ctx.syncStatus = 'error';
      modalsUi.applyReadOnlyUi(ctx);
      modalsUi.renderProfileBanner(ctx);
      modalsUi.renderTopbarAccount(ctx);
      modalsUi.renderSyncBadge(ctx);
      episodesUi.renderEpisodesList(ctx);

      ctx.showToast('Tu sesión venció. Ingresa tu clave para guardar los últimos cambios.');
      modalsUi.openAuthModal(ctx, 'login', {
        prefillUsername: displayName || slug,
        errorMessage: 'Sesión vencida. Vuelve a ingresar tu clave para guardar tus cambios.'
      });
    };

    ctx.performCloudSync = async function performCloudSync(useKeepalive = false) {
      if (ctx.syncInFlight || !ctx.pendingSync || ctx.isReadOnly() || !ctx.session || ctx.storageMode !== 'cloud') {
        return;
      }

      ctx.syncInFlight = true;
      try {
        while (ctx.pendingSync && !ctx.isReadOnly() && ctx.session && ctx.storageMode === 'cloud') {
          const snapshot = model.sanitizeState(ctx.state);
          const targetSlug = ctx.session.slug;
          const token = ctx.session.token;
          ctx.pendingSync = false;

          const res = await ctx.api.apiUpdateProfile(targetSlug, token, snapshot, useKeepalive);
          if (res.summary) {
            ctx.updateSummaryInDirectory(res.summary);
            if (ctx.viewedProfile && ctx.viewedProfile.slug === targetSlug) {
              ctx.viewedProfile.summary = res.summary;
              ctx.viewedProfile.updatedAt = res.updatedAt || res.summary.updatedAt;
            }
          }
        }

        if (!ctx.pendingSync && !ctx.isReadOnly()) {
          ctx.syncStatus = 'saved';
          modalsUi.renderSyncBadge(ctx);
        }
      } catch (err) {
        if (err.status === 401 && ctx.session) {
          ctx.handleSessionExpiredDuringSave(ctx.session.slug, ctx.session.displayName, ctx.state);
        } else {
          ctx.syncStatus = 'error';
          modalsUi.renderSyncBadge(ctx);
          ctx.showToast('No se pudieron sincronizar los cambios con el servidor.');
        }
      } finally {
        ctx.syncInFlight = false;
        if (ctx.pendingSync && !ctx.isReadOnly() && ctx.session && ctx.storageMode === 'cloud') {
          ctx.performCloudSync(useKeepalive);
        }
      }
    };

    ctx.flushPendingSave = async function flushPendingSave(useKeepalive = false) {
      if (ctx.saveDebounceTimer) {
        clearTimeout(ctx.saveDebounceTimer);
        ctx.saveDebounceTimer = null;
      }
      if (ctx.isReadOnly() || !ctx.session || !ctx.pendingSync || ctx.storageMode !== 'cloud') return;
      await ctx.performCloudSync(useKeepalive);
    };

    ctx.saveState = function saveState(options = {}) {
      if (ctx.isReadOnly() || !ctx.session || !ctx.viewedProfile) return;

      storage.saveLocalCacheForSlug(ctx.session.slug, ctx.state);

      if (ctx.storageMode === 'local') {
        storage.localDbApi.updateProfile(ctx.session.slug, ctx.session.token, ctx.state)
          .then((res) => {
            if (res.summary) {
              ctx.updateSummaryInDirectory(res.summary);
              if (ctx.viewedProfile && ctx.viewedProfile.slug === ctx.session.slug) {
                ctx.viewedProfile.summary = res.summary;
                ctx.viewedProfile.updatedAt = res.updatedAt;
              }
            }
            ctx.syncStatus = 'local';
            modalsUi.renderSyncBadge(ctx);
          })
          .catch((err) => {
            console.error('Error al guardar en almacenamiento local:', err);
          });
        return;
      }

      ctx.pendingSync = true;
      ctx.syncStatus = 'saving';
      modalsUi.renderSyncBadge(ctx);

      if (ctx.saveDebounceTimer) clearTimeout(ctx.saveDebounceTimer);
      const delay = options.immediate ? 0 : 650;
      ctx.saveDebounceTimer = setTimeout(() => {
        ctx.saveDebounceTimer = null;
        ctx.performCloudSync(false);
      }, delay);
    };

    ctx.buildShareUrl = function buildShareUrl(slug) {
      const url = new URL(window.location.href);
      if (slug) {
        url.searchParams.set('user', slug);
      } else {
        url.searchParams.delete('user');
      }
      return url.toString();
    };

    ctx.updateUrlForUser = function updateUrlForUser(slug) {
      try {
        const nextUrl = ctx.buildShareUrl(slug);
        window.history.replaceState({}, '', nextUrl);
      } catch {
        // Ignorar en entornos restringidos (p. ej. file:// en algunos navegadores)
      }
    };

    ctx.copyProfileShareLink = async function copyProfileShareLink() {
      if (!ctx.viewedProfile) return;
      const shareUrl = ctx.buildShareUrl(ctx.viewedProfile.slug);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const temp = document.createElement('textarea');
          temp.value = shareUrl;
          temp.setAttribute('readonly', '');
          temp.style.position = 'fixed';
          temp.style.opacity = '0';
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        ctx.showToast(`Enlace copiado (?user=${ctx.viewedProfile.slug})`);
      } catch {
        ctx.showToast(`Comparte este usuario: ?user=${ctx.viewedProfile.slug}`);
      }
    };

    ctx.openProfile = async function openProfile(slug) {
      await ctx.flushPendingSave();

      try {
        const res = await ctx.api.apiGetProfile(slug);
        const profile = res.profile;
        ctx.viewedProfile = {
          slug: profile.slug,
          displayName: profile.displayName,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          summary: profile.summary
        };
        ctx.state = model.sanitizeState(profile.data);
        ctx.hoveredPointIndex = -1;
        ctx.syncStatus = ctx.isReadOnly() ? 'readonly' : (ctx.storageMode === 'local' ? 'local' : 'saved');
        ctx.updateSummaryInDirectory(profile.summary);
        ctx.updateUrlForUser(profile.slug);
        ctx.renderAll();
        return true;
      } catch (err) {
        if (err.status === 404) {
          ctx.showToast('No encontramos ese usuario.');
        } else {
          ctx.showToast(err.message || 'No se pudo cargar el perfil.');
        }
        return false;
      }
    };

    ctx.addEpisodes = function addEpisodes(count) {
      if (ctx.isReadOnly()) return;
      const { season } = ctx.getActiveContext();
      const safeCount = Math.min(100, Math.max(1, Math.floor(Number(count) || 1)));
      let nextNumber = season.episodes.length > 0
        ? Math.max(...season.episodes.map((ep) => ep.number)) + 1
        : 1;

      for (let i = 0; i < safeCount; i++) {
        season.episodes.push({
          id: model.generateId('ep'),
          number: nextNumber++,
          title: '',
          score: null
        });
      }

      ctx.saveState();
      ctx.renderAll();
      ctx.showToast(safeCount === 1 ? 'Capítulo añadido' : `Se añadieron ${safeCount} capítulos`);
    };

    ctx.refreshAnalyticsAndVisuals = function refreshAnalyticsAndVisuals() {
      const { series, season } = ctx.getActiveContext();
      const stats = model.computeStats(series, season, ctx.state.chartScope);
      episodesUi.renderStats(ctx, stats, series, season);
      chart.renderChart(ctx, stats, series);
      episodesUi.syncEpisodeRowsVisualState(ctx, stats, season);
      if (!ctx.isReadOnly() && ctx.viewedProfile) {
        modalsUi.renderProfileBanner(ctx);
      }
    };

    ctx.renderAll = function renderAll() {
      const { series, season } = ctx.getActiveContext();
      const stats = model.computeStats(series, season, ctx.state.chartScope);

      modalsUi.applyReadOnlyUi(ctx);
      modalsUi.renderTopbarAccount(ctx);
      modalsUi.renderSyncBadge(ctx);
      modalsUi.renderProfileBanner(ctx);
      episodesUi.renderSeriesAndSeasons(ctx, series, season);
      episodesUi.renderStats(ctx, stats, series, season);
      chart.renderChart(ctx, stats, series);
      episodesUi.renderEpisodesList(ctx);
    };

    ctx.api = storage.createBackendClient(ctx);
    return ctx;
  }

  /**
   * Conecta los eventos de cuenta, autenticación, directorio, tracker y gráfico.
   */
  function bindEvents(ctx) {
    const { el } = ctx;

    if (el.backHomeBtn) {
      el.backHomeBtn.addEventListener('click', (e) => {
        if (typeof global.playCloseSound === 'function') {
          e.preventDefault();
          global.playCloseSound();
          setTimeout(() => {
            window.location.href = el.backHomeBtn.href;
          }, 160);
        }
      });
    }

    if (el.storageNoticeClose) {
      el.storageNoticeClose.addEventListener('click', () => {
        el.storageNotice.hidden = true;
      });
    }

    // Menú desplegable de cuenta
    el.accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modalsUi.setAccountMenuOpen(ctx, el.accountMenu.hidden);
    });

    document.addEventListener('click', (e) => {
      if (el.accountDropdown && !el.accountDropdown.contains(e.target)) {
        modalsUi.setAccountMenuOpen(ctx, false);
      }
    });

    el.openUsersBtn.addEventListener('click', () => {
      ctx.playUiPop();
      modalsUi.openUsersModal(ctx);
    });

    el.bannerUsersBtn.addEventListener('click', () => {
      ctx.playUiPop();
      modalsUi.openUsersModal(ctx);
    });

    el.shareProfileBtn.addEventListener('click', () => {
      ctx.playUiPop();
      ctx.copyProfileShareLink();
    });

    el.bannerShareBtn.addEventListener('click', () => {
      ctx.playUiPop();
      ctx.copyProfileShareLink();
    });

    const goToOwnTracker = async () => {
      if (!ctx.session) return;
      ctx.playUiPop();
      modalsUi.setAccountMenuOpen(ctx, false);
      await ctx.openProfile(ctx.session.slug);
    };

    el.goMyTrackerBtn.addEventListener('click', goToOwnTracker);
    el.bannerMyTrackerBtn.addEventListener('click', goToOwnTracker);

    el.openAuthBtn.addEventListener('click', () => {
      ctx.playUiPop();
      modalsUi.openAuthModal(ctx, ctx.session ? 'login' : 'register');
    });

    el.bannerAuthBtn.addEventListener('click', () => {
      ctx.playUiPop();
      modalsUi.openAuthModal(ctx, 'register');
    });

    el.logoutBtn.addEventListener('click', async () => {
      ctx.playUiPop();
      modalsUi.setAccountMenuOpen(ctx, false);
      await ctx.flushPendingSave();
      const prevSession = ctx.session;
      storage.persistSession(ctx, null);
      if (prevSession) {
        ctx.api.apiLogout(prevSession.slug, prevSession.token).catch(() => {});
      }
      ctx.syncStatus = 'readonly';
      ctx.renderAll();
      ctx.showToast('Sesión cerrada. El tracker quedó en modo solo lectura.');
    });

    // Modal de autenticación
    el.authCloseBtn.addEventListener('click', () => modalsUi.closeAuthModal(ctx));
    el.authModal.addEventListener('click', (e) => {
      if (e.target === el.authModal) modalsUi.closeAuthModal(ctx);
    });

    el.authTabRegister.addEventListener('click', () => modalsUi.setAuthTab(ctx, 'register'));
    el.authTabLogin.addEventListener('click', () => modalsUi.setAuthTab(ctx, 'login'));
    el.regUsername.addEventListener('input', () => modalsUi.updateRegisterSlugPreview(ctx));

    document.querySelectorAll('.toggle-pin-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    el.browseOthersBtn.addEventListener('click', () => {
      ctx.playUiPop();
      modalsUi.closeAuthModal(ctx);
      modalsUi.openUsersModal(ctx);
    });

    el.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      el.regError.hidden = true;

      const userCheck = model.normalizeUsernameClient(el.regUsername.value);
      if (!userCheck.ok) {
        el.regError.textContent = userCheck.error;
        el.regError.hidden = false;
        return;
      }

      const pin = el.regPin.value.trim();
      const confirmPin = el.regPinConfirm.value.trim();
      if (pin.length < 4 || pin.length > 64) {
        el.regError.textContent = 'La clave o PIN debe tener entre 4 y 64 caracteres.';
        el.regError.hidden = false;
        return;
      }
      if (pin !== confirmPin) {
        el.regError.textContent = 'Las claves no coinciden.';
        el.regError.hidden = false;
        return;
      }

      const shouldMigrate = Boolean(el.regMigrateWrap && !el.regMigrateWrap.hidden && el.regMigrateCheckbox.checked);
      const initialData = shouldMigrate
        ? (storage.getLegacyLocalData() || model.createDefaultState())
        : model.createDefaultState();

      el.regSubmitBtn.disabled = true;
      el.regSubmitBtn.textContent = 'Creando usuario...';
      try {
        const result = await ctx.api.apiRegister(userCheck.displayName, pin, initialData);
        const profile = result.profile;
        storage.persistSession(ctx, {
          slug: profile.slug,
          displayName: profile.displayName,
          token: result.token
        });

        ctx.viewedProfile = {
          slug: profile.slug,
          displayName: profile.displayName,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          summary: profile.summary
        };
        ctx.state = model.sanitizeState(profile.data);
        ctx.hoveredPointIndex = -1;
        ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : 'saved';

        ctx.updateSummaryInDirectory(profile.summary);
        storage.saveLocalCacheForSlug(profile.slug, ctx.state);
        ctx.updateUrlForUser(profile.slug);
        modalsUi.closeAuthModal(ctx);
        ctx.renderAll();
        ctx.showToast(`¡Bienvenido @${profile.slug}! Ya puedes puntuar tus series.`);
      } catch (err) {
        el.regError.textContent = err.message || 'No se pudo crear el usuario.';
        el.regError.hidden = false;
      } finally {
        el.regSubmitBtn.disabled = false;
        el.regSubmitBtn.textContent = 'Crear mi Series Tracker';
      }
    });

    el.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      el.loginError.hidden = true;

      const rawUser = el.loginUsername.value.trim().replace(/^@+/, '');
      const pin = el.loginPin.value.trim();
      if (!rawUser || pin.length < 4) {
        el.loginError.textContent = 'Ingresa tu usuario y tu clave (mínimo 4 caracteres).';
        el.loginError.hidden = false;
        return;
      }

      el.loginSubmitBtn.disabled = true;
      el.loginSubmitBtn.textContent = 'Verificando...';
      try {
        const result = await ctx.api.apiLogin(rawUser, pin);
        const profile = result.profile;
        storage.persistSession(ctx, {
          slug: profile.slug,
          displayName: profile.displayName,
          token: result.token
        });

        ctx.viewedProfile = {
          slug: profile.slug,
          displayName: profile.displayName,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          summary: profile.summary
        };

        const hasRecovery = Boolean(ctx.unsavedRecovery && ctx.unsavedRecovery.slug === profile.slug);
        ctx.state = hasRecovery ? ctx.unsavedRecovery.data : model.sanitizeState(profile.data);
        ctx.unsavedRecovery = null;

        ctx.hoveredPointIndex = -1;
        ctx.syncStatus = ctx.storageMode === 'local' ? 'local' : 'saved';
        ctx.updateSummaryInDirectory(profile.summary);
        ctx.updateUrlForUser(profile.slug);
        modalsUi.closeAuthModal(ctx);
        ctx.renderAll();

        if (hasRecovery) {
          ctx.saveState({ immediate: true });
          ctx.showToast(`Sesión iniciada como @${profile.slug}. Guardando cambios pendientes...`);
        } else {
          ctx.showToast(`Sesión iniciada como ${profile.displayName}`);
        }
      } catch (err) {
        el.loginError.textContent = err.message || 'Usuario o clave incorrectos.';
        el.loginError.hidden = false;
      } finally {
        el.loginSubmitBtn.disabled = false;
        el.loginSubmitBtn.textContent = 'Entrar y editar mi Tracker';
      }
    });

    // Modal de directorio de usuarios
    el.usersCloseBtn.addEventListener('click', () => modalsUi.closeUsersModal(ctx));
    el.usersModal.addEventListener('click', (e) => {
      if (e.target === el.usersModal) modalsUi.closeUsersModal(ctx);
    });
    el.usersSearchInput.addEventListener('input', () => modalsUi.renderUsersDirectory(ctx));
    el.usersRefreshBtn.addEventListener('click', async () => {
      ctx.playUiPop();
      try {
        await ctx.api.apiListUsers();
        modalsUi.renderTopbarAccount(ctx);
        modalsUi.renderUsersDirectory(ctx);
        ctx.showToast('Lista de usuarios actualizada');
      } catch (err) {
        ctx.showToast(err.message || 'Error al actualizar la lista.');
      }
    });
    el.usersCreateCtaBtn.addEventListener('click', () => {
      modalsUi.closeUsersModal(ctx);
      modalsUi.openAuthModal(ctx, 'register');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!el.usersModal.hidden) modalsUi.closeUsersModal(ctx);
        else if (!el.authModal.hidden) modalsUi.closeAuthModal(ctx);
        modalsUi.setAccountMenuOpen(ctx, false);
      }
    });

    // Eventos del tracker (protegidos por isReadOnly())
    el.seriesTitleInput.addEventListener('input', (e) => {
      if (ctx.isReadOnly()) return;
      const { series } = ctx.getActiveContext();
      series.title = e.target.value;
      ctx.saveState();
      const activeTab = el.seriesTabs.querySelector('.series-tab-btn.active');
      if (activeTab) {
        activeTab.textContent = series.title.trim() || 'Serie sin título';
      }
    });

    el.addSeriesBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      ctx.playUiPop();
      const seasonId = model.generateId('season');
      const seriesId = model.generateId('series');
      const nextIdx = ctx.state.seriesList.length + 1;
      ctx.state.seriesList.push({
        id: seriesId,
        title: `Nueva Serie ${nextIdx}`,
        activeSeasonId: seasonId,
        seasons: [
          {
            id: seasonId,
            number: 1,
            episodes: [
              { id: model.generateId('ep'), number: 1, title: '', score: null },
              { id: model.generateId('ep'), number: 2, title: '', score: null },
              { id: model.generateId('ep'), number: 3, title: '', score: null }
            ]
          }
        ]
      });
      ctx.state.activeSeriesId = seriesId;
      ctx.hoveredPointIndex = -1;
      ctx.saveState();
      ctx.renderAll();
      el.seriesTitleInput.focus();
      el.seriesTitleInput.select();
    });

    el.deleteSeriesBtn.addEventListener('click', () => {
      if (ctx.isReadOnly() || ctx.state.seriesList.length <= 1) return;
      const { series } = ctx.getActiveContext();
      const name = series.title.trim() || 'esta serie';
      if (!window.confirm(`¿Eliminar "${name}" y todas sus puntuaciones?`)) return;

      ctx.state.seriesList = ctx.state.seriesList.filter((item) => item.id !== series.id);
      ctx.state.activeSeriesId = ctx.state.seriesList[0].id;
      ctx.hoveredPointIndex = -1;
      ctx.saveState();
      ctx.renderAll();
      ctx.showToast('Serie eliminada');
    });

    el.addSeasonBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      ctx.playUiPop();
      const { series } = ctx.getActiveContext();
      const nextNum = series.seasons.length > 0
        ? Math.max(...series.seasons.map((sea) => sea.number)) + 1
        : 1;
      const newSeasonId = model.generateId('season');
      series.seasons.push({
        id: newSeasonId,
        number: nextNum,
        episodes: [
          { id: model.generateId('ep'), number: 1, title: '', score: null },
          { id: model.generateId('ep'), number: 2, title: '', score: null },
          { id: model.generateId('ep'), number: 3, title: '', score: null }
        ]
      });
      series.activeSeasonId = newSeasonId;
      ctx.hoveredPointIndex = -1;
      ctx.saveState();
      ctx.renderAll();
      ctx.showToast(`Temporada ${nextNum} creada`);
    });

    el.deleteSeasonBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      const { series, season } = ctx.getActiveContext();
      if (series.seasons.length <= 1) return;
      if (!window.confirm(`¿Eliminar la Temporada ${season.number} y sus capítulos?`)) return;

      series.seasons = series.seasons.filter((item) => item.id !== season.id);
      series.seasons.forEach((item, idx) => {
        item.number = idx + 1;
      });
      series.activeSeasonId = series.seasons[0].id;
      ctx.hoveredPointIndex = -1;
      ctx.saveState();
      ctx.renderAll();
      ctx.showToast('Temporada eliminada');
    });

    const setScope = (scope) => {
      if (ctx.state.chartScope === scope) return;
      ctx.playUiPop();
      ctx.state.chartScope = scope;
      ctx.hoveredPointIndex = -1;
      if (!ctx.isReadOnly()) ctx.saveState();
      ctx.renderAll();
    };

    el.scopeSeasonBtn.addEventListener('click', () => setScope('season'));
    el.scopeSeriesBtn.addEventListener('click', () => setScope('series'));

    el.filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.playUiPop();
        ctx.state.episodeFilter = btn.dataset.filter;
        if (!ctx.isReadOnly()) ctx.saveState();
        episodesUi.renderEpisodesList(ctx);
      });
    });

    el.addEpisodeBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      ctx.playUiPop();
      ctx.addEpisodes(1);
    });

    el.batchAddBtn.addEventListener('click', () => {
      if (ctx.isReadOnly()) return;
      ctx.playUiPop();
      ctx.addEpisodes(el.batchCountInput.value);
    });

    // Exportar JSON (permitido incluso en solo lectura para respaldo de lo visualizado)
    el.exportBtn.addEventListener('click', () => {
      modalsUi.setAccountMenuOpen(ctx, false);
      const blob = new Blob([JSON.stringify(ctx.state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const prefix = ctx.viewedProfile ? ctx.viewedProfile.slug : 'series';
      a.href = url;
      a.download = `series-${prefix}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ctx.showToast('Respaldo JSON exportado');
    });

    // Importar JSON (exclusivo del propietario)
    el.importBtn.addEventListener('click', () => {
      modalsUi.setAccountMenuOpen(ctx, false);
      if (ctx.isReadOnly()) return;
      el.importFileInput.click();
    });

    el.importFileInput.addEventListener('change', (e) => {
      if (ctx.isReadOnly()) {
        el.importFileInput.value = '';
        return;
      }
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed || !Array.isArray(parsed.seriesList) || parsed.seriesList.length === 0) {
            throw new Error('Formato JSON inválido');
          }
          ctx.state = model.sanitizeState(parsed);
          ctx.hoveredPointIndex = -1;
          ctx.saveState({ immediate: true });
          ctx.renderAll();
          ctx.showToast('Series importadas correctamente');
        } catch (err) {
          console.error('Error al importar JSON:', err);
          ctx.showToast('Archivo JSON inválido o dañado');
        } finally {
          el.importFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });

    // Interactividad del gráfico (hover y toque)
    const handlePointerMove = (clientX, clientY) => {
      if (ctx.chartPoints.length === 0) return;
      const rect = el.chartCanvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      const closestIdx = chart.findClosestChartPoint(ctx.chartPoints, px, py, 24);
      const { series, season } = ctx.getActiveContext();
      const stats = model.computeStats(series, season, ctx.state.chartScope);

      if (closestIdx !== ctx.hoveredPointIndex) {
        ctx.hoveredPointIndex = closestIdx;
        chart.renderChart(ctx, stats, series);
      }

      if (closestIdx !== -1 && ctx.chartPoints[closestIdx]) {
        chart.showChartTooltip(ctx, ctx.chartPoints[closestIdx], stats);
      } else {
        el.chartTooltip.hidden = true;
      }
    };

    el.chartCanvas.addEventListener('mousemove', (e) => {
      handlePointerMove(e.clientX, e.clientY);
    });

    el.chartCanvas.addEventListener('mouseleave', () => {
      if (ctx.hoveredPointIndex !== -1) {
        ctx.hoveredPointIndex = -1;
        const { series, season } = ctx.getActiveContext();
        const stats = model.computeStats(series, season, ctx.state.chartScope);
        chart.renderChart(ctx, stats, series);
      }
      el.chartTooltip.hidden = true;
    });

    el.chartCanvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!ctx.state) return;
      const { series, season } = ctx.getActiveContext();
      const stats = model.computeStats(series, season, ctx.state.chartScope);
      chart.renderChart(ctx, stats, series);
    });

    window.addEventListener('beforeunload', () => {
      if (ctx.pendingSync && !ctx.isReadOnly() && ctx.session && ctx.storageMode === 'cloud') {
        ctx.flushPendingSave(true);
      }
    });
  }

  /**
   * Inicializa la aplicación al cargar el documento.
   */
  async function init(ctx) {
    ctx.session = storage.loadSessionFromStorage();
    ctx.state = model.createDefaultState();
    bindEvents(ctx);
    ctx.renderAll();

    const params = new URLSearchParams(window.location.search);
    const requestedUser = (params.get('user') || '').trim().replace(/^@+/, '');

    await ctx.api.detectBackend();
    modalsUi.renderTopbarAccount(ctx);

    let opened = false;
    if (requestedUser) {
      const check = model.normalizeUsernameClient(requestedUser);
      if (check.ok) {
        opened = await ctx.openProfile(check.slug);
      } else {
        ctx.showToast('El usuario indicado en el enlace no es válido.');
      }
      if (!opened) {
        ctx.updateUrlForUser(null);
      }
    }

    if (!opened && ctx.session) {
      opened = await ctx.openProfile(ctx.session.slug);
      if (!opened) {
        storage.persistSession(ctx, null);
        ctx.updateUrlForUser(null);
      }
    }

    if (!opened) {
      ctx.viewedProfile = null;
      ctx.syncStatus = 'local';
      ctx.renderAll();
      modalsUi.openAuthModal(ctx, 'register');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const ctx = createAppContext();
    init(ctx);
  });
})(window);
