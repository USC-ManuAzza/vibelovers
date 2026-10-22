'use strict';

const el = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const state = {
  P: {hp:26, maxHp:26, fp:9, maxFp:9, cafe:2, star:0, drowsy:0, wideGuard:false},
  B: {hp:52, maxHp:52, phase:1, marked:0},
  busy: true, over: true, turns: 0, sound: true
};

/* ---------- audio ---------- */
let ac = null;
function sfx(kind){
  if(!state.sound) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime;
    const map = {
      tap:     {f:420, d:0.07, type:'square'},
      perfect: {f:900, d:0.13, type:'square'},
      hit:     {f:180, d:0.14, type:'sawtooth'},
      bad:     {f:90,  d:0.22, type:'sawtooth'},
      win:     {f:660, d:0.18, type:'triangle'}
    };
    const c = map[kind] || map.tap;
    o.type = c.type;
    o.frequency.setValueAtTime(c.f, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + c.d);
    o.start(t); o.stop(t + c.d + 0.02);
  }catch(e){}
}

/* ---------- UI ---------- */
function setBar(barId, txtId, v, max, pct){
  el(barId).style.width = Math.max(0, Math.min(100, (v / max) * 100)) + '%';
  el(txtId).textContent = pct ? Math.round(v) + '%' : Math.round(v) + '/' + max;
}

function updateUI(){
  const P = state.P, B = state.B;
  setBar('pHpBar', 'pHpTxt', P.hp, P.maxHp);
  setBar('pFpBar', 'pFpTxt', P.fp, P.maxFp);
  setBar('pStarBar', 'pStarTxt', P.star, 100, true);
  setBar('bHpBar', 'bHpTxt', B.hp, B.maxHp);
  el('cafeCount').textContent = P.cafe;
  el('face').textContent = P.hp <= 8 ? '😰' : P.hp <= 16 ? '😬' : '🎓';
}

function refreshButtons(){
  const P = state.P;
  const off = state.busy || state.over;
  document.querySelectorAll('#commands button').forEach(b => b.disabled = off);
  if(off) return;
  if(P.fp < 2) q('[data-cmd="mark"]').disabled = true;
  if(P.fp < 3) q('[data-cmd="focus"]').disabled = true;
  if(P.cafe <= 0) q('[data-cmd="cafe"]').disabled = true;
  if(P.star < 100) q('[data-cmd="star"]').disabled = true;
  el('hint').textContent = 'Tu turno: elige una acción';
}

function q(sel){ return document.querySelector(sel); }

function log(msg, cls){
  const d = document.createElement('div');
  if(cls) d.className = cls;
  d.textContent = msg;
  const L = el('log');
  L.appendChild(d);
  while(L.children.length > 5) L.removeChild(L.firstChild);
}

function floatText(target, text, cls){
  const f = document.createElement('div');
  f.className = 'float ' + (cls || '');
  f.textContent = text;
  target.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

function shake(target){
  target.classList.remove('shake');
  void target.offsetWidth;
  target.classList.add('shake');
  setTimeout(() => target.classList.remove('shake'), 480);
}

/* ---------- QTE ---------- */
function qte(opts){
  return new Promise(resolve => {
    const {title, hint, a, b, speed = 1000, kind = 'attack'} = opts;
    const overlay = el('qte'), track = el('track'), marker = el('marker');
    const pad = 9;

    el('qteTitle').textContent = title;
    el('qteTitle').style.color = kind === 'guard' ? 'var(--blue)' : 'var(--red)';
    el('qteHint').textContent = hint;
    el('goodZone').style.left = (a - pad) + '%';
    el('goodZone').style.width = (b - a + pad * 2) + '%';
    el('perfectZone').style.left = a + '%';
    el('perfectZone').style.width = (b - a) + '%';
    marker.style.left = '0%';

    const t0 = performance.now();
    let raf = 0, done = false;
    const pos = () => Math.min(100, (performance.now() - t0) / speed * 100);

    function cleanup(){
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      track.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('pointerdown', onBackdrop);
    }
    function finish(res){
      if(done) return;
      done = true; cleanup();
      overlay.classList.add('hidden');
      resolve(res);
    }
    function judge(){
      const p = pos();
      if(p >= a && p <= b) return 'perfect';
      if(p >= a - pad && p <= b + pad) return 'good';
      return 'miss';
    }
    function press(){
      if(done) return;
      const res = judge();
      sfx(res === 'perfect' ? 'perfect' : res === 'good' ? 'tap' : 'bad');
      finish(res);
    }
    function onKey(e){
      if(e.code === 'Space' || e.code === 'Enter'){ e.preventDefault(); press(); }
    }
    function onDown(e){ e.preventDefault(); press(); }
    function onBackdrop(e){ e.preventDefault(); }
    function frame(){
      const p = pos();
      marker.style.left = p + '%';
      if(p >= 100){ finish('miss'); return; }
      raf = requestAnimationFrame(frame);
    }

    overlay.classList.remove('hidden');
    window.addEventListener('keydown', onKey);
    track.addEventListener('pointerdown', onDown);
    overlay.addEventListener('pointerdown', onBackdrop);
    raf = requestAnimationFrame(frame);
  });
}

/* ---------- combate ---------- */
function hitBoss(dmg){
  const B = state.B;
  dmg = Math.max(1, Math.round(dmg));
  B.hp = Math.max(0, B.hp - dmg);
  floatText(el('enemyCard'), '-' + dmg, 'dmg');
  shake(el('enemyCard'));
  sfx('hit');
  log('El examen pierde ' + dmg + ' de vida.');
  checkPhase();
  updateUI();
}

function healPlayer(n, msg){
  const P = state.P;
  P.hp = Math.min(P.maxHp, P.hp + n);
  floatText(el('playerCard'), '+' + n, 'good');
  sfx('perfect');
  log(msg, 'good');
  updateUI();
}

function checkPhase(){
  const B = state.B;
  if(B.phase === 1 && B.hp <= B.maxHp * 0.6){
    B.phase = 2;
    log('📄 El examen pasa a la SEGUNDA PARTE: problemas.', 'warn');
    shake(el('enemyCard'));
  } else if(B.phase === 2 && B.hp <= B.maxHp * 0.3){
    B.phase = 3;
    el('enemyCard').classList.add('phase3');
    log('🔥 TERCERA PARTE: recuperación. El tribunal está furioso.', 'warn');
    shake(el('enemyCard'));
  }
}

const ATTACKS = {
  test:  {name:'PREGUNTA TIPO TEST', dmg:4, zone:[52, 80], speed:950},
  doble: {name:'HOJA A DOBLE CARA', dmg:2, hits:2, zone:[50, 78], speed:780},
  tiempo:{name:'SE ACABÓ EL TIEMPO', dmg:6, zone:[48, 74], speed:900},
  sueno: {name:'EFECTO SOMNÍFERO', dmg:0, sleep:true, zone:[52, 82], speed:1000}
};

function resolveGuard(quality, atk){
  const P = state.P, B = state.B;
  if(atk.sleep){
    if(quality === 'perfect'){
      log('Resistes la somnolencia. Bien hecho.', 'good');
      P.star = Math.min(100, P.star + 10);
    } else {
      P.drowsy = 3;
      log('😴 Te entra sueño: tu zona de ataque se reduce.', 'warn');
    }
    return;
  }
  const base = atk.dmg + (B.phase === 3 ? 1 : 0);
  if(quality === 'perfect'){
    P.star = Math.min(100, P.star + 22);
    floatText(el('playerCard'), '¡BLOQUEO!', 'good');
    log('¡Bloqueo perfecto! +22 de concentración.', 'good');
    return;
  }
  const dmg = quality === 'good' ? Math.ceil(base / 2) : base;
  P.hp = Math.max(0, P.hp - dmg);
  if(quality === 'good') P.star = Math.min(100, P.star + 8);
  floatText(el('playerCard'), '-' + dmg, 'dmg');
  shake(el('playerCard'));
  sfx('hit');
  log('Recibes ' + dmg + ' de daño.');
}

async function bossTurn(){
  const P = state.P, B = state.B;
  const pool = B.phase === 1 ? ['test', 'doble']
             : B.phase === 2 ? ['test', 'doble', 'tiempo', 'sueno']
             : ['tiempo', 'doble', 'test', 'sueno'];
  const key = pool[Math.floor(Math.random() * pool.length)];
  const atk = ATTACKS[key];

  el('hint').textContent = 'Turno del examen...';
  el('enemyCard').classList.add('windup');
  log('⚠️ ' + atk.name, 'warn');
  await sleep(650);
  el('enemyCard').classList.remove('windup');

  const hits = atk.hits || 1;
  for(let i = 0; i < hits; i++){
    const a = P.wideGuard ? 40 : 52;
    const b = P.wideGuard ? 90 : 80;
    const quality = await qte({
      title: hits > 1 ? '¡BLOQUEA! (' + (i + 1) + '/' + hits + ')' : '¡BLOQUEA!',
      hint: atk.name,
      a, b,
      speed: atk.speed,
      kind: 'guard'
    });
    resolveGuard(quality, atk);
    updateUI();
    if(P.hp <= 0) break;
    await sleep(280);
  }
}

async function runCommand(cmd){
  const P = state.P, B = state.B;

  if(cmd === 'attack'){
    const drowsy = P.drowsy > 0;
    const quality = await qte({
      title: '¡BOLÍGRAFO!',
      hint: drowsy ? '😴 Somnoliento: la zona es más estrecha' : 'Pulsa en la zona verde',
      a: drowsy ? 46 : 38,
      b: drowsy ? 60 : 62,
      speed: 1050
    });
    let dmg = quality === 'perfect' ? 8 : quality === 'good' ? 5 : 1;
    if(drowsy) dmg = Math.max(1, dmg - 2);
    if(B.marked > 0) dmg += 2;
    if(quality === 'perfect'){
      P.star = Math.min(100, P.star + 10);
      log('¡Golpe perfecto! +10 de concentración.', 'good');
    }
    if(quality === 'miss') log('El bolígrafo resbala...', 'dim');
    hitBoss(dmg);
  }

  else if(cmd === 'mark'){
    P.fp -= 2;
    B.marked = 3;
    log('Subrayas la idea principal: +2 de daño en tus golpes.', 'good');
    floatText(el('enemyCard'), 'SUBRAYADO', 'good');
    hitBoss(5);
  }

  else if(cmd === 'focus'){
    P.fp -= 3;
    P.wideGuard = true;
    healPlayer(5, '📐 Esquema mental: +5 de vida y guardia más amplia.');
  }

  else if(cmd === 'cafe'){
    P.cafe -= 1;
    healPlayer(7, '☕ Café: +7 de vida. El pulso vuelve.');
  }

  else if(cmd === 'star'){
    P.star = 0;
    log('⚡ REPASO RELÁMPAGO: repasas el temario entero en un instante.', 'good');
    shake(el('enemyCard'));
    hitBoss(12);
  }

  else if(cmd === 'flee'){
    log('Intentas huir... el tribunal bloquea la puerta. Pierdes el turno.', 'warn');
    shake(el('playerCard'));
  }

  updateUI();
}

function checkEnd(){
  if(state.over) return true;
  if(state.B.hp <= 0){ endGame(true); return true; }
  if(state.P.hp <= 0){ endGame(false); return true; }
  return false;
}

async function doTurn(cmd){
  if(state.busy || state.over) return;
  state.busy = true;
  state.turns += 1;
  refreshButtons();

  await runCommand(cmd);
  updateUI();
  if(checkEnd()) return;

  await sleep(450);
  await bossTurn();
  updateUI();
  if(checkEnd()) return;

  const P = state.P;
  P.fp = Math.min(P.maxFp, P.fp + 1);
  if(P.drowsy > 0) P.drowsy -= 1;
  P.wideGuard = false;
  if(state.B.marked > 0) state.B.marked -= 1;

  state.busy = false;
  refreshButtons();
  updateUI();
  log('— Tu turno —', 'dim');
}

/* ---------- fin de partida ---------- */
function endGame(win){
  state.over = true;
  state.busy = true;
  refreshButtons();

  const P = state.P;
  const ratio = P.hp / P.maxHp;
  const nota = !win ? 'SUSPENSO'
             : ratio > 0.75 ? 'MATRÍCULA DE HONOR'
             : ratio > 0.55 ? 'SOBRESALIENTE'
             : ratio > 0.3  ? 'NOTABLE'
             : 'APROBADO';

  el('ovTitle').textContent = win ? '¡APROBADO!' : 'SUSPENSO';
  el('ovText').textContent = win
    ? 'Nota final: ' + nota + '. Has aguantado ' + state.turns + ' turnos con ' + Math.max(0, P.hp) + ' de vida restante.'
    : 'El examen te ha derrotado en el turno ' + state.turns + '. Nos vemos en la convocatoria de septiembre.';
  el('ovRules').innerHTML = win
    ? '📄 El tribunal firma el acta.<br>🎓 <b>' + nota + '</b><br>❤️ Vida restante: ' + Math.max(0, P.hp) + '/' + P.maxHp
    : '💀 Vida: 0/' + P.maxHp + '<br>📚 Consejo: bloquea para cargar el ⚡ Repaso y subraya antes de atacar.';
  el('ovBtn').textContent = win ? 'Jugar otra vez' : 'Reintentar';
  sfx(win ? 'win' : 'bad');
  el('overlay').classList.remove('hidden');
}

/* ---------- arranque ---------- */
function startBattle(){
  state.P = {hp:26, maxHp:26, fp:9, maxFp:9, cafe:2, star:0, drowsy:0, wideGuard:false};
  state.B = {hp:52, maxHp:52, phase:1, marked:0};
  state.busy = false;
  state.over = false;
  state.turns = 0;

  el('log').innerHTML = '';
  el('enemyCard').classList.remove('phase3', 'windup');
  el('overlay').classList.add('hidden');

  log('📄 El tribunal te mira. Comienza el examen.', 'dim');
  updateUI();
  refreshButtons();
}

el('commands').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b || b.disabled) return;
  b.blur();
  doTurn(b.dataset.cmd);
});

el('ovBtn').addEventListener('click', () => {
  startBattle();
});

el('soundBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  el('soundBtn').textContent = state.sound ? '🔊 sonido' : '🔇 silencio';
});

window.addEventListener('keydown', e => {
  if(e.code === 'Enter' && !el('overlay').classList.contains('hidden')){
    e.preventDefault();
    startBattle();
  }
});

updateUI();
refreshButtons();
