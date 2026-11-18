/**
 * Capa compartida de almacenamiento en Cloudflare KV, validación y criptografía
 * para los perfiles del Series Tracker (/api/series/*).
 */

export const SERIES_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const RESERVED_SLUGS = new Set([
  'register',
  'login',
  'logout',
  'index',
  'users',
  'user',
  'profile',
  'profiles',
  'me',
  'admin',
  'api',
  'new',
  'create'
]);

export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_SESSIONS_PER_USER = 10;
// Cloudflare Workers admite un máximo de 100.000 iteraciones en PBKDF2
export const PBKDF2_ITERATIONS = 100000;

const MAX_SERIES = 200;
const MAX_SEASONS_PER_SERIES = 50;
const MAX_EPISODES_PER_SEASON = 500;

const textEncoder = new TextEncoder();

/**
 * Construye una respuesta JSON con cabeceras CORS y sin caché.
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SERIES_CORS_HEADERS,
      ...extraHeaders
    }
  });
}

/**
 * Responde a solicitudes preflight OPTIONS.
 */
export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: SERIES_CORS_HEADERS
  });
}

/**
 * Obtiene el binding KV configurado en Cloudflare Pages.
 */
export function getSeriesKv(env) {
  return env?.SERIES_KV || null;
}

/**
 * Respuesta estándar cuando falta configurar el namespace SERIES_KV.
 */
export function kvMissingResponse() {
  return jsonResponse(
    {
      error: 'Base de datos KV no configurada (falta el binding SERIES_KV en Cloudflare Pages).',
      code: 'KV_NOT_CONFIGURED'
    },
    503
  );
}

/**
 * Clave de almacenamiento en KV para un usuario.
 */
export function userKvKey(slug) {
  return `user:${slug}`;
}

/**
 * Genera un identificador breve para entidades de seguimiento.
 */
function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Normaliza y valida el nombre de usuario visible y su slug único.
 */
export function normalizeUsername(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'El nombre de usuario debe ser texto.' };
  }

  const displayName = raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (displayName.length < 2 || displayName.length > 24) {
    return { ok: false, error: 'El usuario debe tener entre 2 y 24 caracteres.' };
  }

  const slug = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 24)
    .replace(/[-_]+$/g, '');

  if (!/^[a-z0-9][a-z0-9_-]{1,23}$/.test(slug)) {
    return {
      ok: false,
      error: 'Usa al menos 2 letras o números válidos para el nombre de usuario.'
    };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: 'Ese nombre de usuario está reservado. Elige otro.' };
  }

  return { ok: true, slug, displayName };
}

/**
 * Valida la clave o PIN corta del usuario (4 a 64 caracteres).
 */
export function validatePin(rawPin) {
  if (typeof rawPin !== 'string') {
    return { ok: false, error: 'La clave debe ser un texto válido.' };
  }
  const pin = rawPin.trim();
  if (pin.length < 4 || pin.length > 64) {
    return { ok: false, error: 'La clave o PIN debe tener entre 4 y 64 caracteres.' };
  }
  return { ok: true, pin };
}

/**
 * Lee y parsea el cuerpo JSON de la petición respetando el límite de tamaño.
 */
export async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'El contenido enviado supera el tamaño máximo permitido.' };
  }

  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    return { ok: false, status: 400, error: 'No se pudo leer el cuerpo de la solicitud.' };
  }

  if (textEncoder.encode(rawText).byteLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'El contenido enviado supera el tamaño máximo permitido.' };
  }

  if (!rawText.trim()) {
    return { ok: true, body: {} };
  }

  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'El JSON debe ser un objeto válido.' };
    }
    return { ok: true, body: parsed };
  } catch {
    return { ok: false, status: 400, error: 'JSON inválido en la solicitud.' };
  }
}

/**
 * Normaliza una puntuación numérica al rango [0, 10] con hasta 2 decimales.
 */
function normalizeScore(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  const normalizedText = String(rawValue).trim().replace(',', '.');
  if (normalizedText === '') return null;
  const parsed = Number(normalizedText);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;
  const clamped = Math.min(10, Math.max(0, parsed));
  return Math.round(clamped * 100) / 100;
}

/**
 * Crea un estado inicial limpio sin calificaciones pre-cargadas.
 */
export function createEmptyTrackerData() {
  const season1Id = generateId('season');
  const series1Id = generateId('series');
  return {
    activeSeriesId: series1Id,
    chartScope: 'season',
    episodeFilter: 'all',
    seriesList: [
      {
        id: series1Id,
        title: 'Mi primera serie',
        activeSeasonId: season1Id,
        seasons: [
          {
            id: season1Id,
            number: 1,
            episodes: [
              { id: generateId('ep'), number: 1, title: '', score: null },
              { id: generateId('ep'), number: 2, title: '', score: null },
              { id: generateId('ep'), number: 3, title: '', score: null }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Valida, acota y limpia la estructura de series de un usuario.
 */
export function sanitizeTrackerData(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.seriesList) || raw.seriesList.length === 0) {
    return createEmptyTrackerData();
  }

  const sanitizedSeries = raw.seriesList.slice(0, MAX_SERIES).map((s, sIdx) => {
    const src = s && typeof s === 'object' ? s : {};
    const seriesId = typeof src.id === 'string' && src.id.trim()
      ? src.id.trim().slice(0, 64)
      : generateId('series');
    const title = typeof src.title === 'string'
      ? src.title.slice(0, 80)
      : `Serie ${sIdx + 1}`;

    const rawSeasons = Array.isArray(src.seasons) && src.seasons.length > 0
      ? src.seasons.slice(0, MAX_SEASONS_PER_SERIES)
      : [{ id: generateId('season'), number: 1, episodes: [] }];

    const seasons = rawSeasons.map((sea, seaIdx) => {
      const seaSrc = sea && typeof sea === 'object' ? sea : {};
      const seasonId = typeof seaSrc.id === 'string' && seaSrc.id.trim()
        ? seaSrc.id.trim().slice(0, 64)
        : generateId('season');
      const seasonNum = Number.isFinite(Number(seaSrc.number)) && Number(seaSrc.number) > 0
        ? Math.floor(Number(seaSrc.number))
        : seaIdx + 1;
      const rawEps = Array.isArray(seaSrc.episodes)
        ? seaSrc.episodes.slice(0, MAX_EPISODES_PER_SEASON)
        : [];

      const episodes = rawEps.map((ep, epIdx) => {
        const epSrc = ep && typeof ep === 'object' ? ep : {};
        return {
          id: typeof epSrc.id === 'string' && epSrc.id.trim()
            ? epSrc.id.trim().slice(0, 64)
            : generateId('ep'),
          number: Number.isFinite(Number(epSrc.number)) && Number(epSrc.number) > 0
            ? Math.floor(Number(epSrc.number))
            : epIdx + 1,
          title: typeof epSrc.title === 'string' ? epSrc.title.slice(0, 120) : '',
          score: normalizeScore(epSrc.score)
        };
      });

      return { id: seasonId, number: seasonNum, episodes };
    });

    const hasActiveSeason = seasons.some((sea) => sea.id === src.activeSeasonId);
    return {
      id: seriesId,
      title,
      activeSeasonId: hasActiveSeason ? src.activeSeasonId : seasons[0].id,
      seasons
    };
  });

  const hasActiveSeries = sanitizedSeries.some((s) => s.id === raw.activeSeriesId);
  const chartScope = raw.chartScope === 'series' ? 'series' : 'season';
  const episodeFilter = ['all', 'rated', 'unrated'].includes(raw.episodeFilter)
    ? raw.episodeFilter
    : 'all';

  return {
    activeSeriesId: hasActiveSeries ? raw.activeSeriesId : sanitizedSeries[0].id,
    chartScope,
    episodeFilter,
    seriesList: sanitizedSeries
  };
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

/**
 * Comparación en tiempo constante para cadenas hexadecimales.
 */
export function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Deriva un hash PBKDF2-SHA256 del PIN con salt aleatoria de 16 bytes.
 */
export async function hashPin(pin, existingSaltHex = null) {
  const saltBytes = existingSaltHex ? hexToBytes(existingSaltHex) : crypto.getRandomValues(new Uint8Array(16));
  if (!saltBytes) {
    throw new Error('Salt inválida para verificar el PIN.');
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    saltHex: bytesToHex(saltBytes),
    hashHex: bytesToHex(new Uint8Array(derivedBits))
  };
}

/**
 * Verifica un PIN contra su salt y hash almacenados.
 */
export async function verifyPin(pin, saltHex, expectedHashHex) {
  if (!pin || !saltHex || !expectedHashHex) return false;
  try {
    const { hashHex } = await hashPin(pin, saltHex);
    return timingSafeEqualHex(hashHex, expectedHashHex);
  } catch {
    return false;
  }
}

/**
 * Genera un token aleatorio de sesión de 256 bits en hexadecimal.
 */
export function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Calcula el hash SHA-256 de un token de sesión para guardarlo en KV.
 */
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Extrae el token Bearer del header Authorization.
 */
export function extractBearerToken(request) {
  const auth = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Comprueba en tiempo constante si el token pertenece a alguna sesión activa del usuario.
 */
export async function isValidSession(userRecord, rawToken) {
  if (!userRecord || !rawToken || !Array.isArray(userRecord.sessions) || userRecord.sessions.length === 0) {
    return false;
  }
  const incomingHash = await hashToken(rawToken);
  let valid = false;
  for (const storedHash of userRecord.sessions) {
    if (timingSafeEqualHex(incomingHash, storedHash)) {
      valid = true;
    }
  }
  return valid;
}

/**
 * Calcula un resumen compacto del perfil para el listado y metadatos de KV (< 1024 bytes).
 */
export function computeProfileSummary(slug, displayName, data, createdAt, updatedAt) {
  const seriesList = Array.isArray(data?.seriesList) ? data.seriesList : [];
  let ratedCount = 0;
  let totalEpisodes = 0;
  let scoreSum = 0;
  let topSeriesTitle = '';
  let topSeriesRatedCount = -1;

  for (const series of seriesList) {
    let seriesRated = 0;
    const seasons = Array.isArray(series?.seasons) ? series.seasons : [];
    for (const season of seasons) {
      const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
      totalEpisodes += episodes.length;
      for (const ep of episodes) {
        if (typeof ep?.score === 'number' && Number.isFinite(ep.score) && ep.score >= 0 && ep.score <= 10) {
          ratedCount += 1;
          seriesRated += 1;
          scoreSum += ep.score;
        }
      }
    }
    const candidateTitle = typeof series?.title === 'string' ? series.title.trim() : '';
    if (candidateTitle && seriesRated > topSeriesRatedCount) {
      topSeriesRatedCount = seriesRated;
      topSeriesTitle = candidateTitle;
    }
  }

  return {
    slug,
    displayName,
    seriesCount: seriesList.length,
    ratedCount,
    totalEpisodes,
    avgScore: ratedCount > 0 ? Math.round((scoreSum / ratedCount) * 100) / 100 : null,
    topSeriesTitle: topSeriesTitle.slice(0, 40),
    createdAt,
    updatedAt
  };
}

/**
 * Construye la representación pública del perfil sin exponer credenciales ni sesiones.
 */
export function toPublicUserPayload(record) {
  const summary = computeProfileSummary(
    record.slug,
    record.displayName,
    record.data,
    record.createdAt,
    record.updatedAt
  );
  return {
    slug: record.slug,
    displayName: record.displayName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    summary,
    data: record.data
  };
}

/**
 * Guarda el registro completo en Cloudflare KV junto con su resumen en metadata.
 */
export async function saveUserRecord(kv, record) {
  const summary = computeProfileSummary(
    record.slug,
    record.displayName,
    record.data,
    record.createdAt,
    record.updatedAt
  );
  await kv.put(userKvKey(record.slug), JSON.stringify(record), {
    metadata: summary
  });
  return summary;
}

/**
 * Obtiene el registro completo de un usuario por slug.
 */
export async function getUserRecord(kv, slug) {
  if (!slug) return null;
  return kv.get(userKvKey(slug), 'json');
}

/**
 * Lista todos los perfiles guardados usando los metadatos de KV ordenados por última actualización.
 */
export async function listAllProfiles(kv) {
  const profiles = [];
  let cursor;
  let listComplete = false;

  while (!listComplete) {
    const page = await kv.list({ prefix: 'user:', cursor });
    const keys = Array.isArray(page?.keys) ? page.keys : [];

    for (const keyEntry of keys) {
      if (keyEntry.metadata && typeof keyEntry.metadata === 'object' && keyEntry.metadata.slug) {
        profiles.push(keyEntry.metadata);
      } else if (typeof keyEntry.name === 'string' && keyEntry.name.startsWith('user:')) {
        const slug = keyEntry.name.slice('user:'.length);
        const record = await getUserRecord(kv, slug);
        if (record) {
          profiles.push(
            computeProfileSummary(
              record.slug,
              record.displayName,
              record.data,
              record.createdAt,
              record.updatedAt
            )
          );
        }
      }
    }

    listComplete = Boolean(page?.list_complete);
    cursor = page?.cursor;
    if (!cursor && !listComplete) break;
  }

  profiles.sort((a, b) => {
    const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });

  return profiles;
}
