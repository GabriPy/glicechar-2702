# GlucoScope — Dashboard Glicemica Nightscout

Dashboard web per il monitoraggio continuo della glicemia tramite integrazione con [Nightscout](https://nightscout.github.io/). Il backend Node.js raccoglie automaticamente i dati dal sensore CGM, li persiste in un database MySQL e li espone via REST API. Il frontend React visualizza in tempo reale i valori glicemici, il trend e le statistiche delle ultime 24 ore.

---

## Indice

- [Funzionalità](#funzionalità)
- [Architettura](#architettura)
- [Struttura del progetto](#struttura-del-progetto)
- [Requisiti](#requisiti)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Utilizzo](#utilizzo)
- [API REST](#api-rest)
- [Build e produzione](#build-e-produzione)

---

## Funzionalità

- **Sincronizzazione automatica** con l'API Nightscout ogni 60 secondi tramite cron job
- **Visualizzazione in tempo reale** del valore glicemico attuale con badge di stato (In Range, Ipoglicemia, Iperglicemia)
- **Indicatore di trend** con direzione e velocità di variazione (Flat, SingleUp, DoubleDown, ecc.)
- **Grafico interattivo** con finestra temporale selezionabile (1h, 3h, 6h, 12h, 24h)
- **Statistiche 24h**: media, minimo, massimo, numero di letture e Time In Range (TIR)
- **Countdown** al prossimo aggiornamento e stato di connessione visibile in topbar
- **Deduplicazione automatica** dei record tramite `INSERT IGNORE` su timestamp univoco
- **Frontend servito direttamente dal backend** in produzione (nessun server aggiuntivo)

---

## Architettura

```
Nightscout / Gluroo API
        │
        │  HTTP GET (ogni 60s)
        ▼
┌─────────────────────────┐
│   Backend  (Node.js)    │
│   Express + node-cron   │
│   src/server.js         │
│                         │
│  ┌─────────────────┐    │
│  │  nightscout.js  │    │  ← sincronizzazione + validazione
│  └────────┬────────┘    │
│           │ INSERT IGNORE
│  ┌────────▼────────┐    │
│  │    db.js        │    │  ← pool MySQL2
│  └────────┬────────┘    │
│           │             │
│  ┌────────▼────────┐    │
│  │ routes/glucose  │    │  ← REST API /api/glucose, /api/stats
│  └─────────────────┘    │
│                         │
│  serve dist/ (prod)     │
└─────────┬───────────────┘
          │
          │  REST API + file statici
          ▼
┌─────────────────────────┐
│   Frontend  (React)     │
│   Vite + Recharts       │
│   Tailwind CSS          │
│                         │
│  App.jsx                │  ← fetch ogni 60s, countdown
│  GlucoseCard.jsx        │  ← valore + trend + badge stato
│  GlucoseChart.jsx       │  ← grafico con finestre temporali
└─────────────────────────┘
          │
          ▼
     MySQL Database
     (glucose_readings)
```

---

## Struttura del progetto

```
glicechar/
├── backend/
│   ├── src/
│   │   ├── server.js          # Entry point, Express, cron job, static serving
│   │   ├── db.js              # Pool di connessioni MySQL2 + helper query
│   │   ├── nightscout.js      # Sincronizzazione API Nightscout → MySQL
│   │   └── routes/
│   │       └── glucose.js     # Endpoint REST /api/glucose, /api/glucose/latest, /api/stats
│   ├── package.json
│   └── .env                   # Variabili d'ambiente (non committare)
│
└── frontend/
    ├── src/
    │   ├── main.jsx            # Entry point React
    │   ├── App.jsx             # Layout principale, fetch, stato globale
    │   ├── index.css           # Stili globali Tailwind + CSS custom properties
    │   └── components/
    │       ├── GlucoseCard.jsx # Card valore attuale + trend + badge stato
    │       └── GlucoseChart.jsx# Grafico Recharts con selezione finestra temporale
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Requisiti

- **Node.js** >= 18
- **MySQL** >= 8.0
- Un'istanza **Nightscout** accessibile via HTTP con API abilitata (es. Gluroo)

---

## Installazione

### 1. Clona il repository

```bash
git clone https://github.com/GabriPy/glicechar-2702.git
cd glicechar-2702/glicechar
```

### 2. Installa le dipendenze del backend

```bash
cd backend
npm install
```

### 3. Installa le dipendenze del frontend

```bash
cd ../frontend
npm install
```

### 4. Crea il database MySQL

Connettiti al tuo server MySQL ed esegui:

```sql
CREATE DATABASE nightscout_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nightscout_db;

CREATE TABLE glucose_readings (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  sgv         SMALLINT        NOT NULL,
  direction   VARCHAR(20)     DEFAULT NULL,
  timestamp   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timestamp (timestamp)
);
```

---

## Configurazione

Crea il file `backend/.env` a partire dall'esempio seguente:

```env
# Server
PORT=3001
FRONTEND_URL=http://localhost

# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=la_tua_password
DB_NAME=nightscout_db

# Nightscout
NIGHTSCOUT_URL=https://il-tuo-sito.nightscout.io/api/v1/entries.json
NIGHTSCOUT_API_SECRET=il_tuo_token_sha1
```

> ⚠️ Non committare mai il file `.env`. Aggiungilo a `.gitignore`.

---

## Utilizzo

### Modalità sviluppo

Avvia backend e frontend in due terminali separati.

**Backend:**
```bash
cd backend
npm run dev        # avvia con nodemon (hot reload)
```

**Frontend:**
```bash
cd frontend
npm run dev        # avvia Vite su http://localhost:5173
```

Il proxy Vite reindirizza automaticamente le chiamate `/api/*` verso `http://localhost:3001`, quindi non ci sono problemi CORS in sviluppo.

### Modalità produzione

Vedi la sezione [Build e produzione](#build-e-produzione).

---

## API REST

Tutti gli endpoint sono prefissati con `/api`.

### `GET /api/glucose`

Restituisce le letture glicemiche per la finestra temporale richiesta.

| Query param | Tipo | Default | Max | Descrizione |
|---|---|---|---|---|
| `hours` | number | 24 | 24 | Finestra temporale in ore |

**Risposta:**
```json
{
  "success": true,
  "count": 48,
  "data": [
    {
      "id": 1,
      "sgv": 112,
      "direction": "Flat",
      "timestamp": 1710000000000,
      "created_at": "2024-03-09T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/glucose/latest`

Restituisce solo l'ultima lettura disponibile.

**Risposta:**
```json
{
  "success": true,
  "data": { "id": 99, "sgv": 135, "direction": "SingleUp", "timestamp": 1710003600000, "created_at": "..." }
}
```

---

### `GET /api/stats`

Statistiche aggregate delle ultime 24 ore.

**Risposta:**
```json
{
  "success": true,
  "data": {
    "total_readings": 288,
    "avg_sgv": 118.4,
    "min_sgv": 68,
    "max_sgv": 210,
    "low_count": 3,
    "in_range_count": 260,
    "high_count": 25,
    "time_in_range_percent": 90,
    "period": "last_24h"
  }
}
```

---

### `GET /health`

Endpoint di diagnostica per verificare che il server sia attivo.

```json
{ "status": "ok", "timestamp": "2024-03-09T12:00:00.000Z" }
```

---

## Build e produzione

### 1. Builda il frontend

```bash
cd frontend
npm run build
# genera la cartella frontend/dist/
```

### 2. Avvia il backend

```bash
cd backend
npm start
```

Il backend servirà automaticamente i file statici della cartella `dist/` e gestirà il fallback a `index.html` per il routing React. L'intera applicazione sarà disponibile su `http://localhost:3001`.

---

## Soglie glicemiche

| Valore (mg/dL) | Stato |
|---|---|
| < 54 | 🔴 Ipoglicemia grave |
| 54 – 69 | 🔴 Ipoglicemia |
| 70 – 180 | 🟢 In range |
| 181 – 250 | 🟠 Iperglicemia |
| > 250 | 🟠 Iperglicemia grave |

Il Time In Range (TIR) è calcolato come percentuale di letture nel range 70–180 mg/dL nelle ultime 24 ore.
