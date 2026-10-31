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

const runMigrations = () => {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS superadmin_module_allocation (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      admin_user_id INT NOT NULL,
      module_key    VARCHAR(100) NOT NULL,
      module_name   VARCHAR(100) NOT NULL,
      is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_admin_module (admin_user_id, module_key)
    )`,
    `CREATE TABLE IF NOT EXISTS superadmin_sub_feature_permissions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      admin_user_id   INT NOT NULL,
      module_key      VARCHAR(100) NOT NULL,
      sub_feature_key VARCHAR(100) NOT NULL,
      can_view        TINYINT(1) DEFAULT 1,
      can_create      TINYINT(1) DEFAULT 1,
      can_edit        TINYINT(1) DEFAULT 1,
      can_delete      TINYINT(1) DEFAULT 0,
      can_print       TINYINT(1) DEFAULT 0,
      can_export      TINYINT(1) DEFAULT 0,
      can_manage      TINYINT(1) DEFAULT 0,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_admin_sub_feature (admin_user_id, module_key, sub_feature_key)
    )`,
  ];

  migrations.forEach((sql) => {
    pool.query(sql, (err) => {
      if (err) {
        console.error("❌ Migration failed:", err.message);
      }
    });
  });
};

runMigrations();

module.exports = {
  pool,
  getConnection,
  query,
  queryIn,
};


















