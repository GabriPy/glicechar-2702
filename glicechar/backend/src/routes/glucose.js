/**
 * ============================================================
 * routes/glucose.js - Endpoint REST per le letture glicemiche
 * ============================================================
 * Espone le API che il frontend React chiamerà per ottenere
 * i dati glicemici salvati nel database MySQL.
 *
 * Il frontend NON accede mai direttamente al database:
 * passa sempre attraverso questo backend, che funge da
 * intermediario sicuro.
 * ============================================================
 */

const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/glucose
 * ----------------
 * Restituisce gli ultimi 100 valori glicemici ordinati
 * per timestamp crescente (dal più vecchio al più recente).
 *
 * Il frontend usa questi dati per disegnare il grafico
 * con Recharts.
 *
 * Risposta JSON: array di oggetti con campi:
 *   - id: numero intero (chiave primaria)
 *   - sgv: numero intero (valore glicemia in mg/dL)
 *   - direction: stringa (trend, es. "Flat", "SingleUp")
 *   - timestamp: numero (millisecondi epoch)
 *   - created_at: stringa ISO (data inserimento in DB)
 */
router.get('/glucose', async (req, res) => {
  try {
    /**
     * Recupera gli ultimi 100 record dal database.
     *
     * Struttura della query:
     * - Subquery interna: prende gli ultimi 100 per timestamp DESC
     * - Query esterna: li riordina ASC per il grafico (sinistra → destra)
     *
     * Questo pattern garantisce:
     * 1. Di prendere i 100 più RECENTI
     * 2. Di restituirli in ordine CRONOLOGICO per il grafico
     */
    // Accetta ?hours=N per filtrare per finestra temporale
    // Default: 24h (copre qualsiasi finestra che il frontend può richiedere)
    const hours = Math.min(parseInt(req.query.hours) || 24, 24)
    const since = Date.now() - hours * 3600 * 1000

    const rows = await db.query(`
      SELECT id, sgv, direction, timestamp, created_at
      FROM glucose_readings
      WHERE timestamp >= ?
      ORDER BY timestamp ASC
    `, [since]);

    // Aggiunge intestazioni HTTP per evitare caching del browser
    // (vogliamo sempre dati freschi ogni 60 secondi)
    res.set('Cache-Control', 'no-store');
    res.set('X-Total-Count', rows.length.toString());

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (error) {
    console.error('❌ Errore GET /api/glucose:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Errore interno del server durante il recupero dei dati glicemici.',
      // In produzione NON esporre i dettagli tecnici dell'errore
    });
  }
});

/**
 * GET /api/glucose/latest
 * -----------------------
 * Restituisce solo l'ultima lettura glicemica disponibile.
 * Usato dalla GlucoseCard per il valore "attuale".
 */
router.get('/glucose/latest', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT id, sgv, direction, timestamp, created_at
      FROM glucose_readings
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nessuna lettura disponibile nel database.',
      });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: rows[0],
    });

  } catch (error) {
    console.error('❌ Errore GET /api/glucose/latest:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server.',
    });
  }
});

/**
 * GET /api/stats
 * --------------
 * Statistiche aggregate sulle letture glicemiche delle ultime 24h.
 * Utile per metriche nella sidebar o card aggiuntive.
 */
router.get('/stats', async (req, res) => {
  try {
    // Timestamp 24 ore fa in millisecondi
    const last24h = Date.now() - (24 * 60 * 60 * 1000);

    const rows = await db.query(`
      SELECT
        COUNT(*)                          AS total_readings,
        ROUND(AVG(sgv), 1)               AS avg_sgv,
        MIN(sgv)                          AS min_sgv,
        MAX(sgv)                          AS max_sgv,
        SUM(CASE WHEN sgv < 70 THEN 1 ELSE 0 END)                    AS low_count,
        SUM(CASE WHEN sgv >= 70 AND sgv <= 180 THEN 1 ELSE 0 END)    AS in_range_count,
        SUM(CASE WHEN sgv > 180 THEN 1 ELSE 0 END)                   AS high_count
      FROM glucose_readings
      WHERE timestamp >= ?
    `, [last24h]);

    const stats = rows[0];

    // Calcola percentuale Time In Range (TIR)
    const total = parseInt(stats.total_readings) || 0;
    const inRange = parseInt(stats.in_range_count) || 0;
    const tir = total > 0 ? Math.round((inRange / total) * 100) : 0;

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      data: {
        ...stats,
        time_in_range_percent: tir,
        period: 'last_24h',
      },
    });

  } catch (error) {
    console.error('❌ Errore GET /api/stats:', error.message);
    return res.status(500).json({ success: false, error: 'Errore interno del server.' });
  }
});

module.exports = router;