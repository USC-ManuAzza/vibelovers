'use strict';

/* ============================================================
   COMPILA! — minijuego de ritmo de elementos de código.
   Cada ficha cae por una de las 4 columnas y hay que pulsar la
   tecla de su CATEGORÍA justo al cruzar la línea.
   Los aciertos escriben el programa en el editor de la derecha.
   ============================================================ */

const $ = id => document.getElementById(id);

/* ---------- categorías ---------- */
const LANES = [
  {
    key: 'd', code: 'KeyD', name: 'palabra clave', color: '#7cc4ff', cls: 'kw',
    tokens: ['if', 'else', 'for', 'while', 'return', 'def', 'class', 'import', 'try', 'except',
             'async', 'await', 'yield', 'break', 'continue', 'lambda', 'with', 'in', 'not', 'and']
  },
  {
    key: 'f', code: 'KeyF', name: 'símbolo', color: '#ffd66b', cls: 'sym',
    tokens: ['{', '}', '(', ')', ';', '=>', '==', '++', '&&', '||', '[', ']', '+=', '!==', ':', '->']
  },
  {
    key: 'j', code: 'KeyJ', name: 'número', color: '#7ee2a8', cls: 'num',
    tokens: ['42', '0', '3.14', '1e6', '-7', '0xFF', '256', '8', '100', '2.5', '1_000', '9', '0b1010', '60']
  },
  {
    key: 'k', code: 'KeyK', name: 'texto', color: '#ff9ecb', cls: 'str',
    tokens: ['"hola"', "'a'", '"USC"', '"examen"', '"nota"', '"ok"', '"error"', '"2026"', '"TFG"', '`tpl`']
  }
];

/* ---------- constantes de tempo (ms) ---------- */
const STEP = 300;        // duración de un paso (8º a 100 BPM)
const LEAD = 3200;       // cuenta atrás antes de la primera ficha
const TRAVEL = 1750;     // tiempo que tarda una ficha en cruzar la pista
const HIT_OFFSET = 84;   // altura de la línea de golpe respecto al fondo
const W_PERFECT = 80;
const W_GREAT = 150;
const W_GOOD = 220;
const W_MISS = 260;
const TOTAL_STEPS = 176;

const S = {
  running: false, ended: false, mute: false, paused: false, pauseAt: 0,
  t0: 0, chartEnd: 0, notes: [],
  score: 0, combo: 0, maxCombo: 0,
  judged: 0, hits: 0, errors: 0,
  perfect: 0, great: 0, good: 0, miss: 0,
  quality: 0, lastBeat: -1
};

/* ---------- audio ---------- */
let ac = null;
function ensureAudio(){
  if (!ac){
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}
function beep(freq, dur, type, vol){
  if (S.mute || !ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.value = freq;
  const t = ac.currentTime;
  g.gain.setValueAtTime(vol == null ? 0.05 : vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

/* ---------- lienzo ---------- */
const canvas = $('board');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, hitY = 0;

function resize(){
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = r.width;
  H = r.height;
  hitY = H - HIT_OFFSET;
}
window.addEventListener('resize', () => { resize(); if (!S.running) draw(0); });

/* ---------- editor ---------- */
const codeEl = $('code');
const statusEl = $('status');
const progEl = $('prog');

let lineas = [];
let actual = [];

function esc(t){
  return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function cargarCodigo(){
  lineas = [
    [{ text: '# main.py — examen final de programación', cls: 'cm' }],
    [{ text: 'def ', cls: 'kw' }, { text: 'resolver', cls: '' }, { text: '(', cls: 'sym' },
     { text: 'examen', cls: '' }, { text: '):', cls: 'sym' }],
    [{ text: '    nota', cls: '' }, { text: ' = ', cls: 'sym' }, { text: '0', cls: 'num' }]
  ];
  actual = [{ text: '    ', cls: '' }];
  pintarCodigo();
}

function pintarCodigo(){
  const todas = lineas.concat([actual.concat([{ text: ' ', cls: '' }, { text: '▍', cls: 'cur' }])]);
  codeEl.innerHTML = todas
    .map(l => l.map(t => t.cls === 'cur'
      ? '<span class="cur"></span>'
      : (t.cls ? '<span class="' + t.cls + '">' + esc(t.text) + '</span>' : esc(t.text))).join(''))
    .join('\n');
  codeEl.scrollTop = codeEl.scrollHeight;
}

function escribirToken(token, cls){
  const largo = actual.reduce((n, t) => n + t.text.length, 0);
  if (largo > 44){ lineas.push(actual); actual = [{ text: '    ', cls: '' }]; }
  actual.push({ text: token, cls: cls });
  actual.push({ text: ' ', cls: '' });
  pintarCodigo();
}

function escribirError(){
  actual.push({ text: '¿?', cls: 'err' });
  actual.push({ text: ' ', cls: '' });
  pintarCodigo();
  codeEl.classList.add('shake');
  setTimeout(() => codeEl.classList.remove('shake'), 260);
}

/* ---------- HUD ---------- */
function precision(){
  return S.judged === 0 ? 100 : (S.quality / (S.judged * 300)) * 100;
}

function pintarHud(){
  $('score').textContent = S.score;
  $('combo').textContent = S.combo + 'x';
  $('acc').textContent = Math.max(0, precision()).toFixed(0) + '%';
  $('combo').style.color = S.combo >= 20 ? '#7ee2a8' : S.combo >= 10 ? '#ffd66b' : '';
}

function multiplicador(){
  return 1 + Math.min(3, Math.floor(S.combo / 10));
}

/* ---------- cartas ---------- */
function construirChart(){
  const notas = [];
  const rnd = (n) => Math.floor(Math.random() * n);
  let ultima = -1;

  for (let i = 0; i < TOTAL_STEPS; i++){
    const progreso = i / TOTAL_STEPS;
    const prob = 0.32 + 0.5 * progreso;
    if (Math.random() > prob) continue;

    let lane = rnd(4);
    if (lane === ultima && Math.random() < 0.65) lane = (lane + 1 + rnd(3)) % 4;

    const t = LEAD + i * STEP;
    notas.push({ t, lane, token: LANES[lane].tokens[rnd(LANES[lane].tokens.length)], judged: false });
    ultima = lane;

    if (i > TOTAL_STEPS * 0.5 && Math.random() < 0.1 + 0.18 * progreso){
      const l2 = (lane + 2) % 4;
      notas.push({ t, lane: l2, token: LANES[l2].tokens[rnd(LANES[l2].tokens.length)], judged: false });
    }
  }
  notas.sort((a, b) => a.t - b.t);
  return notas;
}

/* ---------- efectos ---------- */
const parts = [];
function addPart(x, y, text, color){
  parts.push({ x, y, text, color, t: performance.now() });
  if (parts.length > 40) parts.shift();
}

function feedback(texto, color){
  const el = $('judge');
  el.textContent = texto;
  el.style.color = color;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

const laneBtns = [...document.querySelectorAll('.lane')];

function flashLane(lane, ok){
  const b = laneBtns[lane];
  b.classList.add(ok ? 'hit' : 'active');
  setTimeout(() => b.classList.remove('hit', 'active'), ok ? 140 : 90);
}

/* ---------- juicio ---------- */
function press(lane){
  if (!S.running || S.ended || S.paused) return;
  const now = performance.now() - S.t0;

  let mejor = null, mejorDt = Infinity;
  for (const n of S.notes){
    if (n.judged || n.lane !== lane) continue;
    const dt = Math.abs(n.t - now);
    if (dt < mejorDt){ mejorDt = dt; mejor = n; }
  }

  if (!mejor || mejorDt > W_MISS){
    flashLane(lane, false);
    return;
  }

  mejor.judged = true;
  const dt = Math.abs(mejor.t - now);
  let label, w, color;

  if (dt <= W_PERFECT){ label = 'PERFECT'; w = 300; color = '#7ee2a8'; S.perfect++; }
  else if (dt <= W_GREAT){ label = 'GREAT'; w = 200; color = '#7cc4ff'; S.great++; }
  else { label = 'GOOD'; w = 100; color = '#ffd66b'; S.good++; }

  S.judged++;
  S.hits++;
  S.quality += w;
  S.combo++;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.score += Math.round(w * multiplicador());

  beep(w === 300 ? 880 : w === 200 ? 660 : 520, 0.09, 'square', 0.045);
  feedback(label, color);

  const lw = W / 4;
  addPart(lane * lw + lw / 2, hitY - 10, '+' + Math.round(w * multiplicador()), color);
  flashLane(lane, true);
  escribirToken(mejor.token, LANES[lane].cls);
  pintarHud();
}

function fallar(n){
  n.judged = true;
  S.judged++;
  S.miss++;
  S.combo = 0;
  S.errors++;
  beep(140, 0.18, 'sawtooth', 0.05);
  feedback('MISS', '#ff6b6b');
  escribirError();
  pintarHud();
}

/* ---------- dibujo ---------- */
function rrect(x, y, w, h, r){
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function draw(now){
  const lw = W / 4;
  ctx.clearRect(0, 0, W, H);

  /* bandas de las columnas */
  for (let i = 0; i < 4; i++){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(124,196,255,.015)');
    g.addColorStop(1, 'rgba(124,196,255,.07)');
    ctx.fillStyle = g;
    ctx.fillRect(i * lw, 0, lw, H);

    ctx.fillStyle = LANES[i].color;
    ctx.globalAlpha = 0.05;
    ctx.fillRect(i * lw, H - 4, lw, 4);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgba(124,196,255,.13)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++){
    ctx.beginPath(); ctx.moveTo(i * lw, 0); ctx.lineTo(i * lw, H); ctx.stroke();
  }

  /* línea de golpe con pulso de negra */
  const beat = now > 0 ? (now % 600) / 600 : 0;
  const glow = Math.pow(1 - beat, 3);
  ctx.fillStyle = 'rgba(124,196,255,' + (0.05 + 0.1 * glow) + ')';
  ctx.fillRect(0, hitY - 26, W, 52);
  ctx.strokeStyle = 'rgba(150,215,255,' + (0.45 + 0.45 * glow) + ')';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, hitY); ctx.lineTo(W, hitY); ctx.stroke();

  /* fichas */
  const speed = (hitY + 70) / TRAVEL;
  for (const n of S.notes){
    if (n.judged) continue;
    const dt = n.t - now;
    if (dt > TRAVEL || dt < -W_MISS) continue;

    const y = hitY - dt * speed;
    const x = n.lane * lw + 8;
    const w = lw - 16;
    const h = 30;
    const fade = dt < 0 ? Math.max(0, 1 - Math.abs(dt) / W_MISS) : 1;

    ctx.globalAlpha = fade;
    rrect(x, y - h / 2, w, h, 8);
    ctx.fillStyle = 'rgba(9,24,38,.94)';
    ctx.fill();
    ctx.strokeStyle = LANES[n.lane].color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = LANES[n.lane].color;
    ctx.font = 'bold 15px ui-monospace, Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.token, x + w / 2, y + 0.5);
    ctx.globalAlpha = 1;
  }

  /* combo fantasma */
  if (S.combo >= 3){
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#7cc4ff';
    ctx.font = '900 62px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(S.combo + 'x', W / 2, H * 0.42);
    ctx.globalAlpha = 1;
  }

  /* partículas de puntuación */
  const tNow = performance.now();
  for (let i = parts.length - 1; i >= 0; i--){
    const p = parts[i];
    const k = (tNow - p.t) / 750;
    if (k >= 1){ parts.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = p.color;
    ctx.font = '900 14px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y - k * 44);
    ctx.globalAlpha = 1;
  }

  /* cuenta atrás */
  if (now < LEAD){
    const resta = Math.ceil((LEAD - now) / 1000);
    ctx.fillStyle = 'rgba(3,9,15,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(234,245,255,.95)';
    ctx.font = '900 76px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(resta > 0 ? resta : '¡YA!', W / 2, H / 2 - 10);
    ctx.font = '400 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = 'rgba(169,196,224,.9)';
    ctx.fillText('prepárate…', W / 2, H / 2 + 46);
  }
}

/* ---------- bucle ---------- */
let raf = 0;

function loop(){
  if (!S.running || S.paused) return;
  const now = performance.now() - S.t0;

  const beat = Math.floor(now / 600);
  if (beat !== S.lastBeat && now > 0){
    S.lastBeat = beat;
    beep(beat % 4 === 0 ? 220 : 150, 0.05, 'triangle', beat % 4 === 0 ? 0.06 : 0.03);
  }

  for (const n of S.notes){
    if (!n.judged && now > n.t + W_MISS) fallar(n);
  }

  draw(now);
  progEl.style.width = Math.min(100, Math.max(0, (now / S.chartEnd) * 100)) + '%';

  if (now > S.chartEnd + 900){ fin(); return; }
  raf = requestAnimationFrame(loop);
}

/* ---------- pausa ---------- */
function pausar(){
  if (!S.running || S.paused || S.ended) return;
  S.paused = true;
  S.pauseAt = performance.now();
  cancelAnimationFrame(raf);
  $('pausa').classList.remove('hidden');
  $('resumeBtn').focus();
}

function reanudar(){
  if (!S.paused) return;
  S.t0 += performance.now() - S.pauseAt;
  S.paused = false;
  S.lastBeat = -1;
  $('pausa').classList.add('hidden');
  raf = requestAnimationFrame(loop);
}

/* ---------- fin ---------- */
function notaFinal(){
  const a = precision();
  if (a >= 96) return ['COMPILA A LA PRIMERA', false];
  if (a >= 89) return ['SIN WARNINGS', false];
  if (a >= 78) return ['COMPILA CON WARNINGS', false];
  if (a >= 62) return ['PARECE QUE COMPILA', false];
  return ['ERROR DE SINTAXIS', true];
}

function fin(){
  S.running = false;
  S.ended = true;
  cancelAnimationFrame(raf);

  const [nota, mal] = notaFinal();
  $('status').textContent = mal ? '✗ errores' : '✓ compilado';
  $('status').className = 'status ' + (mal ? 'bad' : 'ok');

  $('ovTitle').textContent = 'FIN DE LA COMPILACIÓN';
  $('ovText').innerHTML =
    '<div class="result">' +
      '<div><b>' + S.score + '</b><small>puntos</small></div>' +
      '<div><b>' + precision().toFixed(0) + '%</b><small>precisión</small></div>' +
      '<div><b>' + S.maxCombo + 'x</b><small>combo máx.</small></div>' +
      '<div><b>' + S.errors + '</b><small>errores</small></div>' +
    '</div>' +
    '<p class="nota ' + (mal ? 'mal' : '') + '">' + nota + '</p>' +
    '<p>Perfectas: ' + S.perfect + ' · Great: ' + S.great + ' · Good: ' + S.good + ' · Falladas: ' + S.miss + '</p>';

  $('ovBtn').textContent = 'Compilar otra vez';
  $('overlay').classList.remove('hidden');
  $('ovBtn').focus();
}

/* ---------- arranque ---------- */
function empezar(){
  ensureAudio();
  resize();

  S.running = true;
  S.ended = false;
  S.score = 0; S.combo = 0; S.maxCombo = 0;
  S.judged = 0; S.hits = 0; S.errors = 0;
  S.perfect = 0; S.great = 0; S.good = 0; S.miss = 0;
  S.quality = 0; S.lastBeat = -1;

  S.notes = construirChart();
  S.chartEnd = S.notes.reduce((m, n) => Math.max(m, n.t), 0) + 1200;
  S.paused = false;
  $('pausa').classList.add('hidden');

  parts.length = 0;
  cargarCodigo();
  $('status').textContent = 'escribiendo…';
  $('status').className = 'status';
  progEl.style.width = '0%';
  pintarHud();

  $('overlay').classList.add('hidden');
  S.t0 = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

/* ---------- eventos ---------- */
const TECLAS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };

window.addEventListener('keydown', e => {
  if (e.code === 'Escape'){
    e.preventDefault();
    if (S.paused) reanudar();
    else pausar();
    return;
  }
  if (e.repeat) return;
  const lane = TECLAS[e.code];
  if (lane !== undefined){
    e.preventDefault();
    press(lane);
  }
});

laneBtns.forEach(b => {
  const lane = Number(b.dataset.lane);
  b.addEventListener('pointerdown', e => { e.preventDefault(); ensureAudio(); press(lane); });
});

$('ovBtn').addEventListener('click', empezar);

$('pause').addEventListener('click', () => {
  if (S.paused) reanudar(); else pausar();
});

$('resumeBtn').addEventListener('click', reanudar);

$('quitBtn').addEventListener('click', () => {
  window.location.href = '../index.html';
});

$('mute').addEventListener('click', () => {
  S.mute = !S.mute;
  $('mute').textContent = S.mute ? '🔇' : '🔊';
});

window.addEventListener('keydown', e => {
  if (e.code === 'Enter' && !$('overlay').classList.contains('hidden')) empezar();
  if (e.code === 'Enter' && !$('pausa').classList.contains('hidden')) reanudar();
});

resize();
cargarCodigo();
pintarHud();
draw(0);
