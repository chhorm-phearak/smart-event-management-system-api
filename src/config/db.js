const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});

console.log(
  "DB CONFIG:",
  process.env.DB_HOST,
  process.env.DB_PORT,
  process.env.DB_NAME,
  process.env.DB_USER
);

// mysql2 returns an array of rows for SELECT and an OkPacket for writes.
// Both are normalised to { rows, rowCount } so callers stay database agnostic.
const toResult = (result) => {
  if (Array.isArray(result)) {
    return { rows: result, rowCount: result.length };
  }
  return {
    rows: [],
    rowCount: result?.affectedRows ?? 0,
    affectedRows: result?.affectedRows ?? 0,
    insertId: result?.insertId,
  };
};

const query = async (text, params = []) => {
  const [result] = await pool.query(text, params);
  return toResult(result);
};

const TRANSACTION_STATEMENTS = {
  BEGIN: "beginTransaction",
  "START TRANSACTION": "beginTransaction",
  COMMIT: "commit",
  ROLLBACK: "rollback",
};

const getClient = async () => {
  const connection = await pool.getConnection();

  return {
    query: async (text, params = []) => {
      const statement = String(text).trim().replace(/;$/, "").toUpperCase();
      const transactionMethod = TRANSACTION_STATEMENTS[statement];

      if (transactionMethod) {
        await connection[transactionMethod]();
        return { rows: [], rowCount: 0 };
      }

      const [result] = await connection.query(text, params);
      return toResult(result);
    },
    release: () => connection.release(),
  };
};

module.exports = {
  pool,
  query,
  getClient,
};
