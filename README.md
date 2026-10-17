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

* **Pubblico (senza login)**: classifica Impegno Costante, Coppa Efficienza, classifica MVP, tabellini, profili giocatori, albo d'oro, regolamento.
* **Giocatore**: dopo una partita in cui ha giocato vota i compagni (1–10 + commento) entro N giorni. I voti sono anonimi: gli altri vedono solo media e commenti. Chi ha la media più alta (con almeno N voti) è l'**MVP** della partita e prende il punto "Man of the Match".
* **Score keeper**: inserisce e corregge i tabellini (squadra bianca/nera, vincente), assegna eventuali MoM manuali.
* **Organizzatore (admin)**: tutto quanto sopra, più anagrafica giocatori, inviti/ruoli, stagioni e loro parametri, testi e albo d'oro.

Le regole (punti per vittoria/pareggio/MoM, minimo giocatori per partita valida, partite minime per coppa ed efficienza, giorni di voto, voti minimi per l'MVP) sono **parametri di ogni stagione**, modificabili dall'area admin.
La sicurezza è nel database (Row Level Security): anche chi manomette il sito non può scrivere ciò che il suo ruolo non consente.

## Setup (circa 15 minuti)

### 1. Supabase

1. Vai su https://supabase.com, crea un account gratuito e un nuovo progetto (regione EU, scegli una password per il database e conservala).
2. Nel menu laterale apri **SQL Editor** → *New query*, incolla il contenuto di `supabase/migrations/0001_schema.sql` e premi **Run**.
3. Stessa cosa con `supabase/migrations/0002_seed.sql` (importa giocatori, stagione 2025/26, albo d'oro e regolamento).
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

1. Apri il sito, vai su **Area → Registrati** con la tua email: **il primo utente registrato diventa automaticamente Organizzatore**.
2. In *Area → Amministrazione → Utenti e inviti* aggiungi gli **inviti**: email del giocatore → nickname → ruolo (`player`, `scorekeeper` o `admin`). Quando quella persona si registra con la stessa email viene collegata al suo giocatore con il ruolo giusto. Puoi anche cambiare ruolo e giocatore agli utenti già registrati.
3. In *Stagioni* controlla la stagione in corso (è già creata la 2026/2027 con le regole del regolamento: 12 giocatori per partita valida, 5 partite per l'efficienza). La 2025/2026 è importata con soglia 0 giocatori e 4 partite per l'efficienza, in modo da riprodurre esattamente la classifica dell'Excel.

## Flusso del sabato

1. Lo score keeper apre *Area → Nuovo tabellino*: tocca i nomi (1 tocco = Bianca, 2 = Nera, 3 = rimuovi), sceglie la vincente, salva.
2. I giocatori che erano in campo ricevono in *Area* la partita da votare: slider 1–10 e commento facoltativo per ogni compagno (non per sé stessi; "Salta" per chi non si vuole valutare). Si può tornare a modificare finché le votazioni sono aperte.
3. L'MVP, le classifiche e le medie si aggiornano da soli.

## Note tecniche

* Nessun server proprio: il sito chiama direttamente l'API REST di Supabase con `supabase-js` caricato da CDN.
* Le viste `v_standings`, `v_match_ratings`, `v_mom_points` ecc. sostituiscono le formule dell'Excel; sono *security definer* di proposito per esporre solo aggregati anonimi.
* Modalità demo: finché `config.js` contiene i valori di esempio, il sito mostra i dati 2025/26 da `demo-data.json` in sola lettura.
* Per aggiornare lo schema in futuro basta rieseguire `0001_schema.sql` (è idempotente).
* Test locali (opzionali): `scripts/test_local.sql` + `scripts/test_rls.sql` verificano le policy su un Postgres locale; `scripts/test_ui.py` esercita l'interfaccia con Playwright.
