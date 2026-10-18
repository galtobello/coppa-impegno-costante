# Coppa Impegno Costante — web app

Versione web del foglio Excel che gestiva il torneo interno di ultimate frisbee.
Tutto gratuito: database e login su **Supabase** (piano free), sito statico su **GitHub Pages**.

```
docs/                     il sito (HTML/CSS/JS, nessun build)
  index.html
  app.js                  interfaccia e logica
  api.js                  accesso ai dati (Supabase, o demo se non configurato)
  config.js               <-- qui vanno URL e chiave del progetto Supabase
  demo-data.json          dati 2025/26 per la modalità demo
  img/                    loghi Disc & Disc ottimizzati per il web, favicon e icone
supabase/migrations/
  0001_schema.sql         tabelle, viste di calcolo, ruoli e policy di sicurezza
  0002_seed.sql           anagrafica, stagione 2025/26 (19 partite), MoM, albo d'oro, regolamento
scripts/                  script di supporto e test (non servono per usare l'app)
```

## Come funziona

* **Pubblico (senza login)**: classifica Impegno Costante, Coppa Efficienza, classifica MVP, tabellini, profili giocatori (con il radar delle caratteristiche: Lancio, Ricezione, Taglio, Difesa, Velocità, Resistenza, da 0 a 5, modificabile solo da organizzatori e allenatori), albo d'oro, regolamento.
* **Giocatore**: dopo una partita in cui ha giocato vota i compagni (1–10 + commento) per N giorni a partire dal giorno della partita (7 = fino al giorno prima della partita successiva: con le partite del venerdì si vota fino al giovedì). I voti sono anonimi: gli altri vedono solo la media. I commenti invece sono firmati con il nickname di chi li scrive, e l'organizzatore li può cancellare (il voto resta). Alla **chiusura delle votazioni** chi ha la media più alta (con almeno N voti; a pari media più giocatori) è l'**MVP** della partita e prende il punto "Man of the Match".
* **Score keeper** e **Allenatore**: inseriscono e correggono i tabellini (squadra bianca/nera, vincente, punteggio), assegnano eventuali MoM manuali.
* **Organizzatore (admin)**: tutto quanto sopra, più anagrafica giocatori, approvazione delle registrazioni, ruoli ed eliminazione account, stagioni e loro parametri, testi e albo d'oro.

Le regole (punti per vittoria/pareggio/MoM, minimo giocatori per partita valida, partite minime per coppa ed efficienza, giorni di voto, voti minimi per l'MVP) sono **parametri di ogni stagione**, modificabili dall'area admin.
La sicurezza è nel database (Row Level Security): anche chi manomette il sito non può scrivere ciò che il suo ruolo non consente.

## Setup (circa 15 minuti)

### 1. Supabase

1. Vai su https://supabase.com, crea un account gratuito e un nuovo progetto (regione EU, scegli una password per il database e conservala).
2. Nel menu laterale apri **SQL Editor** → *New query*, incolla il contenuto di `supabase/migrations/0001_schema.sql` e premi **Run**.
3. Stessa cosa con `supabase/migrations/0002_seed.sql` (importa giocatori, stagione 2025/26, albo d'oro e regolamento).
   Poi esegui, in ordine, anche `0003_match_score.sql` (punteggio facoltativo), `0004_storico_2023_24_q2.sql` (storico 2023/24, 2° quadrimestre), `0005_coach_mvp_chiusura.sql` (ruolo allenatore, MVP alla chiusura del voto), `0006_player_skills.sql` (radar delle caratteristiche), `0007_skills_resistenza.sql` (sesto asse: resistenza) `0008_registrazioni.sql` (registrazione con approvazione al posto degli inviti) `0009_collegamento_giocatore.sql` (collegamento utente-giocatore sempre coerente) e `0010_commenti_firmati.sql` (commenti con autore, voti anonimi).
4. **Authentication → Providers → Email**: lascia attivo Email. Consiglio per semplicità: disattiva *Confirm email* (così i giocatori entrano subito dopo la registrazione) oppure lascialo attivo se preferisci la verifica.
5. **Authentication → URL Configuration**: in *Site URL* metti l'indirizzo del sito (dopo il passo 2 di GitHub Pages, es. `https://tuonome.github.io/coppa-impegno-costante/`) e aggiungilo anche a *Redirect URLs*. Serve per i link di accesso via email.
6. **Project Settings → API**: copia *Project URL* e la chiave *anon public*.

### 2. Il sito su GitHub Pages

1. Crea un account su https://github.com e un nuovo repository pubblico, es. `coppa-impegno-costante`.
2. Apri `docs/config.js` e incolla URL e chiave anon copiati prima.
3. Carica nel repository l'intero contenuto di questa cartella (puoi trascinare i file nell'interfaccia web di GitHub, *Add file → Upload files*).
4. Nel repository: **Settings → Pages → Build and deployment**: *Source: Deploy from a branch*, *Branch: main*, *Folder: /docs* → Save.
5. Dopo un minuto il sito è online su `https://<tuonome>.github.io/<repository>/`.

La chiave *anon* è fatta per stare nel sito pubblico: non dà nessun potere oltre a quello che le policy del database concedono al pubblico.

### 3. Primo accesso e ruoli

1. Apri il sito, vai su **Area → Registrati** e inserisci nickname, nome e cognome, email e password: **il primo utente registrato diventa automaticamente Organizzatore**.
2. Gli altri si registrano allo stesso modo e restano **in attesa**: in *Area → Amministrazione → Utenti* l'organizzatore vede le richieste e le **accetta** (scegliendo il ruolo: Giocatore, Allenatore, Score keeper o Organizzatore) o le **rifiuta**. Accettando, l'utente viene collegato al giocatore con lo stesso nickname; se il nickname non esiste, il giocatore viene creato. Finché non è accettato, un utente non ha alcun potere (lo impone il database).
3. Sempre da *Utenti* si cambiano ruolo e giocatore collegato e si **elimina un account** (il giocatore e le sue statistiche restano).
   In *Radar* l'organizzatore rinomina i sei assi del radar delle caratteristiche (anteprima dal vivo; vuoto = nome predefinito).
4. In *Stagioni* controlla la stagione in corso e le sue regole.

## Flusso del venerdì

1. Lo score keeper apre *Area → Nuovo tabellino* (stagione e data sono già quelle di oggi): sceglie in alto "Aggiungi a Bianca/Nera" e tocca i nomi, che compaiono subito nella tabella della squadra (× per toglierli). Imposta il risultato e, se vuole, il punteggio (il risultato si calcola da solo), poi salva.
2. I giocatori che erano in campo ricevono in *Area* la partita da votare: slider 1–10 e commento facoltativo per ogni compagno (non per sé stessi; "Salta" per chi non si vuole valutare). Si può tornare a modificare finché le votazioni sono aperte.
3. L'MVP, le classifiche e le medie si aggiornano da soli.

## Note tecniche

* Prima di pubblicare una modifica al sito esegui `sh scripts/versione.sh`: aggiorna il numero di versione (`?v=...`) dei file, così chi ricarica la pagina scarica subito la versione nuova invece di quella in cache.
* Nessun server proprio: il sito chiama direttamente l'API REST di Supabase con `supabase-js` caricato da CDN.
* Le viste `v_standings`, `v_match_ratings`, `v_mom_points` ecc. sostituiscono le formule dell'Excel; sono *security definer* di proposito per esporre solo aggregati anonimi.
* Modalità demo: finché `config.js` contiene i valori di esempio, il sito mostra i dati 2025/26 da `demo-data.json` in sola lettura.
* Per aggiornare lo schema in futuro basta rieseguire `0001_schema.sql` (è idempotente).
* **Prima di pubblicare**: con il server locale avviato (`cd docs && python3 -m http.server 8787`) esegui `python3 scripts/test_sito.py`. Prova tutte le pagine pubbliche sul database vero (solo letture, telefono/desktop, tema chiaro/scuro) e tutti i ruoli con un database finto e rete lenta simulata; segnala errori, testi come "undefined", pagine che sbordano.
* Test locali (opzionali): `scripts/test_local.sql` + `scripts/test_rls.sql` verificano le policy su un Postgres locale; `scripts/test_ui.py` esercita l'interfaccia con Playwright.
