# Lupi Gomme – Magazzino

PWA privata per il magazzino gomme dell'officina. Risponde in pochi secondi a: **la misura c'è? quante? dove?**

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, RLS, Storage) · Netlify.

## Messa in produzione (una volta sola, ~20 minuti)

### 1. Supabase
1. Crea il progetto su supabase.com, **regione UE** (es. `eu-central-1` Francoforte).
2. **SQL Editor** → incolla ed esegui tutto `supabase/migrations/0001_schema.sql`.
3. **Authentication → Sign In / Providers**: disattiva **"Allow new users to sign up"**. Nessuno si registra da solo.
4. **Project Settings → API**: copia URL, `anon` key e `service_role` key.

### 2. Netlify (piano gratuito, uso commerciale ammesso)
1. app.netlify.com → **Add new project → Import an existing project → GitHub** → `fotocamera-upload-`, branch `main`.
2. Build command e cartella li legge da `netlify.toml`: non toccarli.
3. **Environment variables** (vedi `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← segnala come *secret*, **mai** con prefisso `NEXT_PUBLIC_`
4. Deploy. In Supabase → Authentication → URL Configuration metti l'URL Netlify come *Site URL*.

### 3. Primo avvio: account del titolare
Apri l'app: nella pagina di login compare **"Primo avvio: crea il titolare"**. Il titolare inserisce nome, email e password.
Funziona una sola volta: appena esiste un titolare la pagina si chiude. I dipendenti li crea poi lui da *Altro → Account dipendenti*.
(In alternativa: crea l'utente da Supabase e lancia `scripts/crea-titolare.sql`.)

### 4. Telefoni
Apri l'URL e accedi. Poi:
- **iPhone (Safari)**: Condividi → *Aggiungi alla schermata Home*.
- **Android (Chrome)**: menu ⋮ → *Installa app*.

L'accesso resta attivo: non si rifà ogni giorno (sessione rinnovata in automatico).

### 5. Backup automatico
`.github/workflows/backup.yml` fa ogni notte un dump del database, **cifrato** (contiene dati clienti), conservato 30 giorni negli artifact di GitHub.
Aggiungi in GitHub → Settings → Secrets → Actions:
- `SUPABASE_DB_URL`: Supabase → Connect → *Session pooler* (con password)
- `BACKUP_PASSPHRASE`: frase lunga, conservala anche su carta

Ripristino: `gpg -d backup.sql.gz.gpg | gunzip | psql "<url database>"`.
Le **foto** non sono nel dump: sono nello Storage di Supabase. Con il piano Pro Supabase fa anche backup giornalieri propri.

## Ruoli e sicurezza
Tutto è imposto dal database (Row Level Security), non solo dall'interfaccia.

| | Titolare | Dipendente |
|---|---|---|
| Cerca, carica/scarica, sposta, crea schede | ✅ | ✅ |
| Prezzo d'acquisto | ✅ | ❌ (tabella separata, invisibile) |
| Storico movimenti, import, export | ✅ | ❌ |
| Cancellare | ✅ | ❌ |
| Account dipendenti | ✅ | ❌ |

- La quantità cambia **solo** con la funzione `muovi_stock` (mai sotto zero, sempre registrata con chi/quando/quanto/perché).
- Cambiare posizione registra uno *spostamento* nello storico in automatico.
- Disattivare un account lo blocca subito (ban in Auth + RLS).
- Depositi: solo targa, nome, telefono (GDPR). I ritirati si cancellano dopo N mesi da Impostazioni.

## Uso
- **Ricerca**: `205/55 R16`, `2055516`, `205 55 16` sono la stessa cosa. Tastierino numerico di default, tasto ABC per cercare per marca. Senza campo resta visibile l'ultima ricerca.
- **Scanner**: legge l'EAN; se la gomma c'è la apre, altrimenti apre una scheda nuova con l'EAN compilato.
- **Posizioni**: formato `A-3-2` (scaffale-ripiano-posto). Si accetta anche `a 3 2` o `A32`.
- **Import**: Altro → Importa. Scarica il file modello, anteprima ed errori riga per riga prima di salvare.

## Sviluppo
```bash
cp .env.example .env.local   # compila
npm install
npm run dev
npm test        # test misure/DOT/posizioni/import
npm run lint    # type-check
```
