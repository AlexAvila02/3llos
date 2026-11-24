/**
 * Modelo de datos, geometría hexagonal y utilidades científicas HEXACO.
 * Compatible con navegador (window.HexagonoApp.model) y Node (module.exports).
 */
(function (globalScope) {
  const SERIES_SESSION_KEY = 'papubanda_series_session_v1';
  const ALEX_SESSION_KEY = 'papubanda_hexagono_alex_session_v1';
  const LOCAL_BOARD_KEY = 'papubanda_hexagono_local_board_v1';
  const LOCAL_SERIES_DB_KEY = 'papubanda_series_local_db_v1';
  const SOUND_PREF_KEY = 'papubanda_hexagono_sound_v1';

  const ARCHETYPE_KEYS = ['H', 'E', 'X', 'A', 'C', 'O'];
  const VERTEX_ANGLES_DEG = [-90, -30, 30, 90, 150, 210];
  const HEX_POS_MAX_RADIUS = 0.82;
  const MAX_PEOPLE = 60;

  const EMOJI_PRESETS = ['🌌', '🎧', '🍚', '🐧', '🌊', '🎯', '⚔️', '🛡️', '🔥', '🧩', '🌸', '⚡', '⚖️', '🌿', '✨', '👑', '🦊', '🦉'];
  const COLOR_PRESETS = ['#fbbf24', '#fb7185', '#e879f9', '#34d399', '#38bdf8', '#818cf8', '#f97316', '#2dd4bf', '#f43f5e', '#a3e635'];

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
   * Escapa texto dinámico para insertarlo de forma segura en HTML.
   */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Valida si una cadena corresponde a un color hexadecimal (#RRGGBB).
   */
  function isValidHexColor(value) {
    return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
  }

  /**
   * Permite únicamente URLs de avatar http(s) o rutas locales seguras dentro de assets.
   */
  function sanitizeAvatarUrl(raw) {
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
   * Devuelve el vector unitario del vértice de arquetipo `index` (0..5).
   */
  function getVertexUnitVector(index) {
    const deg = VERTEX_ANGLES_DEG[index] ?? -90;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  /**
   * Restringe unas coordenadas normalizadas al interior de un hexágono regular pointy-top.
   */
  function clampToHexagon(rawX, rawY, maxRadius = HEX_POS_MAX_RADIUS) {
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
   * Calcula la posición 2D dentro del hexágono a partir de los 6 puntajes HEXACO.
   */
  function scoresToHexPosition(scores) {
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

    return clampToHexagon(vx * 1.45, vy * 1.45, 0.78);
  }

  /**
   * Determina a qué sector de arquetipo (0..5) pertenece una coordenada, o -1 si está en el centro.
   */
  function getSectorFromPosition(rawX, rawY) {
    const x = Number(rawX) || 0;
    const y = Number(rawY) || 0;
    if (Math.hypot(x, y) < 0.12) {
      return -1;
    }
    const deg = (Math.atan2(y, x) * 180) / Math.PI;
    const shifted = (((deg + 120) % 360) + 360) % 360;
    return Math.min(5, Math.max(0, Math.floor(shifted / 60)));
  }

  /**
   * Devuelve una copia limpia de los 6 arquetipos científicos HEXACO originales.
   */
  function createDefaultArchetypes() {
    return DEFAULT_ARCHETYPES.map((arch) => ({
      ...arch,
      traits: [...arch.traits]
    }));
  }

  /**
   * Construye la plantilla inicial del tablero HEXACO.
   */
  function createDefaultBoard() {
    return {
      version: 1,
      title: 'Hexágono de Arquetipos',
      subtitle: 'Clasificación de la Papubanda basada en el modelo científico HEXACO (evolución de 6 factores del Big Five)',
      archetypes: createDefaultArchetypes(),
      people: DEFAULT_PEOPLE.map((person) => ({
        ...person,
        scores: { ...person.scores },
        pos: { ...person.pos }
      }))
    };
  }

  /**
   * Valida y repara cualquier tablero recibido desde servidor, localStorage o JSON.
   */
  function sanitizeBoard(raw) {
    const defaults = createDefaultBoard();
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
   * Obtiene los arquetipos primario, secundario y de sector espacial de una persona.
   */
  function getDominantArchetypes(person, archetypes) {
    const safeArchs = Array.isArray(archetypes) && archetypes.length === 6 ? archetypes : createDefaultArchetypes();
    const scores = person?.scores || {};

    const ordered = safeArchs
      .map((arch, index) => ({
        arch,
        index,
        score: clampScore(scores[arch.key], 50)
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index);

    const sectorIndex = getSectorFromPosition(person?.pos?.x || 0, person?.pos?.y || 0);
    const sectorArchetype = sectorIndex >= 0 ? safeArchs[sectorIndex] : null;

    return {
      primary: ordered[0].arch,
      primaryIndex: ordered[0].index,
      primaryScore: ordered[0].score,
      secondary: ordered[1].arch,
      secondaryIndex: ordered[1].index,
      secondaryScore: ordered[1].score,
      sectorIndex,
      sectorArchetype,
      ordered
    };
  }

  /**
   * Calcula los puntajes HEXACO promedio del grupo completo.
   */
  function computeGroupAverageScores(people) {
    const list = Array.isArray(people) ? people : [];
    const result = {};
    if (list.length === 0) {
      for (const key of ARCHETYPE_KEYS) {
        result[key] = 50;
      }
      return result;
    }

    for (const key of ARCHETYPE_KEYS) {
      let sum = 0;
      for (const person of list) {
        sum += clampScore(person?.scores?.[key], 50);
      }
      result[key] = Math.round(sum / list.length);
    }
    return result;
  }

  /**
   * Crea una nueva persona con puntajes iniciales orientados hacia el arquetipo indicado.
   */
  function createPersonFromArchetype(archetypeKey, archetypes) {
    const safeArchs = Array.isArray(archetypes) && archetypes.length === 6 ? archetypes : createDefaultArchetypes();
    const archIndex = Math.max(0, safeArchs.findIndex((a) => a.key === archetypeKey));
    const arch = safeArchs[archIndex];
    const scores = {};
    for (const key of ARCHETYPE_KEYS) {
      scores[key] = key === arch.key ? 86 : 52;
    }

    const unit = getVertexUnitVector(archIndex);
    const jitter = (Math.random() - 0.5) * 0.14;
    const pos = clampToHexagon(unit.x * 0.54 + jitter, unit.y * 0.54 - jitter, HEX_POS_MAX_RADIUS);

    return {
      id: generateId('person'),
      name: 'Nuevo integrante',
      alias: '',
      emoji: arch.emoji || '✨',
      avatarUrl: '',
      color: arch.color,
      bio: '',
      scores,
      pos,
      manualPos: true
    };
  }

  const modelExports = {
    SERIES_SESSION_KEY,
    ALEX_SESSION_KEY,
    LOCAL_BOARD_KEY,
    LOCAL_SERIES_DB_KEY,
    SOUND_PREF_KEY,
    ARCHETYPE_KEYS,
    VERTEX_ANGLES_DEG,
    HEX_POS_MAX_RADIUS,
    MAX_PEOPLE,
    EMOJI_PRESETS,
    COLOR_PRESETS,
    generateId,
    escapeHtml,
    isValidHexColor,
    sanitizeAvatarUrl,
    getVertexUnitVector,
    clampToHexagon,
    scoresToHexPosition,
    getSectorFromPosition,
    createDefaultArchetypes,
    createDefaultBoard,
    sanitizeBoard,
    getDominantArchetypes,
    computeGroupAverageScores,
    createPersonFromArchetype
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = modelExports;
  }

  if (globalScope) {
    globalScope.HexagonoApp = globalScope.HexagonoApp || {};
    globalScope.HexagonoApp.model = modelExports;
  }
})(typeof window !== 'undefined' ? window : globalThis);
