/**
 * Persistencia local (sesión, caché, base multiusuario de respaldo)
 * y cliente unificado hacia la API de Cloudflare Pages Functions (/api/series/*).
 */
(function (global) {
  const model = global.SeriesTracker.model;

  function loadSessionFromStorage() {
    try {
      const raw = localStorage.getItem(model.SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.slug === 'string' && typeof parsed.token === 'string' && parsed.slug && parsed.token) {
        return {
          slug: parsed.slug,
          displayName: parsed.displayName || parsed.slug,
          token: parsed.token
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  function persistSession(ctxOrSession, maybeSession) {
    const hasCtx = arguments.length >= 2 && ctxOrSession && typeof ctxOrSession === 'object' && 'storageMode' in ctxOrSession;
    const nextSession = hasCtx ? maybeSession : ctxOrSession;
    if (hasCtx) {
      ctxOrSession.session = nextSession;
    }
    try {
      if (nextSession) {
        localStorage.setItem(model.SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        localStorage.removeItem(model.SESSION_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error al guardar sesión:', err);
    }
  }

  function saveLocalCacheForSlug(slug, data) {
    if (!slug) return;
    try {
      localStorage.setItem(`${model.CACHE_PREFIX}${slug}`, JSON.stringify(data));
    } catch (err) {
      console.error('Error al guardar respaldo en caché local:', err);
    }
  }

  function getLegacyLocalData() {
    try {
      const raw = localStorage.getItem(model.LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.seriesList) && parsed.seriesList.length > 0) {
        return model.sanitizeState(parsed);
      }
      return null;
    } catch {
      return null;
    }
  }

  async function hashLocalSecret(secret) {
    if (window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(secret);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Respaldo simple en contextos sin crypto.subtle (p. ej. file:// o HTTP plano antiguo)
    let hash = 2166136261;
    for (let i = 0; i < secret.length; i += 1) {
      hash ^= secret.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function readLocalDb() {
    try {
      const raw = localStorage.getItem(model.LOCAL_DB_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && parsed.users && typeof parsed.users === 'object') {
        return parsed;
      }
    } catch {
      // Ignorar almacén corrupto y regenerar
    }
    return { users: {} };
  }

  function writeLocalDb(db) {
    localStorage.setItem(model.LOCAL_DB_KEY, JSON.stringify(db));
  }

  function toPublicLocalProfile(rec) {
    return {
      slug: rec.slug,
      displayName: rec.displayName,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      summary: model.computeProfileSummaryClient(rec.slug, rec.displayName, rec.data, rec.createdAt, rec.updatedAt),
      data: model.sanitizeState(rec.data)
    };
  }

  const localDbApi = {
    async listUsers() {
      const db = readLocalDb();
      const users = Object.values(db.users).map((rec) =>
        model.computeProfileSummaryClient(rec.slug, rec.displayName, rec.data, rec.createdAt, rec.updatedAt)
      );
      users.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      return { users };
    },

    async getProfile(slug) {
      const db = readLocalDb();
      const rec = db.users[slug];
      if (!rec) {
        const err = new Error('Perfil de usuario no encontrado.');
        err.status = 404;
        throw err;
      }
      return { profile: toPublicLocalProfile(rec) };
    },

    async register(username, pin, initialData) {
      const check = model.normalizeUsernameClient(username);
      if (!check.ok) {
        const err = new Error(check.error);
        err.status = 400;
        throw err;
      }
      const cleanPin = String(pin || '').trim();
      if (cleanPin.length < 4 || cleanPin.length > 64) {
        const err = new Error('La clave o PIN debe tener entre 4 y 64 caracteres.');
        err.status = 400;
        throw err;
      }

      const db = readLocalDb();
      if (db.users[check.slug]) {
        const err = new Error('Ese nombre de usuario ya existe. Inicia sesión con tu clave si es tuyo.');
        err.status = 409;
        throw err;
      }

      const salt = model.generateId('salt');
      const pinHash = await hashLocalSecret(`${salt}:${cleanPin}`);
      const token = model.generateId('localtok');
      const tokenHash = await hashLocalSecret(token);
      const now = new Date().toISOString();

      const rec = {
        slug: check.slug,
        displayName: check.displayName,
        pinSalt: salt,
        pinHash,
        sessions: [tokenHash],
        createdAt: now,
        updatedAt: now,
        data: model.sanitizeState(initialData || model.createDefaultState())
      };

      db.users[rec.slug] = rec;
      writeLocalDb(db);
      return { token, profile: toPublicLocalProfile(rec) };
    },

    async login(username, pin) {
      const check = model.normalizeUsernameClient(username);
      const db = readLocalDb();
      const rec = check.ok ? db.users[check.slug] : null;
      const cleanPin = String(pin || '').trim();

      if (!rec || cleanPin.length < 4) {
        const err = new Error('Usuario o clave incorrectos.');
        err.status = 401;
        throw err;
      }

      const expected = await hashLocalSecret(`${rec.pinSalt}:${cleanPin}`);
      if (expected !== rec.pinHash) {
        const err = new Error('Usuario o clave incorrectos.');
        err.status = 401;
        throw err;
      }

      const token = model.generateId('localtok');
      const tokenHash = await hashLocalSecret(token);
      rec.sessions = [...(Array.isArray(rec.sessions) ? rec.sessions : []), tokenHash].slice(-10);
      writeLocalDb(db);
      return { token, profile: toPublicLocalProfile(rec) };
    },

    async logout(slug, token) {
      if (!slug || !token) return { ok: true };
      const db = readLocalDb();
      const rec = db.users[slug];
      if (rec && Array.isArray(rec.sessions)) {
        const tokenHash = await hashLocalSecret(token);
        rec.sessions = rec.sessions.filter((h) => h !== tokenHash);
        writeLocalDb(db);
      }
      return { ok: true };
    },

    async updateProfile(slug, token, data) {
      const db = readLocalDb();
      const rec = db.users[slug];
      if (!rec) {
        const err = new Error('Perfil de usuario no encontrado.');
        err.status = 404;
        throw err;
      }
      const tokenHash = await hashLocalSecret(token || '');
      if (!Array.isArray(rec.sessions) || !rec.sessions.includes(tokenHash)) {
        const err = new Error('Sesión inválida o expirada.');
        err.status = 401;
        throw err;
      }
      rec.data = model.sanitizeState(data);
      rec.updatedAt = new Date().toISOString();
      writeLocalDb(db);
      return {
        ok: true,
        updatedAt: rec.updatedAt,
        summary: model.computeProfileSummaryClient(rec.slug, rec.displayName, rec.data, rec.createdAt, rec.updatedAt)
      };
    }
  };

  function isLocalEnvironment() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
  }

  async function requestApiJson(url, options = {}) {
    const res = await fetch(url, {
      cache: 'no-store',
      ...options
    });
    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const err = new Error(payload?.error || `Error del servidor (${res.status})`);
      err.status = res.status;
      err.code = payload?.code || null;
      throw err;
    }
    return payload || {};
  }

  /**
   * Crea un cliente de backend que alterna entre Cloudflare KV y localDbApi según el entorno.
   */
  function createBackendClient(ctx) {
    async function detectBackend() {
      try {
        const data = await requestApiJson('/api/series');
        ctx.storageMode = 'cloud';
        ctx.kvUnconfigured = false;
        ctx.directoryUsers = Array.isArray(data.users) ? data.users : [];
        return { ok: true, users: ctx.directoryUsers };
      } catch (err) {
        if (err.status === 503 && err.code === 'KV_NOT_CONFIGURED') {
          ctx.storageMode = 'local';
          ctx.kvUnconfigured = true;
          ctx.showStorageNotice(
            '<strong>Modo local en este navegador:</strong> Falta enlazar el namespace KV <code>SERIES_KV</code> en Cloudflare Pages (ver <code>SERIES_SETUP.md</code>) para que otros dispositivos vean tus calificaciones.'
          );
          const localData = await localDbApi.listUsers();
          ctx.directoryUsers = localData.users;
          return { ok: true, users: ctx.directoryUsers };
        }

        if (isLocalEnvironment()) {
          ctx.storageMode = 'local';
          ctx.kvUnconfigured = false;
          ctx.showStorageNotice(
            '<strong>Modo prueba local:</strong> Estás corriendo el sitio sin Cloudflare Pages Functions; los usuarios y notas se guardan en este navegador.'
          );
          const localData = await localDbApi.listUsers();
          ctx.directoryUsers = localData.users;
          return { ok: true, users: ctx.directoryUsers };
        }

        ctx.storageMode = 'cloud';
        ctx.showStorageNotice(
          `<strong>Sin conexión con el servidor de series:</strong> ${model.escapeHtml(err.message)}. Intenta recargar la página.`
        );
        return { ok: false, error: err.message };
      }
    }

    async function apiListUsers() {
      if (ctx.storageMode === 'local') {
        const res = await localDbApi.listUsers();
        ctx.directoryUsers = res.users;
        return ctx.directoryUsers;
      }
      const res = await requestApiJson('/api/series');
      ctx.directoryUsers = Array.isArray(res.users) ? res.users : [];
      return ctx.directoryUsers;
    }

    async function apiGetProfile(slug) {
      if (ctx.storageMode === 'local') {
        return localDbApi.getProfile(slug);
      }
      return requestApiJson(`/api/series/${encodeURIComponent(slug)}`);
    }

    async function apiRegister(username, pin, initialData) {
      if (ctx.storageMode === 'local') {
        return localDbApi.register(username, pin, initialData);
      }
      return requestApiJson('/api/series/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, data: initialData })
      });
    }

    async function apiLogin(username, pin) {
      if (ctx.storageMode === 'local') {
        return localDbApi.login(username, pin);
      }
      return requestApiJson('/api/series/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });
    }

    async function apiLogout(slug, token) {
      if (ctx.storageMode === 'local') {
        return localDbApi.logout(slug, token);
      }
      return requestApiJson('/api/series/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ slug })
      });
    }

    async function apiUpdateProfile(slug, token, data, useKeepalive = false) {
      if (ctx.storageMode === 'local') {
        return localDbApi.updateProfile(slug, token, data);
      }
      return requestApiJson(`/api/series/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        keepalive: Boolean(useKeepalive),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ data })
      });
    }

    return {
      detectBackend,
      apiListUsers,
      apiGetProfile,
      apiRegister,
      apiLogin,
      apiLogout,
      apiUpdateProfile
    };
  }

  global.SeriesTracker = global.SeriesTracker || {};
  global.SeriesTracker.storage = {
    loadSessionFromStorage,
    persistSession,
    saveLocalCacheForSlug,
    getLegacyLocalData,
    hashLocalSecret,
    readLocalDb,
    writeLocalDb,
    toPublicLocalProfile,
    localDbApi,
    isLocalEnvironment,
    requestApiJson,
    createBackendClient
  };
})(window);
