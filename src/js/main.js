/* ============================================================
   main: router e avvio
   ============================================================ */
function route() {
  const v = $('#view'); const h = (location.hash.slice(1) || 'mappa');
  setKeys(null);
  if (currentMap && !/^mappa$/.test(h)) { currentMap.destroy(); currentMap = null; }
  let m;
  try {
    if (h === 'mappa') viewMap(v);
    else if ((m = h.match(/^cap-(\d+)$/))) viewChapter(v, +m[1]);
    else if ((m = h.match(/^lez-(\d+)-(\d+)$/))) viewLesson(v, +m[1], +m[2]);
    else if ((m = h.match(/^parete-(\d+)$/))) viewBoss(v, +m[1]);
    else if (h === 'allena') viewAllena(v);
    else if (h === 'ripasso') viewRipasso(v);
    else if (h === 'zaino') viewZaino(v);
    else if (h === 'sprint') viewSprint(v);
    else if (h === 'teoria') viewTeoria(v);
    else if ((m = h.match(/^teoria-(\d+)$/))) viewTeoria(v, +m[1]);
    else if (h === 'esame') viewEsame(v);
    else if (h === 'formulario') viewFormulario(v);
    else if (h === 'libretto') viewLibretto(v);
    else if (h === 'lab') viewLabs(v);
    else if ((m = h.match(/^lab-([a-z0-9]+)$/))) viewLab(v, m[1]);
    else viewMap(v);
  } catch (err) {
    console.error(err);
    v.innerHTML = `<div class="wrap narrow"><div class="empty">${icon('warning')}<b>Questa pagina non si è caricata</b><span class="muted">${esc(err.message)}</span><a class="btn" href="#mappa">Torna alla mappa</a></div></div>`;
  }
  refreshChrome();
  typeset(v);
  if (!/^(lez|parete)/.test(h) || !document.activeElement || document.activeElement === document.body) window.scrollTo({ top: 0 });
}
function boot() {
  loadState(); applyTheme(); loadContent();
  window.addEventListener('hashchange', route);
  route();
  cloudInit(() => { applyTheme(); route(); toast('Progressi caricati dal tuo account.', { icon: 'cloud-check' }); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (currentMap) currentMap.schedule(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
