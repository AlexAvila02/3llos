/**
 * Capa de almacenamiento en Cloudflare KV, validación y geometría HEXACO
 * para el tablero del Hexágono de Arquetipos (/api/hexagono).
 */
import {
  extractBearerToken,
  getSeriesKv,
  getUserRecord,
  isValidSession,
  jsonResponse,
  kvMissingResponse,
  optionsResponse,
  readJsonBody
} from './_series-store.js';

export {
  getSeriesKv,
  jsonResponse,
  kvMissingResponse,
  optionsResponse,
  readJsonBody
};

export const HEXAGONO_KV_KEY = 'hexagono:board:v1';
export const HEXAGONO_ADMIN_SLUG = 'alex';
export const ARCHETYPE_KEYS = ['H', 'E', 'X', 'A', 'C', 'O'];
export const VERTEX_ANGLES_DEG = [-90, -30, 30, 90, 150, 210];
export const MAX_PEOPLE = 60;
export const HEX_POS_MAX_RADIUS = 0.82;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SQRT3_HALF = Math.sqrt(3) / 2;

const DEFAULT_ARCHETYPES = [
  {
    key: 'H',
    name: 'El Íntegro',
    dimension: 'Honestidad-Humildad',
    emoji: '⚖️',
    color: '#fbbf24',
    description:
      'Representa la sinceridad, la equidad y la falta de codicia o arrogancia. Quienes puntúan alto actúan con transparencia y prefieren el trato justo incluso cuando nadie mira.',
    traits: ['Sincero', 'Justo', 'Leal', 'Modesto']
  },
  {
    key: 'E',
    name: 'El Empático',
    dimension: 'Emocionalidad',
    emoji: '🌊',
    color: '#fb7185',
    description:
      'Mide la sensibilidad emocional, el apego afectivo y la empatía profunda hacia el grupo. Detecta rápido cómo se sienten los demás y cuida los vínculos cercanos.',
    traits: ['Sensible', 'Protector', 'Intuitivo', 'Cercano']
  },
  {
    key: 'X',
    name: 'El Carismático',
    dimension: 'Extraversión',
    emoji: '⚡',
    color: '#e879f9',
    description:
      'Refleja la energía social, la expresividad, la confianza y el entusiasmo al liderar o animar charlas. Suele encender el ambiente cuando el grupo se junta.',
    traits: ['Sociable', 'Expresivo', 'Animador', 'Seguro']
  },
  {
    key: 'A',
    name: 'El Conciliador',
    dimension: 'Amabilidad',
    emoji: '🌿',
    color: '#34d399',
    description:
      'Describe la paciencia, la tolerancia y la disposición a perdonar sin guardar rencor. Mantiene la paz en los debates intensos y busca acuerdos reales.',
    traits: ['Paciente', 'Calmado', 'Flexible', 'Pacificador']
  },
  {
    key: 'C',
    name: 'El Estratega',
    dimension: 'Responsabilidad',
    emoji: '🎯',
    color: '#38bdf8',
    description:
      'Encarna la organización, la disciplina, el pensamiento metódico y el perfeccionismo. Planifica cada paso con precisión y cumple lo que se propone.',
    traits: ['Metódico', 'Preciso', 'Constante', 'Prudente']
  },
  {
    key: 'O',
    name: 'El Visionario',
    dimension: 'Apertura a la Experiencia',
    emoji: '✨',
    color: '#818cf8',
    description:
      'Abarca la curiosidad intelectual, la creatividad estética y el gusto por ideas poco convencionales. Siempre imagina proyectos, mundos o rutas distintas.',
    traits: ['Creativo', 'Curioso', 'Original', 'Imaginativo']
  }
];

const DEFAULT_PEOPLE = [
  {
    id: 'person-alex',
    name: 'Alex',
    alias: 'Arquitecto del tablero',
    emoji: '🌌',
    avatarUrl: '',
    color: '#818cf8',
    bio: 'Siempre armando sistemas, ideas raras y detalles nuevos para el grupo.',
    scores: { H: 74, E: 52, X: 60, A: 66, C: 78, O: 92 },
    pos: { x: -0.49, y: -0.25 },
    manualPos: true
  },
  {
    id: 'person-calipso',
    name: 'Calipso',
    alias: 'Gio',
    emoji: '🎧',
    avatarUrl: '',
    color: '#e879f9',
    bio: 'Energía social constante, ritmo rápido y presencia en cada juntada.',
    scores: { H: 62, E: 56, X: 90, A: 64, C: 58, O: 72 },
    pos: { x: 0.48, y: 0.24 },
    manualPos: true
  },
  {
    id: 'person-arroz',
    name: 'Arroz',
    alias: 'Danilo',
    emoji: '🍚',
    avatarUrl: '',
    color: '#fbbf24',
    bio: 'Directo, leal al código propio y firme en sus convicciones.',
    scores: { H: 88, E: 48, X: 65, A: 62, C: 70, O: 60 },
    pos: { x: 0.04, y: -0.56 },
    manualPos: true
  },
  {
    id: 'person-pinguipollo',
    name: 'Pinguipollo',
    alias: 'Fede',
    emoji: '🐧',
    avatarUrl: '',
    color: '#34d399',
    bio: 'Tranquilo bajo presión y pieza clave para equilibrar el clima.',
    scores: { H: 72, E: 58, X: 54, A: 88, C: 64, O: 62 },
    pos: { x: -0.02, y: 0.56 },
    manualPos: true
  },
  {
    id: 'person-primito',
    name: 'Primito',
    alias: 'Tobi',
    emoji: '🌊',
    avatarUrl: '',
    color: '#fb7185',
    bio: 'Muy conectado con lo que pasa en el grupo y atento al ánimo general.',
    scores: { H: 66, E: 88, X: 68, A: 72, C: 55, O: 64 },
    pos: { x: 0.47, y: -0.27 },
    manualPos: true
  },
  {
    id: 'person-pablito',
    name: 'Pablito',
    alias: 'Tomi',
    emoji: '🎯',
    avatarUrl: '',
    color: '#38bdf8',
    bio: 'Analítico, ordenado y siempre mirando la jugada más eficiente.',
    scores: { H: 70, E: 44, X: 52, A: 64, C: 90, O: 66 },
    pos: { x: -0.47, y: 0.28 },
    manualPos: true
  },
  {
    id: 'person-latipica',
    name: 'La Típica',
    alias: 'Gero',
    emoji: '⚔️',
    avatarUrl: '',
    color: '#38bdf8',
    bio: 'Competitivo, táctico y calculador cuando toca definir partidas.',
    scores: { H: 65, E: 42, X: 68, A: 54, C: 86, O: 74 },
    pos: { x: -0.28, y: 0.42 },
    manualPos: true
  },
  {
    id: 'person-godtorias',
    name: 'Godtorias',
    alias: 'Mau',
    emoji: '🛡️',
    avatarUrl: '',
    color: '#fbbf24',
    bio: 'Presencia serena, código de honor y criterio claro en las decisiones.',
    scores: { H: 85, E: 50, X: 58, A: 74, C: 76, O: 62 },
    pos: { x: -0.21, y: -0.44 },
    manualPos: true
  },
  {
    id: 'person-emilio',
    name: 'Emilio',
    alias: 'La chispa',
    emoji: '🔥',
    avatarUrl: '',
    color: '#e879f9',
    bio: 'Espontáneo y sin filtro, rompe el hielo en cuestión de segundos.',
    scores: { H: 54, E: 58, X: 86, A: 56, C: 48, O: 78 },
    pos: { x: 0.25, y: 0.41 },
    manualPos: true
  },
  {
    id: 'person-andres',
    name: 'Andrés',
    alias: 'Andy',
    emoji: '🧩',
    avatarUrl: '',
    color: '#818cf8',
    bio: 'Curioso y detallista, siempre encontrando ángulos poco obvios.',
    scores: { H: 72, E: 55, X: 52, A: 68, C: 74, O: 84 },
    pos: { x: -0.29, y: -0.14 },
    manualPos: true
  },
  {
    id: 'person-laura',
    name: 'Laura',
    alias: 'Lau',
    emoji: '🌸',
    avatarUrl: '',
    color: '#fb7185',
    bio: 'Calidez afectiva y escucha atenta que une distintas partes del grupo.',
    scores: { H: 76, E: 84, X: 64, A: 82, C: 64, O: 68 },
    pos: { x: 0.24, y: -0.16 },
    manualPos: true
  }
];

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function round4(num) {
  const rounded = Math.round(num * 10000) / 10000;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Devuelve el vector unitario del vértice de arquetipo `index` (0..5).
 */
export function getVertexUnitVector(index) {
  const deg = VERTEX_ANGLES_DEG[index] ?? -90;
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

/**
 * Restringe unas coordenadas normalizadas (x, y) estrictamente al interior
 * de un hexágono regular pointy-top de radio exterior `maxRadius`.
 */
export function clampToHexagon(rawX, rawY, maxRadius = HEX_POS_MAX_RADIUS) {
  const safeR = Number.isFinite(Number(maxRadius)) && Number(maxRadius) > 0
    ? Number(maxRadius)
    : HEX_POS_MAX_RADIUS;
  let x = Number(rawX);
  let y = Number(rawY);
  if (!Number.isFinite(x)) x = 0;
  if (!Number.isFinite(y)) y = 0;

  const inRadius = safeR * SQRT3_HALF;
  const metric = Math.max(
    Math.abs(x),
    Math.abs(0.5 * x + SQRT3_HALF * y),
    Math.abs(-0.5 * x + SQRT3_HALF * y)
  );

  if (metric > inRadius && metric > 0) {
    const scale = inRadius / metric;
    x *= scale;
    y *= scale;
  }

  return { x: round4(x), y: round4(y) };
}

/**
 * Calcula la posición dentro del hexágono a partir de los 6 puntajes HEXACO (0-100).
 */
export function scoresToHexPosition(scores) {
  let vx = 0;
  let vy = 0;

  for (let i = 0; i < ARCHETYPE_KEYS.length; i += 1) {
    const key = ARCHETYPE_KEYS[i];
    const val = clampScore(scores?.[key]);
    const weight = val / 100;
    const unit = getVertexUnitVector(i);
    vx += weight * unit.x;
    vy += weight * unit.y;
  }

  // Factor 1.45 para aprovechar la amplitud visual cuando un eje sobresale sobre el promedio
  return clampToHexagon(vx * 1.45, vy * 1.45, 0.78);
}

/**
 * Comprueba si un color tiene formato hexadecimal de 6 dígitos (#RRGGBB).
 */
export function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
}

/**
 * Valida y sanea una URL opcional de avatar permitiendo solo http(s) o rutas dentro de assets.
 */
export function sanitizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 300);
  if (!trimmed) return '';
  if (/^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(?:\.\.\/){0,2}assets\/[^\s"'<>]+$/i.test(trimmed) && !trimmed.includes('..', 6)) {
    return trimmed;
  }
  return '';
}

function clampScore(raw, fallback = 50) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function cleanText(raw, maxLen, fallback = '') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

/**
 * Crea el tablero inicial basado en el modelo científico HEXACO y miembros de Papubanda.
 */
export function createDefaultHexagonoBoard() {
  return {
    version: 1,
    title: 'Hexágono de Arquetipos',
    subtitle: 'Clasificación de la Papubanda basada en el modelo científico HEXACO (evolución de 6 factores del Big Five)',
    archetypes: DEFAULT_ARCHETYPES.map((arch) => ({
      ...arch,
      traits: [...arch.traits]
    })),
    people: DEFAULT_PEOPLE.map((person) => ({
      ...person,
      scores: { ...person.scores },
      pos: { ...person.pos }
    }))
  };
}

/**
 * Valida y sanea por completo la estructura del tablero del hexágono.
 */
export function sanitizeHexagonoBoard(raw) {
  const defaults = createDefaultHexagonoBoard();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }

  const title = cleanText(raw.title, 80, defaults.title);
  const subtitle = cleanText(raw.subtitle, 200, defaults.subtitle);

  const rawArchetypes = Array.isArray(raw.archetypes) ? raw.archetypes : [];
  const archetypes = DEFAULT_ARCHETYPES.map((defArch, index) => {
    const byKey = rawArchetypes.find((item) => item && item.key === defArch.key);
    const candidate = byKey || (rawArchetypes[index] && typeof rawArchetypes[index] === 'object' ? rawArchetypes[index] : {});
    const rawTraits = Array.isArray(candidate.traits) ? candidate.traits : defArch.traits;
    const traits = rawTraits
      .map((t) => cleanText(t, 24, ''))
      .filter(Boolean)
      .slice(0, 6);

    return {
      key: defArch.key,
      name: cleanText(candidate.name, 40, defArch.name),
      dimension: cleanText(candidate.dimension, 50, defArch.dimension),
      emoji: cleanText(candidate.emoji, 8, defArch.emoji),
      color: isValidHexColor(candidate.color) ? candidate.color.trim().toLowerCase() : defArch.color,
      description: cleanText(candidate.description, 280, defArch.description),
      traits: traits.length > 0 ? traits : [...defArch.traits]
    };
  });

  const rawPeople = Array.isArray(raw.people) ? raw.people.slice(0, MAX_PEOPLE) : defaults.people;
  const seenIds = new Set();
  const people = rawPeople.map((item, idx) => {
    const src = item && typeof item === 'object' ? item : {};
    let id = cleanText(src.id, 64, '');
    if (!id || seenIds.has(id)) {
      id = generateId(`person-${idx + 1}`);
    }
    seenIds.add(id);

    const scores = {};
    for (const key of ARCHETYPE_KEYS) {
      scores[key] = clampScore(src.scores?.[key], 50);
    }

    const manualPos = src.manualPos !== false;
    const hasCoords = src.pos && typeof src.pos === 'object'
      && Number.isFinite(Number(src.pos.x))
      && Number.isFinite(Number(src.pos.y));
    const pos = manualPos && hasCoords
      ? clampToHexagon(src.pos.x, src.pos.y, HEX_POS_MAX_RADIUS)
      : scoresToHexPosition(scores);

    return {
      id,
      name: cleanText(src.name, 40, `Persona ${idx + 1}`),
      alias: cleanText(src.alias, 40, ''),
      emoji: cleanText(src.emoji, 8, '✨'),
      avatarUrl: sanitizeAvatarUrl(src.avatarUrl),
      color: isValidHexColor(src.color) ? src.color.trim().toLowerCase() : '',
      bio: cleanText(src.bio, 260, ''),
      scores,
      pos,
      manualPos
    };
  });

  return {
    version: 1,
    title,
    subtitle,
    archetypes,
    people
  };
}

/**
 * Carga el registro guardado del hexágono en Cloudflare KV o devuelve la plantilla inicial.
 */
export async function loadHexagonoRecord(kv) {
  const stored = await kv.get(HEXAGONO_KV_KEY, 'json');
  if (!stored || typeof stored !== 'object' || !stored.board) {
    return {
      board: createDefaultHexagonoBoard(),
      isDefault: true,
      updatedAt: null,
      updatedBy: null
    };
  }

  return {
    board: sanitizeHexagonoBoard(stored.board),
    isDefault: false,
    updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : null,
    updatedBy: typeof stored.updatedBy === 'string' ? stored.updatedBy : null
  };
}

/**
 * Guarda el tablero saneado en Cloudflare KV bajo la clave del hexágono.
 */
export async function saveHexagonoRecord(kv, rawBoard) {
  const board = sanitizeHexagonoBoard(rawBoard);
  const updatedAt = new Date().toISOString();
  const payload = {
    board,
    updatedAt,
    updatedBy: HEXAGONO_ADMIN_SLUG
  };
  await kv.put(HEXAGONO_KV_KEY, JSON.stringify(payload));
  return {
    board,
    updatedAt,
    updatedBy: HEXAGONO_ADMIN_SLUG
  };
}

/**
 * Comprueba si el Bearer token del request corresponde a una sesión activa de @alex.
 */
export async function verifyAlexToken(kv, request) {
  const token = extractBearerToken(request);
  const alexRecord = await getUserRecord(kv, HEXAGONO_ADMIN_SLUG);
  const alexExists = Boolean(alexRecord);
  if (!token || !alexExists) {
    return {
      hasToken: Boolean(token),
      alexExists,
      authorized: false
    };
  }

  const authorized = await isValidSession(alexRecord, token);
  return {
    hasToken: true,
    alexExists: true,
    authorized
  };
}
