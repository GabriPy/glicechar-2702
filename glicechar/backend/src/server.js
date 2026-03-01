/**
 * ============================================================
 * server.js - Backend Nightscout Dashboard (migliorato)
 * ============================================================
 * Miglioramenti:
 * - Logging centralizzato
 * - Cron job con gestione errori
 * - Messaggi più chiari
 * ============================================================
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");

const db = require("./db");
const logger = require("./logger");
const { syncNightscout } = require("./nightscout");
const glucoseRouter = require("./routes/glucose");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

// API
app.use("/api", glucoseRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Avvio server
async function startServer() {
  try {
    await db.testConnection();
    logger.info("✅ Connessione MySQL stabilita");

    logger.info("🔄 Sync iniziale Nightscout...");
    await syncNightscout();

    // Cron job ogni minuto
    cron.schedule("*/1 * * * *", async () => {
      logger.info("⏱️ Cron: avvio sync Nightscout");
      try {
        await syncNightscout();
      } catch (err) {
        logger.error({
          msg: "Errore inatteso nel cron job",
          error: err.message
        });
      }
    });

    // Serve frontend buildato
    app.use(express.static(path.join(__dirname, "../../frontend/dist")));

    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api") && !req.path.startsWith("/health")) {
        res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
      }
    });

    app.listen(PORT, "127.0.0.1", () => {
      logger.info(`🚀 Server attivo su http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error({ msg: "Errore avvio server", error: error.message });
    process.exit(1);
  }
}

startServer();
