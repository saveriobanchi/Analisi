/* ============================================================
   quiz: domande, registrazione risposte, zaino (Leitner), quota, timbri
   ============================================================ */
const SRS_DAYS = [0, 1, 3, 7, 16];
const RANKS = [[0, 'Matricola'], [600, 'Escursionista'], [1600, 'Alpinista'], [3300, 'Guida alpina'], [6000, 'Accademico del CAI']];
const rankOf = xp => { let r = RANKS[0]; for (const k of RANKS) if (xp >= k[0]) r = k; const i = RANKS.indexOf(r); return { name: r[1], from: r[0], to: (RANKS[i + 1] || [r[0] * 2])[0], next: (RANKS[i + 1] || [0, '—'])[1] }; };

function addXP(n) { S.xp = Math.max(0, (S.xp || 0) + Math.round(n)); save(); refreshChrome(); }
function touchStreak() {
  const t = dayNum(), st = S.streak;
  if (st.last === t) return;
  st.n = st.last === t - 1 ? st.n + 1 : 1; st.last = t; st.best = Math.max(st.best || 0, st.n);
  if (st.n >= 7) award('streak7');
}
function record(q, ok, ctx = 'practice') {
  S.log.push({ q: q.id, c: q.ch, ok: !!ok, t: Date.now(), x: ctx });
  if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
  const it = S.srs[q.id];
  if (!ok) S.srs[q.id] = { box: 0, due: dayNum(), wrong: (it?.wrong || 0) + 1 };
  else if (it) { it.box++; if (it.box >= SRS_DAYS.length) delete S.srs[q.id]; else it.due = dayNum() + SRS_DAYS[it.box]; }
  touchStreak();
  const n = S.log.length; if (n >= 100) award('a100'); if (n >= 500) award('a500');
  save();
}
const dueItems = () => Object.entries(S.srs).filter(([id, it]) => Q[id] && it.due <= dayNum()).map(([id]) => Q[id]);
function mastery(ch) {
  const ans = S.log.filter(e => e.c === ch).slice(-25);
  if (ans.length < 4) return null;
  return ans.filter(e => e.ok).length / ans.length;
}
function predicted() {
  let wsum = 0, acc = 0, have = 0;
  for (const c of CH) { const m = mastery(c.n); wsum += c.weight; if (m !== null) { acc += m * c.weight; have += c.weight; } }
  if (have < wsum * 0.25) return null;
  const covered = have / wsum, p = (acc / have) * covered + 0.25 * (1 - covered);
  return clamp(Math.round(6 * (3 * p - 1) + 7 * (4 * p - 1)), 0, 33);
}

/* ---------------- timbri (achievement) ---------------- */
const STAMPS = () => [
  ...CH.map(c => ({ id: 'rif' + c.n, name: c.place, sub: c.alt + ' m', ico: 'tent', desc: `Tutte le lezioni del capitolo ${c.n} con almeno una stella` })),
  ...CH.map(c => ({ id: 'par' + c.n, name: 'Parete ' + c.n, sub: 'superata', ico: 'mountains', desc: `Parete d'esame del capitolo ${c.n} con almeno il 60%` })),
  { id: 'vetta', name: 'Cima Esame', sub: '≥ 16/33', ico: 'flag-pennant', desc: 'Simulazione d’esame sopra la soglia' },
  { id: 'lode', name: 'Cum laude', sub: '≥ 30/33', ico: 'trophy', desc: 'Simulazione d’esame con almeno 30 punti' },
  { id: 'sprint15', name: 'Discesa libera', sub: '15 in 60 s', ico: 'lightning', desc: 'Sprint con punteggio 15 o più' },
  { id: 'streak7', name: 'Cordata', sub: '7 giorni', ico: 'fire', desc: 'Sette giorni di fila' },
  { id: 'zaino', name: 'Zaino leggero', sub: 'ripasso', ico: 'backpack', desc: 'Ripasso completato senza errori' },
  { id: 'teoria', name: 'Diario di vetta', sub: 'teoria', ico: 'notebook', desc: 'Dieci domande di teoria autovalutate' },
  { id: 'a100', name: 'Cento passi', sub: '100 risposte', ico: 'path', desc: '100 risposte date' },
  { id: 'a500', name: 'Mille metri', sub: '500 risposte', ico: 'compass', desc: '500 risposte date' }
];
function stampSVG(st, date, color = '#D7261E') {
  const id = 'sp' + st.id;
  const top = esc(st.name.toUpperCase()), bot = esc((st.sub || '').toUpperCase());
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Timbro ${esc(st.name)}">
    <defs><path id="${id}t" d="M18 60 A42 42 0 0 1 102 60"/><path id="${id}b" d="M14 60 A46 46 0 0 0 106 60"/>
      <filter id="${id}r"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${st.id.length * 7}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.35"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
    <g filter="url(#${id}r)" fill="none" stroke="${color}">
      <circle cx="60" cy="60" r="56" stroke-width="3.5"/><circle cx="60" cy="60" r="48" stroke-width="1.2"/><circle cx="60" cy="60" r="27" stroke-width="1.5"/>
      <text fill="${color}" stroke="none" font-family="Barlow Condensed" font-weight="700" font-size="11.5" letter-spacing="1.5"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${top}</textPath></text>
      <text fill="${color}" stroke="none" font-family="JetBrains Mono" font-weight="600" font-size="9" letter-spacing="1"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${bot}${date ? ' · ' + date : ''}</textPath></text>
      <g transform="translate(44 44) scale(.125)" fill="${color}" stroke="none"><use href="#i-${st.ico}" width="256" height="256"/></g>
    </g></svg>`;
}
function award(id) {
  if (S.stamps[id]) return false;
  const st = STAMPS().find(s => s.id === id); if (!st) return false;
  S.stamps[id] = Date.now(); save();
  setTimeout(() => {
    const fx = $('#stampFx'); fx.innerHTML = stampSVG(st, new Date().toLocaleDateString('it-IT')); fx.hidden = false; SFX.stamp();
    setTimeout(() => { fx.hidden = true; fx.innerHTML = ''; }, 1500);
    toast(`Nuovo timbro nel libretto: <b>${esc(st.name)}</b>`, { icon: 'stamp' });
  }, 350);
  return true;
}
function checkChapterStamps(n) {
  const c = chapter(n); if (!c) return;
  if (c.lessons.length && c.lessons.every(l => (S.lessons[l.key]?.stars || 0) > 0)) award('rif' + n);
}

/* ---------------- rendering di una domanda ---------------- */
function qTypeLabel(q) { return q.k === 'vf' ? 'Vero / Falso · +2 −1' : 'Risposta multipla · +3 −1'; }
function renderQuestion(q, { selected = null, locked = false, showKeys = true } = {}) {
  let opts = '';
  if (q.k === 'vf') {
    opts = `<div class="opts vf" role="group" aria-label="Vero o falso">
      ${[[true, 'Vero', 'V'], [false, 'Falso', 'F']].map(([v, t, k]) => `<button type="button" class="opt" data-v="${v}" aria-pressed="${selected === v}" ${locked ? 'disabled' : ''}><span class="k">${k}</span><span>${t}</span></button>`).join('')}</div>`;
  } else {
    opts = `<div class="opts" role="group" aria-label="Opzioni">${q.O.map((o, i) => `<button type="button" class="opt" data-v="${i}" aria-pressed="${selected === i}" ${locked ? 'disabled' : ''}><span class="k">${i + 1}</span><span>${inline(o)}</span></button>`).join('')}</div>`;
  }
  const chp = chapter(q.ch);
  return `<div class="qmeta"><span class="chip ${q.k === 'vf' ? 'blue' : 'amber'}">${qTypeLabel(q)}</span>
      ${q.real ? `<span class="chip red">${icon('seal-check')} Prova reale · ${esc(q.S)}</span>` : ''}
      <span class="chip">Cap. ${q.ch} · ${esc(chp ? chp.short : '')}</span></div>
    <div class="qtext prose">${md(q.Q)}</div>${opts}`;
}
function isRight(q, v) { return q.k === 'vf' ? v === q.ans : v === q.ans; }
function answerText(q) { return q.k === 'vf' ? (q.ans ? 'Vero' : 'Falso') : `${q.ans + 1}. ${q.O[q.ans]}`; }
function feedbackHTML(q, ok, skipped = false) {
  return `<div class="feedback ${ok ? 'ok' : 'ko'}"><div class="fh">${icon(ok ? 'check-circle' : 'x-circle')}${skipped ? 'Non risposta · 0 punti' : ok ? 'Giusta' : 'Sbagliata'}<span class="muted small" style="font-weight:500;margin-left:auto">Risposta: ${inline(answerText(q))}</span></div>
    <div class="prose">${md(q.W)}</div></div>`;
}
function bindOptions(root, q, onPick) {
  $$('.opt', root).forEach(b => b.addEventListener('click', () => {
    const v = q.k === 'vf' ? b.dataset.v === 'true' : parseInt(b.dataset.v, 10);
    $$('.opt', root).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onPick(v);
  }));
}
function markOptions(root, q, picked) {
  $$('.opt', root).forEach(b => {
    const v = q.k === 'vf' ? b.dataset.v === 'true' : parseInt(b.dataset.v, 10);
    b.disabled = true; if (v === q.ans) b.classList.add('right'); else if (v === picked) b.classList.add('wrong');
  });
}

/* ---------------- sessione di allenamento (lezione, parete, ripasso) ---------------- */
let activeKeyHandler = null;
function setKeys(fn) { if (activeKeyHandler) document.removeEventListener('keydown', activeKeyHandler); activeKeyHandler = fn; if (fn) document.addEventListener('keydown', fn); }

function runQuiz(host, { items, title = 'Prova', mode = 'practice', onDone, allowSkip = false }) {
  const st = { i: 0, res: items.map(() => null), picked: null, confirmed: false };
  const points = () => st.res.reduce((s, r, i) => s + (r === null || r.skip ? 0 : r.ok ? (items[i].k === 'vf' ? 2 : 3) : -1), 0);
  const draw = () => {
    const q = items[st.i];
    host.innerHTML = `<div class="quiz">
      <div class="qhead"><span class="sign">${esc(title)}</span><span class="mono small muted">${st.i + 1} / ${items.length}</span>
        <div class="qprog" aria-hidden="true">${items.map((_, i) => `<i class="${st.res[i] ? (st.res[i].skip ? 'skip' : st.res[i].ok ? 'ok' : 'ko') : i === st.i ? 'cur' : ''}" style="flex:1"></i>`).join('')}</div>
        ${mode === 'boss' ? `<span class="chip amber mono">${points()} pt</span>` : ''}</div>
      <div class="qcard" id="qcard">${renderQuestion(q)}<div id="fb"></div>
        <div class="qactions">${allowSkip ? `<button type="button" class="btn ghost small grow" id="skip">Salta (0 pt)</button>` : '<span class="grow kbd-help">Tasti: ' + (q.k === 'vf' ? 'V / F' : '1–4') + ' · Invio</span>'}
          <button type="button" class="btn primary" id="go" disabled>Conferma <kbd>Invio</kbd></button></div></div></div>`;
    st.picked = null; st.confirmed = false;
    const card = $('#qcard', host), go = $('#go', host);
    bindOptions(card, q, v => { if (st.confirmed) return; st.picked = v; go.disabled = false; });
    go.onclick = () => st.confirmed ? next() : confirm();
    const sk = $('#skip', host); if (sk) sk.onclick = () => { st.res[st.i] = { skip: true, ok: false }; $('#fb', host).innerHTML = feedbackHTML(q, false, true); markOptions(card, q, null); finishStep(); };
    typeset(host);
  };
  const confirm = () => {
    if (st.picked === null) return;
    const q = items[st.i], ok = isRight(q, st.picked);
    st.res[st.i] = { ok, picked: st.picked }; record(q, ok, mode);
    addXP(ok ? (mode === 'boss' ? 15 : 10) : 2);
    ok ? SFX.ok() : SFX.ko();
    markOptions($('#qcard', host), q, st.picked);
    $('#fb', host).innerHTML = feedbackHTML(q, ok); typeset($('#fb', host));
    finishStep();
  };
  const finishStep = () => {
    st.confirmed = true; const go = $('#go', host); go.disabled = false;
    go.innerHTML = (st.i < items.length - 1 ? 'Avanti ' : 'Vedi risultato ') + icon('arrow-right');
    const sk = $('#skip', host); if (sk) sk.remove();
    $$('.qprog i', host).forEach((el, i) => { const r = st.res[i]; el.className = r ? (r.skip ? 'skip' : r.ok ? 'ok' : 'ko') : i === st.i ? 'cur' : ''; });
    go.focus();
  };
  const next = () => { if (st.i < items.length - 1) { st.i++; draw(); window.scrollTo({ top: host.offsetTop - 80, behavior: 'smooth' }); } else finish(); };
  const finish = () => {
    setKeys(null);
    const right = st.res.filter(r => r && r.ok).length, frac = right / items.length;
    onDone && onDone({ right, total: items.length, frac, points: points(), res: st.res, items });
  };
  setKeys(e => {
    if (e.target.closest('input,textarea,select')) return;
    const q = items[st.i]; const k = e.key.toLowerCase();
    if (!st.confirmed) {
      let btn = null;
      if (q.k === 'vf' && (k === 'v' || k === 'f')) btn = $(`.opt[data-v="${k === 'v'}"]`, host);
      if (q.k === 'mc' && /^[1-4]$/.test(k)) btn = $(`.opt[data-v="${+k - 1}"]`, host);
      if (btn) { btn.click(); e.preventDefault(); }
    }
    if (e.key === 'Enter' && !e.target.closest('button')) { $('#go', host)?.click(); e.preventDefault(); }
  });
  draw();
}
function starsHTML(n, max = 3) { return `<span class="stars" aria-label="${n} stelle su ${max}">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>`; }
const starsFor = f => f >= 1 ? 3 : f >= .75 ? 2 : f >= .5 ? 1 : 0;
function reviewHTML(items, res) {
  return `<div class="review">${items.map((q, i) => {
    const r = res[i] || { skip: true }, cls = r.skip ? 'skip' : r.ok ? 'ok' : 'ko';
    return `<div class="rv ${cls}"><span class="m">${i + 1}</span><details ${r.ok ? '' : 'open'}><summary>${inline(clip(q.Q, 160))}</summary>
      <div>${renderQuestion(q, { locked: true }).replace(/<div class="opts[\s\S]*$/, '')}${feedbackHTML(q, r.ok, r.skip)}</div></details></div>`;
  }).join('')}</div>`;
}
