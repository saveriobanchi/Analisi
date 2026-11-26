/* ============================================================
   map: carta topografica notturna generata da una vera z = f(x,y)
   ============================================================ */
const MAP_LAYOUT = {
  wide: { start: [0.035, 0.66], pts: [[0.10, 0.70], [0.19, 0.53], [0.29, 0.71], [0.385, 0.52], [0.47, 0.69], [0.555, 0.47], [0.645, 0.64], [0.715, 0.43], [0.805, 0.6], [0.865, 0.37]], summit: [0.93, 0.15],
    peaks: [[0.33, 0.30, 1850, .085], [0.6, 0.22, 2550, .07], [0.14, 0.33, 1350, .09], [0.79, 0.86, 1700, .09], [0.52, 0.9, 1150, .1], [0.98, 0.55, 2700, .06], [0.25, 0.92, 900, .1], [0.45, 0.2, 1450, .06]] },
  tall: { start: [0.1, 0.875], pts: [[0.2, 0.81], [0.64, 0.765], [0.24, 0.7], [0.68, 0.645], [0.26, 0.585], [0.7, 0.525], [0.24, 0.465], [0.66, 0.405], [0.24, 0.345], [0.62, 0.285]], summit: [0.84, 0.2],
    peaks: [[0.9, 0.78, 1500, .1], [0.08, 0.6, 1700, .09], [0.92, 0.45, 2300, .08], [0.06, 0.32, 2100, .08], [0.95, 0.12, 2600, .07], [0.5, 0.95, 800, .12]] }
};
function vnoise(x, y) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}
const fbm = (x, y) => vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .28 + vnoise(x * 4.3, y * 4.3) * .17;

class TopoMap {
  constructor(host) {
    this.host = host;
    host.innerHTML = `
      <canvas class="map-canvas" aria-label="Carta topografica del percorso: 10 rifugi fino a Cima Esame"></canvas>
      <canvas class="map-canvas map-over" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true"></canvas>
      <svg class="map-svg" aria-label="Rifugi"></svg>
      <div class="map-title"><div class="eyebrow">Carta della preparazione · Analisi Matematica 2</div>
        <h1 class="h-display">Sali fino a <em>Cima Esame</em></h1></div>
      <div class="map-gps" aria-live="off"></div>
      <div class="map-legend"><b>Legenda</b>Equidistanza 100 m · 3300 m = 33 punti<div class="lg">
        <span><i class="sw" style="background:#F6B23A"></i>1600 m: soglia 16/33</span>
        <span><i class="sw" style="background:linear-gradient(90deg,#FF5446 50%,#fff 50%)"></i>sentiero</span></div></div>`;
    this.cv = host.querySelector('.map-canvas'); this.ov = host.querySelector('.map-over'); this.svg = host.querySelector('.map-svg'); this.gps = host.querySelector('.map-gps');
    this.ro = new ResizeObserver(() => this.schedule()); this.ro.observe(host);
    this.cv.style.pointerEvents = 'auto';
    const move = e => { const r = this.cv.getBoundingClientRect(); this.cursor = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; this.drawOver(); };
    this.cv.addEventListener('pointermove', move); this.cv.addEventListener('pointerdown', move);
    this.cv.addEventListener('pointerleave', () => { this.cursor = null; this.drawOver(); });
  }
  schedule() { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.render()); }
  destroy() { this.ro.disconnect(); }
  z(u, v) {
    const L = this.L, A = this.A;
    let best = 1e9, alt = 300, sp = 0;
    for (let k = 0; k < this.samples.length; k++) { const s = this.samples[k], d = (s[0] - u) * (s[0] - u) * A * A + (s[1] - v) * (s[1] - v); if (d < best) { best = d; alt = s[2]; sp = k; } }
    const d = Math.sqrt(best);
    // rilievo naturale: rumore "ridged" con distorsione del dominio, che cresce verso la cima
    const wu = u * A * 2.6 + 1.7 * (fbm(u * 3.1 + 5.2, v * 3.1 + 1.3) - .5), wv = v * 2.6 + 1.7 * (fbm(u * 3.1 + 9.1, v * 3.1 + 4.7) - .5);
    let rid = 0, amp = .55, fr = 1;
    for (let o = 0; o < 4; o++) { rid += amp * (1 - Math.abs(2 * vnoise(wu * fr, wv * fr) - 1)) ** 2; amp *= .5; fr *= 2.03; }
    const [su, sv] = this.L.start, [tu, tv] = this.L.summit, du = (tu - su) * A, dv = tv - sv;
    const prog = clamp(((u - su) * A * du + (v - sv) * dv) / (du * du + dv * dv), 0, 1.1);
    let nat = 250 + (500 + 2700 * prog) * (.25 + 1.05 * rid);
    for (const [pu, pv, h, s] of L.peaks) { const dd = ((pu - u) * A) ** 2 + (pv - v) ** 2; nat = Math.max(nat, h * Math.exp(-dd / (2 * s * s)) * (.8 + .4 * rid)); }
    const w = Math.exp(-((d / 0.06) ** 2));
    return nat * (1 - w) + (alt + 70 * (rid - .4)) * w;
  }
  render() {
    const { ctx, w, h } = fitCanvas(this.cv); fitCanvas(this.ov);
    this.w = w; this.h = h; this.A = w / h; this.L = this.A >= 1.05 ? MAP_LAYOUT.wide : MAP_LAYOUT.tall;
    const L = this.L;
    const wps = [{ n: 0, name: 'Base · Analisi 1', alt: 300, p: L.start }].concat(CH.map((c, i) => ({ n: c.n, name: c.place, alt: c.alt, p: L.pts[i] || [0.5, 0.5] })))
      .concat([{ n: 99, name: 'Cima Esame', alt: 3300, p: L.summit }]);
    this.wps = wps;
    // campionamento del sentiero (Catmull-Rom) con quota interpolata
    const P = wps.map(w => w.p), samples = [];
    for (let k = 0; k < P.length - 1; k++) {
      const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)];
      for (let t = 0; t < 1; t += 1 / 16) {
        const t2 = t * t, t3 = t2 * t;
        const cr = i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
        samples.push([cr(0), cr(1), wps[k].alt + (wps[k + 1].alt - wps[k].alt) * t]);
      }
    }
    samples.push([...P[P.length - 1], 3300]);
    this.samples = samples;
    // campo di quota
    const step = w > 900 ? 3 : 2.5, nx = Math.ceil(w / step) + 1, ny = Math.ceil(h / step) + 1, Z = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) Z[j * nx + i] = this.z(i * step / w, j * step / h);
    this.grid = { Z, nx, ny, step };
    // tinte ipsometriche + ombreggiatura del rilievo
    const off = document.createElement('canvas'); off.width = nx; off.height = ny; const oc = off.getContext('2d'); const img = oc.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, z = Z[k];
      const zx = (Z[j * nx + Math.min(nx - 1, i + 1)] - Z[j * nx + Math.max(0, i - 1)]) / (2 * step), zy = (Z[Math.min(ny - 1, j + 1) * nx + i] - Z[Math.max(0, j - 1) * nx + i]) / (2 * step);
      const shade = clamp(0.62 + (-zx * 0.7 - zy * 0.7) * 0.05, 0.25, 1.15);
      const c = ramp(RAMP_NIGHT, z / 3400);
      img.data[k * 4] = clamp(c[0] * shade, 0, 255); img.data[k * 4 + 1] = clamp(c[1] * shade, 0, 255); img.data[k * 4 + 2] = clamp(c[2] * shade, 0, 255); img.data[k * 4 + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, nx, ny, -step / 2, -step / 2, nx * step, ny * step);
    // curve di livello
    for (let Lv = 200; Lv < 3400; Lv += 100) {
      const idx = Lv % 500 === 0, soglia = Lv === 1600;
      ctx.beginPath();
      isoLines(Z, nx, ny, Lv, (x1, y1, x2, y2) => { ctx.moveTo(x1 * step, y1 * step); ctx.lineTo(x2 * step, y2 * step); });
      if (soglia) { ctx.strokeStyle = 'rgba(246,178,58,.62)'; ctx.lineWidth = 1.3; ctx.setLineDash([6, 5]); }
      else { ctx.strokeStyle = idx ? 'rgba(232,214,176,.42)' : 'rgba(232,214,176,.17)'; ctx.lineWidth = idx ? 1.3 : .8; ctx.setLineDash([]); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    this.contourLabels(ctx);
    // reticolo e cornice con tacche
    ctx.strokeStyle = 'rgba(220,231,234,.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 1; k < 6; k++) { ctx.moveTo(w * k / 6, 0); ctx.lineTo(w * k / 6, h); }
    for (let k = 1; k < 4; k++) { ctx.moveTo(0, h * k / 4); ctx.lineTo(w, h * k / 4); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,231,234,.45)'; ctx.font = '10px "JetBrains Mono", monospace';
    for (let k = 1; k < 6; k++) { ctx.fillRect(w * k / 6 - .5, h - 7, 1, 7); ctx.fillText(fmt((k / 6 - .5) * 6, 0), w * k / 6 + 3, h - 3); }
    // sentiero
    const prog = this.progress();
    const drawTrail = (from, to, alpha) => {
      if (to <= from) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); samples.slice(from, to + 1).forEach((s, m) => { const X = s[0] * w, Y = s[1] * h; m ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); };
      path(); ctx.strokeStyle = 'rgba(5,10,14,.85)'; ctx.lineWidth = 8; ctx.stroke();
      path(); ctx.strokeStyle = '#F4F6F2'; ctx.lineWidth = 4.2; ctx.stroke();
      path(); ctx.strokeStyle = '#FF4A3D'; ctx.lineWidth = 4.2; ctx.setLineDash([11, 11]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    };
    const reachedIdx = Math.min(samples.length - 1, prog.reached * 16);
    drawTrail(0, reachedIdx, 1); drawTrail(reachedIdx, samples.length - 1, .42);
    // rosa e scala
    const bx = w - 40, by = h - 150;
    if (this.A >= 1.05) {
      ctx.save(); ctx.translate(bx, by); ctx.strokeStyle = 'rgba(220,231,234,.6)'; ctx.fillStyle = 'rgba(220,231,234,.85)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(5, 0); ctx.lineTo(0, -4); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
      ctx.font = '600 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', 0, -26);
      ctx.restore();
    }
    this.drawMarkers(prog);
    this.drawOver();
  }
  contourLabels(ctx) {
    // etichette di quota sulle curve indice lungo il sentiero
    ctx.font = '600 10.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const done = new Set();
    for (let k = 1; k < this.samples.length; k++) {
      const a = this.samples[k - 1], b = this.samples[k];
      for (const Lv of [500, 1000, 1500, 1600, 2000, 2500, 3000]) {
        if (done.has(Lv)) continue;
        if ((a[2] - Lv) * (b[2] - Lv) <= 0) {
          done.add(Lv);
          const lab = Lv === 1600 ? '1600 · soglia' : String(Lv), tw = ctx.measureText(lab).width + 8;
          const X = b[0] * this.w + (Lv === 1600 ? -tw / 2 - 14 : 20), Y = b[1] * this.h + (Lv === 1600 ? 16 : -14);
          ctx.fillStyle = 'rgba(11,21,28,.8)'; ctx.fillRect(X - tw / 2, Y - 7, tw, 14);
          ctx.fillStyle = Lv === 1600 ? '#F6B23A' : 'rgba(232,214,176,.85)'; ctx.fillText(lab, X, Y);
        }
      }
    }
  }
  progress() {
    const per = CH.map(c => {
      const tot = c.lessons.length, done = c.lessons.filter(l => (S.lessons[l.key]?.stars || 0) > 0).length;
      return { n: c.n, done, tot, frac: tot ? done / tot : 0 };
    });
    let reached = 0; per.forEach((p, i) => { if (p.done > 0) reached = i + 1; });
    if (per.length && per.every(p => p.frac === 1) && (S.sims || []).some(s => s.score >= 16)) reached = per.length + 1;
    return { per, reached };
  }
  drawMarkers(prog) {
    const w = this.w, h = this.h, svgNS = 'http://www.w3.org/2000/svg';
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let out = '';
    const next = nextLesson();
    this.wps.forEach(wp => {
      const X = wp.p[0] * w, Y = wp.p[1] * h, wide = this.A >= 1.05;
      const fs = wide ? clamp(w / 1100, .74, 1) : clamp(w / 420, .82, 1);
      let lx, ly, anchor;
      if (wide) { const up = wp.n % 2 === 0; lx = X; anchor = 'middle'; ly = up ? Y - 44 * fs - 4 : Y + 36 * fs + 6; }
      else { const right = wp.p[0] < 0.5; lx = right ? X + 24 : X - 24; anchor = right ? 'start' : 'end'; ly = Y - 2; }
      if (wp.n === 0) {
        out += `<g><circle cx="${X}" cy="${Y}" r="6" fill="#F4F6F2" stroke="#0B151C" stroke-width="2"/><text x="${X - 6}" y="${Y - 12}" fill="#8FA6B0" font-family="Barlow Condensed" font-weight="600" font-size="12" letter-spacing=".08em" paint-order="stroke" stroke="#0B151C" stroke-width="3">BASE · 300 m</text></g>`;
        return;
      }
      if (wp.n === 99) {
        const ok = (S.sims || []).some(s => s.score >= 16);
        out += `<a class="hit" href="#esame" aria-label="Cima Esame, 3300 metri: simulazione d'esame"><g>
          <path d="M${X - 18} ${Y + 14} L${X} ${Y - 16} L${X + 18} ${Y + 14} Z" fill="${ok ? '#F6B23A' : '#12222C'}" stroke="#F4F6F2" stroke-width="2"/>
          <path d="M${X} ${Y - 16} L${X} ${Y - 38}" stroke="#F4F6F2" stroke-width="2"/><path d="M${X} ${Y - 38} L${X + 16} ${Y - 33} L${X} ${Y - 28} Z" fill="#FF4A3D"/>
          <text x="${X - 26}" y="${Y - 2}" text-anchor="end" fill="#fff" font-family="Bodoni Moda" font-style="italic" font-weight="700" font-size="20">Cima Esame</text>
          <text x="${X - 26}" y="${Y + 14}" text-anchor="end" fill="#F6B23A" font-family="JetBrains Mono" font-size="11">3300 m · 33/33</text></g></a>`;
        return;
      }
      const pr = prog.per.find(p => p.n === wp.n) || { frac: 0, done: 0, tot: 0 };
      const isNext = next && next.ch === wp.n;
      const ring = pr.frac === 1 ? '#43C98B' : isNext ? '#F6B23A' : pr.done ? '#F4F6F2' : '#4E6874';
      const R = 15, circ = 2 * Math.PI * (R + 4);
      out += `<a class="hit" href="#cap-${wp.n}" aria-label="Capitolo ${wp.n}, ${esc(wp.name)}, ${wp.alt} metri, ${pr.done} lezioni su ${pr.tot}"><g>
        <circle cx="${X}" cy="${Y}" r="${R + 4}" fill="none" stroke="rgba(78,104,116,.5)" stroke-width="3"/>
        <circle cx="${X}" cy="${Y}" r="${R + 4}" fill="none" stroke="${pr.frac === 1 ? '#43C98B' : '#F6B23A'}" stroke-width="3" stroke-dasharray="${circ * pr.frac} ${circ}" transform="rotate(-90 ${X} ${Y})"/>
        <circle cx="${X}" cy="${Y}" r="${R}" fill="#0B151C" stroke="${ring}" stroke-width="2.2"/>
        <text x="${X}" y="${Y + 6.5}" text-anchor="middle" fill="#fff" font-family="Bodoni Moda" font-style="italic" font-weight="700" font-size="18">${wp.n}</text>
        <text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="#F4F6F2" font-family="Barlow Condensed" font-weight="700" font-size="${14.5 * fs}" letter-spacing=".06em" paint-order="stroke" stroke="#0B151C" stroke-width="4">${esc(wp.name.toUpperCase())}</text>
        <text x="${lx}" y="${ly + 15 * fs}" text-anchor="${anchor}" fill="${isNext ? '#F6B23A' : '#8FA6B0'}" font-family="JetBrains Mono" font-size="${11 * fs}" paint-order="stroke" stroke="#0B151C" stroke-width="3">${isNext ? 'SEI QUI · ' : ''}${wp.alt} m · ${pr.done}/${pr.tot}</text>
      </g></a>`;
    });
    this.svg.innerHTML = out;
  }
  drawOver() {
    const { ctx, w, h } = fitCanvas(this.ov); ctx.clearRect(0, 0, w, h);
    if (!this.grid) return;
    let cur = this.cursor;
    if (!cur) { const nx = nextLesson(); const wp = this.wps.find(p => nx && p.n === nx.ch) || this.wps[1]; cur = wp.p; }
    const [u, v] = cur, z = this.z(u, v), e = 0.004;
    const gu = (this.z(u + e, v) - this.z(u - e, v)) / (2 * e), gv = (this.z(u, v + e) - this.z(u, v - e)) / (2 * e);
    const X = u * w, Y = v * h;
    // curva di livello passante per il cursore
    const { Z, nx, ny, step } = this.grid;
    ctx.beginPath(); isoLines(Z, nx, ny, z, (x1, y1, x2, y2) => { ctx.moveTo(x1 * step, y1 * step); ctx.lineTo(x2 * step, y2 * step); });
    ctx.strokeStyle = 'rgba(98,178,240,.95)'; ctx.lineWidth = 2; ctx.stroke();
    // freccia del gradiente (direzione di massima salita)
    const gx = gu / w, gy = gv / h, gl = Math.hypot(gx, gy) || 1, len = 46;
    const ex = X + gx / gl * len, ey = Y + gy / gl * len;
    ctx.strokeStyle = '#F6B23A'; ctx.fillStyle = '#F6B23A'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ex, ey); ctx.stroke();
    const ang = Math.atan2(ey - Y, ex - X); ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 10 * Math.cos(ang - .4), ey - 10 * Math.sin(ang - .4)); ctx.lineTo(ex - 10 * Math.cos(ang + .4), ey - 10 * Math.sin(ang + .4)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#0B151C'; ctx.lineWidth = 1.5; ctx.stroke();
    // lettura GPS in coordinate matematiche
    const mx = (u - .5) * 6, my = (.5 - v) * 6 / this.A, sx = 6, sy = 6 / this.A;
    const fx = gu / sx, fy = -gv / sy;
    this.gps.innerHTML = `<div><span class="k">x</span> ${fmt(mx)}&nbsp; <span class="k">y</span> ${fmt(my)}</div>
      <div><span class="k">z = f(x,y)</span> ${Math.round(z)} m</div>
      <div><span class="k">∇f</span> (${Math.round(fx)}, ${Math.round(fy)})</div>
      <div class="k" style="font-size:10.5px">${this.cursor ? 'blu: curva di livello · ambra: ∇f' : 'tocca la mappa per misurare'}</div>`;
  }
}
