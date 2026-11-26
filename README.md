# Monte Analisi

Gioco di preparazione allo scritto di **Analisi Matematica 2** (Ingegneria Meccanica e Gestionale, UniFI).
L'esame è una montagna: la mappa è una carta topografica generata da una vera funzione $z=f(x,y)$, il sentiero passa per
10 rifugi (i capitoli) e arriva a **Cima Esame, 3300 m = 33/33 punti**. La curva di livello a 1600 m è la soglia 16/33.

Apri `dist/index.html` in un browser: è un unico file, funziona anche offline salvo font e formule (MathJax da CDN).

## Cosa contiene

| Parte | Contenuto |
| --- | --- |
| 10 capitoli, 52 lezioni | Idea, definizioni ed enunciati esatti, metodo, esempi a livelli (base, medio, esame) con soluzione passo per passo, errori da evitare, "All'esame" |
| 237 domande di lezione | Vero/Falso e multiple nel formato dello scritto, con spiegazione |
| Pareti d'esame (124 quesiti) | Una per capitolo, punteggio dello scritto (+2/−1, +3/−1, 0 se salti) |
| 87 quesiti delle prove reali | Dalle 8 prove disponibili (22/1/2025 – 15/7/2026), risposte secondo le chiavi ufficiali |
| Simulazione d'esame | 13 quesiti (6 V/F + 7 multipla), timer, consegna, correzione, storico dei punteggi |
| 26 domande di teoria | Risposta modello e checklist per autovalutarsi |
| Zaino degli errori | Ripasso a intervalli (1, 3, 7, 16 giorni) delle domande sbagliate |
| Sprint 60 s | Vero/Falso a raffica |
| 11 laboratori | Superfici 3D e limiti lungo i percorsi, gradiente, forme quadratiche, polari, Fubini, curve, campi e Green, campo di direzioni, Taylor, serie, mappa delle implicazioni |
| Libretto | Quota, gradi, 28 timbri, punteggio stimato, impostazioni, trasferimento dei progressi |

I progressi restano nel browser (`localStorage`). Per passare a un altro dispositivo: Libretto › Copia codice, poi Incolla codice sull'altro.

## Fonti e limiti

- Programma, formato dello scritto, quesiti reali e stile delle spiegazioni vengono dal progetto "analisi" (guide dei capitoli 1–4 e prove d'esame).
- Per i capitoli 5–10 le prove reali non erano trascritte: lezioni e quesiti sono stati scritti nello stesso formato e **ogni risultato numerico è stato verificato con SymPy**. Aggiungendo i PDF delle prove si possono importare i quesiti reali anche per questi capitoli.
- Alcuni quesiti reali riportano solo la risposta esatta: dove le altre opzioni mancavano sono segnate come "distrattori ricostruiti".
- Il tempo della simulazione (45 minuti di default) è una stima: si può cambiare.

## Struttura

```
src/index.html        modello della pagina
src/css/app.css       sistema visivo (token chiaro/scuro)
src/js/core.js        stato, parser dei contenuti, markup, MathJax, suoni
src/js/plot.js        superfici 3D, curve di livello, piano 2D
src/js/map.js         carta topografica
src/js/quiz.js        quiz, zaino, quota, timbri
src/js/labs.js        laboratori
src/js/views.js       schermate
src/js/main.js        router
src/content/chNN.txt  contenuti, un file per capitolo
assets/icons/         icone Phosphor (MIT)
tools/build.py        genera dist/index.html e dist/artifact.html
```

Dopo una modifica: `python3 tools/build.py`.

### Formato dei contenuti

```
#lesson 2.5 Piano tangente
goal: Scrivere l'equazione del piano tangente
::def Piano tangente
$$z=f(x_0,y_0)+f_x(x-x_0)+f_y(y-y_0)$$
::example esame Testo del problema
+ Passo: spiegazione
= Risultato
#quiz
?mc
Q: Testo
O: opzione 1
O: opzione 2
O: opzione 3
O: Nessuna delle precedenti
A: 2
W: Spiegazione
S: 25 giugno 2025, fila A, n. 11   (solo per i quesiti delle prove reali)
```

Blocchi: `idea`, `def`, `thm`, `method`, `example`, `trap`, `exam`, `note`, `table` (celle separate da ` ¦ `), `lab`.
Sezioni di capitolo: `#bank` (parete), `#theory` (`?th` con `K:` per la checklist), `#sheet` (formulario).
