/**
 * Modelo de datos, validaciones y cálculos estadísticos del Series Tracker.
 * Compatible con navegador (window.SeriesTracker.model) y Node (module.exports).
 */
(function (globalScope) {
  const LEGACY_STORAGE_KEY = 'papubanda_series_tracker_v1';
  const SESSION_STORAGE_KEY = 'papubanda_series_session_v1';
  const LOCAL_DB_KEY = 'papubanda_series_local_db_v1';
  const CACHE_PREFIX = 'papubanda_series_cache_';

  const RESERVED_SLUGS = new Set([
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

  /**
   * Genera un identificador único breve para series, temporadas o capítulos.
   */
  function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Escapa texto de usuario para insertarlo de forma segura en HTML.
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
   * Normaliza un nombre de usuario en cliente replicando las reglas del servidor.
   */
  function normalizeUsernameClient(raw) {
    if (typeof raw !== 'string') {
      return { ok: false, error: 'Escribe un nombre de usuario válido.' };
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
      return { ok: false, error: 'Usa al menos 2 letras o números válidos.' };
    }

    if (RESERVED_SLUGS.has(slug)) {
      return { ok: false, error: 'Ese nombre de usuario está reservado. Elige otro.' };
    }

    return { ok: true, slug, displayName };
  }

  /**
   * Comprueba de forma segura si una puntuación es un número válido entre 0 y 10.
   */
  function isRated(score) {
    return typeof score === 'number' && !Number.isNaN(score) && Number.isFinite(score) && score >= 0 && score <= 10;
  }

  /**
   * Normaliza un valor numérico al rango [0, 10] aceptando coma o punto y hasta 2 decimales.
   */
  function normalizeScore(rawValue) {
    if (rawValue === null || rawValue === undefined) return null;
    const normalizedText = String(rawValue).trim().replace(',', '.');
    if (normalizedText === '') return null;
    const parsed = Number(normalizedText);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;
    const clamped = Math.min(10, Math.max(0, parsed));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Formatea una puntuación mostrando 2 decimales cuando corresponde y 1 decimal en el resto.
   */
  function formatScore(score) {
    if (!isRated(score)) return '—';
    const num = Number(score);
    const hasTwoDecimals = Math.round(num * 100) % 10 !== 0;
    return num.toFixed(hasTwoDecimals ? 2 : 1);
  }

  /**
   * Devuelve la clase CSS de color según la puntuación.
   */
  function getScoreColorClass(score) {
    if (!isRated(score)) return 'score-unrated';
    if (score >= 9.0) return 'score-master';
    if (score >= 7.5) return 'score-good';
    if (score >= 6.0) return 'score-ok';
    if (score >= 4.0) return 'score-weak';
    return 'score-bad';
  }

  /**
   * Devuelve el color hexadecimal correspondiente a una puntuación para el gráfico.
   */
  function getScoreHexColor(score) {
    if (!isRated(score)) return '#94a3b8';
    if (score >= 9.0) return '#fbbf24';
    if (score >= 7.5) return '#4ade80';
    if (score >= 6.0) return '#facc15';
    if (score >= 4.0) return '#fb923c';
    return '#f87171';
  }

  /**
   * Crea un estado inicial limpio sin puntuaciones ficticias.
   */
  function createDefaultState() {
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
   * Valida y repara cualquier estructura cargada desde servidor, caché o JSON importado.
   */
  function sanitizeState(raw) {
    if (!raw || !Array.isArray(raw.seriesList) || raw.seriesList.length === 0) {
      return createDefaultState();
    }

    const sanitizedSeries = raw.seriesList.map((s, sIdx) => {
      const src = s && typeof s === 'object' ? s : {};
      const seriesId = typeof src.id === 'string' && src.id ? src.id : generateId('series');
      const title = typeof src.title === 'string' ? src.title : `Serie ${sIdx + 1}`;
      const rawSeasons = Array.isArray(src.seasons) && src.seasons.length > 0
        ? src.seasons
        : [{ id: generateId('season'), number: 1, episodes: [] }];

      const seasons = rawSeasons.map((sea, seaIdx) => {
        const seaSrc = sea && typeof sea === 'object' ? sea : {};
        const seasonId = typeof seaSrc.id === 'string' && seaSrc.id ? seaSrc.id : generateId('season');
        const seasonNum = Number.isFinite(Number(seaSrc.number)) && Number(seaSrc.number) > 0
          ? Math.floor(Number(seaSrc.number))
          : seaIdx + 1;
        const rawEps = Array.isArray(seaSrc.episodes) ? seaSrc.episodes : [];
        const episodes = rawEps.map((ep, epIdx) => {
          const epSrc = ep && typeof ep === 'object' ? ep : {};
          return {
            id: typeof epSrc.id === 'string' && epSrc.id ? epSrc.id : generateId('ep'),
            number: Number.isFinite(Number(epSrc.number)) && Number(epSrc.number) > 0
              ? Math.floor(Number(epSrc.number))
              : epIdx + 1,
            title: typeof epSrc.title === 'string' ? epSrc.title : '',
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

  /**
   * Calcula resumen estadístico compacto de un perfil (equivalente al backend).
   */
  function computeProfileSummaryClient(slug, displayName, data, createdAt, updatedAt) {
    const seriesList = Array.isArray(data?.seriesList) ? data.seriesList : [];
    let ratedCount = 0;
    let totalEpisodes = 0;
    let scoreSum = 0;
    let topSeriesTitle = '';
    let topSeriesRatedCount = -1;

    for (const s of seriesList) {
      let sRated = 0;
      const seasons = Array.isArray(s?.seasons) ? s.seasons : [];
      for (const sea of seasons) {
        const eps = Array.isArray(sea?.episodes) ? sea.episodes : [];
        totalEpisodes += eps.length;
        for (const ep of eps) {
          if (isRated(ep?.score)) {
            ratedCount += 1;
            sRated += 1;
            scoreSum += ep.score;
          }
        }
      }
      const title = typeof s?.title === 'string' ? s.title.trim() : '';
      if (title && sRated > topSeriesRatedCount) {
        topSeriesRatedCount = sRated;
        topSeriesTitle = title;
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
   * Calcula promedios, mínimos, máximos y progreso de la temporada y serie.
   */
  function computeStats(series, activeSeason, chartScope) {
    const seasonRated = [];
    activeSeason.episodes.forEach((ep) => {
      if (isRated(ep.score)) {
        seasonRated.push({
          episodeId: ep.id,
          seasonId: activeSeason.id,
          seasonNumber: activeSeason.number,
          number: ep.number,
          title: ep.title,
          score: ep.score
        });
      }
    });

    const allRated = [];
    let totalSeriesEpisodes = 0;
    let seasonsWithRatings = 0;

    series.seasons.forEach((sea) => {
      totalSeriesEpisodes += sea.episodes.length;
      let seaHasRated = false;
      sea.episodes.forEach((ep) => {
        if (isRated(ep.score)) {
          seaHasRated = true;
          allRated.push({
            episodeId: ep.id,
            seasonId: sea.id,
            seasonNumber: sea.number,
            number: ep.number,
            title: ep.title,
            score: ep.score
          });
        }
      });
      if (seaHasRated) seasonsWithRatings += 1;
    });

    const seasonAvg = seasonRated.length
      ? seasonRated.reduce((acc, item) => acc + item.score, 0) / seasonRated.length
      : null;

    const seriesAvg = allRated.length
      ? allRated.reduce((acc, item) => acc + item.score, 0) / allRated.length
      : null;

    const scopeRated = chartScope === 'series' ? allRated : seasonRated;
    const scopeTotalEpisodes = chartScope === 'series'
      ? totalSeriesEpisodes
      : activeSeason.episodes.length;

    let maxScore = null;
    let minScore = null;
    let maxEpisodes = [];
    let minEpisodes = [];

    if (scopeRated.length > 0) {
      const scores = scopeRated.map((item) => item.score);
      maxScore = Math.max(...scores);
      minScore = Math.min(...scores);
      maxEpisodes = scopeRated.filter((item) => item.score === maxScore);
      minEpisodes = scopeRated.filter((item) => item.score === minScore);
    }

    return {
      seasonRated,
      allRated,
      scopeRated,
      seasonAvg,
      seriesAvg,
      seasonsWithRatings,
      maxScore,
      minScore,
      maxEpisodes,
      minEpisodes,
      seasonTotalEpisodes: activeSeason.episodes.length,
      totalSeriesEpisodes,
      scopeTotalEpisodes
    };
  }

  /**
   * Formatea la lista de capítulos que obtuvieron el máximo o mínimo.
   */
  function formatExtremumLabels(items, includeSeason) {
    if (!items || items.length === 0) return 'Sin puntuaciones';
    const labels = items.slice(0, 3).map((item) =>
      includeSeason ? `T${item.seasonNumber} Cap ${item.number}` : `Cap ${item.number}`
    );
    if (items.length > 3) {
      labels.push(`+${items.length - 3} más`);
    }
    return labels.join(', ');
  }

  const modelExports = {
    LEGACY_STORAGE_KEY,
    SESSION_STORAGE_KEY,
    LOCAL_DB_KEY,
    CACHE_PREFIX,
    RESERVED_SLUGS,
    generateId,
    escapeHtml,
    normalizeUsernameClient,
    isRated,
    normalizeScore,
    formatScore,
    getScoreColorClass,
    getScoreHexColor,
    createDefaultState,
    sanitizeState,
    computeProfileSummaryClient,
    computeStats,
    formatExtremumLabels
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = modelExports;
  }

  if (globalScope) {
    globalScope.SeriesTracker = globalScope.SeriesTracker || {};
    globalScope.SeriesTracker.model = modelExports;
  }
})(typeof window !== 'undefined' ? window : globalThis);
