import { G } from './state.js';
import { levels } from './levels.js';

var bgm = document.getElementById('bgm');
var bgmSky = document.getElementById('bgm-sky');
var bgmSecret = document.getElementById('bgm-secret');
var bgmGalaxy = document.getElementById('bgm-galaxy');
var baseVol = 0.7;
bgm.volume = baseVol;
bgmSky.volume = baseVol;
bgmSecret.volume = baseVol;
bgmGalaxy.volume = baseVol;

var sfxCtx = null;
function getSfxCtx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  return sfxCtx;
}
function sfxMuted() {
  try { return bgm.muted; } catch(e) { return false; }
}
function sfxTone(f0, f1, dur, vol, type, delay) {
  try {
    if (sfxMuted()) return;
    var ctx = getSfxCtx();
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'square';
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch(e) {}
}
function sfxNoise(dur, vol, freq, delay) {
  try {
    if (sfxMuted()) return;
    var ctx = getSfxCtx();
    var t = ctx.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq || 1200, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t);
  } catch(e) {}
}
export function playJumpSound() {
  sfxTone(240, 760, 0.13, 0.16, 'square', 0);
}
export function playImpactSound() {
  sfxNoise(0.22, 0.32, 1400, 0);
  sfxTone(170, 45, 0.2, 0.3, 'square', 0);
}
export function playGameOverSound() {
  var notes = [660, 523, 494, 440, 392, 330, 262];
  for (var i = 0; i < notes.length; i++) {
    sfxTone(notes[i], notes[i] * 0.995, i === notes.length - 1 ? 0.42 : 0.13, 0.16, 'square', i * 0.14);
  }
  sfxNoise(0.5, 0.1, 800, notes.length * 0.14);
}
var sunMusic = null;
var SUN_BATTLE_BPM = 152;
var SUN_BATTLE_ROOTS = [38, 46, 41, 48];
var SUN_BATTLE_CHORDS = [[62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]];
var SUN_BATTLE_LEAD = [[0, 3, 74], [4, 2, 77], [6, 2, 76], [8, 4, 74], [12, 2, 72], [14, 2, 74], [16, 3, 77], [20, 2, 79], [22, 2, 77], [24, 4, 75], [28, 2, 74], [30, 2, 72], [32, 3, 81], [36, 2, 79], [38, 2, 81], [40, 4, 84], [44, 2, 81], [46, 2, 79], [48, 3, 79], [52, 2, 81], [54, 2, 82], [56, 4, 84], [60, 1, 83], [61, 1, 82], [62, 1, 81], [63, 1, 79]];
var SUN_BATTLE_LEAD_BY_STEP = {};
for (var sunLeadCursor = 0; sunLeadCursor < SUN_BATTLE_LEAD.length; sunLeadCursor++) {
  var sunLeadEntry = SUN_BATTLE_LEAD[sunLeadCursor];
  if (!SUN_BATTLE_LEAD_BY_STEP[sunLeadEntry[0]]) SUN_BATTLE_LEAD_BY_STEP[sunLeadEntry[0]] = [];
  SUN_BATTLE_LEAD_BY_STEP[sunLeadEntry[0]].push(sunLeadEntry);
}
function sunBattleMidi(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}
function sunBattleStepDur() {
  return 60 / SUN_BATTLE_BPM / 4;
}
function sunBattleTargetVolume() {
  try {
    if (bgm.muted) return 0;
    return Math.max(0, Math.min(1, baseVol)) * 0.5;
  } catch (e) {
    return 0.35;
  }
}
function getSunBattleIntensity() {
  if (!G.sunBoss || G.sunDeath) return 1;
  if (G.sunBoss.phase >= 3) return 3;
  if (G.sunBoss.phase === 2) return 2;
  var ratio = G.sunBoss.hp / G.sunBoss.maxHp;
  if (ratio <= 0.25) return 3;
  if (ratio <= 0.5) return 2;
  return 1;
}
export function startSunBattleMusic() {
  try {
    if (sunMusic && sunMusic.on) {
      applySunBattleVolume();
      return;
    }
    var ctx = getSfxCtx();
    try { ctx.resume(); } catch (e) {}
    var master = ctx.createGain();
    master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    master.connect(comp);
    comp.connect(ctx.destination);
    var delay = ctx.createDelay(1);
    delay.delayTime.value = 0.29;
    var feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    var wet = ctx.createGain();
    wet.gain.value = 0.2;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    var noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    sunMusic = { on: true, ctx: ctx, master: master, comp: comp, delay: delay, feedback: feedback, wet: wet, noise: noiseBuf, nextTime: ctx.currentTime + 0.1, step: 0, intensity: getSunBattleIntensity(), appliedVol: -1, timer: 0 };
    sunMusic.timer = setInterval(scheduleSunBattle, 40);
    applySunBattleVolume();
  } catch (e) {}
}
export function applySunBattleVolume() {
  if (!sunMusic || !sunMusic.on) return;
  try {
    var v = sunBattleTargetVolume();
    if (Math.abs(v - sunMusic.appliedVol) < 0.01) return;
    sunMusic.appliedVol = v;
    sunMusic.master.gain.setTargetAtTime(v, sunMusic.ctx.currentTime, 0.06);
  } catch (e) {}
}
export function stopSunBattleMusic() {
  var m = sunMusic;
  if (!m) return;
  sunMusic = null;
  try { clearInterval(m.timer); } catch (e) {}
  try {
    var t = m.ctx.currentTime;
    m.master.gain.cancelScheduledValues(t);
    m.master.gain.setTargetAtTime(0, t, 0.04);
    setTimeout(function() {
      try { m.master.disconnect(); } catch (e) {}
      try { m.comp.disconnect(); } catch (e) {}
      try { m.delay.disconnect(); } catch (e) {}
      try { m.feedback.disconnect(); } catch (e) {}
      try { m.wet.disconnect(); } catch (e) {}
    }, 260);
  } catch (e) {}
}
export function syncSunBattleMusic() {
  try {
    var L = (typeof levels !== 'undefined') ? levels[G.currentLevel] : null;
    if (L && L.sunBossLevel && G.sunBoss && !G.sunDeath) {
      var level = getSunBattleIntensity();
      if (!sunMusic) startSunBattleMusic();
      if (sunMusic) {
        if (level > sunMusic.intensity) sunBattleAccent();
        sunMusic.intensity = level;
        applySunBattleVolume();
      }
    } else if (sunMusic) {
      stopSunBattleMusic();
    }
  } catch (e) {}
}
function sunBattleAccent() {
  if (!sunMusic || !sunMusic.on) return;
  try {
    var t = sunMusic.ctx.currentTime + 0.02;
    sunBattleCrash(t, 3);
    sunBattleNote(110, 880, t, 0.55, 'sawtooth', 0.14, 2400, 0.22);
  } catch (e) {}
}
function scheduleSunBattle() {
  var m = sunMusic;
  if (!m || !m.on) return;
  try {
    var ctx = m.ctx;
    if (ctx.state !== 'running') return;
    var stepDur = sunBattleStepDur();
    var ahead = ctx.currentTime + 0.25;
    var guard = 0;
    while (m.nextTime < ahead && guard < 16) {
      if (m.nextTime >= ctx.currentTime - 0.08) playSunBattleStep(m.step, m.nextTime);
      m.nextTime += stepDur;
      m.step = (m.step + 1) % 64;
      guard++;
    }
  } catch (e) {}
}
function playSunBattleStep(step, time) {
  var m = sunMusic;
  if (!m) return;
  var intense = m.intensity;
  var bar = Math.floor(step / 16);
  var s = step % 16;
  var stepDur = sunBattleStepDur();
  var root = SUN_BATTLE_ROOTS[bar];
  var chord = SUN_BATTLE_CHORDS[bar];
  var i;
  if (step === 0 || (intense >= 2 && step === 32)) sunBattleCrash(time, intense);
  if (s === 0) {
    for (i = 0; i < chord.length; i++) sunBattleNote(sunBattleMidi(chord[i]), sunBattleMidi(chord[i]), time, stepDur * 15, 'sawtooth', 0.085, 760, 0.05);
    if (intense >= 3) sunBattleNote(sunBattleMidi(root - 12), sunBattleMidi(root - 12), time, stepDur * 15, 'triangle', 0.1, 500, 0);
  }
  if (s === 4 || s === 12) {
    for (i = 0; i < chord.length; i++) sunBattleNote(sunBattleMidi(chord[i]), sunBattleMidi(chord[i]), time, stepDur * 1.6, 'square', 0.06, 2800, 0.08);
  }
  if (s % 4 === 0) sunBattleKick(time, 0.5);
  if (s === 4 || s === 12) sunBattleSnare(time, 0.3);
  if (s % 2 === 0) sunBattleHat(time, 0.028, s % 4 === 2 ? 0.14 : 0.09);
  if (s === 14) sunBattleHat(time, 0.11, 0.11);
  if (intense >= 3 && s % 2 === 1) sunBattleHat(time, 0.028, 0.055);
  if (bar === 3 && s >= 12) {
    if (s % 2 === 0) sunBattleKick(time, 0.42);
    else sunBattleSnare(time, 0.22);
    var tomSteps = [160, 130, 100, 78];
    sunBattleNote(tomSteps[s - 12], tomSteps[s - 12] * 0.94, time, 0.09, 'square', 0.12, 900, 0);
  }
  if (s % 2 === 0) {
    var oct = (s % 8 === 6) ? 12 : 0;
    sunBattleBass(root + oct, time, stepDur * 1.7, intense >= 3 ? 0.3 : 0.26, s === 0 ? root - 2 : root + oct);
    if (intense >= 2 && s === 14) sunBattleBass(root + 12, time, stepDur, 0.2, root + 12);
  }
  if (intense >= 3 && s % 2 === 1) sunBattleBass(root + 12, time, stepDur * 0.9, 0.11, root + 12);
  var seq = [0, 1, 2, 1];
  var arpMidi = chord[seq[step % 4]] + (step % 8 >= 4 ? 12 : 0);
  sunBattleNote(sunBattleMidi(arpMidi), sunBattleMidi(arpMidi), time, stepDur * 1.1, 'square', 0.055, 3300, 0.18);
  if (intense >= 2 && step % 2 === 0) sunBattleNote(sunBattleMidi(arpMidi + 12), sunBattleMidi(arpMidi + 12), time, stepDur, 'square', 0.038, 4300, 0.22);
  var entries = SUN_BATTLE_LEAD_BY_STEP[step] || [];
  for (i = 0; i < entries.length; i++) {
    var dur = entries[i][1] * stepDur;
    var f = sunBattleMidi(entries[i][2]);
    sunBattleNote(f, f, time, dur, 'square', 0.14, 3400, 0.24);
    if (intense >= 2) sunBattleNote(f / 2, f / 2, time, dur, 'triangle', 0.06, 1600, 0);
  }
}
function sunBattleNote(f0, f1, time, dur, type, vol, cutoff, echo) {
  var m = sunMusic;
  if (!m) return;
  try {
    var ctx = m.ctx;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), time + dur);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff || 2400, time);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(m.master);
    var send = null;
    if (echo > 0) {
      send = ctx.createGain();
      send.gain.value = echo;
      gain.connect(send);
      send.connect(m.delay);
    }
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.start(time);
    osc.stop(time + dur + 0.05);
    osc.onended = function() {
      try { osc.disconnect(); } catch (e) {}
      try { filter.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      if (send) { try { send.disconnect(); } catch (e) {} }
    };
  } catch (e) {}
}
function sunBattleBass(midi, time, dur, vol, slideMidi) {
  sunBattleNote(sunBattleMidi(slideMidi), sunBattleMidi(midi), time, dur, 'sawtooth', vol, 520, 0);
}
function sunBattleKick(time, vol) {
  sunBattleNote(160, 42, time, 0.22, 'sine', vol, 900, 0);
  sunBattleNote(900, 700, time, 0.02, 'square', 0.1, 4000, 0);
}
function sunBattleSnare(time, vol) {
  sunBattleNoise(time, 0.12, vol, 'bandpass', 1800);
  sunBattleNote(190, 150, time, 0.08, 'triangle', vol * 0.7, 2500, 0);
}
function sunBattleHat(time, dur, vol) {
  sunBattleNoise(time, dur, vol, 'highpass', 7200);
}
function sunBattleCrash(time, intense) {
  sunBattleNoise(time, 0.9, intense >= 3 ? 0.26 : 0.2, 'highpass', 5200);
  sunBattleNote(220, 110, time, 0.4, 'sawtooth', 0.1, 1400, 0.12);
}
function sunBattleNoise(time, dur, vol, filterType, filterFreq) {
  var m = sunMusic;
  if (!m) return;
  try {
    var ctx = m.ctx;
    var src = ctx.createBufferSource();
    src.buffer = m.noise;
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, time);
    var gain = ctx.createGain();
    src.connect(filter);
    filter.connect(gain);
    gain.connect(m.master);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.start(time);
    src.stop(time + dur + 0.02);
    src.onended = function() {
      try { src.disconnect(); } catch (e) {}
      try { filter.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
    };
  } catch (e) {}
}
var dashAudioCtx = null;
export function playDashSound() {
  if (bgm.muted) return;
  try {
    if (!dashAudioCtx) dashAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (dashAudioCtx.state === 'suspended') dashAudioCtx.resume();
    var o = dashAudioCtx.createOscillator();
    var g = dashAudioCtx.createGain();
    var f = dashAudioCtx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 400;
    o.type = 'sine';
    o.connect(f); f.connect(g); g.connect(dashAudioCtx.destination);
    o.frequency.setValueAtTime(500, dashAudioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(1100, dashAudioCtx.currentTime + 0.08);
    o.frequency.linearRampToValueAtTime(700, dashAudioCtx.currentTime + 0.14);
    g.gain.setValueAtTime(0.28, dashAudioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, dashAudioCtx.currentTime + 0.14);
    o.start(dashAudioCtx.currentTime);
    o.stop(dashAudioCtx.currentTime + 0.15);
    var o2 = dashAudioCtx.createOscillator();
    var g2 = dashAudioCtx.createGain();
    o2.type = 'triangle';
    o2.connect(g2); g2.connect(dashAudioCtx.destination);
    o2.frequency.setValueAtTime(900, dashAudioCtx.currentTime);
    o2.frequency.exponentialRampToValueAtTime(200, dashAudioCtx.currentTime + 0.12);
    g2.gain.setValueAtTime(0.12, dashAudioCtx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.01, dashAudioCtx.currentTime + 0.12);
    o2.start(dashAudioCtx.currentTime);
    o2.stop(dashAudioCtx.currentTime + 0.12);
  } catch(e) {}
}

export function initAudioUI() {
  var volSlider = document.getElementById('vol-slider');
  var muteBtn = document.getElementById('mute-btn');
  var muteIcon = document.getElementById('mute-icon');
  var ictx = muteIcon.getContext('2d');

  function drawSpeakerIcon(muted) {
    ictx.clearRect(0, 0, 10, 10);
    var c = '#4ecdc4';
    if (!muted) {
      ictx.fillStyle = c;
      ictx.fillRect(1, 3, 2, 4);
      ictx.fillRect(3, 2, 1, 1);
      ictx.fillRect(3, 7, 1, 1);
      ictx.fillRect(4, 1, 1, 2);
      ictx.fillRect(4, 7, 1, 2);
      ictx.fillRect(5, 0, 1, 2);
      ictx.fillRect(5, 8, 1, 2);
      ictx.fillRect(6, 3, 1, 1);
      ictx.fillRect(7, 2, 1, 1);
      ictx.fillRect(8, 1, 1, 1);
      ictx.fillRect(6, 6, 1, 1);
      ictx.fillRect(7, 7, 1, 1);
      ictx.fillRect(8, 8, 1, 1);
    } else {
      ictx.fillStyle = c;
      ictx.fillRect(1, 3, 2, 4);
      ictx.fillRect(3, 2, 1, 1);
      ictx.fillRect(3, 7, 1, 1);
      ictx.fillRect(4, 1, 1, 2);
      ictx.fillRect(4, 7, 1, 2);
      ictx.fillStyle = '#e94560';
      ictx.fillRect(5, 2, 1, 1);
      ictx.fillRect(6, 3, 1, 1);
      ictx.fillRect(7, 4, 1, 1);
      ictx.fillRect(6, 5, 1, 1);
      ictx.fillRect(5, 6, 1, 1);
      ictx.fillRect(7, 2, 1, 1);
      ictx.fillRect(6, 3, 1, 1);
      ictx.fillRect(5, 4, 1, 1);
      ictx.fillRect(6, 5, 1, 1);
      ictx.fillRect(7, 6, 1, 1);
    }
  }
  drawSpeakerIcon(false);

  volSlider.addEventListener('input', function() {
    baseVol = this.value / 100;
    bgm.volume = baseVol;
    bgmSky.volume = baseVol;
    bgmSecret.volume = baseVol;
    bgmGalaxy.volume = baseVol;
    bgm.muted = false;
    bgmSky.muted = false;
    bgmSecret.muted = false;
    bgmGalaxy.muted = false;
    try { applySunBattleVolume(); } catch (e) {}
    drawSpeakerIcon(false);
  });
  muteBtn.addEventListener('click', function() {
    bgm.muted = !bgm.muted;
    bgmSky.muted = bgm.muted;
    bgmSecret.muted = bgm.muted;
    bgmGalaxy.muted = bgm.muted;
    try { syncSunBattleMusic(); } catch (e) {}
    drawSpeakerIcon(bgm.muted);
  });

}
export function audioLevelMusic(kind, dead) {
  if (kind === 'secret') {
    bgm.pause();
    bgmSky.pause();
    bgmGalaxy.pause();
    bgmSecret.currentTime = 0;
    if (!bgmSecret.muted) bgmSecret.play();
  } else if (kind === 'galaxy') {
    bgm.pause();
    bgmSky.pause();
    bgmSecret.pause();
    bgmGalaxy.currentTime = 0;
    if (!bgmGalaxy.muted) bgmGalaxy.play();
  } else if (kind === 'sky') {
    bgm.pause();
    bgmSecret.pause();
    bgmGalaxy.pause();
    bgmSky.currentTime = 0;
    if (!bgmSky.muted) bgmSky.play();
  } else {
    bgmSky.pause();
    bgmSecret.pause();
    bgmGalaxy.pause();
    if (bgm.paused && !dead) { bgm.currentTime = 0; if (!bgm.muted) bgm.play(); }
  }
}
export function stopAllBgm() {
  bgm.pause();
  bgmSky.pause();
  bgmSecret.pause();
  bgmGalaxy.pause();
}
export function stopGameOverBgm() {
  bgm.pause();
  bgmSky.pause();
}
export function resumeMainBgm() {
  bgm.currentTime = 0;
  if (!bgm.muted) bgm.play();
}
export function updateAudioFrame(skyActive, fade, ambient) {
  if (skyActive) bgmSky.volume = baseVol * fade;
  else if (ambient) bgm.volume = baseVol;
  else if (bgm.volume !== baseVol) bgm.volume = baseVol;
}
