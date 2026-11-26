/* ============================================================
   plot: superfici 3D su canvas, curve di livello (marching squares), piano 2D
   ============================================================ */
const NIGHT = { bg: '#0B151C', bg2: '#12222C', grid: 'rgba(143,166,176,.13)', axis: 'rgba(220,231,234,.55)', text: '#8FA6B0', ink: '#DCE7EA',
  amber: '#F6B23A', red: '#FF5446', blue: '#62B2F0', green: '#43C98B', white: '#F4F6F2', violet: '#B79CFF' };
const RAMP_TOPO = [[0, [27, 77, 87]], [.22, [46, 138, 132]], [.45, [190, 176, 104]], [.65, [232, 154, 46]], [.85, [217, 72, 59]], [1, [242, 238, 230]]];
const RAMP_NIGHT = [[0, [12, 30, 38]], [.3, [20, 58, 66]], [.55, [44, 84, 86]], [.75, [86, 98, 92]], [.9, [140, 132, 118]], [1, [205, 205, 196]]];
const RAMP_DIV = [[0, [47, 111, 183]], [.5, [18, 34, 44]], [1, [215, 38, 30]]];
function ramp(R, t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < R.length; i++) if (t <= R[i][0]) {
    const [t0, c0] = R[i - 1], [t1, c1] = R[i], u = (t - t0) / (t1 - t0 || 1);
    return [0, 1, 2].map(k => Math.round(c0[k] + (c1[k] - c0[k]) * u));
  }
  return R[R.length - 1][1];
}
const rgb = (c, a = 1) => a === 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function fitCanvas(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

/* ----- marching squares: chiama seg(x1,y1,x2,y2) in coordinate di griglia ----- */
const MS = { 1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 5: [['T', 'R'], ['L', 'B']], 6: [['T', 'B']], 7: [['T', 'L']],
  8: [['T', 'L']], 9: [['T', 'B']], 10: [['T', 'L'], ['R', 'B']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['R', 'B']], 14: [['L', 'B']] };
function isoLines(v, nx, ny, L, seg) {
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
    if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d))) continue;
    const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const P = {
      T: () => [i + (L - a) / (b - a), j], R: () => [i + 1, j + (L - b) / (c - b)],
      B: () => [i + (L - d) / (c - d), j + 1], L: () => [i, j + (L - a) / (d - a)]
    };
    for (const [e1, e2] of MS[idx]) { const p = P[e1](), q = P[e2](); seg(p[0], p[1], q[0], q[1]); }
  }
}

/* ----- piano 2D con assi ----- */
class Plot2D {
  constructor(cv, { xr = [-3, 3], yr = [-2, 2], equal = true } = {}) { this.cv = cv; this.xr0 = xr; this.yr0 = yr; this.equal = equal; this.resize(); }
  resize() {
    const { ctx, w, h } = fitCanvas(this.cv); this.ctx = ctx; this.w = w; this.h = h;
    let [x0, x1] = this.xr0, [y0, y1] = this.yr0;
    if (this.equal) {
      const sx = w / (x1 - x0), sy = h / (y1 - y0);
      if (sx > sy) { const cx = (x0 + x1) / 2, half = (w / sy) / 2; x0 = cx - half; x1 = cx + half; }
      else { const cy = (y0 + y1) / 2, half = (h / sx) / 2; y0 = cy - half; y1 = cy + half; }
    }
    this.xr = [x0, x1]; this.yr = [y0, y1];
  }
  X(x) { return (x - this.xr[0]) / (this.xr[1] - this.xr[0]) * this.w; }
  Y(y) { return this.h - (y - this.yr[0]) / (this.yr[1] - this.yr[0]) * this.h; }
  inv(px, py) { return [this.xr[0] + px / this.w * (this.xr[1] - this.xr[0]), this.yr[0] + (this.h - py) / this.h * (this.yr[1] - this.yr[0])]; }
  clear(bg = NIGHT.bg) { const c = this.ctx; c.fillStyle = bg; c.fillRect(0, 0, this.w, this.h); }
  grid(step = 1, labels = true) {
    const c = this.ctx; c.lineWidth = 1; c.strokeStyle = NIGHT.grid; c.beginPath();
    for (let x = Math.ceil(this.xr[0] / step) * step; x <= this.xr[1]; x += step) { c.moveTo(this.X(x), 0); c.lineTo(this.X(x), this.h); }
    for (let y = Math.ceil(this.yr[0] / step) * step; y <= this.yr[1]; y += step) { c.moveTo(0, this.Y(y)); c.lineTo(this.w, this.Y(y)); }
    c.stroke();
    c.strokeStyle = NIGHT.axis; c.lineWidth = 1.2; c.beginPath();
    c.moveTo(this.X(this.xr[0]), this.Y(0)); c.lineTo(this.X(this.xr[1]), this.Y(0));
    c.moveTo(this.X(0), this.Y(this.yr[0])); c.lineTo(this.X(0), this.Y(this.yr[1])); c.stroke();
    if (labels) {
      c.fillStyle = NIGHT.text; c.font = '11px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let x = Math.ceil(this.xr[0] / step) * step; x <= this.xr[1]; x += step) if (Math.abs(x) > 1e-9) c.fillText(fmt(x, step < 1 ? 1 : 0), this.X(x), this.Y(0) + 4);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let y = Math.ceil(this.yr[0] / step) * step; y <= this.yr[1]; y += step) if (Math.abs(y) > 1e-9) c.fillText(fmt(y, step < 1 ? 1 : 0), this.X(0) - 5, this.Y(y));
    }
  }
  curve(fx, t0, t1, n = 400, color = NIGHT.amber, width = 2.4, dash = null) {
    const c = this.ctx; c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []); c.beginPath();
    let pen = false;
    for (let k = 0; k <= n; k++) {
      const t = t0 + (t1 - t0) * k / n, p = fx(t);
      if (!p || !isFinite(p[0]) || !isFinite(p[1]) || Math.abs(p[1]) > 1e4) { pen = false; continue; }
      const X = this.X(p[0]), Y = this.Y(p[1]);
      if (!pen) { c.moveTo(X, Y); pen = true; } else c.lineTo(X, Y);
    }
    c.stroke(); c.setLineDash([]);
  }
  graph(f, color, width, dash) { return this.curve(x => [x, f(x)], this.xr[0], this.xr[1], Math.round(this.w), color, width, dash); }
  dot(x, y, r = 5, color = NIGHT.white, ring = null) {
    const c = this.ctx; c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, 7); c.fillStyle = color; c.fill();
    if (ring) { c.lineWidth = 2; c.strokeStyle = ring; c.stroke(); }
  }
  arrow(x, y, dx, dy, color = NIGHT.white, w = 2, head = 7) {
    const c = this.ctx, X0 = this.X(x), Y0 = this.Y(y), X1 = this.X(x + dx), Y1 = this.Y(y + dy);
    const L = Math.hypot(X1 - X0, Y1 - Y0); if (L < 1) return;
    const ux = (X1 - X0) / L, uy = (Y1 - Y0) / L, hh = Math.min(head, L * .45);
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X1 - ux * hh * .6, Y1 - uy * hh * .6); c.stroke();
    c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X1 - ux * hh - uy * hh * .55, Y1 - uy * hh + ux * hh * .55); c.lineTo(X1 - ux * hh + uy * hh * .55, Y1 - uy * hh - ux * hh * .55); c.closePath(); c.fill();
  }
  label(t, x, y, color = NIGHT.ink, align = 'left', dy = -8) {
    const c = this.ctx; c.font = '600 12px "JetBrains Mono", monospace'; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'bottom'; c.fillText(t, this.X(x), this.Y(y) + dy);
  }
  /* campo scalare: mappa di colore + curve di livello */
  field(f, { levels = 14, heat = true, rampName = 'div', step = 4, zr = null, lineColor = 'rgba(244,246,242,.55)' } = {}) {
    const nx = Math.ceil(this.w / step) + 1, ny = Math.ceil(this.h / step) + 1, v = new Float64Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const [x, y] = this.inv(i * step, j * step); let z = f(x, y); if (!isFinite(z)) z = NaN; v[j * nx + i] = z;
      if (isFinite(z)) { lo = Math.min(lo, z); hi = Math.max(hi, z); }
    }
    if (zr) { lo = zr[0]; hi = zr[1]; }
    else { const vals = Array.from(v).filter(isFinite).sort((a, b) => a - b); lo = vals[Math.floor(vals.length * .03)] ?? lo; hi = vals[Math.floor(vals.length * .97)] ?? hi; }
    if (!(hi > lo)) hi = lo + 1;
    const c = this.ctx;
    if (heat) {
      const R = rampName === 'topo' ? RAMP_TOPO : rampName === 'night' ? RAMP_NIGHT : RAMP_DIV;
      const sym = rampName === 'div' ? Math.max(Math.abs(lo), Math.abs(hi)) : 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const z = v[j * nx + i]; if (!isFinite(z)) continue;
        const t = rampName === 'div' ? .5 + z / (2 * sym || 1) : (z - lo) / (hi - lo);
        c.fillStyle = rgb(ramp(R, t), .85); c.fillRect(i * step - step / 2, j * step - step / 2, step + .6, step + .6);
      }
    }
    c.strokeStyle = lineColor; c.lineWidth = 1;
    for (let k = 1; k < levels; k++) {
      const L = lo + (hi - lo) * k / levels; c.beginPath();
      isoLines(v, nx, ny, L, (x1, y1, x2, y2) => { c.moveTo(x1 * step, y1 * step); c.lineTo(x2 * step, y2 * step); });
      c.stroke();
    }
    return { lo, hi };
  }
}

/* ----- superficie 3D (painter's algorithm) ----- */
class Surface3D {
  constructor(cv, opts = {}) {
    this.cv = cv; this.o = Object.assign({ range: 2, n: 37, yaw: -0.75, elev: 0.62, zclip: null, zscale: null, ramp: 'topo', axes: true, wire: true }, opts);
    this.yaw = this.o.yaw; this.elev = this.o.elev; this.paths = []; this.points = [];
    this.setF(opts.f || ((x, y) => 0));
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!drag) return; this.yaw += (e.clientX - drag[0]) * 0.01; this.elev = clamp(this.elev + (e.clientY - drag[1]) * 0.008, 0.05, 1.5);
      drag = [e.clientX, e.clientY]; this.render();
    });
    const up = () => drag = null; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  setF(f, opts = {}) {
    Object.assign(this.o, opts); this.f = f;
    const { range: a, n } = this.o, xs = [], zs = [];
    for (let k = 0; k <= n; k++) xs.push(-a + 2 * a * k / n);
    const vals = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const z = f(xs[i], xs[j]); zs.push(z); if (isFinite(z)) vals.push(z); }
    vals.sort((p, q) => p - q);
    let lo = vals[0] ?? -1, hi = vals[vals.length - 1] ?? 1;
    if (this.o.zclip) { lo = Math.max(lo, this.o.zclip[0]); hi = Math.min(hi, this.o.zclip[1]); }
    else { lo = vals[Math.floor(vals.length * .02)] ?? lo; hi = vals[Math.floor(vals.length * .98)] ?? hi; }
    if (hi - lo < 1e-6) { hi += .5; lo -= .5; }
    this.xs = xs; this.zs = zs; this.lo = lo; this.hi = hi;
    this.zs2 = this.o.zscale ?? (1.4 * a / (hi - lo));
    this.zmid = 0;
    return this;
  }
  P(x, y, z) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), ce = Math.cos(this.elev), se = Math.sin(this.elev);
    const zz = clamp(z, this.lo, this.hi) * this.zs2;
    const xr = x * cy - y * sy, yr = x * sy + y * cy;
    return [xr, zz * ce + yr * se, yr * ce - zz * se];
  }
  render() {
    const { ctx, w, h } = fitCanvas(this.cv); const c = ctx, a = this.o.range, n = this.o.n;
    c.fillStyle = NIGHT.bg; c.fillRect(0, 0, w, h);
    const sc = Math.min(w, h) / (a * 3.1), cx = w / 2, cyy = h / 2 + h * 0.06;
    const S2 = p => [cx + p[0] * sc, cyy - p[1] * sc];
    const V = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) V.push(this.P(this.xs[i], this.xs[j], this.zs[j * (n + 1) + i]));
    const quads = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * (n + 1) + i, ids = [k, k + 1, k + n + 2, k + n + 1];
      const zq = ids.map(q => this.zs[q]); if (zq.some(z => !isFinite(z))) continue;
      const zm = (zq[0] + zq[1] + zq[2] + zq[3]) / 4;
      quads.push([ids, (V[ids[0]][2] + V[ids[1]][2] + V[ids[2]][2] + V[ids[3]][2]) / 4, zm]);
    }
    quads.sort((p, q) => q[1] - p[1]);
    // pavimento
    if (this.o.axes) {
      c.strokeStyle = NIGHT.grid; c.lineWidth = 1; c.beginPath();
      for (let k = -2; k <= 2; k++) {
        const t = k * a / 2;
        let p = S2(this.P(-a, t, this.lo)), q = S2(this.P(a, t, this.lo)); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
        p = S2(this.P(t, -a, this.lo)); q = S2(this.P(t, a, this.lo)); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
      }
      c.stroke();
    }
    const R = this.o.ramp === 'div' ? RAMP_DIV : RAMP_TOPO;
    for (const [ids, , zm] of quads) {
      const t = (clamp(zm, this.lo, this.hi) - this.lo) / (this.hi - this.lo);
      c.beginPath(); ids.forEach((q, m) => { const p = S2(V[q]); m ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      c.fillStyle = rgb(ramp(R, this.o.ramp === 'div' ? t : t)); c.fill();
      if (this.o.wire) { c.strokeStyle = 'rgba(11,21,28,.38)'; c.lineWidth = .7; c.stroke(); }
    }
    if (this.o.axes) {
      const ax = [[[0, 0, this.lo], [a * 1.15, 0, this.lo], 'x'], [[0, 0, this.lo], [0, a * 1.15, this.lo], 'y'], [[0, 0, this.lo], [0, 0, this.hi + (this.hi - this.lo) * .15], 'z']];
      c.font = '600 12px "JetBrains Mono", monospace'; c.fillStyle = NIGHT.ink;
      for (const [p0, p1, lab] of ax) {
        const A = S2(this.P(...p0)), B = S2(this.P(p1[0], p1[1], lab === 'z' ? p1[2] : this.lo));
        c.strokeStyle = NIGHT.axis; c.lineWidth = 1.3; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
        c.fillText(lab, B[0] + 4, B[1] - 2);
      }
    }
    for (const pth of this.paths) {
      c.strokeStyle = pth.color || NIGHT.white; c.lineWidth = pth.width || 3; c.setLineDash(pth.dash || []); c.beginPath(); let pen = false;
      for (const [x, y, z] of pth.pts) {
        if (!isFinite(z) || Math.abs(x) > a || Math.abs(y) > a) { pen = false; continue; }
        const p = S2(this.P(x, y, z)); if (!pen) { c.moveTo(p[0], p[1]); pen = true; } else c.lineTo(p[0], p[1]);
      }
      c.stroke(); c.setLineDash([]);
    }
    for (const pt of this.points) {
      const p = S2(this.P(pt[0], pt[1], pt[2])); c.beginPath(); c.arc(p[0], p[1], pt[4] || 5, 0, 7); c.fillStyle = pt[3] || NIGHT.white; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = NIGHT.bg; c.stroke();
    }
  }
}
