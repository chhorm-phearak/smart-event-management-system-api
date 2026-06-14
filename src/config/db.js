const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
});

console.log(
  "DB CONFIG:",
  process.env.DB_HOST,
  process.env.DB_PORT,
  process.env.DB_NAME,
  process.env.DB_USER
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};












