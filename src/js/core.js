/* ============================================================
   Monte Analisi · core: utilità, stato, parser dei contenuti, markup, MathJax, suoni
   ============================================================ */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const DAY = 86400000;
const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY);
const fmt = (x, d = 2) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(d).replace('-', '−');

/* ---------------- stato persistente ---------------- */
const STORE_KEY = 'monte-analisi-v1';
const DEFAULT_STATE = () => ({
  v: 1, xp: 0, lessons: {}, studied: {}, bosses: {}, srs: {}, log: [], sims: [], sprintBest: 0,
  streak: { last: null, n: 0, best: 0 }, stamps: {}, theory: {},
  settings: { theme: 'system', sound: true, unlockAll: false, timer: 45 }, lastRoute: null
});
let S = DEFAULT_STATE();
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) S = Object.assign(DEFAULT_STATE(), JSON.parse(raw));
    S.settings = Object.assign(DEFAULT_STATE().settings, S.settings || {});
  } catch (e) { S = DEFAULT_STATE(); }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }, 120);
}
function resetState() { S = DEFAULT_STATE(); try { localStorage.removeItem(STORE_KEY); } catch (e) { } }

/* ---------------- contenuti: parser del formato .txt ---------------- */
const CH = [];          // capitoli
const Q = {};           // indice di tutte le domande per id
function parseChapter(txt) {
  const ch = { lessons: [], bank: [], theory: [], sheet: [], n: 0 };
  let mode = 'chapter', lesson = null, block = null, list = null, q = null, lastKey = null, metaKey = null;
  const lines = txt.replace(/\r/g, '').split('\n');
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^#chapter\b/.test(line)) { ch.n = parseInt(line.split(/\s+/)[1], 10); mode = 'chapter'; continue; }
    if (/^#lesson\b/.test(line)) {
      const m = line.match(/^#lesson\s+(\S+)\s+(.*)$/);
      lesson = { id: m[1], title: m[2].trim(), goal: '', blocks: [], quiz: [] };
      ch.lessons.push(lesson); mode = 'lesson'; block = null; continue;
    }
    if (/^#quiz\b/.test(line)) { mode = 'q'; list = lesson.quiz; q = null; continue; }
    if (/^#bank\b/.test(line)) { mode = 'q'; list = ch.bank; q = null; continue; }
    if (/^#theory\b/.test(line)) { mode = 'q'; list = ch.theory; q = null; continue; }
    if (/^#sheet\b/.test(line)) { mode = 'sheet'; continue; }
    if (mode === 'chapter') {
      const m = line.match(/^([a-z]+):\s?(.*)$/);
      if (m) { metaKey = m[1]; ch[metaKey] = m[2]; } else if (metaKey && line.trim()) ch[metaKey] += '\n' + line;
      continue;
    }
    if (mode === 'lesson') {
      if (!block && /^goal:/.test(line)) { lesson.goal = line.slice(5).trim(); continue; }
      if (line.startsWith('::')) {
        const m = line.slice(2).match(/^(\w+)\s*(.*)$/);
        block = { t: m[1], head: m[2] || '', lines: [] };
        if (block.t === 'example') {
          const mm = block.head.match(/^(base|medio|esame)\b\s*(.*)$/);
          if (mm) { block.lvl = mm[1]; block.head = mm[2]; }
        }
        lesson.blocks.push(block); continue;
      }
      if (block) block.lines.push(line);
      continue;
    }
    if (mode === 'q') {
      if (/^\?\w+/.test(line)) {
        q = { k: line.slice(1).trim(), Q: '', O: [], A: '', W: '', S: '', K: [] };
        list.push(q); lastKey = null; continue;
      }
      if (!q) continue;
      const m = line.match(/^([QOAWSK]):\s?(.*)$/);
      if (m) {
        lastKey = m[1];
        if (lastKey === 'O' || lastKey === 'K') q[lastKey].push(m[2]); else q[lastKey] = m[2];
      } else if (lastKey) {
        if (lastKey === 'O' || lastKey === 'K') { const arr = q[lastKey]; arr[arr.length - 1] += '\n' + line; }
        else q[lastKey] += '\n' + line;
      }
      continue;
    }
    if (mode === 'sheet' && line.trim()) ch.sheet.push(line.split(' ¦ ').map(s => s.trim()));
  }
  return ch;
}
function loadContent() {
  $$('script.chapter-src').forEach(s => CH.push(parseChapter(s.textContent)));
  CH.sort((a, b) => a.n - b.n);
  for (const ch of CH) {
    ch.alt = parseInt(ch.alt || '0', 10);
    ch.weight = parseFloat(ch.weight || '1');
    ch.lessons.forEach((l, i) => {
      l.ch = ch.n; l.idx = i + 1; l.key = ch.n + '.' + (i + 1);
      l.quiz.forEach((q, j) => reg(q, 'L' + l.key + '#' + (j + 1), ch.n, 'lesson', l.key));
    });
    ch.bank.forEach((q, j) => reg(q, 'B' + ch.n + '#' + (j + 1), ch.n, 'bank'));
    ch.theory.forEach((q, j) => reg(q, 'T' + ch.n + '#' + (j + 1), ch.n, 'theory'));
  }
}
function reg(q, id, ch, origin, lesson) {
  q.id = id; q.ch = ch; q.origin = origin; q.lesson = lesson || null;
  if (q.k === 'vf') q.ans = /^v/i.test(q.A.trim());
  if (q.k === 'mc') q.ans = parseInt(q.A, 10) - 1;
  q.real = !!q.S;
  Q[id] = q;
}
const chapter = n => CH.find(c => c.n === +n);
const allQuestions = (filter = () => true) => Object.values(Q).filter(q => q.k !== 'th' && filter(q));

/* ---------------- markup: markdown minimale + matematica ---------------- */
function inline(s) {
  const parts = String(s).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/);
  return parts.map((p, i) => {
    if (i % 2) return esc(p);
    let h = esc(p);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return h;
  }).join('');
}
function md(text) {
  if (!text) return '';
  const chunks = String(text).trim().split(/\n\s*\n/);
  return chunks.map(ch => {
    const lines = ch.split('\n');
    if (lines.every(l => /^\s*-\s/.test(l) || /^\s{2,}\S/.test(l))) {
      const items = []; lines.forEach(l => { if (/^\s*-\s/.test(l)) items.push(l.replace(/^\s*-\s/, '')); else items[items.length - 1] += ' ' + l.trim(); });
      return '<ul>' + items.map(i => '<li>' + inline(i) + '</li>').join('') + '</ul>';
    }
    if (lines.every(l => /^\s*\d+\.\s/.test(l) || /^\s{2,}\S/.test(l))) {
      const items = []; lines.forEach(l => { if (/^\s*\d+\.\s/.test(l)) items.push(l.replace(/^\s*\d+\.\s/, '')); else items[items.length - 1] += ' ' + l.trim(); });
      return '<ol>' + items.map(i => '<li>' + inline(i) + '</li>').join('') + '</ol>';
    }
    return '<p>' + inline(lines.join('\n')) + '</p>';
  }).join('');
}

/* ---------------- MathJax ---------------- */
let mjReady = false; const mjQueue = [];
window.__mjReady = () => { mjReady = true; mjQueue.splice(0).forEach(el => typeset(el)); };
function typeset(el) {
  if (!el) return Promise.resolve();
  if (!mjReady || !window.MathJax || !MathJax.typesetPromise) { if (!mjQueue.includes(el)) mjQueue.push(el); return Promise.resolve(); }
  return MathJax.typesetPromise([el]).catch(err => console.warn('MathJax', err));
}

/* ---------------- suoni sintetizzati (nessun file esterno) ---------------- */
let AC = null;
function tone(seq) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime + 0.01;
    seq.forEach(([f, d, at = 0, type = 'sine', vol = 0.07]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + d);
      o.start(t0 + at); o.stop(t0 + at + d + 0.02);
    });
  } catch (e) { }
}
const SFX = {
  ok: () => tone([[660, .12], [990, .18, .08]]),
  ko: () => tone([[180, .22, 0, 'triangle', .09], [140, .25, .06, 'triangle', .07]]),
  stamp: () => tone([[90, .25, 0, 'square', .05], [60, .3, .02, 'sine', .12]]),
  tick: () => tone([[1200, .03, 0, 'square', .02]]),
  fanfare: () => tone([[523, .14], [659, .14, .12], [784, .16, .24], [1046, .4, .38]])
};

/* ---------------- toast, sheet ---------------- */
function toast(msg, opts = {}) {
  const box = $('#toasts'); const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = icon(opts.icon || 'info') + '<span>' + msg + '</span>' + (opts.action ? `<button type="button">${esc(opts.action)}</button>` : '');
  box.appendChild(t);
  if (opts.action) t.querySelector('button').onclick = () => { opts.onAction && opts.onAction(); t.remove(); };
  setTimeout(() => t.remove(), opts.ms || 3200);
  typeset(t);
}
function openSheet(html, onMount) {
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true">${html}</div>`;
  sh.hidden = false;
  const close = () => { sh.hidden = true; sh.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  sh.onclick = e => { if (e.target === sh || e.target.closest('[data-close]')) close(); };
  onMount && onMount(sh.firstElementChild, close);
  typeset(sh);
  const f = sh.querySelector('button,a,[tabindex]'); f && f.focus();
  return close;
}

/* ---------------- tema ---------------- */
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
const isDark = () => {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
};
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
