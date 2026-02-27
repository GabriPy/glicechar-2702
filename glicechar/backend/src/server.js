/**
 * ============================================================
 * server.js - Entry point del backend Nightscout Dashboard
 * ============================================================
 * Questo file:
 * 1. Carica le variabili ambiente dal file .env
 * 2. Configura Express con middleware (CORS, JSON)
 * 3. Connette a MySQL
 * 4. Avvia il cron job per sincronizzare i dati Nightscout
 * 5. Espone gli endpoint REST per il frontend
 * ============================================================
 */

// Carica le variabili ambiente PRIMA di qualsiasi altra importazione
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

// Importa i moduli interni del progetto
const db = require('./db');
const { syncNightscout } = require('./nightscout');
const glucoseRouter = require('./routes/glucose');

// ── Inizializzazione Express ──────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────

/**
 * CORS: permette al frontend (React su Vite) di comunicare
 * con questo backend. In produzione, impostare FRONTEND_URL
 * all'URL reale del frontend (es. https://yourdomain.com)
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
}));

// Permette al server di leggere JSON nel corpo delle richieste
app.use(express.json());

// ── Route ─────────────────────────────────────────────────────
/**
 * Tutte le rotte API sono prefissate con /api
 * /api/glucose → restituisce le letture glicemiche salvate in DB
 */
app.use('/api', glucoseRouter);

// ── Health check ──────────────────────────────────────────────
/**
 * Endpoint di diagnostica: utile per verificare che il server
 * sia in esecuzione (es. con uptime monitors)
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Avvio del server ──────────────────────────────────────────
async function startServer() {
  try {
    // 1. Testa la connessione al database MySQL
    await db.testConnection();
    console.log('✅ Connessione MySQL stabilita');

    // 2. Prima sincronizzazione immediata al boot
    console.log('🔄 Sincronizzazione iniziale Nightscout...');
    await syncNightscout();

    // 3. Cron job: sincronizza ogni 60 secondi
    //    Sintassi cron: "*/1 * * * *" = ogni minuto
    cron.schedule('*/1 * * * *', async () => {
      console.log(`[${new Date().toLocaleTimeString()}] 🔄 Sync Nightscout...`);
      await syncNightscout();
    });

    const path = require('path')

    // Serve i file statici del frontend buildato
    app.use(express.static(path.join(__dirname, '../../frontend_2/dist')))

    // Qualsiasi rotta non-API rimanda a index.html (React gestisce il routing)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
      }
    })

    // 4. Avvia il server HTTP
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
      console.log(`📡 Cron job attivo: sync ogni 60 secondi`);
    });

  } catch (error) {
    console.error('❌ Errore avvio server:', error.message);
    process.exit(1); // Termina il processo con errore
  }
}

startServer();
