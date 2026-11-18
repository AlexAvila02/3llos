import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../pages/series/js/model.js');

test('normalizeUsernameClient normaliza acentos, espacios y rechaza reservados/cortos', () => {
  const valid = model.normalizeUsernameClient('  Álex  Pro ');
  assert.equal(valid.ok, true);
  assert.equal(valid.displayName, 'Álex Pro');
  assert.equal(valid.slug, 'alex-pro');

  assert.equal(model.normalizeUsernameClient('a').ok, false);
  assert.equal(model.normalizeUsernameClient('admin').ok, false);
  assert.equal(model.normalizeUsernameClient('register').ok, false);
});

test('isRated, normalizeScore y formatScore manejan 0, 10, comas y valores inválidos', () => {
  assert.equal(model.isRated(0), true);
  assert.equal(model.isRated(10), true);
  assert.equal(model.isRated(null), false);
  assert.equal(model.isRated(11), false);
  assert.equal(model.isRated(-1), false);

  assert.equal(model.normalizeScore('8,756'), 8.76);
  assert.equal(model.normalizeScore('15'), 10);
  assert.equal(model.normalizeScore('-3'), 0);
  assert.equal(model.normalizeScore(''), null);
  assert.equal(model.normalizeScore('abc'), null);

  assert.equal(model.formatScore(8), '8.0');
  assert.equal(model.formatScore(8.25), '8.25');
  assert.equal(model.formatScore(null), '—');
});

test('sanitizeState repara estructuras incompletas sin perder notas válidas', () => {
  const fallback = model.sanitizeState(null);
  assert.equal(fallback.seriesList.length, 1);

  const repaired = model.sanitizeState({
    activeSeriesId: 'inexistente',
    chartScope: 'invalid',
    episodeFilter: 'rated',
    seriesList: [
      {
        id: 's1',
        title: 'Breaking Bad',
        seasons: [
          {
            id: 't1',
            number: 1,
            episodes: [
              { id: 'e1', number: 1, title: 'Piloto', score: '9,5' },
              { id: 'e2', number: 2, title: '', score: 0 }
            ]
          }
        ]
      }
    ]
  });

  assert.equal(repaired.activeSeriesId, 's1');
  assert.equal(repaired.chartScope, 'season');
  assert.equal(repaired.episodeFilter, 'rated');
  assert.equal(repaired.seriesList[0].seasons[0].episodes[0].score, 9.5);
  assert.equal(repaired.seriesList[0].seasons[0].episodes[1].score, 0);
});

test('computeStats y computeProfileSummaryClient calculan promedios y extremos correctamente', () => {
  const state = {
    seriesList: [
      {
        id: 's1',
        title: 'Andor',
        activeSeasonId: 't1',
        seasons: [
          {
            id: 't1',
            number: 1,
            episodes: [
              { id: 'e1', number: 1, title: 'A', score: 7 },
              { id: 'e2', number: 2, title: 'B', score: 9.5 },
              { id: 'e3', number: 3, title: 'C', score: null }
            ]
          },
          {
            id: 't2',
            number: 2,
            episodes: [
              { id: 'e4', number: 1, title: 'D', score: 8.5 }
            ]
          }
        ]
      }
    ]
  };

  const series = state.seriesList[0];
  const stats = model.computeStats(series, series.seasons[0], 'season');
  assert.equal(stats.seasonRated.length, 2);
  assert.equal(stats.allRated.length, 3);
  assert.equal(stats.seasonAvg, 8.25);
  assert.equal(stats.seriesAvg, (7 + 9.5 + 8.5) / 3);
  assert.equal(stats.maxScore, 9.5);
  assert.equal(stats.minScore, 7);

  const summary = model.computeProfileSummaryClient('arroz', 'Arroz', state, '2026-01-01', '2026-01-02');
  assert.equal(summary.seriesCount, 1);
  assert.equal(summary.ratedCount, 3);
  assert.equal(summary.totalEpisodes, 4);
  assert.equal(summary.avgScore, 8.33);
  assert.equal(summary.topSeriesTitle, 'Andor');
});
