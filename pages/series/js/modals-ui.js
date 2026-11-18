/**
 * Renderizado y control de barra de estado, banner de perfil,
 * modal de autenticación y directorio de usuarios.
 */
(function (global) {
  const model = global.SeriesTracker.model;
  const storage = global.SeriesTracker.storage;

  function renderSyncBadge(ctx) {
    const { el, viewedProfile, syncStatus, storageMode } = ctx;
    if (!el.syncStatusBadge) return;
    const badge = el.syncStatusBadge;
    badge.className = 'sync-badge';

    if (!viewedProfile) {
      badge.classList.add('is-local');
      badge.textContent = '👤 Sin usuario';
      return;
    }

    if (ctx.isReadOnly()) {
      badge.classList.add('is-saving');
      badge.textContent = '👁️ Solo lectura';
      return;
    }

    if (syncStatus === 'saving') {
      badge.classList.add('is-saving');
      badge.textContent = '● Guardando...';
    } else if (syncStatus === 'error') {
      badge.classList.add('is-error');
      badge.textContent = '● Error al guardar';
    } else if (storageMode === 'local') {
      badge.classList.add('is-local');
      badge.textContent = '● Guardado local';
    } else {
      badge.classList.add('is-saved');
      badge.textContent = '● Guardado';
    }
  }

  function applyReadOnlyUi(ctx) {
    const { el, viewedProfile } = ctx;
    const ro = ctx.isReadOnly();
    document.body.classList.toggle('read-only', ro);
    if (el.seriesTitleInput) {
      el.seriesTitleInput.readOnly = ro;
      el.seriesTitleInput.tabIndex = ro ? -1 : 0;
    }
    if (el.chartEmptyHint) {
      el.chartEmptyHint.textContent = ro
        ? 'Este usuario todavía no puntuó capítulos en esta vista.'
        : 'Asigna una nota de 0 a 10 abajo para generar el gráfico.';
    }
    if (viewedProfile) {
      document.title = `${viewedProfile.displayName} · Series Tracker · Papubanda`;
    } else {
      document.title = 'Series Tracker · Papubanda';
    }
    if (el.trackerFooter) {
      el.trackerFooter.textContent = ro
        ? 'Papubanda 2026 · Series Tracker · Vista pública en modo solo lectura'
        : 'Papubanda 2026 · Series Tracker · Tus cambios se guardan automáticamente en tu usuario';
    }
  }

  function renderProfileBanner(ctx) {
    const { el, viewedProfile, session, state } = ctx;
    if (!el.profileBanner) return;

    if (!viewedProfile) {
      el.profileBanner.hidden = true;
      return;
    }

    const ro = ctx.isReadOnly();
    const summary = model.computeProfileSummaryClient(
      viewedProfile.slug,
      viewedProfile.displayName,
      state,
      viewedProfile.createdAt,
      viewedProfile.updatedAt
    );

    el.profileBanner.hidden = false;
    el.profileBanner.classList.toggle('is-readonly', ro);
    el.profileBanner.classList.toggle('is-owner', !ro);

    if (ro) {
      el.profileBannerBadge.textContent = '👁️ Solo lectura';
      el.profileBannerTitle.textContent = `Estás viendo el Series Tracker de ${viewedProfile.displayName} (@${viewedProfile.slug})`;
      const avgPart = summary.avgScore !== null ? ` · Promedio general: ${model.formatScore(summary.avgScore)}` : '';
      el.profileBannerSub.textContent =
        `${summary.seriesCount} ${summary.seriesCount === 1 ? 'serie' : 'series'} · ${summary.ratedCount} caps puntuados${avgPart} · No podés editar estas calificaciones.`;
      el.bannerMyTrackerBtn.hidden = !session;
      el.bannerAuthBtn.hidden = Boolean(session);
    } else {
      el.profileBannerBadge.textContent = '✨ Tu perfil';
      el.profileBannerTitle.textContent = `Tu Series Tracker · ${viewedProfile.displayName} (@${viewedProfile.slug})`;
      el.profileBannerSub.textContent =
        'Tus puntuaciones se guardan en tu usuario. Comparte el enlace para que los demás puedan verlas sin editar.';
      el.bannerMyTrackerBtn.hidden = true;
      el.bannerAuthBtn.hidden = true;
    }
  }

  function renderTopbarAccount(ctx) {
    const { el, directoryUsers, viewedProfile, session } = ctx;
    if (el.usersCountBadge) {
      el.usersCountBadge.textContent = String(directoryUsers.length);
    }
    if (el.shareProfileBtn) {
      el.shareProfileBtn.hidden = !viewedProfile;
    }

    if (session) {
      el.accountBtnLabel.textContent = `👤 ${session.displayName}`;
      el.accountMenuHeader.hidden = false;
      el.accountMenuName.textContent = session.displayName;
      el.accountMenuSlug.textContent = `@${session.slug}`;
      el.goMyTrackerBtn.hidden = Boolean(viewedProfile && viewedProfile.slug === session.slug);
      el.logoutBtn.hidden = false;
      el.openAuthBtn.textContent = '🔄 Cambiar o crear otro usuario';
    } else {
      el.accountBtnLabel.textContent = '👤 Entrar / Crear';
      el.accountMenuHeader.hidden = true;
      el.goMyTrackerBtn.hidden = true;
      el.logoutBtn.hidden = true;
      el.openAuthBtn.textContent = '🔑 Crear usuario / Iniciar sesión';
    }
  }

  function setAccountMenuOpen(ctx, open) {
    const { el } = ctx;
    if (!el.accountMenu || !el.accountBtn) return;
    el.accountMenu.hidden = !open;
    el.accountBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function updateRegisterSlugPreview(ctx) {
    const { el } = ctx;
    if (!el.regUsername || !el.regSlugPreview) return;
    const val = el.regUsername.value;
    if (!val.trim()) {
      el.regSlugPreview.textContent = 'Enlace público: ?user=...';
      return;
    }
    const check = model.normalizeUsernameClient(val);
    if (check.ok) {
      el.regSlugPreview.textContent = `Enlace público: ?user=${check.slug}`;
    } else {
      el.regSlugPreview.textContent = check.error;
    }
  }

  function renderQuickProfilesInAuth(ctx) {
    const { el, directoryUsers } = ctx;
    if (!el.authQuickProfiles) return;
    if (!directoryUsers || directoryUsers.length === 0) {
      el.authQuickProfiles.hidden = true;
      el.authQuickProfiles.innerHTML = '';
      return;
    }

    el.authQuickProfiles.hidden = false;
    el.authQuickProfiles.innerHTML = '';
    directoryUsers.slice(0, 6).forEach((u) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'quick-profile-chip';
      const avgText = model.isRated(u.avgScore) ? ` · ★ ${model.formatScore(u.avgScore)}` : '';
      chip.textContent = `${u.displayName}${avgText}`;
      chip.addEventListener('click', async () => {
        ctx.playUiPop();
        closeAuthModal(ctx);
        await ctx.openProfile(u.slug);
      });
      el.authQuickProfiles.appendChild(chip);
    });
  }

  function setAuthTab(ctx, tabName) {
    const { el } = ctx;
    const isRegister = tabName !== 'login';
    el.authTabRegister.classList.toggle('active', isRegister);
    el.authTabRegister.setAttribute('aria-selected', isRegister ? 'true' : 'false');
    el.authTabLogin.classList.toggle('active', !isRegister);
    el.authTabLogin.setAttribute('aria-selected', !isRegister ? 'true' : 'false');
    el.registerForm.hidden = !isRegister;
    el.loginForm.hidden = isRegister;
    el.regError.hidden = true;
    el.loginError.hidden = true;
  }

  function openAuthModal(ctx, tabName = 'register', options = {}) {
    const { el } = ctx;
    setAccountMenuOpen(ctx, false);
    setAuthTab(ctx, tabName);

    const legacy = storage.getLegacyLocalData();
    if (el.regMigrateWrap) {
      el.regMigrateWrap.hidden = !legacy;
    }
    if (el.regMigrateCheckbox) {
      el.regMigrateCheckbox.checked = Boolean(legacy);
    }

    if (options.prefillUsername && el.loginUsername) {
      el.loginUsername.value = options.prefillUsername;
    }
    if (options.errorMessage) {
      const targetErr = tabName === 'login' ? el.loginError : el.regError;
      targetErr.textContent = options.errorMessage;
      targetErr.hidden = false;
    }

    if (el.regPin) el.regPin.value = '';
    if (el.regPinConfirm) el.regPinConfirm.value = '';
    if (el.loginPin) el.loginPin.value = '';
    updateRegisterSlugPreview(ctx);
    renderQuickProfilesInAuth(ctx);

    el.authModal.hidden = false;
    setTimeout(() => {
      if (tabName === 'login') {
        if (el.loginUsername.value.trim()) el.loginPin.focus();
        else el.loginUsername.focus();
      } else {
        el.regUsername.focus();
      }
    }, 30);
  }

  function closeAuthModal(ctx) {
    if (ctx.el.authModal) ctx.el.authModal.hidden = true;
  }

  function renderUsersDirectory(ctx) {
    const { el, directoryUsers, session, viewedProfile } = ctx;
    const query = (el.usersSearchInput?.value || '').trim().toLowerCase();
    const filtered = directoryUsers.filter((u) => {
      if (!query) return true;
      return (
        u.displayName.toLowerCase().includes(query) ||
        u.slug.toLowerCase().includes(query) ||
        (u.topSeriesTitle && u.topSeriesTitle.toLowerCase().includes(query))
      );
    });

    el.usersDirectoryList.innerHTML = '';

    if (filtered.length === 0) {
      el.usersEmptyState.hidden = false;
      el.usersEmptyText.textContent = directoryUsers.length === 0
        ? 'Todavía no hay perfiles creados. ¡Sé el primero en crear tu Series Tracker!'
        : `No se encontraron usuarios para "${query}".`;
      el.usersCreateCtaBtn.hidden = directoryUsers.length > 0;
      return;
    }

    el.usersEmptyState.hidden = true;
    const fragment = document.createDocumentFragment();

    filtered.forEach((u) => {
      const isOwn = Boolean(session && session.slug === u.slug);
      const isViewing = Boolean(viewedProfile && viewedProfile.slug === u.slug);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `user-card${isViewing ? ' is-current' : ''}`;

      const initial = model.escapeHtml((u.displayName || '?').charAt(0).toUpperCase());
      const avgLabel = model.isRated(u.avgScore) ? `★ ${model.formatScore(u.avgScore)}` : 'Sin notas';
      const topSeriesHtml = u.topSeriesTitle
        ? `<div class="user-top-series">📺 ${model.escapeHtml(u.topSeriesTitle)}</div>`
        : '<div class="user-top-series">Sin serie destacada</div>';

      card.innerHTML = `
        <div class="user-card-top">
          <div class="user-avatar">${initial}</div>
          <div class="user-meta">
            <div class="user-name">${model.escapeHtml(u.displayName)}</div>
            <div class="user-slug">@${model.escapeHtml(u.slug)}</div>
          </div>
        </div>
        <div class="user-badges">
          <span class="user-badge ${isOwn ? 'is-own' : 'is-ro'}">${isOwn ? '✨ Tu perfil' : '👁️ Solo lectura'}</span>
        </div>
        <div class="user-stats-row">
          <span class="user-stat-pill">${u.seriesCount || 0} ${u.seriesCount === 1 ? 'serie' : 'series'}</span>
          <span class="user-stat-pill">${u.ratedCount || 0} caps</span>
          <span class="user-stat-pill">${avgLabel}</span>
        </div>
        ${topSeriesHtml}
      `;

      card.addEventListener('click', async () => {
        ctx.playUiPop();
        closeUsersModal(ctx);
        await ctx.openProfile(u.slug);
      });

      fragment.appendChild(card);
    });

    el.usersDirectoryList.appendChild(fragment);
  }

  async function openUsersModal(ctx) {
    setAccountMenuOpen(ctx, false);
    ctx.el.usersModal.hidden = false;
    renderUsersDirectory(ctx);
    try {
      await ctx.api.apiListUsers();
      renderTopbarAccount(ctx);
      renderUsersDirectory(ctx);
    } catch (err) {
      ctx.showToast(err.message || 'No se pudo actualizar la lista de usuarios.');
    }
  }

  function closeUsersModal(ctx) {
    if (ctx.el.usersModal) ctx.el.usersModal.hidden = true;
  }

  global.SeriesTracker = global.SeriesTracker || {};
  global.SeriesTracker.modalsUi = {
    renderSyncBadge,
    applyReadOnlyUi,
    renderProfileBanner,
    renderTopbarAccount,
    setAccountMenuOpen,
    updateRegisterSlugPreview,
    renderQuickProfilesInAuth,
    setAuthTab,
    openAuthModal,
    closeAuthModal,
    renderUsersDirectory,
    openUsersModal,
    closeUsersModal
  };
})(window);
