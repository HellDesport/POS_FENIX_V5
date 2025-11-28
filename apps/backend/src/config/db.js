// Pool de MySQL listo para usar con async/await
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.pass,
  database: env.db.name,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,

  // Claves que ya tienes
  namedPlaceholders: true,
  multipleStatements: true,
  supportBigNumbers: true,
  bigNumberStrings: true,

  // ⏱ defensivos
  connectTimeout: 10000,     // 10s para conectar
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
// Helper opcional para probar la conexión en el arranque
export async function assertDb() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows?.[0]?.ok === 1;
}