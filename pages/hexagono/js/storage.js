/**
 * Persistencia de sesión exclusiva para @alex y cliente de almacenamiento
 * compartido entre Cloudflare KV (/api/hexagono) y respaldo local (localStorage).
 */
(function (global) {
  const model = global.HexagonoApp.model;

  function parseSessionRaw(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.slug === 'string' &&
        parsed.slug.toLowerCase() === 'alex' &&
        typeof parsed.token === 'string' &&
        parsed.token.trim()
      ) {
        return {
          slug: 'alex',
          displayName: parsed.displayName || 'Alex',
          token: parsed.token.trim()
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Recupera la sesión activa de @alex (reutilizando también la de Series Tracker si ya inició sesión).
   */
  function loadAlexSession() {
    try {
      const own = parseSessionRaw(localStorage.getItem(model.ALEX_SESSION_KEY));
      if (own) return own;
      const shared = parseSessionRaw(localStorage.getItem(model.SERIES_SESSION_KEY));
      if (shared) return shared;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Persiste o limpia la sesión de @alex sincronizando ambas claves si corresponde.
   */
  function persistAlexSession(session) {
    try {
      if (session && session.slug === 'alex' && session.token) {
        const clean = {
          slug: 'alex',
          displayName: session.displayName || 'Alex',
          token: session.token
        };
        const serialized = JSON.stringify(clean);
        localStorage.setItem(model.ALEX_SESSION_KEY, serialized);

        const existingSeries = localStorage.getItem(model.SERIES_SESSION_KEY);
        if (!existingSeries) {
          localStorage.setItem(model.SERIES_SESSION_KEY, serialized);
        } else {
          const parsedSeries = JSON.parse(existingSeries);
          if (parsedSeries && parsedSeries.slug === 'alex') {
            localStorage.setItem(model.SERIES_SESSION_KEY, serialized);
          }
        }
        return;
      }

      localStorage.removeItem(model.ALEX_SESSION_KEY);
      const existingSeries = localStorage.getItem(model.SERIES_SESSION_KEY);
      if (existingSeries) {
        const parsedSeries = JSON.parse(existingSeries);
        if (parsedSeries && parsedSeries.slug === 'alex') {
          localStorage.removeItem(model.SERIES_SESSION_KEY);
        }
      }
    } catch (err) {
      console.error('Error al persistir sesión de Alex:', err);
    }
  }

  function isLocalEnvironment() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
  }

  async function hashLocalSecret(secret) {
    if (window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(secret);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 2166136261;
    for (let i = 0; i < secret.length; i += 1) {
      hash ^= secret.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function readLocalBoard() {
    try {
      const raw = localStorage.getItem(model.LOCAL_BOARD_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.board) {
        return {
          board: model.sanitizeBoard(parsed.board),
          updatedAt: parsed.updatedAt || null
        };
      }
    } catch {
      // Ignorar datos locales dañados
    }
    return null;
  }

  function writeLocalBoard(board) {
    const sanitized = model.sanitizeBoard(board);
    const updatedAt = new Date().toISOString();
    localStorage.setItem(
      model.LOCAL_BOARD_KEY,
      JSON.stringify({ board: sanitized, updatedAt, updatedBy: 'alex' })
    );
    return { board: sanitized, updatedAt, updatedBy: 'alex' };
  }

  async function loginLocalAlex(pin) {
    const cleanPin = String(pin || '').trim();
    if (cleanPin.length < 4 || cleanPin.length > 64) {
      const err = new Error('La clave o PIN debe tener entre 4 y 64 caracteres.');
      err.status = 400;
      throw err;
    }

    try {
      const rawDb = localStorage.getItem(model.LOCAL_SERIES_DB_KEY);
      const db = rawDb ? JSON.parse(rawDb) : null;
      const alexRec = db?.users?.alex;
      if (alexRec && alexRec.pinSalt && alexRec.pinHash) {
        const expected = await hashLocalSecret(`${alexRec.pinSalt}:${cleanPin}`);
        if (expected !== alexRec.pinHash) {
          const err = new Error('Clave incorrecta para el usuario local @alex.');
          err.status = 401;
          throw err;
        }
      }
    } catch (err) {
      if (err.status === 401) throw err;
    }

    return {
      slug: 'alex',
      displayName: 'Alex',
      token: model.generateId('local-alex')
    };
  }

  async function requestJson(url, options = {}) {
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
   * Crea el cliente unificado nube/local para el Hexágono de Arquetipos.
   */
  function createBackendClient(ctx) {
    async function loadBoard(token) {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const data = await requestJson('/api/hexagono', { headers });
        ctx.storageMode = 'cloud';
        ctx.kvUnconfigured = false;
        return {
          board: model.sanitizeBoard(data.board),
          isDefault: Boolean(data.isDefault),
          updatedAt: data.updatedAt || null,
          canEdit: Boolean(data.canEdit),
          alexExists: data.alexExists !== false
        };
      } catch (err) {
        if (err.status === 503 && err.code === 'KV_NOT_CONFIGURED') {
          ctx.storageMode = 'local';
          ctx.kvUnconfigured = true;
          ctx.showNotice(
            '<strong>Modo local en este navegador:</strong> Falta enlazar el namespace KV <code>SERIES_KV</code> en Cloudflare Pages para sincronizar los cambios entre dispositivos.'
          );
          const local = readLocalBoard();
          return {
            board: local ? local.board : model.createDefaultBoard(),
            isDefault: !local,
            updatedAt: local?.updatedAt || null,
            canEdit: Boolean(token),
            alexExists: true
          };
        }

        if (isLocalEnvironment()) {
          ctx.storageMode = 'local';
          ctx.kvUnconfigured = false;
          ctx.showNotice(
            '<strong>Modo prueba local:</strong> Ejecutando sin Cloudflare Pages Functions; los cambios de <code>@alex</code> se guardan en este navegador.'
          );
          const local = readLocalBoard();
          return {
            board: local ? local.board : model.createDefaultBoard(),
            isDefault: !local,
            updatedAt: local?.updatedAt || null,
            canEdit: Boolean(token),
            alexExists: true
          };
        }

        throw err;
      }
    }

    async function saveBoard(token, board, useKeepalive = false) {
      if (ctx.storageMode === 'local') {
        const saved = writeLocalBoard(board);
        return { ok: true, ...saved };
      }

      return requestJson('/api/hexagono', {
        method: 'PUT',
        keepalive: Boolean(useKeepalive),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ board })
      });
    }

    async function loginAsAlex(pin) {
      if (ctx.storageMode === 'local') {
        return loginLocalAlex(pin);
      }

      const data = await requestJson('/api/series/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alex', pin })
      });

      if (!data?.token || data?.profile?.slug !== 'alex') {
        const err = new Error('Solo el usuario @alex puede editar el hexágono.');
        err.status = 403;
        throw err;
      }

      return {
        slug: 'alex',
        displayName: data.profile.displayName || 'Alex',
        token: data.token
      };
    }

    async function logoutAlex(token) {
      if (ctx.storageMode === 'local' || !token) return { ok: true };
      return requestJson('/api/series/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ slug: 'alex' })
      }).catch(() => ({ ok: true }));
    }

    return {
      loadBoard,
      saveBoard,
      loginAsAlex,
      logoutAlex
    };
  }

  global.HexagonoApp = global.HexagonoApp || {};
  global.HexagonoApp.storage = {
    loadAlexSession,
    persistAlexSession,
    isLocalEnvironment,
    readLocalBoard,
    writeLocalBoard,
    createBackendClient
  };
})(window);
