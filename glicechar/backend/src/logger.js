/**
 * ============================================================
 * logger.js - Logger centralizzato (Pino)
 * ============================================================
 * Fornisce un logger veloce, strutturato e leggibile.
 * - In sviluppo: output colorato e formattato
 * - In produzione: JSON compatibile con PM2 / log collectors
 * ============================================================
 */

const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard" }
  }
});

module.exports = logger;
