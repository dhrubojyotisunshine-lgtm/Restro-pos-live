require("dotenv").config();
const mysql = require("mysql2");

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// Handle connection pool errors
pool.on("error", (err) => {
  console.error("Database pool error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("Reconnecting to the database...");
  } else {
    throw err;
  }
});

// Promisified query wrapper
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) {
        console.error("Query error:", err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Custom helper for handling IN clauses with dynamic values
const queryIn = (sqlTemplate, preParams = [], inValues = []) => {
  return new Promise((resolve, reject) => {
    if (!inValues.length) return resolve([]);

    const sql = sqlTemplate.replace("IN (?)", `IN (${inValues.map(() => "?").join(",")})`);
    const finalParams = [...preParams, ...inValues];

    pool.query(sql, finalParams, (err, results) => {
      if (err) {
        console.error("QueryIn error:", err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully!");
    connection.release(); // zaruri hai, warna pool lock ho jayega
  }
});


const getConnection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
};

module.exports = {
  pool,
  getConnection,
  query,
  queryIn,
};


















