'use strict';

/* ============================================================
   Pizarra Rápida — copia la frase antes de que la borren.
   Sin dependencias: todo en un solo módulo.
   ============================================================ */

const $ = id => document.getElementById(id);

const FRASES = [
  'La célula es la unidad de la vida',
  'La capital de Galicia es Santiago',
  'El ADN guarda la información genética',
  'Un triángulo tiene tres lados',
  'La energía no se crea ni se destruye',
  'La fotosíntesis ocurre en los cloroplastos',
  'El Quijote lo escribió Cervantes',
  'La mitosis produce dos células iguales',
  'El teorema de Pitágoras usa los catetos',
  'La Revolución Francesa empezó en 1789',
  'El sujeto y el predicado forman la oración',
  'La derivada mide la tasa de cambio',
  'El examen es el martes a las nueve',
  'El café de la cafetería no parece café',
  'La biblioteca cierra justo cuando llegas',
  'El tribunal corrige siempre en rojo'
];

const S = {
  vidas: 3,
  puntos: 0,
  aciertos: 0,
  racha: 0,
  mejorRacha: 0,
  nivel: 1,
  activo: false,
  frase: '',
  objetivo: '',
  borrados: 0,
  t0: 0,
  duracion: 1,
  raf: 0,
  acabado: false
};

let spans = [];

const input = $('input');
const fraseEl = $('frase');
const typedEl = $('typed');
const hintEl = $('hint');

/* ---------- utilidades ---------- */
const normalizar = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function elegirFrase(){
  const tope = Math.min(FRASES.length, 5 + S.nivel * 2);
  const candidatas = FRASES.slice(0, tope);
  let f;
  do { f = candidatas[Math.floor(Math.random() * candidatas.length)]; }
  while (f === S.frase && candidatas.length > 1);
  return f;
}

function pintarVidas(){
  $('vidas').textContent = '📄'.repeat(Math.max(0, S.vidas)) || '—';
}

function pintarHud(){
  $('pts').textContent = S.puntos;
  $('mult').textContent = 'x' + multiplicador();
  pintarVidas();
}

function multiplicador(){
  return 1 + Math.min(3, Math.floor(S.racha / 3));
}

function hint(txt, clase){
  hintEl.textContent = txt;
  hintEl.className = 'hint' + (clase ? ' ' + clase : '');
}

/* ---------- pizarra ---------- */
function pintarFrase(){
  fraseEl.replaceChildren();
  spans = [];
  const frag = document.createDocumentFragment();

  for (const ch of S.frase){
    const sp = document.createElement('span');
    sp.textContent = ch === ' ' ? '\u00A0' : ch;
    if (ch === ' ') sp.classList.add('space');
    frag.appendChild(sp);
    spans.push(sp);
  }
  fraseEl.appendChild(frag);
  marcarCursor(0);
}

function marcarCursor(indice){
  spans.forEach((sp, i) => sp.classList.toggle('cur', i === indice));
}

function pintarBorrado(){
  const total = S.frase.length;
  const desde = total - S.borrados;
  spans.forEach((sp, i) => sp.classList.toggle('erased', i >= desde));
}

function revelarTodo(){
  spans.forEach(sp => sp.classList.remove('erased', 'cur'));
}

/* ---------- folio ---------- */
function pintarEscrito(raw){
  const norm = normalizar(raw);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < raw.length; i++){
    const sp = document.createElement('span');
    sp.textContent = raw[i];
    if (i < S.objetivo.length){
      sp.className = normalizar(raw[i]) === S.objetivo[i] ? 'ok' : 'bad';
    }
    frag.appendChild(sp);
  }
  typedEl.replaceChildren(frag);
  marcarCursor(norm.length);
  return norm;
}

/* ---------- ronda ---------- */
function nuevaRonda(){
  if (S.acabado) return;

  S.frase = elegirFrase();
  S.objetivo = normalizar(S.frase);
  S.borrados = 0;
  S.activo = true;

  input.value = '';
  input.maxLength = S.frase.length;
  typedEl.replaceChildren();
  pintarFrase();

  const factor = Math.max(0.17, 0.34 - S.nivel * 0.02);
  S.duracion = Math.max(2600, S.frase.length * factor * 1000);
  S.t0 = performance.now();

  $('timerBar').style.width = '100%';
  $('teacher').classList.add('wiping');
  hint('Escribe la frase antes de que la borre.', '');

  input.focus();
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(tick);
}

function tick(){
  if (!S.activo) return;

  const p = Math.min(1, (performance.now() - S.t0) / S.duracion);
  $('timerBar').style.width = Math.max(0, (1 - p) * 100) + '%';

  const objetivo = Math.floor(p * S.frase.length);
  if (objetivo !== S.borrados){
    S.borrados = objetivo;
    pintarBorrado();
  }

  if (p >= 1){ fallo(); return; }
  S.raf = requestAnimationFrame(tick);
}

/* ---------- resultados ---------- */
function acierto(){
  S.activo = false;
  cancelAnimationFrame(S.raf);
  $('teacher').classList.remove('wiping');

  const resto = Math.max(0, 1 - (performance.now() - S.t0) / S.duracion);
  const pts = Math.round(S.frase.length * 10 * (0.5 + resto) * multiplicador());

  S.puntos += pts;
  S.aciertos += 1;
  S.racha += 1;
  S.mejorRacha = Math.max(S.mejorRacha, S.racha);
  S.nivel = 1 + Math.floor(S.aciertos / 2);

  pintarHud();
  hint('¡Bien! +' + pts + ' puntos' + (multiplicador() > 1 ? ' (x' + multiplicador() + ')' : ''), 'ok');
  fraseEl.classList.add('flash');

  setTimeout(() => {
    fraseEl.classList.remove('flash');
    nuevaRonda();
  }, 650);
}

function fallo(){
  S.activo = false;
  cancelAnimationFrame(S.raf);
  $('teacher').classList.remove('wiping');

  S.vidas -= 1;
  S.racha = 0;
  pintarHud();
  revelarTodo();
  hint('Se borró... era: «' + S.frase + '»', 'bad');
  $('timerBar').style.width = '0%';

  if (S.vidas <= 0){ setTimeout(finJuego, 900); return; }
  setTimeout(nuevaRonda, 1500);
}

function notaFinal(){
  const a = S.aciertos;
  if (a >= 12) return 'MATRÍCULA DE HONOR';
  if (a >= 9) return 'SOBRESALIENTE';
  if (a >= 6) return 'NOTABLE';
  if (a >= 3) return 'APROBADO';
  return 'SUSPENSO';
}

function finJuego(){
  S.acabado = true;
  S.activo = false;
  cancelAnimationFrame(S.raf);

  const nota = notaFinal();
  $('ovTitle').textContent = 'FIN DE LA CLASE';
  $('ovText').innerHTML =
    '<div class="final">' +
      '<div><b>' + S.puntos + '</b><small>puntos</small></div>' +
      '<div><b>' + S.aciertos + '</b><small>frases</small></div>' +
      '<div><b>' + S.mejorRacha + '</b><small>mejor racha</small></div>' +
    '</div>' +
    '<p class="nota">' + nota + '</p>' +
    '<p>Te quedaste sin folios. El profesor ya está borrando la siguiente.</p>';

  $('ovBtn').textContent = 'Repetir la clase';
  $('overlay').classList.remove('hidden');
  $('ovBtn').focus();
}

/* ---------- arranque ---------- */
function empezar(){
  S.vidas = 3;
  S.puntos = 0;
  S.aciertos = 0;
  S.racha = 0;
  S.mejorRacha = 0;
  S.nivel = 1;
  S.acabado = false;
  S.frase = '';

  $('overlay').classList.add('hidden');
  pintarHud();
  nuevaRonda();
}

/* ---------- eventos ---------- */
input.addEventListener('input', () => {
  if (!S.activo) return;

  const raw = input.value;
  const norm = pintarEscrito(raw);

  if (norm.length >= S.objetivo.length){
    if (norm === S.objetivo) acierto();
  }
});

input.addEventListener('keydown', e => {
  if (e.key === 'Escape') input.blur();
});

$('ovBtn').addEventListener('click', empezar);

window.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !$('overlay').classList.contains('hidden')){
    e.preventDefault();
    empezar();
  }
});

document.addEventListener('click', e => {
  if (S.activo && !e.target.closest('.folio')) input.focus();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.activo){
    S.t0 = performance.now() - (1 - parseFloat($('timerBar').style.width) / 100) * S.duracion;
  }
});

pintarHud();
