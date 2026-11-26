/* ============================================================
   labs: esperimenti interattivi (pagina intera o dentro una lezione)
   ============================================================ */
let LAB_UID = 0;
function labLayout(host, ctlHTML, { hint = '', compact = false } = {}) {
  host.innerHTML = `<div class="lab ${compact ? 'compact' : ''}"><div class="stage"><canvas></canvas><div class="readout"></div><div class="hint">${hint}</div></div><div class="controls">${ctlHTML}</div></div>`;
  const stage = $('.stage', host);
  const L = { cv: $('canvas', host), ro: $('.readout', host), ctl: $('.controls', host), redraw: null };
  const obs = new ResizeObserver(() => { if (!host.isConnected) { obs.disconnect(); return; } L.redraw && L.redraw(); });
  obs.observe(stage);
  return L;
}
const uid = () => 'lb' + (++LAB_UID);
const ctlRange = (id, label, min, max, step, val) => `<div class="ctl"><label for="${id}">${label}<output id="${id}o">${val}</output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
const ctlSelect = (id, label, opts, val) => `<div class="ctl"><label for="${id}">${label}</label><select id="${id}">${opts.map(([k, t]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
function bindRange(id, fn, fmtv = v => v) { const el = document.getElementById(id), o = document.getElementById(id + 'o'); el.oninput = () => { o.textContent = fmtv(+el.value); fn(+el.value); }; o.textContent = fmtv(+el.value); return el; }
function thumbSurface(cv, f, opts = {}) { const s = new Surface3D(cv, Object.assign({ n: 25, axes: false }, opts)); s.setF(f); s.render(); }

/* ---------- funzioni d'esame per i limiti ---------- */
const LIMFUN = {
  xy: { t: 'xy / (x² + y²)', f: (x, y) => x * y / (x * x + y * y), note: 'Gradi 2 contro 2: lungo y = mx vale m/(1+m²), dipende da m. Il limite non esiste.' },
  parab: { t: 'x²y / (x⁴ + y²)', f: (x, y) => x * x * y / (x ** 4 + y * y), note: 'Tutte le rette danno 0, ma lungo y = kx² vale k/(1+k²): il limite non esiste.' },
  cubo: { t: 'x³ / (x² + y²)', f: (x, y) => x ** 3 / (x * x + y * y), note: '|f| ≤ |x| → 0: il limite esiste e vale 0, lungo qualunque curva.' },
  diff: { t: '(x² − y²) / (x² + y²)', f: (x, y) => (x * x - y * y) / (x * x + y * y), note: 'Su y = mx vale (1−m²)/(1+m²): 1 sull\'asse x, 0 sulla bisettrice. Non esiste.' },
  quart: { t: 'x²y² / (x² + y²)', f: (x, y) => x * x * y * y / (x * x + y * y), note: '|f| ≤ r²/4: tende a 0, ed è anche differenziabile in (0,0).' },
  radice: { t: '√|xy|', f: (x, y) => Math.sqrt(Math.abs(x * y)), note: 'Continua, derivate parziali nulle, ma il resto lungo h = k vale 1/√2 e non tende a 0: derivabile, non differenziabile.' },
  dir: { t: 'x²y / (x² + y²)', f: (x, y) => x * x * y / (x * x + y * y), note: 'Continua, tutte le derivate direzionali esistono, ma non è differenziabile: la superficie ha pieghe che non spariscono.' },
  sella: { t: 'x² − y²', f: (x, y) => x * x - y * y, note: 'Punto di sella nell\'origine: gradiente nullo, ma né massimo né minimo.' },
  colle: { t: '4 − x² − 2y²', f: (x, y) => 4 - x * x - 2 * y * y, note: 'Massimo nell\'origine; le curve di livello sono ellissi.' }
};
const LABS = {};

LABS.superfici = {
  ch: 1, title: 'Limiti lungo i percorsi', desc: 'Superficie 3D di una funzione d\'esame: scegli una retta o una parabola verso l\'origine e guarda il valore a cui tende.',
  thumb: cv => thumbSurface(cv, LIMFUN.xy.f, { range: 1.2 }),
  page(host, p = {}, compact = false) {
    const u = uid(), fk = p.f || 'parab';
    const L = labLayout(host, ctlSelect(u + 'f', 'Funzione', Object.entries(LIMFUN).map(([k, v]) => [k, v.t]), fk)
      + ctlSelect(u + 'p', 'Percorso verso (0,0)', [['line', 'retta y = m x'], ['parab', 'parabola y = k x²'], ['none', 'nessuno']], p.path || 'line')
      + ctlRange(u + 'm', 'Pendenza m o k', -3, 3, .05, 1)
      + `<canvas class="chart" id="${u}g" style="height:150px;border:1.5px solid var(--ink);border-radius:4px;background:#0B151C"></canvas><div class="verdict" id="${u}v"></div>`,
      { hint: 'trascina per ruotare', compact });
    const surf = new Surface3D(L.cv, { range: 1.2, n: 41 });
    const g = document.getElementById(u + 'g');
    const st = { f: fk, path: p.path || 'line', m: 1 };
    const pathPt = t => st.path === 'line' ? [t, st.m * t] : [t, st.m * t * t];
    L.redraw = () => {
      const F = LIMFUN[st.f]; surf.setF(F.f, { zclip: null });
      surf.paths = [];
      if (st.path !== 'none') { const pts = []; for (let k = -120; k <= 120; k++) { const t = k / 100 * 1.2; if (Math.abs(t) < 1e-3) continue; const [x, y] = pathPt(t); pts.push([x, y, F.f(x, y)]); } surf.paths.push({ pts, color: '#F4F6F2', width: 3 }); }
      surf.render();
      const pl = new Plot2D(g, { xr: [-1, 1], yr: [-1.2, 1.2], equal: false }); pl.clear(); pl.grid(.5, false);
      let lim = null;
      if (st.path !== 'none') { pl.graph(t => { const [x, y] = pathPt(t); return Math.abs(t) < 1e-4 ? NaN : F.f(x, y); }, NIGHT.amber, 2.2); const [x, y] = pathPt(1e-5); lim = F.f(x, y); pl.dot(0, lim, 4, NIGHT.white, NIGHT.amber); }
      pl.ctx.fillStyle = NIGHT.text; pl.ctx.font = '11px "JetBrains Mono"'; pl.ctx.fillText('g(t) = f(percorso(t))', 6, 14);
      L.ro.innerHTML = `f(x,y) = ${F.t}<br>${st.path === 'none' ? '' : (st.path === 'line' ? 'y = ' + fmt(st.m) + ' x' : 'y = ' + fmt(st.m) + ' x²') + ' → <b>' + fmt(lim, 3) + '</b>'}`;
      document.getElementById(u + 'v').innerHTML = `<b>Cosa osservare</b><span class="small">${esc(F.note)}</span>`;
    };
    document.getElementById(u + 'f').onchange = e => { st.f = e.target.value; L.redraw(); };
    document.getElementById(u + 'p').onchange = e => { st.path = e.target.value; L.redraw(); };
    bindRange(u + 'm', v => { st.m = v; L.redraw(); }, v => fmt(v));
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.gradiente = {
  ch: 2, title: 'Gradiente e derivata direzionale', desc: 'Sposta il punto e ruota la direzione: la derivata direzionale è ∇f·v, massima lungo il gradiente e nulla lungo la curva di livello.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-2, 2], yr: [-1.5, 1.5] }); pl.clear(); pl.field((x, y) => x * x + 2 * y * y, { rampName: 'night', levels: 10 }); pl.arrow(1, .5, .6, .6, NIGHT.amber, 2.5); },
  page(host, p = {}, compact = false) {
    const u = uid();
    const FN = { ell: ['x² + 2y²', (x, y) => x * x + 2 * y * y, (x, y) => [2 * x, 4 * y]], sella: ['x² − y²', (x, y) => x * x - y * y, (x, y) => [2 * x, -2 * y]],
      onda: ['sin x · cos y', (x, y) => Math.sin(x) * Math.cos(y), (x, y) => [Math.cos(x) * Math.cos(y), -Math.sin(x) * Math.sin(y)]],
      gauss: ['x e^(−x²−y²)', (x, y) => x * Math.exp(-x * x - y * y), (x, y) => [(1 - 2 * x * x) * Math.exp(-x * x - y * y), -2 * x * y * Math.exp(-x * x - y * y)]] };
    const L = labLayout(host, ctlSelect(u + 'f', 'Funzione', Object.entries(FN).map(([k, v]) => [k, v[0]]), 'ell') + ctlRange(u + 'a', 'Direzione θ di v (gradi)', 0, 360, 1, 45)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'trascina il punto bianco', compact });
    const st = { f: 'ell', P: [1, .5], th: 45 };
    let pl;
    L.redraw = () => {
      pl = new Plot2D(L.cv, { xr: [-2.5, 2.5], yr: [-1.8, 1.8] }); pl.clear();
      const [, f, gr] = FN[st.f]; pl.field(f, { rampName: 'night', levels: 16 }); pl.grid(1);
      const [x0, y0] = st.P, g = gr(x0, y0), th = st.th * Math.PI / 180, v = [Math.cos(th), Math.sin(th)];
      // curva di livello per P
      const z0 = f(x0, y0), step = 4, nx = Math.ceil(pl.w / step) + 1, ny = Math.ceil(pl.h / step) + 1, Z = new Float64Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const [x, y] = pl.inv(i * step, j * step); Z[j * nx + i] = f(x, y); }
      pl.ctx.beginPath(); isoLines(Z, nx, ny, z0, (a, b, c, d) => { pl.ctx.moveTo(a * step, b * step); pl.ctx.lineTo(c * step, d * step); }); pl.ctx.strokeStyle = NIGHT.blue; pl.ctx.lineWidth = 2.2; pl.ctx.stroke();
      const gl = Math.hypot(g[0], g[1]) || 1, sc = .8 / Math.max(1, gl) ;
      pl.arrow(x0, y0, g[0] * sc, g[1] * sc, NIGHT.amber, 3, 10); pl.arrow(x0, y0, v[0] * .8, v[1] * .8, NIGHT.red, 3, 10);
      pl.dot(x0, y0, 7, NIGHT.white, NIGHT.bg);
      const dv = g[0] * v[0] + g[1] * v[1];
      L.ro.innerHTML = `P = (${fmt(x0)}, ${fmt(y0)})<br><span style="color:${NIGHT.amber}">∇f = (${fmt(g[0])}, ${fmt(g[1])})</span><br><span style="color:${NIGHT.red}">v = (${fmt(v[0])}, ${fmt(v[1])})</span><br>∂f/∂v = ∇f·v = <b>${fmt(dv)}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>|∇f| = ${fmt(gl)}</b><span class="small">È la derivata direzionale massima, nella direzione del gradiente (ambra). In blu la curva di livello per P: il gradiente le è ortogonale e lungo di essa la derivata è 0.</span>`;
    };
    document.getElementById(u + 'f').onchange = e => { st.f = e.target.value; L.redraw(); };
    bindRange(u + 'a', v => { st.th = v; L.redraw(); }, v => v + '°');
    let drag = false;
    const pick = e => { const r = L.cv.getBoundingClientRect(); st.P = pl.inv(e.clientX - r.left, e.clientY - r.top); L.redraw(); };
    L.cv.addEventListener('pointerdown', e => { drag = true; L.cv.setPointerCapture(e.pointerId); pick(e); });
    L.cv.addEventListener('pointermove', e => drag && pick(e)); L.cv.addEventListener('pointerup', () => drag = false);
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.forme = {
  ch: 3, title: 'Forme quadratiche', desc: 'Cambia a, b, c in q = ah² + 2bhk + ck²: coppa, coppa rovesciata, sella o grondaia. Il determinante decide.',
  thumb: cv => thumbSurface(cv, (x, y) => x * x - y * y, { range: 1.3 }),
  page(host, p = {}, compact = false) {
    const u = uid();
    const L = labLayout(host, ctlRange(u + 'a', 'a', -3, 3, .1, 2) + ctlRange(u + 'b', 'b', -3, 3, .1, 1) + ctlRange(u + 'c', 'c', -3, 3, .1, 2)
      + `<div class="row">${[['coppa', 2, 1, 2], ['sella', 1, 2, 1], ['grondaia', 1, 1, 1], ['rovescia', -2, 1, -1]].map(([t, a, b, c]) => `<button type="button" class="btn small ghost" data-p="${a},${b},${c}">${t}</button>`).join('')}</div><div class="verdict" id="${u}v"></div>`,
      { hint: 'trascina per ruotare', compact });
    const st = { a: 2, b: 1, c: 2 }; const s = new Surface3D(L.cv, { range: 1.3, n: 31 });
    L.redraw = () => {
      const { a, b, c } = st; s.setF((h, k) => a * h * h + 2 * b * h * k + c * k * k); s.render();
      const det = a * c - b * b; let cls, col;
      if (det > 1e-9) { cls = a > 0 ? 'definita positiva · minimo' : 'definita negativa · massimo'; col = 'ok'; }
      else if (det < -1e-9) { cls = 'indefinita · sella'; col = 'red'; } else { cls = (a + c > 0 ? 'semidefinita positiva' : a + c < 0 ? 'semidefinita negativa' : 'nulla') + ' · il test non decide'; col = 'amber'; }
      L.ro.innerHTML = `H = [${fmt(a, 1)} ${fmt(b, 1)} ; ${fmt(b, 1)} ${fmt(c, 1)}]<br>det H = ac − b² = <b>${fmt(det)}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>${cls}</b><span class="small">det > 0: conta il segno di a. det < 0: sella, qualunque sia a. det = 0: grondaia, piatta lungo una retta.</span><span class="chip ${col}" style="justify-self:start">det ${det > 1e-9 ? '> 0' : det < -1e-9 ? '< 0' : '= 0'}</span>`;
    };
    ['a', 'b', 'c'].forEach(k => bindRange(u + k, v => { st[k] = v; L.redraw(); }, v => fmt(v, 1)));
    $$('[data-p]', host).forEach(b => b.onclick = () => { const [a, bb, c] = b.dataset.p.split(',').map(Number); Object.assign(st, { a, b: bb, c }); ['a', 'b', 'c'].forEach(k => { const el = document.getElementById(u + k); el.value = st[k]; document.getElementById(u + k + 'o').textContent = fmt(st[k], 1); }); L.redraw(); });
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.polari = {
  ch: 4, title: 'Coordinate polari', desc: 'Un rettangolo nel piano (ρ, θ) diventa un settore di corona: le celle lontane dall\'origine sono più grandi, per questo dx dy = ρ dρ dθ.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-2.2, 2.2], yr: [-1.4, 1.4] }); pl.clear(); pl.grid(1, false); const c = pl.ctx; c.fillStyle = 'rgba(246,178,58,.5)'; c.beginPath(); c.arc(pl.X(0), pl.Y(0), pl.X(1.3) - pl.X(0), -2.3, -.3); c.arc(pl.X(0), pl.Y(0), pl.X(.6) - pl.X(0), -.3, -2.3, true); c.fill(); },
  page(host, p = {}, compact = false) {
    const u = uid();
    const L = labLayout(host, ctlRange(u + 'r1', 'ρ minimo', 0, 2, .05, .5) + ctlRange(u + 'r2', 'ρ massimo', .1, 2.5, .05, 2) + ctlRange(u + 't1', 'θ iniziale (×π)', -1, 2, .05, 0) + ctlRange(u + 't2', 'θ finale (×π)', -1, 2, .05, 1)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'sinistra: piano (ρ,θ) · destra: piano (x,y)', compact });
    const st = { r1: .5, r2: 2, t1: 0, t2: 1 };
    L.redraw = () => {
      const { ctx: c, w, h } = fitCanvas(L.cv); c.fillStyle = NIGHT.bg; c.fillRect(0, 0, w, h);
      const half = w / 2, pad = 28;
      let r1 = Math.min(st.r1, st.r2 - .05), r2 = st.r2, t1 = st.t1 * Math.PI, t2 = Math.max(st.t2, st.t1 + .02) * Math.PI;
      // pannello sinistro
      const LX = rr => pad + (rr / 2.5) * (half - 2 * pad), LY = tt => h - pad - ((tt + Math.PI) / (3 * Math.PI)) * (h - 2 * pad);
      c.strokeStyle = NIGHT.axis; c.lineWidth = 1; c.beginPath(); c.moveTo(pad, h - pad); c.lineTo(half - pad, h - pad); c.moveTo(pad, h - pad); c.lineTo(pad, pad); c.stroke();
      c.fillStyle = NIGHT.text; c.font = '11px "JetBrains Mono"'; c.fillText('ρ', half - pad - 6, h - pad + 16); c.fillText('θ', pad - 14, pad + 4);
      const N = 6, M = 8;
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
        const ra = r1 + (r2 - r1) * i / N, rb = r1 + (r2 - r1) * (i + 1) / N, ta = t1 + (t2 - t1) * j / M, tb = t1 + (t2 - t1) * (j + 1) / M;
        const col = (i + j) % 2 ? 'rgba(246,178,58,.55)' : 'rgba(98,178,240,.45)';
        c.fillStyle = col; c.fillRect(LX(ra), LY(tb), LX(rb) - LX(ra), LY(ta) - LY(tb));
        // destra
        const cx = half + half / 2, cy = h / 2, sc = Math.min(half, h) / 5.6;
        c.beginPath(); c.arc(cx, cy, rb * sc, -ta, -tb, true); c.arc(cx, cy, ra * sc, -tb, -ta, false); c.closePath(); c.fill();
      }
      const cx = half + half / 2, cy = h / 2, sc = Math.min(half, h) / 5.6;
      c.strokeStyle = NIGHT.axis; c.beginPath(); c.moveTo(half + 10, cy); c.lineTo(w - 10, cy); c.moveTo(cx, 10); c.lineTo(cx, h - 10); c.stroke();
      c.strokeStyle = 'rgba(220,231,234,.3)'; c.beginPath(); c.moveTo(half, 0); c.lineTo(half, h); c.stroke();
      c.fillStyle = NIGHT.text; c.fillText('x', w - 18, cy - 6); c.fillText('y', cx + 6, 20);
      const area = .5 * (r2 * r2 - r1 * r1) * (t2 - t1);
      L.ro.innerHTML = `ρ ∈ [${fmt(r1)}, ${fmt(r2)}]  θ ∈ [${fmt(t1 / Math.PI)}π, ${fmt(t2 / Math.PI)}π]<br>area = ½(ρ₂² − ρ₁²)(θ₂ − θ₁) = <b>${fmt(area, 3)}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>Area senza il fattore ρ: ${fmt((r2 - r1) * (t2 - t1), 3)}</b><span class="small">È l'area del rettangolo a sinistra, ed è sbagliata: le celle esterne a destra sono più grandi. Il fattore ρ dello Jacobiano corregge proprio questo.</span>`;
    };
    ['r1', 'r2', 't1', 't2'].forEach(k => bindRange(u + k, v => { st[k] = v; L.redraw(); }, v => fmt(v)));
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.fubini = {
  ch: 5, title: 'Domini normali e Fubini', desc: 'Il segmento verticale scorre da a a b: ogni fetta va da g₁(x) a g₂(x). Integrare le fette dà l\'integrale doppio.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-.3, 1.3], yr: [-.2, 1.2] }); pl.clear(); pl.grid(.5, false); const c = pl.ctx; c.fillStyle = 'rgba(98,178,240,.45)'; c.beginPath(); for (let k = 0; k <= 50; k++) { const x = k / 50; c.lineTo(pl.X(x), pl.Y(x)); } for (let k = 50; k >= 0; k--) { const x = k / 50; c.lineTo(pl.X(x), pl.Y(x * x)); } c.fill(); pl.graph(x => x, NIGHT.amber); pl.graph(x => x * x, NIGHT.red); },
  page(host, p = {}, compact = false) {
    const u = uid();
    const DOM = {
      par: { t: 'x² ≤ y ≤ x, x ∈ [0,1]', a: 0, b: 1, g1: x => x * x, g2: x => x, tex: '\\int_0^1\\!\\int_{x^2}^{x} f\\,dy\\,dx', xr: [-.25, 1.25], yr: [-.2, 1.2] },
      semi: { t: '0 ≤ y ≤ √(1 − x²), x ∈ [−1,1]', a: -1, b: 1, g1: x => 0, g2: x => Math.sqrt(Math.max(0, 1 - x * x)), tex: '\\int_{-1}^{1}\\!\\int_{0}^{\\sqrt{1-x^2}} f\\,dy\\,dx', xr: [-1.3, 1.3], yr: [-.3, 1.3] },
      tri: { t: '0 ≤ y ≤ 2 − x, x ∈ [0,2]', a: 0, b: 2, g1: x => 0, g2: x => 2 - x, tex: '\\int_0^2\\!\\int_0^{2-x} f\\,dy\\,dx', xr: [-.3, 2.3], yr: [-.3, 2.3] }
    };
    const FF = { uno: ['1 (area)', (x, y) => 1], xy: ['x + y', (x, y) => x + y], xy2: ['x y', (x, y) => x * y] };
    const L = labLayout(host, ctlSelect(u + 'd', 'Dominio', Object.entries(DOM).map(([k, v]) => [k, v.t]), p.d || 'par') + ctlSelect(u + 'f', 'Integranda f', Object.entries(FF).map(([k, v]) => [k, v[0]]), 'uno')
      + ctlRange(u + 'x', 'Posizione della fetta x', 0, 1, .005, .5) + `<div class="verdict" id="${u}v"></div>`, { hint: 'la fetta va dal bordo inferiore a quello superiore', compact });
    const st = { d: p.d || 'par', f: 'uno', s: .5 };
    L.redraw = () => {
      const D = DOM[st.d], F = FF[st.f][1], pl = new Plot2D(L.cv, { xr: D.xr, yr: D.yr }); pl.clear(); pl.grid(.5);
      const c = pl.ctx; c.fillStyle = 'rgba(98,178,240,.32)'; c.beginPath();
      for (let k = 0; k <= 120; k++) { const x = D.a + (D.b - D.a) * k / 120; c.lineTo(pl.X(x), pl.Y(D.g2(x))); }
      for (let k = 120; k >= 0; k--) { const x = D.a + (D.b - D.a) * k / 120; c.lineTo(pl.X(x), pl.Y(D.g1(x))); } c.closePath(); c.fill();
      pl.curve(t => [t, D.g2(t)], D.a, D.b, 200, NIGHT.amber, 2.4); pl.curve(t => [t, D.g1(t)], D.a, D.b, 200, NIGHT.red, 2.4);
      const x = D.a + (D.b - D.a) * st.s, y1 = D.g1(x), y2 = D.g2(x);
      c.strokeStyle = NIGHT.white; c.lineWidth = 4; c.beginPath(); c.moveTo(pl.X(x), pl.Y(y1)); c.lineTo(pl.X(x), pl.Y(y2)); c.stroke();
      pl.dot(x, y1, 5, NIGHT.red); pl.dot(x, y2, 5, NIGHT.amber);
      // integrale interno e totale (Simpson)
      const inner = xx => { const a = D.g1(xx), b = D.g2(xx), n = 60; let s = 0; for (let k = 0; k <= n; k++) { const y = a + (b - a) * k / n, wgt = k === 0 || k === n ? 1 : k % 2 ? 4 : 2; s += wgt * F(xx, y); } return s * (b - a) / (3 * n); };
      let tot = 0; const n = 200; for (let k = 0; k <= n; k++) { const xx = D.a + (D.b - D.a) * k / n, wgt = k === 0 || k === n ? 1 : k % 2 ? 4 : 2; tot += wgt * inner(xx); } tot *= (D.b - D.a) / (3 * n);
      L.ro.innerHTML = `fetta x = ${fmt(x)}: y da ${fmt(y1)} a ${fmt(y2)}<br>∫ f dy = ${fmt(inner(x), 4)}<br>∬ f = <b>${fmt(tot, 4)}</b>`;
      const v = document.getElementById(u + 'v'); v.innerHTML = `<b>Formula di riduzione</b><div>$$${D.tex}$$</div><span class="small">Rosso: g₁(x), bordo inferiore. Ambra: g₂(x), bordo superiore. Prima l'integrale della fetta in y, poi si sommano le fette in x.</span>`; typeset(v);
    };
    document.getElementById(u + 'd').onchange = e => { st.d = e.target.value; L.redraw(); };
    document.getElementById(u + 'f').onchange = e => { st.f = e.target.value; L.redraw(); };
    bindRange(u + 'x', v => { st.s = v; L.redraw(); }, v => fmt(v));
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.curve = {
  ch: 6, title: 'Curve, velocità e lunghezza', desc: 'Il punto percorre γ(t); la freccia è γ\'(t), il vettore velocità. La lunghezza è l\'integrale di |γ\'(t)|.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-1.5, 1.5], yr: [-1.2, 1.2] }); pl.clear(); pl.grid(1, false); pl.curve(t => [Math.cos(t) ** 3, Math.sin(t) ** 3], 0, 6.3, 300, NIGHT.amber, 2.5); },
  page(host, p = {}, compact = false) {
    const u = uid(), T = 2 * Math.PI;
    const CV = {
      cerchio: ['circonferenza (cos t, sin t)', t => [Math.cos(t), Math.sin(t)], t => [-Math.sin(t), Math.cos(t)], T, '2π ≈ 6.283'],
      ellisse: ['ellisse (2cos t, sin t)', t => [2 * Math.cos(t), Math.sin(t)], t => [-2 * Math.sin(t), Math.cos(t)], T, 'non elementare ≈ 9.688'],
      cicloide: ['cicloide (t − sin t, 1 − cos t)', t => [t - Math.sin(t), 1 - Math.cos(t)], t => [1 - Math.cos(t), Math.sin(t)], T, '8'],
      astroide: ['astroide (cos³t, sin³t)', t => [Math.cos(t) ** 3, Math.sin(t) ** 3], t => [-3 * Math.cos(t) ** 2 * Math.sin(t), 3 * Math.sin(t) ** 2 * Math.cos(t)], T, '6'],
      cardioide: ['cardioide ρ = 1 + cos θ', t => [(1 + Math.cos(t)) * Math.cos(t), (1 + Math.cos(t)) * Math.sin(t)], t => [-Math.sin(t) * Math.cos(t) - (1 + Math.cos(t)) * Math.sin(t), -Math.sin(t) * Math.sin(t) + (1 + Math.cos(t)) * Math.cos(t)], T, '8']
    };
    const L = labLayout(host, ctlSelect(u + 'c', 'Curva', Object.entries(CV).map(([k, v]) => [k, v[0]]), 'astroide') + ctlRange(u + 't', 'Parametro t (×2π)', 0, 1, .002, .3)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'ambra: tratto già percorso', compact });
    const st = { c: 'astroide', s: .3 };
    L.redraw = () => {
      const [, g, dg, tmax, Ltot] = CV[st.c];
      const xs = [], ys = []; for (let k = 0; k <= 200; k++) { const q = g(tmax * k / 200); xs.push(q[0]); ys.push(q[1]); }
      const pad = .5, xr = [Math.min(...xs) - pad, Math.max(...xs) + pad], yr = [Math.min(...ys) - pad, Math.max(...ys) + pad];
      const pl = new Plot2D(L.cv, { xr, yr }); pl.clear(); pl.grid(1);
      const t = tmax * st.s;
      pl.curve(g, 0, tmax, 600, 'rgba(220,231,234,.35)', 2); pl.curve(g, 0, t, 600, NIGHT.amber, 3.2);
      const [x, y] = g(t), [vx, vy] = dg(t); pl.arrow(x, y, vx * .45, vy * .45, NIGHT.red, 3, 10); pl.dot(x, y, 6, NIGHT.white, NIGHT.bg);
      let len = 0; const n = 600; for (let k = 0; k < n; k++) { const a = t * k / n, b = t * (k + 1) / n, m = (a + b) / 2, d = dg(m); len += Math.hypot(d[0], d[1]) * (b - a); }
      const sp = Math.hypot(vx, vy);
      L.ro.innerHTML = `t = ${fmt(t)}<br>γ'(t) = (${fmt(vx)}, ${fmt(vy)}) · |γ'| = ${fmt(sp)}<br>lunghezza percorsa = <b>${fmt(len, 3)}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>Lunghezza totale: ${Ltot}</b><span class="small">${sp < 1e-6 ? '<b>Qui γ\'(t) = 0: la curva non è regolare in questo punto (cuspide).</b> ' : ''}Regolare vuol dire γ' continua e mai nulla. Astroide, cicloide e cardioide hanno punti dove la velocità si annulla: prova a trovarli.</span>`;
    };
    document.getElementById(u + 'c').onchange = e => { st.c = e.target.value; L.redraw(); };
    bindRange(u + 't', v => { st.s = v; L.redraw(); }, v => fmt(v, 3));
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.campi = {
  ch: 7, title: 'Campi, circuitazione e Green', desc: 'Frecce del campo, colore del rotore, e una circonferenza da spostare: confronta la circuitazione con l\'integrale del rotore.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-2, 2], yr: [-1.3, 1.3] }); pl.clear(); for (let x = -1.8; x <= 1.8; x += .45) for (let y = -1.1; y <= 1.1; y += .45) pl.arrow(x, y, -y * .25, x * .25, NIGHT.amber, 1.6, 5); },
  page(host, p = {}, compact = false) {
    const u = uid();
    const FD = {
      vortice: ['(−y, x)', (x, y) => [-y, x], (x, y) => 2, 'Rotore costante 2: la circuitazione è 2 × area del cerchio, ovunque tu lo metta.'],
      sorgente: ['(x, y)', (x, y) => [x, y], (x, y) => 0, 'Irrotazionale e definito su tutto il piano: è conservativo, potenziale (x² + y²)/2. Circuitazione sempre 0.'],
      grad: ['(y, x) = ∇(xy)', (x, y) => [y, x], (x, y) => 0, 'È un gradiente: il lavoro lungo ogni curva chiusa è 0.'],
      taglio: ['(y, 0)', (x, y) => [y, 0], (x, y) => -1, 'Frecce parallele ma il campo gira: rotore −1, circuitazione −area.'],
      buco: ['(−y, x)/(x² + y²)', (x, y) => { const r = x * x + y * y; return [-y / r, x / r]; }, (x, y) => 0, 'Rotore nullo fuori dall\'origine, ma attorno all\'origine la circuitazione è 2π: irrotazionale non basta, il dominio non è semplicemente connesso.']
    };
    const L = labLayout(host, ctlSelect(u + 'f', 'Campo F = (P, Q)', Object.entries(FD).map(([k, v]) => [k, v[0]]), p.f || 'buco') + ctlRange(u + 'r', 'Raggio della circonferenza', .2, 1.5, .05, .8)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'trascina per spostare la circonferenza', compact });
    const st = { f: p.f || 'buco', C: [0, 0], r: .8 }; let pl;
    L.redraw = () => {
      pl = new Plot2D(L.cv, { xr: [-2.5, 2.5], yr: [-1.8, 1.8] }); pl.clear();
      const [, F, rot, note] = FD[st.f];
      pl.field((x, y) => rot(x, y) + 0 * x, { rampName: 'div', levels: 0, zr: [-2.2, 2.2], heat: st.f !== 'buco' && st.f !== 'sorgente' && st.f !== 'grad' });
      pl.grid(1, false);
      for (let x = -2.4; x <= 2.4; x += .3) for (let y = -1.7; y <= 1.7; y += .3) {
        const [a, b] = F(x, y), m = Math.hypot(a, b); if (!isFinite(m) || m < 1e-9) continue; const s = .22 * Math.min(1, .6 + .4 * Math.tanh(m)) / m;
        pl.arrow(x, y, a * s, b * s, 'rgba(244,246,242,.75)', 1.4, 5);
      }
      const [cx, cy] = st.C, R = st.r;
      pl.curve(t => [cx + R * Math.cos(t), cy + R * Math.sin(t)], 0, 2 * Math.PI, 200, NIGHT.amber, 2.8);
      pl.arrow(cx + R, cy, 0, .25, NIGHT.amber, 2.8, 9);
      let circ = 0; const n = 720; for (let k = 0; k < n; k++) { const t = 2 * Math.PI * (k + .5) / n, x = cx + R * Math.cos(t), y = cy + R * Math.sin(t), [P, Qv] = F(x, y); circ += (P * -R * Math.sin(t) + Qv * R * Math.cos(t)) * 2 * Math.PI / n; }
      let rotInt = 0; const m = 80; for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { const rr = R * (i + .5) / m, tt = 2 * Math.PI * (j + .5) / m; rotInt += rot(cx + rr * Math.cos(tt), cy + rr * Math.sin(tt)) * rr * (R / m) * (2 * Math.PI / m); }
      const inside = st.f === 'buco' && Math.hypot(cx, cy) < R;
      L.ro.innerHTML = `∮ F·dr = <b>${fmt(circ, 3)}</b><br>∬ (Q<sub>x</sub> − P<sub>y</sub>) dx dy = <b>${fmt(rotInt, 3)}</b>${inside ? '<br><span style="color:#FF5446">origine dentro: Green non si applica</span>' : ''}`;
      document.getElementById(u + 'v').innerHTML = `<b>${inside ? 'I due numeri non coincidono' : 'Green: i due numeri coincidono'}</b><span class="small">${esc(note)}</span>`;
    };
    document.getElementById(u + 'f').onchange = e => { st.f = e.target.value; L.redraw(); };
    bindRange(u + 'r', v => { st.r = v; L.redraw(); }, v => fmt(v));
    let drag = false; const pick = e => { const r = L.cv.getBoundingClientRect(); st.C = pl.inv(e.clientX - r.left, e.clientY - r.top); L.redraw(); };
    L.cv.addEventListener('pointerdown', e => { drag = true; L.cv.setPointerCapture(e.pointerId); pick(e); }); L.cv.addEventListener('pointermove', e => drag && pick(e)); L.cv.addEventListener('pointerup', () => drag = false);
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.direzioni = {
  ch: 9, title: 'Campo di direzioni', desc: 'Ogni trattino ha la pendenza y\' = F(t, y). Tocca un punto per scegliere il dato iniziale e vedere la soluzione del problema di Cauchy.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-3, 3], yr: [-2, 2] }); pl.clear(); for (let t = -2.8; t <= 2.8; t += .4) for (let y = -1.8; y <= 1.8; y += .4) { const s = y * (1 - y) * .9, a = Math.atan(s); pl.ctx.strokeStyle = 'rgba(244,246,242,.6)'; pl.ctx.beginPath(); pl.ctx.moveTo(pl.X(t - .14 * Math.cos(a)), pl.Y(y - .14 * Math.sin(a))); pl.ctx.lineTo(pl.X(t + .14 * Math.cos(a)), pl.Y(y + .14 * Math.sin(a))); pl.ctx.stroke(); } },
  page(host, p = {}, compact = false) {
    const u = uid();
    const EQ = {
      exp: ["y' = y", (t, y) => y, 'Soluzione y = y₀ e^(t − t₀): esistenza e unicità globali (F lipschitziana in y).'],
      logi: ["y' = y(1 − y)", (t, y) => y * (1 - y), 'Logistica: y = 0 e y = 1 sono soluzioni costanti. Per unicità nessuna altra soluzione le attraversa.'],
      gauss: ["y' = −2t y", (t, y) => -2 * t * y, 'Lineare: y = y₀ e^(−(t² − t₀²)).'],
      lin: ["y' = t − y", (t, y) => t - y, 'Lineare del primo ordine: y = t − 1 + c e^(−t). Tutte si avvicinano alla retta y = t − 1.'],
      blow: ["y' = y²", (t, y) => y * y, 'F è C¹ ma la soluzione y = y₀/(1 − y₀(t − t₀)) esplode in tempo finito: il teorema è solo locale.'],
      nonu: ["y' = √|y|", (t, y) => Math.sqrt(Math.abs(y)), 'F è continua ma non lipschitziana in y = 0: dal dato y(0) = 0 partono infinite soluzioni (y = 0, y = t²/4 per t ≥ 0, …).']
    };
    const L = labLayout(host, ctlSelect(u + 'e', 'Equazione', Object.entries(EQ).map(([k, v]) => [k, v[0]]), p.e || 'logi') + `<div class="verdict" id="${u}v"></div>`, { hint: 'tocca per scegliere (t₀, y₀)', compact });
    const st = { e: p.e || 'logi', P: [-2, .2] }; let pl;
    L.redraw = () => {
      pl = new Plot2D(L.cv, { xr: [-3, 3], yr: [-2, 2.5] }); pl.clear(); pl.grid(1);
      const [, F, note] = EQ[st.e], c = pl.ctx;
      c.strokeStyle = 'rgba(244,246,242,.5)'; c.lineWidth = 1.3;
      const dx = (pl.xr[1] - pl.xr[0]) / 22;
      for (let t = pl.xr[0] + dx / 2; t < pl.xr[1]; t += dx) for (let y = pl.yr[0] + dx / 2; y < pl.yr[1]; y += dx) {
        const s = F(t, y); if (!isFinite(s)) continue; const a = Math.atan(s), L2 = dx * .36;
        c.beginPath(); c.moveTo(pl.X(t - L2 * Math.cos(a)), pl.Y(y - L2 * Math.sin(a))); c.lineTo(pl.X(t + L2 * Math.cos(a)), pl.Y(y + L2 * Math.sin(a))); c.stroke();
      }
      const solve = (dir) => { const pts = []; let t = st.P[0], y = st.P[1], h = .01 * dir; for (let k = 0; k < 800; k++) { pts.push([t, y]); const k1 = F(t, y), k2 = F(t + h / 2, y + h * k1 / 2), k3 = F(t + h / 2, y + h * k2 / 2), k4 = F(t + h, y + h * k3); y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; t += h; if (!isFinite(y) || Math.abs(y) > 50 || t < pl.xr[0] || t > pl.xr[1]) break; } return pts; };
      [solve(1), solve(-1)].forEach(pts => { c.strokeStyle = NIGHT.amber; c.lineWidth = 3; c.beginPath(); pts.forEach(([t, y], k) => k ? c.lineTo(pl.X(t), pl.Y(y)) : c.moveTo(pl.X(t), pl.Y(y))); c.stroke(); });
      if (st.e === 'nonu' && Math.abs(st.P[1]) < .08) { pl.curve(t => [t, t > st.P[0] ? (t - st.P[0]) ** 2 / 4 : 0], st.P[0], 3, 300, NIGHT.red, 2.4, [6, 5]); pl.curve(t => [t, 0], -3, 3, 10, NIGHT.blue, 2.4, [6, 5]); }
      pl.dot(st.P[0], st.P[1], 6, NIGHT.white, NIGHT.bg);
      L.ro.innerHTML = `${EQ[st.e][0]}<br>y(${fmt(st.P[0])}) = ${fmt(st.P[1])}`;
      document.getElementById(u + 'v').innerHTML = `<b>Cosa osservare</b><span class="small">${esc(note)}</span>`;
    };
    document.getElementById(u + 'e').onchange = e => { st.e = e.target.value; L.redraw(); };
    L.cv.addEventListener('pointerdown', e => { const r = L.cv.getBoundingClientRect(); st.P = pl.inv(e.clientX - r.left, e.clientY - r.top); if (st.e === 'nonu' && Math.abs(st.P[1]) < .12) st.P[1] = 0; L.redraw(); });
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.taylor = {
  ch: 10, title: 'Polinomi di Taylor', desc: 'Aggiungi termini alla serie di Taylor e guarda dove il polinomio insegue la funzione: solo dentro l\'intervallo di convergenza.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [-4, 4], yr: [-2, 2] }); pl.clear(); pl.grid(1, false); pl.graph(Math.sin, 'rgba(244,246,242,.8)', 2); pl.graph(x => x - x ** 3 / 6 + x ** 5 / 120, NIGHT.amber, 2.4); },
  page(host, p = {}, compact = false) {
    const u = uid();
    const fact = n => { let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
    const TF = {
      exp: ['e^x', Math.exp, k => 1 / fact(k), Infinity, 'Σ xⁿ/n!'],
      sin: ['sin x', Math.sin, k => k % 2 ? (k % 4 === 1 ? 1 : -1) / fact(k) : 0, Infinity, 'Σ (−1)ⁿ x²ⁿ⁺¹/(2n+1)!'],
      cos: ['cos x', Math.cos, k => k % 2 ? 0 : (k % 4 === 0 ? 1 : -1) / fact(k), Infinity, 'Σ (−1)ⁿ x²ⁿ/(2n)!'],
      log: ['ln(1 + x)', x => x > -1 ? Math.log(1 + x) : NaN, k => k ? (k % 2 ? 1 : -1) / k : 0, 1, 'Σ (−1)ⁿ⁺¹ xⁿ/n, converge in (−1, 1]'],
      geo: ['1/(1 − x)', x => 1 / (1 - x), k => 1, 1, 'Σ xⁿ, converge in (−1, 1)'],
      atan: ['arctan x', Math.atan, k => k % 2 ? (k % 4 === 1 ? 1 : -1) / k : 0, 1, 'Σ (−1)ⁿ x²ⁿ⁺¹/(2n+1), converge in [−1, 1]']
    };
    const L = labLayout(host, ctlSelect(u + 'f', 'Funzione', Object.entries(TF).map(([k, v]) => [k, v[0]]), p.f || 'log') + ctlRange(u + 'n', 'Grado n del polinomio', 0, 25, 1, 5)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'banda azzurra: intervallo di convergenza', compact });
    const st = { f: p.f || 'log', n: 5 };
    L.redraw = () => {
      const [name, f, a, R, ser] = TF[st.f], pl = new Plot2D(L.cv, { xr: [-4, 4], yr: [-3, 3] }); pl.clear();
      if (isFinite(R)) { pl.ctx.fillStyle = 'rgba(98,178,240,.16)'; pl.ctx.fillRect(pl.X(-R), 0, pl.X(R) - pl.X(-R), pl.h); }
      pl.grid(1);
      pl.graph(f, 'rgba(244,246,242,.9)', 2.4);
      const T = x => { let s = 0, xp = 1; for (let k = 0; k <= st.n; k++) { s += a(k) * xp; xp *= x; } return s; };
      pl.graph(T, NIGHT.amber, 2.6);
      L.ro.innerHTML = `f(x) = ${name}<br>T<sub>${st.n}</sub>(0.5) = ${fmt(T(.5), 5)} · f(0.5) = ${fmt(f(.5), 5)}<br>raggio R = <b>${isFinite(R) ? R : '∞'}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>${esc(ser)}</b><span class="small">${isFinite(R) ? 'Fuori da (−R, R) il polinomio si allontana dalla funzione anche aumentando n: la serie non converge lì.' : 'Raggio infinito: aumentando n il polinomio insegue la funzione su intervalli sempre più grandi.'}</span>`;
    };
    document.getElementById(u + 'f').onchange = e => { st.f = e.target.value; L.redraw(); };
    bindRange(u + 'n', v => { st.n = v; L.redraw(); });
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.serie = {
  ch: 10, title: 'Somme parziali di una serie', desc: 'Le barre sono le somme parziali Sₙ: se si assestano su un valore la serie converge. Prova la serie armonica e quella a segni alterni.',
  thumb: cv => { const pl = new Plot2D(cv, { xr: [0, 30], yr: [0, 2], equal: false }); pl.clear(); let s = 0; for (let n = 1; n <= 30; n++) { s += 1 / (n * n); pl.ctx.fillStyle = NIGHT.amber; pl.ctx.fillRect(pl.X(n - .8), pl.Y(s), pl.X(.6) - pl.X(0), pl.Y(0) - pl.Y(s)); } },
  page(host, p = {}, compact = false) {
    const u = uid();
    const SR = {
      p: ['Σ 1/nᵖ (armonica generalizzata)', (n, q) => 1 / n ** q.p, q => q.p > 1 ? (q.p === 2 ? 'converge a π²/6 ≈ 1.645' : 'converge (p > 1)') : 'diverge (p ≤ 1)'],
      alt: ['Σ (−1)ⁿ⁺¹/n (armonica a segni alterni)', n => (n % 2 ? 1 : -1) / n, () => 'converge a ln 2 ≈ 0.693 (Leibniz), ma non assolutamente'],
      geo: ['Σ rⁿ, n ≥ 0 (geometrica)', (n, q) => q.r ** (n - 1), q => Math.abs(q.r) < 1 ? 'converge a 1/(1 − r) = ' + fmt(1 / (1 - q.r), 3) : 'non converge (|r| ≥ 1)'],
      tel: ['Σ 1/(n(n+1)) (telescopica)', n => 1 / (n * (n + 1)), () => 'converge a 1: Sₙ = 1 − 1/(n+1)']
    };
    const L = labLayout(host, ctlSelect(u + 's', 'Serie', Object.entries(SR).map(([k, v]) => [k, v[0]]), p.s || 'p') + ctlRange(u + 'p', 'Esponente p', .5, 3, .05, 1) + ctlRange(u + 'r', 'Ragione r', -1.1, 1.1, .05, .5) + ctlRange(u + 'N', 'Numero di termini N', 5, 200, 1, 60)
      + `<div class="verdict" id="${u}v"></div>`, { hint: 'barre: somme parziali Sₙ', compact });
    const st = { s: p.s || 'p', p: 1, r: .5, N: 60 };
    L.redraw = () => {
      const [, a, verdict] = SR[st.s], S2 = []; let s = 0; for (let n = 1; n <= st.N; n++) { s += a(n, st); S2.push(s); }
      const lo = Math.min(0, ...S2), hi = Math.max(.5, ...S2.filter(isFinite).map(x => Math.min(x, 1e3)));
      const pl = new Plot2D(L.cv, { xr: [0, st.N + 1], yr: [lo - .1 * (hi - lo), hi * 1.12], equal: false }); pl.clear();
      const c = pl.ctx; const bw = Math.max(1, (pl.X(1) - pl.X(0)) * .7);
      S2.forEach((v, k) => { c.fillStyle = k === S2.length - 1 ? NIGHT.red : NIGHT.amber; const y0 = pl.Y(0), y1 = pl.Y(clamp(v, -1e3, 1e3)); c.fillRect(pl.X(k + 1) - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); });
      c.strokeStyle = NIGHT.axis; c.beginPath(); c.moveTo(0, pl.Y(0)); c.lineTo(pl.w, pl.Y(0)); c.stroke();
      c.fillStyle = NIGHT.text; c.font = '11px "JetBrains Mono"'; c.fillText('n →', pl.w - 34, pl.Y(0) - 6);
      L.ro.innerHTML = `S<sub>${st.N}</sub> = <b>${fmt(S2[S2.length - 1], 4)}</b>`;
      document.getElementById(u + 'v').innerHTML = `<b>${esc(verdict(st))}</b><span class="small">La condizione aₙ → 0 è necessaria ma non sufficiente: nella serie armonica (p = 1) i termini vanno a zero eppure Sₙ cresce senza limite, come ln n.</span>`;
      host.querySelector(`#${u}p`).closest('.ctl').hidden = st.s !== 'p'; host.querySelector(`#${u}r`).closest('.ctl').hidden = st.s !== 'geo';
    };
    document.getElementById(u + 's').onchange = e => { st.s = e.target.value; L.redraw(); };
    bindRange(u + 'p', v => { st.p = v; L.redraw(); }, v => fmt(v)); bindRange(u + 'r', v => { st.r = v; L.redraw(); }, v => fmt(v)); bindRange(u + 'N', v => { st.N = v; L.redraw(); });
    L.redraw();
  },
  mini(host, p) { this.page(host, p, true); }
};

LABS.implicazioni = {
  ch: 2, title: 'Mappa delle implicazioni', desc: 'Tocca ogni freccia e decidi se l\'implicazione è vera o falsa. Poi verifica: per ogni falsa c\'è il controesempio da sapere.',
  thumb: cv => { const { ctx: c, w, h } = fitCanvas(cv); c.fillStyle = NIGHT.bg; c.fillRect(0, 0, w, h); c.strokeStyle = NIGHT.amber; c.lineWidth = 2; [[.2, .5, .5, .25], [.5, .25, .8, .5], [.5, .25, .5, .75]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a * w, b * h); c.lineTo(d * w, e * h); c.stroke(); }); c.fillStyle = NIGHT.white; [[.2, .5], [.5, .25], [.8, .5], [.5, .75]].forEach(([a, b]) => c.fillRect(a * w - 24, b * h - 10, 48, 20)); },
  page(host, p = {}, compact = false) {
    const N = { c1: [90, 60, 'f ∈ C¹'], diff: [330, 60, 'differenziabile'], cont: [570, 60, 'continua'], der: [330, 250, 'derivabile (parziali)'], dir: [600, 250, 'tutte le direzionali'] };
    const A = [
      ['c1', 'diff', true, 'Teorema del differenziale totale.', -1], ['diff', 'cont', true, 'Conseguenza della differenziabilità.', -1], ['diff', 'der', true, 'Differenziabile ⇒ esistono le parziali.', -1],
      ['diff', 'dir', true, 'E vale ∂f/∂v = ∇f·v.', -1], ['der', 'cont', false, 'Controesempio: xy/(x²+y²), f(0,0) = 0: parziali nulle, non continua.', 1], ['cont', 'der', false, 'Controesempio: √(x² + y²) in (0,0).', 1],
      ['der', 'diff', false, 'Controesempio: √|xy| in (0,0).', 1], ['dir', 'diff', false, 'Controesempio: x²y/(x²+y²), f(0,0) = 0.', 1], ['diff', 'c1', false, 'Esistono funzioni differenziabili con parziali discontinue.', 1],
      ['dir', 'cont', false, 'Controesempio: x²y/(x⁴+y²), f(0,0) = 0: tutte le direzionali esistono, non è continua.', 1]
    ];
    const guess = A.map(() => null); let checked = false;
    host.innerHTML = `<div class="panel" style="gap:14px"><div class="tw"><svg class="impl" viewBox="0 0 700 320" role="group" aria-label="Diagramma delle implicazioni"></svg></div>
      <div class="row"><button type="button" class="btn primary" id="implCheck">${icon('check')} Verifica</button><button type="button" class="btn ghost" id="implReset">${icon('arrow-counter-clockwise')} Ricomincia</button><span class="muted small" id="implScore">Tocca le frecce: ? → vera → falsa</span></div>
      <div id="implRows" class="review"></div><div id="implList" class="review"></div></div>`;
    const svg = $('svg', host);
    const draw = () => {
      let g = '<defs>' + ['#6b7f88', '#1C7E4E', '#C2302A', '#E89A1C'].map((c, k) => `<marker id="ar${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('') + '</defs>';
      A.forEach(([a, b, truth, , bend], k) => {
        const [x1, y1] = N[a], [x2, y2] = N[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L2 = Math.hypot(dx, dy);
        const off = (k % 2 ? 1 : -1) * (bend > 0 ? 34 : 14), cx = mx - dy / L2 * off, cy = my + dx / L2 * off;
        const sx = x1 + dx / L2 * 62, sy = y1 + dy / L2 * 24, ex = x2 - dx / L2 * 64, ey = y2 - dy / L2 * 26;
        const gs = guess[k]; let col = 0;
        if (checked) col = gs === truth ? 1 : 2; else if (gs !== null) col = 3;
        const colors = ['#6b7f88', '#1C7E4E', '#C2302A', '#E89A1C'], txt = gs === null ? '?' : gs ? 'V' : 'F';
        g += `<g class="arr" data-k="${k}" tabindex="0" role="button" aria-label="${N[a][2]} implica ${N[b][2]}: ${gs === null ? 'da decidere' : gs ? 'vera' : 'falsa'}">
          <path class="hitp" d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}"/><path d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}" stroke="${colors[col]}" ${truth || !checked ? '' : 'stroke-dasharray="6 5"'} marker-end="url(#ar${col})"/>
          <circle cx="${(sx + 2 * cx + ex) / 4}" cy="${(sy + 2 * cy + ey) / 4}" r="11" fill="var(--sheet)" stroke="${colors[col]}" stroke-width="2"/>
          <text x="${(sx + 2 * cx + ex) / 4}" y="${(sy + 2 * cy + ey) / 4 + 4}" text-anchor="middle" fill="${colors[col]}">${txt}</text></g>`;
      });
      Object.values(N).forEach(([x, y, t]) => { g += `<g class="node"><rect x="${x - 70}" y="${y - 18}" width="140" height="36" rx="3"/><text x="${x}" y="${y + 5}" text-anchor="middle">${t}</text></g>`; });
      svg.innerHTML = g;
      $$('.arr', svg).forEach(el => { const k = +el.dataset.k; const cyc = () => { if (checked) return; guess[k] = guess[k] === null ? true : guess[k] ? false : null; draw(); }; el.onclick = cyc; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cyc(); } }; });
      const rows = $('#implRows', host);
      if (checked) { rows.innerHTML = ''; return; }
      rows.innerHTML = A.map(([a, b], k) => `<div class="rv" style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><span><b>${N[a][2]}</b> ⇒ <b>${N[b][2]}</b></span>
        <span class="seg" role="group" aria-label="Vera o falsa"><button type="button" data-g="${k}" data-v="1" aria-pressed="${guess[k] === true}">Vera</button><button type="button" data-g="${k}" data-v="0" aria-pressed="${guess[k] === false}">Falsa</button></span></div>`).join('');
      $$('[data-g]', rows).forEach(bt => bt.onclick = () => { const k = +bt.dataset.g, v = bt.dataset.v === '1'; guess[k] = guess[k] === v ? null : v; draw(); });
    };
    $('#implCheck', host).onclick = () => {
      checked = true; draw(); const ok = A.filter((a, k) => guess[k] === a[2]).length;
      $('#implScore', host).textContent = `${ok}/${A.length} corrette`; if (ok === A.length) SFX.fanfare(); else SFX.ok();
      $('#implList', host).innerHTML = A.map(([a, b, t, why], k) => `<div class="rv ${guess[k] === t ? 'ok' : 'ko'}"><span class="m">${guess[k] === t ? '✓' : '✗'}</span><div><b>${N[a][2]} ⇒ ${N[b][2]}</b>: ${t ? 'vera' : 'falsa'}. <span class="muted">${esc(why)}</span></div></div>`).join('');
    };
    $('#implReset', host).onclick = () => { checked = false; guess.fill(null); $('#implList', host).innerHTML = ''; $('#implScore', host).textContent = 'Tocca le frecce: ? → vera → falsa'; draw(); };
    draw();
  },
  mini(host, p) { this.page(host, p, true); }
};
