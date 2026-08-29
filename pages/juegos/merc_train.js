// Mercenary neural-network trainer (run with: node merc_train.js)
// Evolves a small feed-forward policy so the hired mercenary moves better:
// accelerate/brake/jump toward enemies (or the player) without falling/clipping.
// Outputs a flat weights array to paste into the game HTML.

var worldW = 1600, worldH = 400;
var plat = [
  [0,360,300,40],[450,360,300,40],[900,360,300,40],[1350,360,250,40],
  [320,300,60,10],[400,240,60,10],
  [520,310,60,10],[620,250,60,10],[700,190,60,10],
  [780,300,60,10],[850,230,60,10],
  [940,310,60,10],[1040,250,60,10],[1120,190,60,10],
  [1190,290,60,10],[1270,230,60,10],[1340,170,60,10],
  [1450,290,80,10],[1500,210,60,10]
];

function hit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function randn() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const NIN = 7, NHID = 8, NOUT = 3;
let W1 = [], B1 = [], W2 = [], B2 = [];

function initWeights() {
  W1 = []; B1 = []; W2 = []; B2 = [];
  for (var i = 0; i < NHID; i++) {
    W1.push([]);
    for (var j = 0; j < NIN; j++) W1[i].push(randn() * 0.4);
    B1.push(randn() * 0.2);
  }
  for (var k = 0; k < NOUT; k++) {
    W2.push([]);
    for (var l = 0; l < NHID; l++) W2[k].push(randn() * 0.4);
    B2.push(randn() * 0.2);
  }
}

function forward(inp) {
  var h = [], o = [];
  for (var i = 0; i < NHID; i++) { var s = B1[i]; for (var j = 0; j < NIN; j++) s += W1[i][j] * inp[j]; h.push(Math.tanh(s)); }
  for (var k = 0; k < NOUT; k++) { var t = B2[k]; for (var l = 0; l < NHID; l++) t += W2[k][l] * h[l]; o.push(Math.tanh(t)); }
  return o;
}

function weightsToArray() {
  var a = [];
  for (var i = 0; i < NHID; i++) { for (var j = 0; j < NIN; j++) a.push(W1[i][j]); a.push(B1[i]); }
  for (var k = 0; k < NOUT; k++) { for (var l = 0; l < NHID; l++) a.push(W2[k][l]); a.push(B2[k]); }
  return a;
}
function arrayToWeights(a) {
  var idx = 0;
  for (var i = 0; i < NHID; i++) { W1[i] = []; for (var j = 0; j < NIN; j++) W1[i][j] = a[idx++]; B1[i] = a[idx++]; }
  for (var k = 0; k < NOUT; k++) { W2[k] = []; for (var l = 0; l < NHID; l++) W2[k][l] = a[idx++]; B2[k] = a[idx++]; }
}
function mutate(a, rate, step) {
  for (var i = 0; i < a.length; i++) if (Math.random() < rate) a[i] += randn() * step;
}
function crossover(a, b) {
  var c = [];
  for (var i = 0; i < a.length; i++) c.push(Math.random() < 0.5 ? a[i] : b[i]);
  return c;
}

// Physics matches the game: pvxm accel/decel, pvym gravity, platform snap.
function sim(genome, cfg) {
  arrayToWeights(genome);
  var ex = cfg.mx, ey = cfg.my;
  var evx = 0, evy = 0, onGround = false;
  var enemies = cfg.enemies.map(function (e) { return { x: e[0], y: e[1], alive: true }; });
  var kills = 0, steps = 0, fell = false;
  var uselessJumps = 0;
  var progress = 0;
  var prevTdt = null;

  for (steps = 0; steps < 2200; steps++) {
    var tgt = null, tdt = 1e9;
    for (var e = 0; e < enemies.length; e++) {
      if (!enemies[e].alive) continue;
      var dd = Math.hypot(enemies[e].x - ex, enemies[e].y - ey);
      if (dd < tdt) { tdt = dd; tgt = enemies[e]; }
    }
    var hasTgt = tgt !== null;
    // when no target, follow the player
    if (!hasTgt) {
      tdt = Math.hypot(cfg.followX - ex, cfg.followY - ey);
      if (prevTdt === null) prevTdt = tdt;
      progress += (prevTdt - tdt) > 0 ? 2 : -1;
      prevTdt = tdt;
    }
    var tx = hasTgt ? tgt.x - ex : cfg.followX - ex;
    var ty = hasTgt ? tgt.y - ey : cfg.followY - ey;
    var face = tx >= 0 ? 1 : -1;
    var wall = false;
    for (var p = 0; p < plat.length; p++) {
      if (hit(ex + face * 12, ey + 4, 10, 10, plat[p][0], plat[p][1], plat[p][2], plat[p][3])) { wall = true; break; }
    }
    // gap ahead: no floor/platform directly below a few px ahead in facing direction
    var gapAhead = false;
    if (onGround) {
      var gx = ex + face * 14;
      var support = false;
      for (var pg = 0; pg < plat.length; pg++) {
        var gr2 = plat[pg];
        if (gx > gr2[0] && gx < gr2[0] + gr2[2] && ey + 14 >= gr2[1] - 4 && ey + 14 <= gr2[1] + 3) { support = true; break; }
      }
      gapAhead = !support;
    }
    var above = hasTgt && ty < -12;
    var inp = [
      clamp(tx / 500, -1, 1),
      clamp(ty / 400, -1, 1),
      clamp((hasTgt ? tdt : tdt) / 500, 0, 1),
      onGround ? 1 : 0,
      wall ? 1 : 0,
      above ? 1 : 0,
      gapAhead ? 1 : 0
    ];
    var out = forward(inp);
    var move = out[0], jump = out[1], attack = out[2];

    // progress reward for heading toward enemy target
    if (hasTgt && prevTdt !== null) {
      progress += (prevTdt - tdt) > 2 ? 3 : ((prevTdt - tdt) > -2 ? 0 : -2);
    }
    if (hasTgt) prevTdt = tdt;

    // --- attack dash (matches game: only when very close, same height) ---
    if (hasTgt && tdt < 48 && Math.abs(ty) <= 30) {
      var dir = (tgt.x > ex) ? 1 : -1;
      ex += dir * 8;
      for (var k = 0; k < enemies.length; k++) {
        if (enemies[k].alive && Math.abs(enemies[k].x - ex) < 20 && Math.abs(enemies[k].y - ey) < 20) {
          enemies[k].alive = false; kills++;
        }
      }
      evx = 0;
      prevTdt = null;
      continue;
    }

    // --- move: accumulate like ACCEL 0.4, cap 3.2 ---
    if (Math.abs(move) > 0.15) {
      var d2 = move > 0 ? 1 : -1;
      evx += d2 * 0.4;
      if (evx > 3.2) evx = 3.2; if (evx < -3.2) evx = -3.2;
    } else {
      if (evx > 0) { evx -= 0.3; if (evx < 0) evx = 0; }
      else if (evx < 0) { evx += 0.3; if (evx > 0) evx = 0; }
    }

    // --- jump (only when it helps: wall, target above, or a gap ahead) ---
    var jumpUseful = onGround && (wall || above || gapAhead);
    if (jump > 0.2 && onGround) {
      if (jumpUseful) { evy = -7.5; onGround = false; }
      else { uselessJumps++; }
    }

    // --- gravity ---
    evy += evy < 0 ? 0.36 : 0.62;
    if (evy > 10) evy = 10;

    ex += evx; ey += evy;
    if (ex < 0) ex = 0; if (ex > worldW - 12) ex = worldW - 12;
    onGround = false;
    for (var p2 = 0; p2 < plat.length; p2++) {
      if (hit(ex, ey, 12, 14, plat[p2][0], plat[p2][1], plat[p2][2], plat[p2][3])) {
        if (evy > 0) { ey = plat[p2][1] - 14; evy = 0; onGround = true; }
        else if (evy < 0) { ey = plat[p2][1] + plat[p2][3]; evy = 0; }
      }
    }

    if (ey > worldH + 40) { fell = true; break; }
  }
  return { kills: kills, steps: steps, fell: fell, uselessJumps: uselessJumps, progress: progress };
}

function fitness(genome, s) {
  var r = sim(genome, s);
  var score = r.kills * 60;
  if (r.fell) score -= 150;
  score -= r.uselessJumps * 1.5;
  score += r.progress * 1.5;
  if (r.kills > 0) score += (2200 - r.steps) * 0.03 * r.kills;
  return score;
}

function buildScenarios() {
  var base = [
    { mx: 30, my: 330, followX: 400, followY: 300, enemies: [[120,348],[280,348],[560,298],[680,238],[820,288],[1020,238],[1150,178],[1300,218],[1430,278]] },
    { mx: 800, my: 280, followX: 1500, followY: 200, enemies: [[560,298],[820,288],[1150,178],[1430,278]].slice(0, 2) },
    { mx: 250, my: 280, followX: 300, followY: 200, enemies: [[700,180]] },
    { mx: 500, my: 360, followX: 1550, followY: 200, enemies: [] }
  ];
  var all = base.slice();
  // mirrored scenarios force directional correctness
  base.forEach(function (s) {
    all.push({
      mx: worldW - s.mx, my: s.my, followX: worldW - s.followX, followY: s.followY,
      enemies: s.enemies.map(function (e) { return [worldW - e[0], e[1]]; })
    });
  });
  return all;
}

const POP = 80, GENS = 300, EPOCHS = 1;
var sc = buildScenarios();
var pop = [];
for (var p = 0; p < POP; p++) { initWeights(); pop.push(weightsToArray()); }

function evalGenome(g) {
  var total = 0;
  for (var e = 0; e < EPOCHS; e++) for (var s = 0; s < sc.length; s++) total += fitness(g, sc[s]);
  return total;
}

function tournament(scored, k) {
  var best = null;
  for (var i = 0; i < k; i++) {
    var cand = scored[(Math.random() * scored.length) | 0];
    if (best === null || cand.f > best.f) best = cand;
  }
  return best.g;
}

var best = null, bestScore = -1e9;
function saveBest() {
  var flat = weightsToArray();
  var out = 'var MERC_WEIGHTS = [' + flat.map(function (x) { return x.toFixed(6); }).join(',') + '];' +
    '\nvar MERC_NIN = ' + NIN + ', MERC_NHID = ' + NHID + ', MERC_NOUT = ' + NOUT + ';';
  try { require('fs').writeFileSync(__dirname + '/merc_weights_latest.js', out); } catch (e) {}
}
for (var g = 0; g < GENS; g++) {
  var scored = pop.map(function (g2) { return { g: g2, f: evalGenome(g2) }; });
  scored.sort(function (a, b) { return b.f - a.f; });
  if (scored[0].f > bestScore) { bestScore = scored[0].f; best = scored[0].g.slice(); arrayToWeights(best); saveBest(); }

  var next = [];
  for (var el = 0; el < 8; el++) next.push(scored[el].g.slice());
  for (var i = 0; i < POP - 8; i++) {
    var p1 = tournament(scored, 3);
    var p2 = tournament(scored, 3);
    var child = crossover(p1, p2);
    mutate(child, 0.35, 0.3);
    next.push(child);
  }
  pop = next;

  if (g % 25 === 0 || g === GENS - 1) {
    var mean = 0;
    for (var q = 0; q < 10; q++) mean += scored[q].f;
    mean /= 10;
    console.log('gen ' + g + ' best ' + scored[0].f.toFixed(1) + ' mean10 ' + mean.toFixed(1) + ' SAVED=' + g);
  }
}

arrayToWeights(best);
var flat = weightsToArray();
console.log('BEST_SCORE ' + bestScore.toFixed(1));
console.log('WEIGHTS_START');
console.log('var MERC_WEIGHTS = [' + flat.map(function (x) { return x.toFixed(6); }).join(',') + '];');
console.log('WEIGHTS_END');