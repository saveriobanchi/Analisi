/* ============================================================
   views: le schermate dell'app
   ============================================================ */
const NAV = [
  ['mappa', 'Mappa', 'map-trifold'], ['allena', 'Allenamento', 'lightning'], ['esame', 'Simulazione', 'exam'],
  ['lab', 'Laboratori', 'flask'], ['formulario', 'Formulario', 'function'], ['libretto', 'Libretto', 'stamp']
];
const TABS = ['mappa', 'allena', 'esame', 'lab', 'libretto'];
let currentMap = null;

const lessonDone = l => (S.lessons[l.key]?.stars || 0) > 0;
const lessonUnlocked = l => S.settings.unlockAll || l.idx === 1 || lessonDone(chapter(l.ch).lessons[l.idx - 2]);
const bossUnlocked = c => S.settings.unlockAll || c.lessons.every(lessonDone);
function nextLesson() {
  for (const c of CH) for (const l of c.lessons) if (!lessonDone(l) && lessonUnlocked(l)) return { ch: c.n, idx: l.idx, l };
  return null;
}
function navKey(route) {
  if (/^(cap|lez|parete)-/.test(route) || route === 'mappa') return 'mappa';
  if (/^(ripasso|zaino|sprint|teoria|mix)/.test(route) || route === 'allena') return 'allena';
  if (/^lab/.test(route)) return 'lab';
  return route;
}
function refreshChrome() {
  const route = (location.hash.slice(1) || 'mappa'), key = navKey(route), due = dueItems().length;
  $('#railNav').innerHTML = NAV.map(([k, t, ic]) => `<a href="#${k}" ${key === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${t}</span>${k === 'allena' && due ? `<span class="badge" aria-label="${due} da ripassare">${due}</span>` : ''}</a>`).join('');
  $('#tabbar').innerHTML = TABS.map(k => { const [, t, ic] = NAV.find(n => n[0] === k); return `<a href="#${k}" ${key === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${t === 'Allenamento' ? 'Allena' : t === 'Simulazione' ? 'Esame' : t === 'Laboratori' ? 'Lab' : t}</span></a>`; }).join('');
  const r = rankOf(S.xp || 0), pct = clamp(((S.xp || 0) - r.from) / (r.to - r.from) * 100, 0, 100);
  $('#railFoot').innerHTML = `<div class="panel flat" style="padding:12px;gap:8px">
      <div class="row spread"><span class="sign">${esc(r.name)}</span><span class="mono small">${S.xp || 0} m</span></div>
      <div class="meter" role="img" aria-label="Avanzamento verso ${esc(r.next)}"><i style="width:${pct}%"></i></div>
      <div class="row spread small muted"><span>${icon('fire')} ${S.streak.n || 0} giorni</span><span>→ ${esc(r.next)}</span></div>
      <a href="#libretto" class="sync-line" data-sync="line">${syncBadge('line')}</a></div>`;
  $('#topStats').innerHTML = `<span class="stat-chip" title="Quota: punti esperienza">${icon('mountains')}${S.xp || 0} m</span><span class="stat-chip streak" title="Giorni consecutivi">${icon('fire')}${S.streak.n || 0}</span><a class="stat-chip sync-chip" href="#libretto" data-sync="icon">${syncBadge('icon')}</a>`;
}
/* stato del salvataggio: 'icon' solo icona, 'line' riga breve, 'full' riga con dettaglio */
function syncBadge(kind = 'line') {
  const [ic, t, d] = syncLabel(), cls = CLOUD.status === 'cloud' ? 'ok' : CLOUD.status === 'error' || CLOUD.status === 'local' ? 'warn' : '';
  if (kind === 'icon') return `<span class="sync ${cls}" title="${esc(t)}${d ? ' · ' + esc(d) : ''}">${icon(ic)}<span class="sr">${esc(t)}</span></span>`;
  if (kind === 'full') return `<span class="sync ${cls}">${icon(ic)} <b>${esc(t)}</b></span>${d ? `<br><span class="muted small">${esc(d)}</span>` : ''}`;
  return `<span class="sync ${cls}">${icon(ic)} ${esc(t)}</span>`;
}

/* ---------------- MAPPA ---------------- */
function viewMap(v) {
  const nx = nextLesson(), due = dueItems().length, last = S.sims[S.sims.length - 1], pred = predicted();
  const thCount = CH.reduce((s, c) => s + c.theory.length, 0);
  v.innerHTML = `<div class="wrap">
    <div class="map-frame" id="mapHost"></div>
    <div class="cartiglio" aria-label="Cartiglio">
      <div><span>Corso</span><b>Analisi Matematica 2</b></div><div><span>Corso di laurea</span><b>Ing. Meccanica e Gestionale · UniFI</b></div>
      <div><span>Scritto</span><b>13 quesiti: 6 V/F + 7 multipla</b></div><div><span>Soglia</span><b>16/33 + 2 domande di teoria</b></div></div>
    <section class="today">
      <div class="next-card">
        ${nx ? `<div class="eyebrow">Prossima tappa · Capitolo ${nx.ch} · ${esc(chapter(nx.ch).place)}</div>
          <h2 class="h2">${esc(nx.l.key)} · ${esc(nx.l.title)}</h2><p class="muted">${inline(nx.l.goal)}</p>
          <div class="row"><a class="btn primary" href="#lez-${nx.ch}-${nx.idx}">${icon('play')} Riprendi la salita</a><a class="btn ghost" href="#cap-${nx.ch}">Apri il capitolo</a></div>`
        : `<div class="eyebrow">Tutti i sentieri percorsi</div><h2 class="h2">Hai finito le lezioni: ora la cima.</h2><p class="muted">Fai simulazioni d'esame e ripassa lo zaino finché resti sopra 16 con margine.</p>
          <div class="row"><a class="btn primary" href="#esame">${icon('flag-pennant')} Simulazione d'esame</a></div>`}
      </div>
      <div class="quick">
        <a href="#ripasso">${icon('backpack')}<b>Ripasso del giorno</b><span>${due ? `${due} ${due === 1 ? 'domanda sbagliata torna' : 'domande sbagliate tornano'} oggi` : 'Un giro misto di 8 domande'}</span></a>
        <a href="#esame">${icon('exam')}<b>Simulazione</b><span>${last ? `Ultima: ${last.score}/33 ${last.score >= 16 ? '· sopra soglia' : '· sotto soglia'}` : '13 quesiti, timer, punteggio vero'}</span></a>
        <a href="#sprint">${icon('lightning')}<b>Sprint 60 s</b><span>${S.sprintBest ? `Record: ${S.sprintBest}` : 'Vero/Falso a raffica'}</span></a>
        <a href="#teoria">${icon('notebook')}<b>Domande di teoria</b><span>${thCount} risposte modello</span></a>
      </div>
    </section>
    <section class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))">
      <div class="panel"><div class="panel-h"><div class="eyebrow">Profilo altimetrico · padronanza per capitolo</div>
        <span class="chip ${pred === null ? '' : pred >= 16 ? 'ok' : 'red'}">${pred === null ? 'Punteggio stimato: servono più risposte' : 'Punteggio stimato ' + pred + '/33'}</span></div>
        <div class="chart-host" id="profHost"></div><p class="foot-note">Percentuale di risposte giuste nelle ultime 25 domande di ogni capitolo. Il punteggio stimato pesa i capitoli per quanto contano allo scritto.</p></div>
      <div class="panel"><div class="eyebrow">I rifugi</div><div class="trail">${CH.map(c => {
        const tot = c.lessons.length, d = c.lessons.filter(lessonDone).length;
        return `<a class="wp" href="#cap-${c.n}"><span class="n">${c.n}</span><span class="t">${esc(c.short)}</span><span class="s">${esc(c.place)} · ${c.alt} m</span><span class="bar"><i style="width:${tot ? d / tot * 100 : 0}%"></i></span></a>`;
      }).join('')}</div></div>
    </section>
  </div>`;
  if (currentMap) currentMap.destroy();
  currentMap = new TopoMap($('#mapHost'));
  fitChart($('#profHost'), profileChart);
}
/* disegna un grafico SVG alla larghezza reale del contenitore, così il testo resta leggibile anche sul telefono */
function fitChart(host, fn) {
  if (!host) return;
  let last = 0;
  const draw = () => { const w = Math.round(host.clientWidth); if (!w || Math.abs(w - last) < 4) return; last = w; host.innerHTML = fn(Math.max(280, w)); };
  draw();
  const ro = new ResizeObserver(() => { if (!host.isConnected) { ro.disconnect(); return; } draw(); });
  ro.observe(host);
}
function profileChart(W = 640) {
  const H = 210, pl = 34, pr = 10, pt = 16, pb = 30, n = CH.length;
  const X = i => pl + (W - pl - pr) * (i + .5) / n, Y = p => pt + (H - pt - pb) * (1 - p);
  const ms = CH.map(c => mastery(c.n));
  let g = '';
  [0, .25, .5, .75, 1].forEach(p => { g += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${Y(p)}" y2="${Y(p)}"/><text x="${pl - 6}" y="${Y(p) + 4}" text-anchor="end">${p * 100}%</text>`; });
  g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(.6)}" y2="${Y(.6)}" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - pr}" y="${Y(.6) - 5}" text-anchor="end" style="fill:var(--amber-ink)">60%: zona sicura</text>`;
  const pts = ms.map((m, i) => [X(i), Y(m ?? 0), m]);
  const poly = `${pl},${Y(0)} ` + pts.map(p => `${p[0]},${p[1]}`).join(' ') + ` ${W - pr},${Y(0)}`;
  g += `<polygon points="${poly}" fill="var(--blue-soft)" stroke="none"/>`;
  g += `<polyline points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="var(--blue)" stroke-width="2"/>`;
  pts.forEach((p, i) => {
    g += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2] === null ? 3 : 5}" fill="${p[2] === null ? 'var(--line)' : p[2] >= .6 ? 'var(--ok)' : 'var(--red)'}" stroke="var(--sheet)" stroke-width="2"/>`;
    g += `<text x="${p[0]}" y="${H - 10}" text-anchor="middle">${CH[i].n}</text>`;
    if (p[2] !== null) g += `<text x="${p[0]}" y="${p[1] - 9}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${Math.round(p[2] * 100)}</text>`;
  });
  g += `<line class="ax" x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Padronanza per capitolo">${g}</svg>`;
}

/* ---------------- CAPITOLO ---------------- */
function viewChapter(v, n) {
  const c = chapter(n); if (!c) return viewMap(v);
  const done = c.lessons.filter(lessonDone).length, stars = c.lessons.reduce((s, l) => s + (S.lessons[l.key]?.stars || 0), 0);
  const real = c.bank.filter(q => q.real).length, bu = bossUnlocked(c), bb = S.bosses[n];
  v.innerHTML = `<div class="wrap mid">
    <header class="ch-head"><span class="ch-num" aria-hidden="true">${c.n}</span>
      <div class="eyebrow">Capitolo ${c.n} · ${esc(c.place)} · ${c.alt} m</div>
      <h1 class="h-display" style="font-size:clamp(30px,4.6vw,50px)">${esc(c.title)}</h1>
      <div class="ch-meta"><span class="chip ok">${done}/${c.lessons.length} lezioni</span><span class="chip amber">${icon('star')} ${stars}/${c.lessons.length * 3}</span>
        <span class="chip red" title="Media sulle 5 prove complete 2025">≈ ${String(c.weight).replace('.', ',')} quesiti a prova</span>
        <span class="chip">${c.bank.length} quesiti di parete${real ? ` · ${real} da prove reali` : ''}</span></div></header>
    <div class="info2">
      <div class="panel flat"><div class="eyebrow">Voci del programma</div><div class="prose small">${md(c.program)}</div></div>
      <div class="panel"><div class="eyebrow">Cosa chiede l'esame</div><div class="prose small">${md(c.exam)}</div></div></div>
    <section class="lessons" aria-label="Lezioni">
      ${c.lessons.map(l => {
        const un = lessonUnlocked(l), st = S.lessons[l.key]?.stars || 0;
        const tag = un ? 'a' : 'div';
        return `<${tag} class="lesson-row ${lessonDone(l) ? 'done' : ''} ${un ? '' : 'locked'}" ${un ? `href="#lez-${c.n}-${l.idx}"` : 'aria-disabled="true"'}>
          <span class="num">${lessonDone(l) ? icon('check') : un ? l.key : icon('lock')}</span>
          <span><span class="tt">${esc(l.title)}</span><span class="gg" style="display:block">${inline(l.goal)}</span></span>
          ${starsHTML(st)}</${tag}>`;
      }).join('')}
    </section>
    <a class="boss ${bu ? '' : 'locked'}" href="${bu ? '#parete-' + c.n : '#cap-' + c.n}" ${bu ? '' : 'aria-disabled="true"'}>
      ${icon('mountains', 'big')}<span><b>Parete d'esame</b><span>${bu ? `${c.bank.length} quesiti con il punteggio dello scritto${bb ? ` · record ${Math.round(bb.best * 100)}%` : ''}` : 'Si apre quando hai finito le lezioni del capitolo (oppure: Libretto › Sblocca tutto).'}</span></span>
      ${bu ? `<span class="btn primary small">${icon('play')} Attacca</span>` : `<span class="chip">${icon('lock')} chiusa</span>`}</a>
    <div class="grid2">
      <a class="panel flat" href="#teoria-${c.n}" style="text-decoration:none;color:inherit"><div class="row">${icon('notebook')}<b>Domande di teoria del capitolo</b></div><span class="muted small">${c.theory.length} domande aperte con risposta modello e checklist.</span></a>
      <button type="button" class="panel flat" id="openSheet" style="text-align:left;cursor:pointer"><div class="row">${icon('function')}<b>Mappa tascabile del capitolo</b></div><span class="muted small">Le formule e i fatti da avere in testa, in una tabella.</span></button>
    </div>
    <nav class="lesson-nav">${n > 1 ? `<a class="btn ghost" href="#cap-${n - 1}">${icon('arrow-left')} Capitolo ${n - 1}</a>` : '<span></span>'}
      ${n < CH.length ? `<a class="btn ghost" href="#cap-${n + 1}">Capitolo ${n + 1} ${icon('arrow-right')}</a>` : `<a class="btn ghost" href="#esame">Cima Esame ${icon('flag-pennant')}</a>`}</nav>
  </div>`;
  $('#openSheet').onclick = () => openSheet(`<div class="row spread"><div class="eyebrow">Mappa tascabile · Capitolo ${c.n}</div><button class="icon-btn" data-close aria-label="Chiudi">${icon('x')}</button></div>${sheetTable(c)}`);
}
function sheetTable(c, filter = '') {
  const rows = c.sheet.slice(1).filter(r => !filter || r.join(' ').toLowerCase().includes(filter));
  if (!rows.length) return '';
  const head = c.sheet[0] || ['Argomento', 'Da ricordare'];
  return `<div class="tw"><table class="t"><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------------- LEZIONE ---------------- */
const BLK = { idea: ['Idea', 'lightbulb'], def: ['Definizione', 'book-open-text'], thm: ['Teorema', 'seal-check'], method: ['Metodo', 'list-checks'],
  example: ['Esempio svolto', 'pencil-simple-line'], trap: ['Errori da evitare', 'warning'], exam: ["All'esame", 'exam'], note: ['Nota', 'info'], table: ['Tabella', 'list-checks'], lab: ['Laboratorio', 'flask'] };
function renderBlock(b, bi) {
  const [lab, ic] = BLK[b.t] || ['', 'info'];
  const text = b.lines.join('\n');
  let body = '';
  if (b.t === 'method') {
    const steps = [], pre = [];
    b.lines.forEach(l => { if (/^\d+\.\s/.test(l)) steps.push(l.replace(/^\d+\.\s/, '')); else if (/^\s{2,}\S/.test(l) && steps.length) steps[steps.length - 1] += ' ' + l.trim(); else pre.push(l); });
    body = (pre.join('\n').trim() ? `<div class="prose">${md(pre.join('\n'))}</div>` : '') + `<ol class="steps">${steps.map(s => `<li><div>${inline(s)}</div></li>`).join('')}</ol>`;
  } else if (b.t === 'example') {
    const prob = [], steps = []; let ans = '';
    b.lines.forEach(l => {
      if (/^\+\s/.test(l)) { const m = l.slice(2).match(/^([^:]{1,24}):\s?(.*)$/); steps.push(m ? [m[1], m[2]] : ['', l.slice(2)]); }
      else if (/^=\s/.test(l)) ans = l.slice(2);
      else if (steps.length && l.trim()) steps[steps.length - 1][1] += '\n' + l;
      else if (ans && l.trim()) ans += '\n' + l;
      else prob.push(l);
    });
    const probText = [b.head, prob.join('\n')].filter(x => x && x.trim()).join('\n\n');
    body = `<div class="ex-q prose">${md(probText)}</div>
      <dl class="ex-steps" data-ex="${bi}">${steps.map((s, k) => `<div class="ex-step" hidden><dt>${esc(s[0])}</dt><dd class="prose">${md(s[1])}</dd></div>`).join('')}
      ${ans ? `<div class="ex-ans prose" hidden>${md(ans)}</div>` : ''}</dl>
      <div class="row"><button type="button" class="btn small reveal-btn" data-reveal="${bi}">${icon('eye')} Mostra il primo passo</button><button type="button" class="btn ghost small" data-revealall="${bi}">Mostra tutto</button></div>`;
  } else if (b.t === 'table') {
    const rows = b.lines.filter(l => l.trim()).map(l => l.split(' ¦ '));
    body = `<div class="tw"><table class="t"><thead><tr>${(rows[0] || []).map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(x => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  } else if (b.t === 'lab') {
    body = `<div class="lab-mini" data-lab="${esc(b.head)}"></div>`;
  } else body = `<div class="prose">${md(text)}</div>`;
  const head = b.t === 'lab' ? (LABS[b.head.split(' ')[0]]?.title || 'Laboratorio') : b.t === 'example' ? '' : b.head;
  return `<section class="blk ${b.t}"><div class="blk-h">${icon(ic)}<span class="lab">${lab}</span>${head ? `<span class="ttl">${inline(head)}</span>` : ''}${b.lvl ? `<span class="lvl ${b.lvl}">${b.lvl}</span>` : ''}</div><div class="blk-b">${body}</div></section>`;
}
function bindExamples(root) {
  $$('[data-reveal]', root).forEach(btn => btn.onclick = () => {
    const dl = $(`[data-ex="${btn.dataset.reveal}"]`, root); const hid = $$('[hidden]', dl);
    if (hid.length) { hid[0].hidden = false; typeset(hid[0]); }
    const left = $$('[hidden]', dl).length;
    if (!left) { btn.remove(); $(`[data-revealall="${btn.dataset.reveal}"]`, root)?.remove(); } else btn.innerHTML = icon('eye') + ' Passo successivo';
  });
  $$('[data-revealall]', root).forEach(btn => btn.onclick = () => {
    const dl = $(`[data-ex="${btn.dataset.revealall}"]`, root); $$('[hidden]', dl).forEach(x => x.hidden = false); typeset(dl);
    btn.remove(); $(`[data-reveal="${btn.dataset.revealall}"]`, root)?.remove();
  });
}
function viewLesson(v, n, i, tab = 'studio') {
  const c = chapter(n), l = c && c.lessons[i - 1]; if (!l) return viewChapter(v, n);
  if (!lessonUnlocked(l)) { toast('Questa lezione si apre quando completi la precedente.', { icon: 'lock' }); location.hash = 'cap-' + n; return; }
  const prev = c.lessons[i - 2], next = c.lessons[i];
  v.innerHTML = `<div class="wrap narrow">
    <div class="lesson-top"><a class="eyebrow" href="#cap-${n}" style="text-decoration:none">Capitolo ${n} · ${esc(c.place)}</a>
      <h1 class="h2" style="font-size:clamp(28px,4vw,40px)"><span class="mono" style="font-size:.55em;color:var(--red);vertical-align:.35em">${l.key}</span> ${esc(l.title)}</h1>
      <div class="tabs" role="tablist"><button role="tab" type="button" data-tab="studio" aria-selected="${tab === 'studio'}">${'Studio'}</button><button role="tab" type="button" data-tab="prova" aria-selected="${tab === 'prova'}">Prova · ${l.quiz.length}</button></div></div>
    <div id="lessonBody" class="stack"></div></div>`;
  $$('[data-tab]', v).forEach(b => b.onclick = () => viewLesson(v, n, i, b.dataset.tab));
  const body = $('#lessonBody', v);
  if (tab === 'studio') {
    body.innerHTML = `<div class="blocks">
      ${l.goal ? `<div class="goal">${icon('target')}<div><span class="sign muted">Obiettivo</span><div>${inline(l.goal)}</div></div></div>` : ''}
      ${l.blocks.map(renderBlock).join('')}
      <nav class="lesson-nav">${prev ? `<a class="btn ghost" href="#lez-${n}-${i - 1}">${icon('arrow-left')} ${prev.key}</a>` : `<a class="btn ghost" href="#cap-${n}">${icon('arrow-left')} Capitolo</a>`}
        <button type="button" class="btn primary" id="toProva">${icon('target')} Mettiti alla prova · ${l.quiz.length} domande</button></nav></div>`;
    bindExamples(body);
    $$('.lab-mini', body).forEach(el => { const [name, ...kv] = el.dataset.lab.split(/\s+/); const p = Object.fromEntries(kv.map(s => s.split('='))); LABS[name] && LABS[name].mini(el, p); });
    $('#toProva', body).onclick = () => { S.studied[l.key] = true; save(); viewLesson(v, n, i, 'prova'); window.scrollTo({ top: 0 }); };
    typeset(body);
  } else {
    runQuiz(body, {
      items: l.quiz, title: 'Prova ' + l.key, onDone: r => {
        const prevStars = S.lessons[l.key]?.stars || 0, stars = starsFor(r.frac), gained = Math.max(0, stars - prevStars);
        S.lessons[l.key] = { stars: Math.max(prevStars, stars), best: Math.max(S.lessons[l.key]?.best || 0, r.frac), t: Date.now() };
        if (gained) addXP(gained * 40); save();
        if (stars > 0) { checkChapterStamps(n); }
        if (stars === 3) SFX.fanfare();
        const nx = next && lessonUnlocked(next) ? `#lez-${n}-${i + 1}` : null;
        body.innerHTML = `<div class="result">
          <div class="eyebrow">Prova ${l.key} completata</div>
          <div class="score">${r.right}<small>/${r.total}</small></div>${starsHTML(stars)}
          <p class="muted">${stars === 3 ? 'Percorso pulito: tutte giuste.' : stars ? 'Lezione superata. Le sbagliate sono nello zaino e tornano nei prossimi giorni.' : 'Serve almeno metà delle risposte giuste per la prima stella. Rileggi lo studio e riprova.'}${gained ? ` <b>+${gained * 40} m</b> di quota.` : ''}</p>
          <div class="row" style="justify-content:center">
            <button type="button" class="btn ghost" id="again">${icon('arrow-counter-clockwise')} Riprova</button>
            ${nx ? `<a class="btn primary" href="${nx}">Prossima lezione ${icon('arrow-right')}</a>` : `<a class="btn primary" href="#cap-${n}">Torna al capitolo ${icon('arrow-right')}</a>`}</div></div>
          <h2 class="h3" style="margin-top:8px">Correzione</h2>${reviewHTML(r.items, r.res)}`;
        $('#again', body).onclick = () => viewLesson(v, n, i, 'prova');
        typeset(body); refreshChrome();
      }
    });
  }
}

/* ---------------- PARETE (boss di capitolo) ---------------- */
function viewBoss(v, n) {
  const c = chapter(n); if (!c) return viewMap(v);
  if (!bossUnlocked(c)) { location.hash = 'cap-' + n; return; }
  // ogni attacco estrae un mini-scritto: fino a 6 V/F e 7 multiple, privilegiando i quesiti delle prove reali
  const pickBoss = () => {
    const take = (k, n2) => { const real = shuffle(c.bank.filter(q => q.k === k && q.real)), other = shuffle(c.bank.filter(q => q.k === k && !q.real)); const nr = Math.min(real.length, Math.ceil(n2 * .7)); return real.slice(0, nr).concat(other).concat(real.slice(nr)).slice(0, n2); };
    return shuffle(take('vf', 6).concat(take('mc', 7)));
  };
  const items = pickBoss(), max = items.reduce((s, q) => s + (q.k === 'vf' ? 2 : 3), 0);
  v.innerHTML = `<div class="wrap narrow"><a class="eyebrow" href="#cap-${n}" style="text-decoration:none">Capitolo ${n} · ${esc(c.place)}</a>
    <h1 class="h-display" style="font-size:clamp(32px,5vw,52px)">Parete d'esame <em>${n}</em></h1>
    <div id="bossBody" class="stack"></div></div>`;
  const body = $('#bossBody', v);
  body.innerHTML = `<div class="rules">
      <div class="rule"><b>${items.length}</b><span>quesiti estratti a ogni attacco, su ${c.bank.length} della parete</span></div>
      <div class="rule"><b>+2 / −1</b><span>Vero/Falso</span></div><div class="rule"><b>+3 / −1</b><span>risposta multipla</span></div>
      <div class="rule"><b>0</b><span>se salti: rispondi solo quando puoi escludere qualcosa</span></div></div>
    <p class="muted">${c.bank.filter(q => q.real).length} quesiti della parete vengono dalle prove reali, con la risposta della chiave ufficiale, e hanno la precedenza nell'estrazione. Per il timbro serve il 60% dei punti (${Math.ceil(max * .6)}/${max}).</p>
    <div class="row"><button type="button" class="btn primary" id="startBoss">${icon('play')} Attacca la parete</button></div>`;
  $('#startBoss').onclick = () => runQuiz(body, {
    items, title: 'Parete ' + n, mode: 'boss', allowSkip: true, onDone: r => {
      const frac = Math.max(0, r.points) / max, prev = S.bosses[n]?.best || 0;
      S.bosses[n] = { best: Math.max(prev, frac), t: Date.now() }; save();
      if (frac >= .6) award('par' + n);
      body.innerHTML = `<div class="result"><div class="eyebrow">Parete ${n}</div><div class="score">${r.points}<small>/${max}</small></div>
        <p class="muted">${r.right} giuste su ${r.total}. ${frac >= .6 ? 'Parete superata.' : 'Sotto il 60%: rileggi le correzioni e riprova domani, lo zaino ti riproporrà gli errori.'}</p>
        <div class="row" style="justify-content:center"><button type="button" class="btn ghost" id="again">${icon('arrow-counter-clockwise')} Riprova</button><a class="btn primary" href="#cap-${n}">Torna al capitolo</a></div></div>
        <h2 class="h3">Correzione</h2>${reviewHTML(r.items, r.res)}`;
      $('#again', body).onclick = () => viewBoss(v, n); typeset(body); refreshChrome();
    }
  });
}

/* ---------------- ALLENAMENTO ---------------- */
function viewAllena(v) {
  const due = dueItems().length, z = Object.keys(S.srs).length;
  v.innerHTML = `<div class="wrap mid">
    <div><div class="eyebrow">Allenamento</div><h1 class="h-display">Gambe e <em>fiato</em></h1>
    <p class="lead">Le lezioni insegnano, qui si consolida. Fai il ripasso del giorno ogni giorno: è il modo più rapido per non dimenticare.</p></div>
    <div class="grid2">
      <a class="next-card" href="#ripasso" style="text-decoration:none;color:inherit">${icon('backpack', 'big')}<h2 class="h2">Ripasso del giorno</h2>
        <p class="muted">${due ? `${due} domande sbagliate tornano oggi, più qualche domanda nuova dalle lezioni che hai fatto.` : 'Nessun errore in scadenza: 8 domande miste dalle lezioni che hai già fatto.'}</p><span class="btn primary">${icon('play')} Inizia</span></a>
      <div class="quick" style="grid-template-columns:1fr">
        <a href="#zaino">${icon('backpack')}<b>Zaino degli errori</b><span>${z} domande dentro · ogni risposta giusta le fa salire di livello, al quinto escono</span></a>
        <a href="#sprint">${icon('lightning')}<b>Sprint 60 secondi</b><span>Vero/Falso a raffica: +1 giusta, −1 sbagliata${S.sprintBest ? ` · record ${S.sprintBest}` : ''}</span></a>
        <a href="#teoria">${icon('notebook')}<b>Domande di teoria</b><span>Scrivi la risposta, poi confrontala con il modello</span></a>
      </div></div>
    <section class="panel"><div class="eyebrow">Mix su misura</div><p class="muted small">Scegli i capitoli e quante domande: arrivano mescolate, lezioni e pareti insieme.</p>
      <div class="row" id="mixCh">${CH.map(c => `<button type="button" class="chip" data-c="${c.n}" aria-pressed="false" style="cursor:pointer">${c.n} · ${esc(c.short)}</button>`).join('')}</div>
      <div class="row"><div class="seg" id="mixN">${[10, 20, 30].map((k, i) => `<button type="button" data-n="${k}" aria-pressed="${i === 0}">${k}</button>`).join('')}</div>
        <label class="row small"><span class="switch"><input type="checkbox" id="mixReal"><span></span></span>solo prove reali</label>
        <button type="button" class="btn primary" id="mixGo">${icon('shuffle')} Mescola</button></div></section>
  </div>`;
  const sel = new Set();
  $$('#mixCh [data-c]').forEach(b => b.onclick = () => { const k = +b.dataset.c; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute('aria-pressed', sel.has(k)); b.classList.toggle('red', sel.has(k)); });
  let N = 10; $$('#mixN button').forEach(b => b.onclick = () => { N = +b.dataset.n; $$('#mixN button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#mixGo').onclick = () => {
    const realOnly = $('#mixReal').checked;
    const pool = allQuestions(q => (!sel.size || sel.has(q.ch)) && (!realOnly || q.real));
    if (!pool.length) { toast('Nessuna domanda con questi filtri.', { icon: 'warning' }); return; }
    const items = sample(pool, Math.min(N, pool.length));
    v.innerHTML = `<div class="wrap narrow"><div id="mixBody" class="stack"></div></div>`;
    runQuiz($('#mixBody'), { items, title: 'Mix', onDone: r => showSimpleResult($('#mixBody'), r, 'Mix completato', '#allena') });
  };
}
function showSimpleResult(host, r, title, back) {
  host.innerHTML = `<div class="result"><div class="eyebrow">${esc(title)}</div><div class="score">${r.right}<small>/${r.total}</small></div>
    <p class="muted">${r.total - r.right ? `Le ${r.total - r.right} sbagliate sono nello zaino.` : 'Nessun errore.'}</p>
    <div class="row" style="justify-content:center"><a class="btn primary" href="${back}">Continua</a></div></div><h2 class="h3">Correzione</h2>${reviewHTML(r.items, r.res)}`;
  typeset(host); refreshChrome();
}
function viewRipasso(v) {
  let items = dueItems().slice(0, 15);
  if (items.length < 8) {
    const studied = new Set(Object.keys(S.lessons).filter(k => S.lessons[k].stars > 0));
    const pool = allQuestions(q => (q.lesson && studied.has(q.lesson)) && !items.includes(q));
    const fallback = allQuestions(q => q.lesson === '1.1' && !items.includes(q));
    items = items.concat(sample(pool.length ? pool : fallback, 8 - items.length));
  }
  const fromZaino = dueItems().length;
  v.innerHTML = `<div class="wrap narrow"><div class="eyebrow">Ripasso del giorno · ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div id="rb" class="stack"></div></div>`;
  runQuiz($('#rb'), { items, title: 'Ripasso', mode: 'review', onDone: r => { if (r.right === r.total && fromZaino >= 3) award('zaino'); showSimpleResult($('#rb'), r, 'Ripasso completato', '#allena'); } });
}
function viewZaino(v) {
  const entries = Object.entries(S.srs).filter(([id]) => Q[id]);
  const by = {}; entries.forEach(([id, it]) => { const q = Q[id]; (by[q.ch] = by[q.ch] || []).push([q, it]); });
  v.innerHTML = `<div class="wrap mid"><div class="row spread"><div><div class="eyebrow">Zaino degli errori</div><h1 class="h2">${entries.length} domande da riportare a valle</h1></div>
    ${entries.length ? `<a class="btn primary" href="#ripasso">${icon('play')} Ripassa ora</a>` : ''}</div>
    <p class="muted">Ogni domanda sbagliata entra qui al livello 1. Quando la rifai giusta sale di livello e torna dopo 1, 3, 7, 16 giorni; al quinto livello esce dallo zaino.</p>
    ${entries.length ? Object.keys(by).sort((a, b) => a - b).map(ch => `<section class="panel flat"><div class="eyebrow">Capitolo ${ch} · ${esc(chapter(ch).short)}</div>
      <div class="review">${by[ch].map(([q, it]) => `<div class="rv ko"><span class="m">${it.box + 1}</span><details><summary>${inline(clip(q.Q, 150))}</summary><div>${feedbackHTML(q, false)}</div></details>
      <span class="small muted mono" style="grid-column:2">${it.due <= dayNum() ? 'da ripassare oggi' : 'torna tra ' + (it.due - dayNum()) + ' g'} · sbagliata ${it.wrong}×</span></div>`).join('')}</div></section>`).join('')
      : `<div class="empty">${icon('backpack')}<b>Zaino vuoto</b><span class="muted">Le domande che sbagli finiscono qui e tornano nei giorni giusti.</span><a class="btn" href="#mappa">Vai alla mappa</a></div>`}
    ${entries.length ? `<div class="row"><button type="button" class="btn ghost small" id="emptyZ">${icon('x')} Svuota lo zaino</button></div>` : ''}</div>`;
  typeset(v);
  const b = $('#emptyZ'); if (b) b.onclick = () => { const old = S.srs; S.srs = {}; save(); viewZaino(v); refreshChrome(); toast('Zaino svuotato.', { icon: 'backpack', action: 'Annulla', ms: 6000, onAction: () => { S.srs = old; save(); viewZaino(v); refreshChrome(); } }); };
}

/* ---------------- SPRINT ---------------- */
function viewSprint(v) {
  v.innerHTML = `<div class="wrap narrow"><div class="sprint-stage" id="sp">
    <div class="eyebrow">Sprint · 60 secondi</div><div class="sprint-clock">60</div>
    <p class="lead" style="text-align:center">Vero/Falso a raffica su tutto quello che hai già studiato. Giusta +1, sbagliata −1. Tasti V e F.</p>
    <button type="button" class="btn primary" id="spGo">${icon('lightning')} Via</button>${S.sprintBest ? `<span class="muted">Record: ${S.sprintBest}</span>` : ''}</div></div>`;
  $('#spGo').onclick = () => startSprint($('#sp'));
}
function startSprint(host) {
  const studied = new Set(Object.keys(S.lessons).filter(k => S.lessons[k].stars > 0));
  let pool = allQuestions(q => q.k === 'vf' && (!studied.size || (q.lesson ? studied.has(q.lesson) : studied.has(q.ch + '.1'))));
  if (pool.length < 10) pool = allQuestions(q => q.k === 'vf' && q.ch <= 2);
  pool = shuffle(pool);
  let i = 0, score = 0, t = 60, wrong = [], lock = false;
  const end = Date.now() + 60000;
  const draw = () => {
    const q = pool[i % pool.length];
    host.innerHTML = `<div class="row spread" style="width:100%"><span class="sprint-clock" id="clk" style="font-size:64px">${t}</span><span class="kpi"><b id="sc">${score}</b><span>punti</span></span></div>
      <div class="qcard sprint-q">${renderQuestion(q)}</div>`;
    bindOptions(host, q, val => {
      if (lock) return; lock = true; const ok = val === q.ans; score += ok ? 1 : -1; record(q, ok, 'sprint'); ok ? SFX.ok() : SFX.ko();
      if (!ok) wrong.push(q); markOptions(host, q, val);
      setTimeout(() => { lock = false; i++; if (Date.now() < end) draw(); }, ok ? 260 : 900);
    });
    typeset(host);
  };
  const timer = setInterval(() => {
    t = Math.max(0, Math.ceil((end - Date.now()) / 1000)); const c = $('#clk', host); if (c) c.textContent = t;
    if (t <= 0) { clearInterval(timer); setKeys(null); finish(); }
  }, 250);
  setKeys(e => { const k = e.key.toLowerCase(); if (k === 'v' || k === 'f') { $(`.opt[data-v="${k === 'v'}"]`, host)?.click(); } });
  const finish = () => {
    const rec = score > (S.sprintBest || 0); if (rec) S.sprintBest = score; addXP(Math.max(0, score) * 5); save();
    if (score >= 15) award('sprint15');
    host.innerHTML = `<div class="result" style="width:100%"><div class="eyebrow">Tempo scaduto</div><div class="score">${score}</div>
      <p class="muted">${rec ? 'Nuovo record.' : 'Record: ' + S.sprintBest}</p><div class="row" style="justify-content:center"><button type="button" class="btn primary" id="spAgain">${icon('arrow-counter-clockwise')} Ancora</button><a class="btn ghost" href="#allena">Allenamento</a></div></div>
      ${wrong.length ? `<h2 class="h3" style="justify-self:start">Le sbagliate</h2><div class="review" style="width:100%">${wrong.map((q, k) => `<div class="rv ko"><span class="m">${k + 1}</span><div><div class="prose">${md(q.Q)}</div>${feedbackHTML(q, false)}</div></div>`).join('')}</div>` : ''}`;
    $('#spAgain', host).onclick = () => startSprint(host); typeset(host); refreshChrome();
  };
  draw();
}

/* ---------------- TEORIA ---------------- */
function viewTeoria(v, onlyCh = null) {
  const list = CH.filter(c => !onlyCh || c.n === onlyCh).flatMap(c => c.theory);
  const done = Object.keys(S.theory).length;
  v.innerHTML = `<div class="wrap narrow"><div class="eyebrow">Domande di teoria${onlyCh ? ' · Capitolo ' + onlyCh : ''}</div>
    <h1 class="h-display">Le due domande <em>aperte</em></h1>
    <p class="lead">All'appello ci sono due domande di teoria. Si risponde con definizioni ed enunciati precisi, ipotesi comprese, e un esempio o controesempio. Niente dimostrazioni.</p>
    <div class="row"><button type="button" class="btn primary" id="draw2">${icon('cards')} Estrai 2 domande come all'esame</button>${onlyCh ? `<a class="btn ghost" href="#teoria">Tutti i capitoli</a>` : ''}<span class="muted small">${done} autovalutate</span></div>
    <div id="thBody" class="lessons">${list.map(q => {
      const r = S.theory[q.id];
      return `<button type="button" class="lesson-row" data-q="${q.id}" style="text-align:left;cursor:pointer"><span class="num">${q.ch}</span><span><span class="tt">${inline(q.Q)}</span></span>
        ${r ? `<span class="chip ${r.score >= .75 ? 'ok' : r.score >= .4 ? 'amber' : 'red'}">${Math.round(r.score * 100)}%</span>` : `<span class="chip">da fare</span>`}</button>`;
    }).join('')}</div></div>`;
  $$('[data-q]', v).forEach(b => b.onclick = () => theoryCard(v, [Q[b.dataset.q]], 0, onlyCh));
  $('#draw2').onclick = () => { const pool = list.length >= 2 ? list : CH.flatMap(c => c.theory); theoryCard(v, sample(pool, 2), 0, onlyCh); };
  typeset(v);
}
function theoryCard(v, qs, k, onlyCh) {
  const q = qs[k];
  v.innerHTML = `<div class="wrap narrow"><div class="row spread"><div class="eyebrow">Domanda ${k + 1} di ${qs.length} · Capitolo ${q.ch}</div><a class="btn ghost small" href="#teoria${onlyCh ? '-' + onlyCh : ''}">${icon('x')} Chiudi</a></div>
    <div class="qcard th-card"><div class="qtext prose">${md(q.Q)}</div>
      <label for="thAns" class="sign muted">La tua risposta (resta solo su questo dispositivo)</label>
      <textarea id="thAns" class="answer" placeholder="Definizione, ipotesi, tesi, esempio o controesempio…"></textarea>
      <div class="row"><button type="button" class="btn primary" id="showModel">${icon('eye')} Confronta con la risposta modello</button></div>
      <div id="modelBox" hidden></div></div></div>`;
  const key = 'th-draft-' + q.id; try { $('#thAns').value = sessionStorage.getItem(key) || ''; } catch (e) { }
  $('#thAns').oninput = e => { try { sessionStorage.setItem(key, e.target.value); } catch (er) { } };
  $('#showModel').onclick = () => {
    const box = $('#modelBox'); box.hidden = false; $('#showModel').remove();
    box.innerHTML = `<div class="model prose">${md(q.A)}</div>
      <div class="sign">Nella tua risposta c'era…</div><ul class="checklist">${q.K.map((kk, j) => `<li><label><input type="checkbox" data-k="${j}"><span>${inline(kk)}</span></label></li>`).join('')}</ul>
      <div class="row"><button type="button" class="btn primary" id="saveTh">${k < qs.length - 1 ? 'Salva e vai alla prossima' : 'Salva'} ${icon('arrow-right')}</button></div>`;
    $('#saveTh').onclick = () => {
      const tot = q.K.length || 1, got = $$('#modelBox input:checked').length;
      S.theory[q.id] = { score: got / tot, t: Date.now() }; addXP(10 + got * 5); save();
      if (Object.keys(S.theory).length >= 10) award('teoria');
      if (k < qs.length - 1) theoryCard(v, qs, k + 1, onlyCh); else viewTeoria(v, onlyCh);
    };
    typeset(box);
  };
  typeset(v);
}

/* ---------------- SIMULAZIONE D'ESAME ---------------- */
function buildExam(realOnly) {
  const seen = new Set(), key = q => q.Q.replace(/\s+/g, ' ').trim();
  const pick = (k, n) => {
    const out = [];
    for (let t = 0; t < n; t++) {
      const cands = CH.map(c => ({ c, pool: allQuestions(q => q.ch === c.n && q.k === k && (!realOnly || q.real) && !seen.has(key(q))) })).filter(x => x.pool.length);
      if (!cands.length) break;
      const tot = cands.reduce((s, x) => s + x.c.weight, 0); let r = Math.random() * tot, chosen = cands[0];
      for (const x of cands) { r -= x.c.weight; if (r <= 0) { chosen = x; break; } }
      const realFirst = chosen.pool.filter(q => q.real), pool = realFirst.length && Math.random() < .6 ? realFirst : chosen.pool;
      const q = pool[Math.floor(Math.random() * pool.length)]; seen.add(key(q)); out.push(q);
    }
    return out;
  };
  return pick('vf', 6).concat(pick('mc', 7));
}
function viewEsame(v) {
  const hist = S.sims.slice(-12);
  v.innerHTML = `<div class="wrap mid">
    <div><div class="eyebrow">Cima Esame · 3300 m</div><h1 class="h-display">Simulazione dello <em>scritto</em></h1>
    <p class="lead">Stessa struttura della prova: puoi saltare, tornare indietro e cambiare le risposte fino alla consegna. Le soluzioni arrivano alla fine.</p></div>
    <div class="rules"><div class="rule"><b>13</b><span>quesiti: 6 Vero/Falso e 7 a risposta multipla</span></div><div class="rule"><b>+2 / −1</b><span>Vero/Falso</span></div>
      <div class="rule"><b>+3 / −1</b><span>multipla; l'ultima opzione è sempre «Nessuna delle precedenti»</span></div><div class="rule"><b>16/33</b><span>soglia; all'appello si aggiungono 2 domande di teoria</span></div></div>
    <p class="foot-note">Punteggio delle prove cartacee 2025. Nei test online di luglio 2026 il Vero/Falso valeva 1 punto (massimo 27).</p>
    <div class="panel"><div class="set-row"><span><b>Tempo</b><br><span class="muted small">Il default di 45 minuti è una stima: usa quello del tuo appello se lo conosci.</span></span>
      <div class="seg" id="tSel">${[30, 45, 60, 90, 0].map(m => `<button type="button" data-m="${m}" aria-pressed="${S.settings.timer === m}">${m ? m + "'" : '∞'}</button>`).join('')}</div></div>
      <div class="set-row"><span><b>Domande</b><br><span class="muted small">Il mix pesa i capitoli come allo scritto. «Solo prove reali» usa solo i quesiti delle prove ufficiali.</span></span>
      <div class="seg" id="srcSel"><button type="button" data-r="0" aria-pressed="true">Tutto il programma</button><button type="button" data-r="1" aria-pressed="false">Solo prove reali</button></div></div>
      <div class="row"><button type="button" class="btn primary" id="examGo">${icon('flag-pennant')} Inizia la simulazione</button></div></div>
    ${hist.length ? `<section class="panel"><div class="eyebrow">Le tue simulazioni</div><div class="chart-host" id="simHost"></div>${simTable()}</section>` : ''}
  </div>`;
  $$('#tSel button').forEach(b => b.onclick = () => { S.settings.timer = +b.dataset.m; save(); $$('#tSel button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  let realOnly = false; $$('#srcSel button').forEach(b => b.onclick = () => { realOnly = b.dataset.r === '1'; $$('#srcSel button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#examGo').onclick = () => runExam(v, buildExam(realOnly));
  if (hist.length) fitChart($('#simHost'), w => simChart(hist, w));
}
/* storico delle simulazioni salvate (più recenti in alto) e capitoli più deboli nelle simulazioni */
function simTable() {
  const rows = S.sims.slice().reverse().slice(0, 12);
  const agg = {}; S.sims.forEach(s => Object.entries(s.ch || {}).forEach(([c, [ok, tot]]) => { const a = agg[c] = agg[c] || [0, 0]; a[0] += ok; a[1] += tot; }));
  const weak = Object.entries(agg).filter(([, [, t]]) => t >= 3).map(([c, [o, t]]) => [c, o / t, t]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return `<div class="tw"><table class="t"><thead><tr><th>Data</th><th>Punti</th><th>V/F giuste</th><th>Multiple giuste</th><th>Sbagliate</th><th>Bianche</th></tr></thead><tbody>
    ${rows.map(s => `<tr><td>${new Date(s.t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} ${new Date(s.t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
      <td><b class="mono" style="color:${s.score >= 16 ? 'var(--ok)' : 'var(--bad)'}">${s.score}</b>/33</td>
      <td class="mono">${s.vf ? s.vf[0] + '/6' : '—'}</td><td class="mono">${s.mc ? s.mc[0] + '/7' : '—'}</td>
      <td class="mono">${s.vf ? s.vf[1] + s.mc[1] : '—'}</td><td class="mono">${s.vf ? s.vf[2] + s.mc[2] : '—'}</td></tr>`).join('')}</tbody></table></div>
    ${weak.length ? `<p class="small"><b>Dove perdi più punti nelle simulazioni:</b> ${weak.map(([c, p]) => `<a href="#cap-${c}">cap. ${c} · ${esc(chapter(c)?.short || '')}</a> (${Math.round(p * 100)}% giuste)`).join(' · ')}</p>` : ''}`;
}
function simChart(hist, W = 640) {
  const H = 200, pl = 30, pr = 12, pt = 14, pb = 28, n = hist.length;
  const X = i => pl + (W - pl - pr) * (n === 1 ? .5 : i / (n - 1)), Y = s => pt + (H - pt - pb) * (1 - (s + 13) / 46);
  let g = '';
  [-13, 0, 16, 33].forEach(s => { g += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${Y(s)}" y2="${Y(s)}"/><text x="${pl - 5}" y="${Y(s) + 4}" text-anchor="end">${s}</text>`; });
  g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(16)}" y2="${Y(16)}" stroke="var(--amber)" stroke-width="1.6" stroke-dasharray="6 4"/><text x="${W - pr}" y="${Y(16) - 5}" text-anchor="end" style="fill:var(--amber-ink)">soglia 16</text>`;
  g += `<polyline points="${hist.map((h, i) => X(i) + ',' + Y(h.score)).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
  hist.forEach((h, i) => { g += `<circle cx="${X(i)}" cy="${Y(h.score)}" r="5" fill="${h.score >= 16 ? 'var(--ok)' : 'var(--red)'}" stroke="var(--sheet)" stroke-width="2"/><text x="${X(i)}" y="${Y(h.score) - 9}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${h.score}</text><text x="${X(i)}" y="${H - 8}" text-anchor="middle">${new Date(h.t).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Punteggi delle simulazioni">${g}</svg>`;
}
function runExam(v, items) {
  const st = { i: 0, ans: items.map(() => null), flag: items.map(() => false), start: Date.now(), end: S.settings.timer ? Date.now() + S.settings.timer * 60000 : null, done: false };
  let timer = null;
  const draw = () => {
    const q = items[st.i];
    v.innerHTML = `<div class="wrap narrow">
      <div class="exam-bar"><span class="timer" id="tmr">${icon('timer')}<span>${st.end ? '' : '∞'}</span></span>
        <div class="qgrid" aria-label="Quesiti">${items.map((_, k) => `<button type="button" data-j="${k}" class="${st.ans[k] !== null ? 'ans' : ''} ${k === st.i ? 'cur' : ''} ${st.flag[k] ? 'flag' : ''}" aria-label="Quesito ${k + 1}">${k + 1}</button>`).join('')}</div>
        <button type="button" class="btn primary small" id="consegna">Consegna</button></div>
      <div class="qcard" id="qc"><div class="row spread"><span class="sign">Quesito ${st.i + 1} di ${items.length}</span>
        <button type="button" class="btn ghost small" id="flagB" aria-pressed="${st.flag[st.i]}">${icon('flag-pennant')} ${st.flag[st.i] ? 'Segnato' : 'Segna per dopo'}</button></div>
        ${renderQuestion(q, { selected: st.ans[st.i] }).replace(/<span class="chip red">[\s\S]*?<\/span>/, '')}
        <p class="small muted">Tocca di nuovo un'opzione scelta per lasciarla in bianco (0 punti).</p>
        <div class="qactions"><button type="button" class="btn ghost grow" id="prevQ" ${st.i ? '' : 'disabled'}>${icon('arrow-left')} Precedente</button>
          <button type="button" class="btn" id="nextQ">${st.i < items.length - 1 ? 'Successivo ' + icon('arrow-right') : 'Rivedi e consegna'}</button></div></div></div>`;
    $$('.opt', v).forEach(b => b.onclick = () => {
      const val = q.k === 'vf' ? b.dataset.v === 'true' : parseInt(b.dataset.v, 10);
      st.ans[st.i] = st.ans[st.i] === val ? null : val; draw();
    });
    $$('.qgrid button', v).forEach(b => b.onclick = () => { st.i = +b.dataset.j; draw(); });
    $('#flagB').onclick = () => { st.flag[st.i] = !st.flag[st.i]; draw(); };
    $('#prevQ').onclick = () => { st.i--; draw(); };
    $('#nextQ').onclick = () => { if (st.i < items.length - 1) { st.i++; draw(); } else confirmSubmit(); };
    $('#consegna').onclick = confirmSubmit;
    tick(); typeset(v);
  };
  const tick = () => {
    if (!st.end) return; const left = Math.max(0, st.end - Date.now()), el = $('#tmr span');
    if (el) { el.textContent = String(Math.floor(left / 60000)).padStart(2, '0') + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); $('#tmr').classList.toggle('low', left < 5 * 60000); }
    if (left <= 0 && !st.done) submit(true);
  };
  const confirmSubmit = () => {
    const blank = st.ans.filter(a => a === null).length;
    openSheet(`<h2 class="h3">Consegnare la prova?</h2><p>${blank ? `Hai ${blank} quesiti in bianco (valgono 0).` : 'Hai risposto a tutti i quesiti.'} Dopo la consegna non puoi più cambiare le risposte.</p>
      <div class="row"><button type="button" class="btn ghost" data-close>Torna alla prova</button><button type="button" class="btn primary" id="okSub">Consegna</button></div>`, (card, close) => { $('#okSub', card).onclick = () => { close(); submit(false); }; });
  };
  const submit = (timeout) => {
    st.done = true; clearInterval(timer); setKeys(null);
    let score = 0; const res = items.map((q, k) => {
      const a = st.ans[k]; if (a === null) return { skip: true, ok: false };
      const ok = isRight(q, a); score += ok ? (q.k === 'vf' ? 2 : 3) : -1; record(q, ok, 'sim'); return { ok, picked: a };
    });
    const vf = items.map((q, k) => [q, res[k]]).filter(([q]) => q.k === 'vf'), mc = items.map((q, k) => [q, res[k]]).filter(([q]) => q.k === 'mc');
    const cnt = (arr, f) => arr.filter(([, r]) => f(r)).length;
    const perCh = {}; items.forEach((q, k) => { const p = perCh[q.ch] = perCh[q.ch] || [0, 0]; p[1]++; if (res[k].ok) p[0]++; });
    S.sims.push({ t: Date.now(), score, n: items.length, min: Math.round((Date.now() - st.start) / 60000), timeout: !!timeout,
      vf: [cnt(vf, r => r.ok), cnt(vf, r => !r.ok && !r.skip), cnt(vf, r => r.skip)], mc: [cnt(mc, r => r.ok), cnt(mc, r => !r.ok && !r.skip), cnt(mc, r => r.skip)],
      ch: perCh, q: items.map((q, k) => [q.id, res[k].skip ? 0 : res[k].ok ? 1 : -1]) });
    if (S.sims.length > 60) S.sims.splice(0, S.sims.length - 60);
    addXP(Math.max(0, score) * 10); save();
    if (score >= 16) award('vetta'); if (score >= 30) award('lode');
    if (score >= 16) SFX.fanfare();
    v.innerHTML = `<div class="wrap narrow"><div class="result">
      <div class="eyebrow">${timeout ? 'Tempo scaduto · ' : ''}Esito della simulazione</div><div class="score">${score}<small>/33</small></div>
      <span class="chip ${score >= 16 ? 'ok' : 'red'}">${score >= 16 ? icon('check') + ' Sopra la soglia di 16' : icon('x') + ' Sotto la soglia di 16'}</span>
      <div class="score-board">
        <div class="kpi"><b>${cnt(vf, r => r.ok)}/${vf.length}</b><span>V/F giuste</span></div><div class="kpi"><b>${cnt(mc, r => r.ok)}/${mc.length}</b><span>multiple giuste</span></div>
        <div class="kpi"><b>${cnt(vf, r => !r.ok && !r.skip) + cnt(mc, r => !r.ok && !r.skip)}</b><span>sbagliate (−1)</span></div><div class="kpi"><b>${res.filter(r => r.skip).length}</b><span>in bianco</span></div></div>
      <div class="row" style="justify-content:center"><a class="btn primary" href="#esame">${icon('arrow-counter-clockwise')} Nuova simulazione</a><a class="btn ghost" href="#zaino">Zaino errori</a></div></div>
      <h2 class="h3">Correzione</h2>${reviewHTML(items, res)}</div>`;
    typeset(v); refreshChrome();
  };
  timer = setInterval(tick, 500);
  setKeys(e => {
    if (st.done || e.target.closest('input,textarea')) return;
    const q = items[st.i], k = e.key.toLowerCase();
    if (q.k === 'vf' && (k === 'v' || k === 'f')) $(`.opt[data-v="${k === 'v'}"]`, v)?.click();
    if (q.k === 'mc' && /^[1-4]$/.test(k)) $(`.opt[data-v="${+k - 1}"]`, v)?.click();
    if (e.key === 'ArrowRight' && st.i < items.length - 1) { st.i++; draw(); }
    if (e.key === 'ArrowLeft' && st.i > 0) { st.i--; draw(); }
  });
  draw();
}

/* ---------------- FORMULARIO ---------------- */
function viewFormulario(v) {
  v.innerHTML = `<div class="wrap mid"><div><div class="eyebrow">Formulario · mappa tascabile</div><h1 class="h-display">Tutto in <em>tasca</em></h1>
    <p class="lead">Le formule e i fatti da avere pronti, capitolo per capitolo. Scrivi per filtrare.</p></div>
    <label class="sr" for="fq">Cerca nel formulario</label><input id="fq" class="search" type="search" placeholder="Cerca: Jacobiano, Leibniz, piano tangente…">
    <div id="fbody" class="grid2" style="grid-template-columns:minmax(0,1fr)"></div></div>`;
  const draw = f => {
    $('#fbody').innerHTML = CH.map(c => { const t = sheetTable(c, f); return t ? `<section class="panel"><div class="row spread"><div class="eyebrow">Capitolo ${c.n} · ${esc(c.short)}</div><a class="small" href="#cap-${c.n}">Apri capitolo</a></div>${t}</section>` : ''; }).join('') || `<div class="empty">${icon('function')}<b>Nessun risultato</b></div>`;
    typeset($('#fbody'));
  };
  let tm; $('#fq').oninput = e => { clearTimeout(tm); tm = setTimeout(() => draw(e.target.value.trim().toLowerCase()), 200); };
  draw('');
}

/* ---------------- LIBRETTO ---------------- */
function viewLibretto(v) {
  const r = rankOf(S.xp || 0), tot = S.log.length, ok = S.log.filter(e => e.ok).length, pred = predicted(), stamps = STAMPS();
  const got = stamps.filter(s => S.stamps[s.id]).length;
  v.innerHTML = `<div class="wrap mid">
    <div><div class="eyebrow">Libretto del rifugio</div><h1 class="h-display">${esc(r.name)}</h1><p class="lead">${S.xp || 0} m di quota · prossimo grado: ${esc(r.next)} a ${r.to} m.</p></div>
    <div class="meter" role="img" aria-label="Avanzamento di grado"><i style="width:${clamp(((S.xp || 0) - r.from) / (r.to - r.from) * 100, 0, 100)}%"></i></div>
    <div class="score-board">
      <div class="kpi"><b>${tot}</b><span>risposte date</span></div><div class="kpi"><b>${tot ? Math.round(ok / tot * 100) + '%' : '—'}</b><span>giuste</span></div>
      <div class="kpi"><b>${S.streak.n || 0}</b><span>giorni di fila · max ${S.streak.best || 0}</span></div><div class="kpi"><b>${pred === null ? '—' : pred + '/33'}</b><span>punteggio stimato</span></div></div>
    <section class="panel"><div class="panel-h"><div class="eyebrow">Timbri · ${got}/${stamps.length}</div></div>
      <div class="stamps">${stamps.map(s => `<div class="stamp ${S.stamps[s.id] ? '' : 'off'}" title="${esc(s.desc)}">${stampSVG(s, S.stamps[s.id] ? new Date(S.stamps[s.id]).toLocaleDateString('it-IT') : '', S.stamps[s.id] ? 'var(--red)' : 'var(--muted)')}<span>${esc(s.desc)}</span></div>`).join('')}</div></section>
    <section class="panel"><div class="eyebrow">Impostazioni</div>
      <div class="set-row"><span><b>Tema</b></span><div class="seg" id="thSel">${[['system', 'Sistema'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([k, t]) => `<button type="button" data-t="${k}" aria-pressed="${S.settings.theme === k}">${t}</button>`).join('')}</div></div>
      <div class="set-row"><label for="sndT"><b>Suoni</b><br><span class="muted small">Brevi segnali per giusto, sbagliato e timbri</span></label><span class="switch"><input type="checkbox" id="sndT" ${S.settings.sound ? 'checked' : ''}><span></span></span></div>
      <div class="set-row"><label for="unlT"><b>Sblocca tutto</b><br><span class="muted small">Apre tutte le lezioni e le pareti, se hai già studiato e vuoi saltare</span></label><span class="switch"><input type="checkbox" id="unlT" ${S.settings.unlockAll ? 'checked' : ''}><span></span></span></div>
      <div class="set-row"><span data-sync="full">${syncBadge('full')}</span>
        ${CLOUD.db ? `<button type="button" class="btn small" id="syncB">${icon('cloud-arrow-up')} Salva ora</button>` : ''}</div>
      <div class="set-row"><span><b>Codice di backup</b><br><span class="muted small">Una copia di tutti i progressi in un testo: utile per tenerla da parte o per un browser che non è collegato al tuo account.</span></span>
        <div class="row"><button type="button" class="btn small" id="expB">${icon('copy')} Copia codice</button><button type="button" class="btn small ghost" id="impB">Incolla codice</button></div></div>
      <div class="set-row"><span><b>Azzera</b><br><span class="muted small">Cancella quota, stelle, zaino e timbri</span></span><button type="button" class="btn small ghost" id="rstB">${icon('arrow-counter-clockwise')} Azzera tutto</button></div>
    </section>
    <p class="foot-note">Contenuti costruiti sul programma ufficiale e sulle prove disponibili: 5 appelli 2025 (fila A e B, con le risposte ufficiali evidenziate), l'esempio di gennaio 2026 e i test online di luglio 2026. Le risposte dei quesiti reali seguono le chiavi ufficiali. Icone: Phosphor (MIT).</p>
  </div>`;
  $$('#thSel button').forEach(b => b.onclick = () => { S.settings.theme = b.dataset.t; save(); applyTheme(); viewLibretto(v); });
  $('#sndT').onchange = e => { S.settings.sound = e.target.checked; save(); if (e.target.checked) SFX.ok(); };
  $('#unlT').onchange = e => { S.settings.unlockAll = e.target.checked; save(); toast(e.target.checked ? 'Tutte le lezioni e le pareti sono aperte.' : 'Progressione normale ripristinata.', { icon: 'lock-open' }); };
  const sb = $('#syncB'); if (sb) sb.onclick = () => { S.updatedAt = Date.now(); persistLocal(); cloudPush().then(() => toast(CLOUD.status === 'cloud' ? 'Progressi salvati nel tuo account.' : 'Salvataggio non riuscito: riprova tra poco.', { icon: CLOUD.status === 'cloud' ? 'cloud-check' : 'cloud-slash' })); };
  $('#expB').onclick = () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const done = () => toast('Codice copiato negli appunti.', { icon: 'copy' });
    const fallback = () => openSheet(`<h2 class="h3">Il tuo codice</h2><p class="small muted">Seleziona e copia tutto il testo.</p><textarea class="io" readonly>${code}</textarea><button class="btn" data-close>Chiudi</button>`, card => { const t = $('textarea', card); t.focus(); t.select(); });
    try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
  };
  $('#impB').onclick = () => openSheet(`<h2 class="h3">Incolla il codice</h2><textarea class="io" id="impT" aria-label="Codice dei progressi"></textarea><p class="small muted" id="impMsg"></p>
    <div class="row"><button class="btn ghost" data-close>Annulla</button><button class="btn primary" id="impOk">Carica</button></div>`, (card, close) => {
    $('#impOk', card).onclick = () => {
      try { const o = JSON.parse(decodeURIComponent(escape(atob($('#impT', card).value.trim())))); if (!o || o.v !== 1) throw 0; S = Object.assign(DEFAULT_STATE(), o); save(); close(); applyTheme(); toast('Progressi caricati.', { icon: 'check' }); route(); }
      catch (e) { $('#impMsg', card).textContent = 'Il codice non è valido: copialo di nuovo per intero dal dispositivo di origine.'; }
    };
  });
  $('#rstB').onclick = () => openSheet(`<h2 class="h3">Azzerare tutto?</h2><p>Perdi quota, stelle, zaino, simulazioni e timbri. Non si può annullare.</p>
    <div class="row"><button class="btn ghost" data-close>Annulla</button><button class="btn dark" id="rstOk">Azzera</button></div>`, (card, close) => {
    $('#rstOk', card).onclick = () => { resetState(); applyTheme(); close(); toast('Progressi azzerati.', { icon: 'arrow-counter-clockwise' }); route(); };
  });
}

/* ---------------- LABORATORI ---------------- */
function viewLabs(v) {
  v.innerHTML = `<div class="wrap"><div><div class="eyebrow">Osservatorio</div><h1 class="h-display">Laboratori <em>da toccare</em></h1>
    <p class="lead">Ogni concetto difficile ha un esperimento: muovi, ruota, cambia i parametri e guarda cosa succede.</p></div>
    <div class="lab-gallery">${Object.entries(LABS).filter(([, L]) => L.page).map(([k, L]) => `<a class="lab-card" href="#lab-${k}"><canvas data-thumb="${k}" aria-hidden="true"></canvas><div><span class="sign muted">Cap. ${L.ch}</span><b>${esc(L.title)}</b><span>${esc(L.desc)}</span></div></a>`).join('')}</div></div>`;
  requestAnimationFrame(() => $$('[data-thumb]', v).forEach(cv => { try { LABS[cv.dataset.thumb].thumb(cv); } catch (e) { } }));
}
function viewLab(v, name) {
  const L = LABS[name]; if (!L) return viewLabs(v);
  v.innerHTML = `<div class="wrap"><div><a class="eyebrow" href="#lab" style="text-decoration:none">Laboratorio · Capitolo ${L.ch}</a><h1 class="h2" style="font-size:clamp(28px,4vw,40px)">${esc(L.title)}</h1><p class="lead">${esc(L.desc)}</p></div><div id="labHost"></div></div>`;
  L.page($('#labHost', v)); typeset(v);
}
