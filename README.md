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
| Pareti d'esame (221 quesiti) | Una per capitolo: a ogni attacco 13 quesiti estratti (6 V/F + 7 multipla), punteggio dello scritto (+2/−1, +3/−1, 0 se salti) |
| 184 quesiti delle prove reali | 5 appelli 2025 (fila A e B), esempio di gennaio 2026, test online di luglio 2026: risposte confrontate con le chiavi ufficiali |
| Simulazione d'esame | 13 quesiti (6 V/F + 7 multipla), timer, consegna, correzione, storico dei punteggi |
| 26 domande di teoria | Risposta modello e checklist per autovalutarsi |
| Zaino degli errori | Ripasso a intervalli (1, 3, 7, 16 giorni) delle domande sbagliate |
| Sprint 60 s | Vero/Falso a raffica |
| 11 laboratori | Superfici 3D e limiti lungo i percorsi, gradiente, forme quadratiche, polari, Fubini, curve, campi e Green, campo di direzioni, Taylor, serie, mappa delle implicazioni |
| Libretto | Quota, gradi, 28 timbri, punteggio stimato, impostazioni, trasferimento dei progressi |

## Salvataggio dei risultati

Aperta da claude.ai, l'app salva tutto nel tuo account con la capacità `db`, in due documenti privati
(`data/users/<id>/stato` e `data/users/<id>/risposte`): lezioni e stelle, zaino, timbri, registro delle risposte e
storico delle simulazioni (punteggio, giuste, sbagliate, bianche, esito per capitolo). Da un altro dispositivo, con lo
stesso account, i progressi si ricaricano da soli; vince la copia aggiornata più di recente. Il browser tiene comunque
una copia locale, e dal Libretto si può copiare un codice di backup. Aperta come file locale, l'app salva solo nel browser.

## Fonti e verifiche

- Programma, formato dello scritto e stile delle spiegazioni vengono dal progetto "analisi".
- Quesiti reali e risposte vengono dai fogli delle prove con le risposte ufficiali evidenziate e dalle revisioni dei test online. Ogni calcolo è stato rifatto, molti con SymPy.
- Correzioni emerse dal confronto: 9/7/2025 fila A n. 9 (campo irrotazionale) ha risposta **A = D e B = −C**, non A = D e B = C; 5/2/2025 fila B n. 8 ha un refuso nel testo ($\log(y-2)$ al posto di $\log(y-1)$), segnalato nella spiegazione.
- I pesi della simulazione sono la media dei quesiti per capitolo nelle 5 prove 2025 complete.
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
