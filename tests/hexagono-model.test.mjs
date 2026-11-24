import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../pages/hexagono/js/model.js');

const SQRT3_HALF = Math.sqrt(3) / 2;

function hexMetric(x, y) {
  return Math.max(
    Math.abs(x),
    Math.abs(0.5 * x + SQRT3_HALF * y),
    Math.abs(-0.5 * x + SQRT3_HALF * y)
  );
}

test('clampToHexagon conserva puntos internos y proyecta puntos externos dentro del límite', () => {
  const inside = model.clampToHexagon(0.25, -0.3, 0.82);
  assert.equal(inside.x, 0.25);
  assert.equal(inside.y, -0.3);

  const far = model.clampToHexagon(3.5, -2.1, 0.82);
  const maxInRadius = 0.82 * SQRT3_HALF;
  assert.ok(hexMetric(far.x, far.y) <= maxInRadius + 1e-4);

  const topFar = model.clampToHexagon(0, -5, 0.82);
  assert.equal(topFar.x, 0);
  assert.ok(Math.abs(topFar.y - -0.82) < 1e-3);
});

test('scoresToHexPosition y getSectorFromPosition mapean cada arquetipo y el centro equilibrado', () => {
  const balanced = model.scoresToHexPosition({ H: 60, E: 60, X: 60, A: 60, C: 60, O: 60 });
  assert.equal(balanced.x, 0);
  assert.equal(balanced.y, 0);
  assert.equal(model.getSectorFromPosition(balanced.x, balanced.y), -1);

  model.ARCHETYPE_KEYS.forEach((key, expectedIndex) => {
    const scores = { H: 30, E: 30, X: 30, A: 30, C: 30, O: 30, [key]: 95 };
    const pos = model.scoresToHexPosition(scores);
    assert.equal(model.getSectorFromPosition(pos.x, pos.y), expectedIndex);
  });
});

test('sanitizeBoard sanea puntajes, URLs inseguras, colores inválidos y límite de personas', () => {
  const dirtyPeople = Array.from({ length: 75 }, (_, idx) => ({
    id: idx < 2 ? 'duplicado' : `p-${idx}`,
    name: `Persona ${idx}`,
    avatarUrl: idx === 0 ? 'javascript:alert(1)' : 'https://example.com/avatar.png',
    color: idx === 0 ? 'red' : '#38BDF8',
    scores: { H: 150, E: -20, X: 'nan', A: 72.6, C: 40, O: 99 },
    pos: { x: 10, y: 10 },
    manualPos: true
  }));

  const clean = model.sanitizeBoard({
    title: '  Mi Hexágono  ',
    archetypes: [{ key: 'H', name: 'Personalizado', color: 'invalido', traits: ['Uno', 'Dos'] }],
    people: dirtyPeople
  });

  assert.equal(clean.title, 'Mi Hexágono');
  assert.equal(clean.archetypes.length, 6);
  assert.equal(clean.archetypes[0].name, 'Personalizado');
  assert.equal(clean.archetypes[0].color, '#fbbf24');

  assert.equal(clean.people.length, model.MAX_PEOPLE);
  assert.notEqual(clean.people[0].id, clean.people[1].id);
  assert.equal(clean.people[0].avatarUrl, '');
  assert.equal(clean.people[1].avatarUrl, 'https://example.com/avatar.png');
  assert.equal(clean.people[0].color, '');
  assert.equal(clean.people[1].color, '#38bdf8');
  assert.deepEqual(clean.people[0].scores, { H: 100, E: 0, X: 50, A: 73, C: 40, O: 99 });
  assert.ok(hexMetric(clean.people[0].pos.x, clean.people[0].pos.y) <= 0.82 * SQRT3_HALF + 1e-4);
});

test('getDominantArchetypes y computeGroupAverageScores calculan estadísticas exactas', () => {
  const board = model.createDefaultBoard();
  const sample = {
    scores: { H: 40, E: 91, X: 75, A: 50, C: 60, O: 82 },
    pos: { x: 0.45, y: -0.25 }
  };
  const dom = model.getDominantArchetypes(sample, board.archetypes);
  assert.equal(dom.primary.key, 'E');
  assert.equal(dom.primaryScore, 91);
  assert.equal(dom.secondary.key, 'O');
  assert.equal(dom.secondaryScore, 82);
  assert.equal(dom.sectorArchetype.key, 'E');

  const avg = model.computeGroupAverageScores([
    { scores: { H: 80, E: 60, X: 40, A: 50, C: 70, O: 90 } },
    { scores: { H: 60, E: 40, X: 80, A: 70, C: 50, O: 70 } }
  ]);
  assert.deepEqual(avg, { H: 70, E: 50, X: 60, A: 60, C: 60, O: 80 });
});
