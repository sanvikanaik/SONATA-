import mysql from "mysql2/promise";

// One shared connection pool (kept across hot reloads in dev).
const g = globalThis;
export const pool =
  g.__sonataPool ??
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "gig_marketplace",
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // DATE/DATETIME come back as plain strings (no timezone surprises)
    decimalNumbers: true, // DECIMAL comes back as numbers
  });
if (process.env.NODE_ENV !== "production") g.__sonataPool = pool;

// Always pass user input through "?" placeholders, never string concatenation.
// That is what protects us from SQL injection.
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Call a stored procedure; returns the first result set (if any).
export async function call(name, params = []) {
  const marks = params.map(() => "?").join(",");
  const [res] = await pool.query(`CALL ${name}(${marks})`, params);
  return Array.isArray(res) ? res[0] : res;
}
