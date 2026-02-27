/**
 * ============================================================
 * db.js - Modulo connessione MySQL
 * ============================================================
 * Crea e gestisce il pool di connessioni al database MySQL.
 * Usa mysql2/promise per supportare async/await nativo.
 *
 * Un "pool" di connessioni permette di riutilizzare connessioni
 * esistenti invece di aprirne e chiuderne una per ogni query,
 * migliorando le performance e la stabilità.
 * ============================================================
 */

const mysql = require('mysql2/promise');

/**
 * Crea il pool di connessioni usando le variabili ambiente.
 * Queste vengono caricate da .env tramite dotenv in server.js.
 */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'dbpsw',
  database: process.env.DB_NAME     || 'nightscout_db',

  // Numero massimo di connessioni contemporanee nel pool
  connectionLimit: 10,

  // Attende una connessione libera invece di restituire errore
  // quando tutte le connessioni sono occupate
  waitForConnections: true,
  queueLimit: 0,

  // Riconnette automaticamente se la connessione viene persa
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * Testa la connessione al database.
 * Viene chiamata all'avvio del server in server.js
 *
 * @throws {Error} Se la connessione fallisce
 */
async function testConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release(); // IMPORTANTE: rilascia la connessione al pool
}

module.exports = {
  pool,
  testConnection,

  /**
   * Helper per eseguire query in modo semplice.
   * Usa direttamente il pool (gestisce automaticamente le connessioni).
   *
   * @param {string} sql - Query SQL con placeholder (?)
   * @param {Array}  params - Valori per i placeholder
   * @returns {Array} Risultati della query
   */
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};
