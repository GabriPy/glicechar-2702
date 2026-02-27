/**
 * ============================================================
 * nightscout.js - Modulo sincronizzazione dati Nightscout
 * ============================================================
 * Questo modulo è responsabile di:
 * 1. Chiamare l'API Nightscout (Gluroo) con autenticazione
 * 2. Validare i dati ricevuti
 * 3. Inserire nel database solo i record NON già presenti
 *    (evitando duplicati tramite il campo UNIQUE: timestamp)
 * ============================================================
 */

const axios = require('axios');
const db = require('./db');

/**
 * syncNightscout()
 * ----------------
 * Funzione principale di sincronizzazione.
 * Viene chiamata:
 * - Una volta all'avvio del server (boot)
 * - Ogni 60 secondi dal cron job
 *
 * Flusso:
 *   Nightscout API → validazione → INSERT IGNORE MySQL
 *
 * @returns {Promise<{inserted: number, skipped: number}>}
 */
async function syncNightscout() {
  let inserted = 0;
  let skipped = 0;

  try {
    // ── 1. Chiamata API Nightscout ────────────────────────────
    /**
     * Nightscout richiede autenticazione tramite header "api-secret".
     * Il valore è il token SHA1 configurato in .env.
     * IMPORTANTE: questo token non deve MAI essere esposto al frontend.
     */
    const response = await axios.get(process.env.NIGHTSCOUT_URL, {
      headers: {
        'api-secret': process.env.NIGHTSCOUT_API_SECRET,
        'Accept': 'application/json',
      },
      timeout: 15000, // 15 secondi di timeout
    });

    const entries = response.data;

    // ── 2. Validazione risposta ───────────────────────────────
    if (!Array.isArray(entries)) {
      console.warn('⚠️  Risposta Nightscout non è un array:', typeof entries);
      return { inserted, skipped };
    }

    console.log(`📥 Ricevuti ${entries.length} record da Nightscout`);

    // ── 3. Inserimento in MySQL ───────────────────────────────
    for (const entry of entries) {
      // Valida che il record abbia i campi minimi necessari
      if (!isValidEntry(entry)) {
        console.warn('⚠️  Record non valido, saltato:', JSON.stringify(entry));
        skipped++;
        continue;
      }

      try {
        /**
         * INSERT IGNORE: se il timestamp è già presente (UNIQUE constraint),
         * MySQL ignora silenziosamente il duplicato senza generare errore.
         * Questo garantisce l'idempotenza: possiamo chiamare questa funzione
         * quante volte vogliamo senza creare duplicati.
         */
        const result = await db.query(
          `INSERT IGNORE INTO glucose_readings (sgv, direction, timestamp)
           VALUES (?, ?, ?)`,
          [
            entry.sgv,                          // Valore glicemia in mg/dL
            entry.direction || null,             // Direzione trend (es. "Flat", "SingleUp")
            entry.date || entry.dateString       // Timestamp in millisecondi (epoch)
              ? (entry.date || new Date(entry.dateString).getTime())
              : null,
          ]
        );

        // affectedRows = 1 → inserito, 0 → duplicato ignorato
        if (result.affectedRows > 0) {
          inserted++;
        } else {
          skipped++;
        }

      } catch (dbError) {
        // Logga l'errore ma continua con gli altri record
        console.error('❌ Errore inserimento record:', dbError.message);
        skipped++;
      }
    }

    console.log(`✅ Sync completato: ${inserted} inseriti, ${skipped} saltati/duplicati`);
    return { inserted, skipped };

  } catch (error) {
    // ── Gestione errori di rete/autenticazione ────────────────
    if (error.response) {
      // Il server Nightscout ha risposto con un codice di errore HTTP
      console.error(`❌ Errore Nightscout HTTP ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Nessuna risposta ricevuta (timeout, DNS, rete)
      console.error('❌ Nessuna risposta da Nightscout (timeout o rete)');
    } else {
      // Errore generico
      console.error('❌ Errore sincronizzazione:', error.message);
    }

    return { inserted, skipped };
  }
}

/**
 * isValidEntry(entry)
 * -------------------
 * Verifica che un record Nightscout abbia i dati minimi validi.
 *
 * @param {Object} entry - Record grezzo da Nightscout
 * @returns {boolean}
 */
function isValidEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;

  // sgv (sensor glucose value) deve essere un numero positivo
  if (typeof entry.sgv !== 'number' || entry.sgv <= 0) return false;

  // Deve avere un timestamp (date in ms oppure dateString ISO)
  const hasDate = typeof entry.date === 'number' && entry.date > 0;
  const hasDateString = typeof entry.dateString === 'string' && entry.dateString.length > 0;
  if (!hasDate && !hasDateString) return false;

  return true;
}

module.exports = { syncNightscout };
