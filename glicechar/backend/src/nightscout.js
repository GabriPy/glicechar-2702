/**
 * ============================================================
 * nightscout.js - Sincronizzazione dati Nightscout (migliorata)
 * ============================================================
 * Miglioramenti:
 * - Logging strutturato con Pino
 * - Retry con backoff esponenziale
 * - Timeout ridotto e controllato
 * - Validazione più robusta
 * - Gestione errori MySQL migliorata
 * ============================================================
 */

const axios = require("axios");
const db = require("./db");
const logger = require("./logger");

const MAX_RETRIES = 3;

/**
 * fetchNightscoutData()
 * ---------------------
 * Effettua la chiamata a Nightscout con retry + backoff.
 */
async function fetchNightscoutData(url, retries = 0) {
  try {
    const response = await axios.get(url, {
      headers: {
        "api-secret": process.env.NIGHTSCOUT_API_SECRET,
        "Accept": "application/json"
      },
      timeout: 8000
    });

    return response.data;

  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = 1000 * Math.pow(2, retries);
      logger.warn({
        msg: "Nightscout non risponde, nuovo tentativo...",
        retry: retries + 1,
        wait_ms: delay,
        error: err.message
      });

      await new Promise(res => setTimeout(res, delay));
      return fetchNightscoutData(url, retries + 1);
    }

    logger.error({
      msg: "Nightscout API fallita definitivamente",
      error: err.message,
      code: err.code
    });

    return null;
  }
}

/**
 * syncNightscout()
 * ----------------
 * Funzione principale di sincronizzazione.
 */
async function syncNightscout() {
  let inserted = 0;
  let skipped = 0;

  logger.info("🔄 Avvio sincronizzazione Nightscout...");

  const entries = await fetchNightscoutData(process.env.NIGHTSCOUT_URL);

  if (!entries) {
    logger.error("❌ Nessun dato ricevuto da Nightscout");
    return { inserted, skipped };
  }

  if (!Array.isArray(entries)) {
    logger.error({
      msg: "Risposta Nightscout non valida",
      type: typeof entries
    });
    return { inserted, skipped };
  }

  logger.info(`📥 Ricevuti ${entries.length} record da Nightscout`);

  for (const entry of entries) {
    if (!isValidEntry(entry)) {
      logger.warn({ msg: "Record non valido, saltato", entry });
      skipped++;
      continue;
    }

    try {
      const timestamp =
        entry.date ||
        (entry.dateString ? new Date(entry.dateString).getTime() : null);

      const result = await db.query(
        `INSERT IGNORE INTO glucose_readings (sgv, direction, timestamp)
         VALUES (?, ?, ?)`,
        [entry.sgv, entry.direction || null, timestamp]
      );

      if (result.affectedRows > 0) inserted++;
      else skipped++;

    } catch (dbError) {
      logger.error({
        msg: "Errore inserimento MySQL",
        error: dbError.message,
        entry
      });
      skipped++;
    }
  }

  logger.info(`✅ Sync completato: ${inserted} inseriti, ${skipped} saltati`);
  return { inserted, skipped };
}

/**
 * isValidEntry()
 * --------------
 * Verifica che un record Nightscout sia valido.
 */
function isValidEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.sgv !== "number" || entry.sgv <= 0) return false;

  const hasDate = typeof entry.date === "number" && entry.date > 0;
  const hasDateString = typeof entry.dateString === "string";

  return hasDate || hasDateString;
}

module.exports = { syncNightscout };
