const db = require("../utils/db");
const crypto = require("crypto");

const createTable = (req, res) => {
  const { tablename, person_capicity, floorName } = req.body;
  const user_id = req.id;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // User has a subscription
      insertTable(user_id);
    } else {
      // Step 2: Check who created the user
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res
            .status(403)
            .json({ message: "You are not authorized to create a table." });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if creator has subscription
        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, results) => {
            if (err) return res.status(500).send(err);

            if (results.length > 0) {
              insertTable(created_by);
            } else {
              return res.status(403).json({
                message: "Creator does not have an active subscription.",
              });
            }
          },
        );
      });
    }
  });

  function insertTable(created_by) {
    const createTableQuery = `
    INSERT INTO rest_table
    (uuid, tablename, person_capicity, floor, status, created_by, occupied_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
      crypto.randomUUID(),
      tablename,
      person_capicity,
      floorName,
      0, // status (numeric, but frontend compute karega)
      created_by,
      0, // occupied_seats default
    ];

    db.pool.query(createTableQuery, values, (err, result) => {
      if (err) {
        console.error("Error creating table:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while creating the table",
        });
      }

      res.status(200).json({
        success: true,
        message: "Table created successfully",
      });
    });
  }
};
const getTables = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;

    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [id], (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: err });
      }

      if (data.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      const isAdmin = data[0].is_admin;
      const created_by = data[0].created_by;

      let getTablesQuery;
      let queryParams;

      if (isAdmin === 1) {
        // Admin user: fetch their own tables
        if (!searchItem || searchItem.trim() === "") {
          getTablesQuery = `
            SELECT tableid, tablename, person_capicity, status,occupied_seats, floor
            FROM rest_table
            WHERE created_by = ?
            ORDER BY tableid DESC
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getTablesQuery = `
            SELECT tableid, tablename, person_capicity, status, floor
            FROM rest_table
            WHERE created_by = ? AND (tablename LIKE ? OR person_capicity LIKE ?)
            ORDER BY tableid DESC
          `;
          queryParams = [id, searchQuery, searchQuery];
        }
      } else {
        // Not an admin, use their creator's id
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view tables.",
          });
        }

        if (!searchItem || searchItem.trim() === "") {
          getTablesQuery = `
            SELECT tableid, tablename, person_capicity, status, floor
            FROM rest_table
            WHERE created_by = ?
            ORDER BY tableid DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getTablesQuery = `
            SELECT tableid, tablename, person_capicity, status, floor
            FROM rest_table
            WHERE created_by = ? AND (tablename LIKE ? OR person_capicity LIKE ?)
            ORDER BY tableid DESC
          `;
          queryParams = [created_by, searchQuery, searchQuery];
        }
      }

      db.pool.query(getTablesQuery, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching tables:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving tables",
            error: err,
          });
        }

        const tables = results.map((table) => {
          const occupied = table.occupied_seats || 0;
          const capacity = table.person_capicity;

          let computedStatus = "free";

          if (occupied >= capacity) {
            computedStatus = "booked";
          } else if (occupied > 0) {
            computedStatus = "partial";
          }

          return {
            ...table,
            status: computedStatus,
            remaining: capacity - occupied,
          };
        });

        res.status(200).json({ success: true, data: tables });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

// ================= TABLE SYNC =================

const syncTables = async (req, res) => {
  try {
    const syncKey = req.headers["x-sync-key"];

    if (syncKey !== process.env.SYNC_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const tables = req.body;

    if (!Array.isArray(tables)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    for (const table of tables) {
      await db.query(
        `
        INSERT INTO rest_table
        (
          uuid,
          table_name,
          floor_id,
          capacity,
          status
        )
        VALUES (?, ?, ?, ?, ?)

        ON DUPLICATE KEY UPDATE
          table_name = VALUES(table_name),
          floor_id = VALUES(floor_id),
          capacity = VALUES(capacity),
          status = VALUES(status)
      `,
        [
          table.uuid,
          table.table_name,
          table.floor_id,
          table.capacity,
          table.status,
        ],
      );
    }

    res.json({
      success: true,
      message: "Tables synced successfully",
    });
  } catch (error) {
    console.log("TABLE SYNC ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBookedTable = async (req, res) => {
  try {
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getBookedTableQuery = `SELECT * FROM rest_table WHERE status = 1 AND created_by = ?`;
      db.pool.query(getBookedTableQuery, [creatorId], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving tables" });
        }
        res.status(200).json({ success: true, data: results });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const getunBookedTable = async (req, res) => {
  try {
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getUnBookedTableQuery = `SELECT * FROM rest_table WHERE status = 0 AND created_by = ?`;
      db.pool.query(getUnBookedTableQuery, [creatorId], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving tables" });
        }
        res.status(200).json({ success: true, data: results });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const cleartable = async (req, res) => {
  const tableId = req.params.tableId;
  const userId = req.id;
  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const clearTableQuery = `UPDATE rest_table SET status = 0 WHERE tableid = ? AND created_by = ?`;
    db.pool.query(clearTableQuery, [tableId, creatorId], (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "An error occurred while clearing the table" });
      }
      res.status(200).json({ success: true, message: "Table cleared successfully" });
    });
  });
};

const deleteTable = async (req, res) => {
  try {
    const tableId = req.params.id;
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const deleteTableQuery = `DELETE FROM rest_table WHERE tableid = ? AND created_by = ?`;
      db.pool.query(deleteTableQuery, [tableId, creatorId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Table not found" });
        }
        res.status(200).json({ success: true, message: "Table deleted successfully" });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getTableById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Table ID is required" });
    }

    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getTableByIdQuery = `
        SELECT tableid, tablename, person_capicity, status, floor
        FROM rest_table
        WHERE tableid = ? AND created_by = ?
      `;
      db.pool.query(getTableByIdQuery, [id, creatorId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving the table" });
        }
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "Table not found" });
        }
        const table = { ...result[0], status: result[0].status === 1 ? "booked" : "free" };
        res.status(200).json({ success: true, data: table, message: "Table fetched successfully" });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

//update table
const updateTable = (req, res) => {
  try {
    const { tableid } = req.params;
    const { tablename, person_capicity, floorName } = req.body;
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by: uc } = userResult[0];
      const creatorId = is_admin === 1 ? userId : uc;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const fetchCurrentDataSql = "SELECT * FROM rest_table WHERE tableid = ? AND created_by = ?";
    db.pool.query(fetchCurrentDataSql, [tableid, creatorId], (fetchErr, fetchData) => {
      if (fetchErr) {
        console.error("Database fetch error:", fetchErr);
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }

      if (fetchData.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Table not found" });
      }

      const currentData = fetchData[0];

      // Merge new and current data
      const updatedData = {
        tablename: tablename ?? currentData.tablename,
        person_capicity: person_capicity ?? currentData.person_capicity,
        floor: floorName ?? currentData.floor,
        status: currentData.status ?? 1, // Default to 1 if null
        created_by: currentData.created_by, // Do not allow modification of created_by
      };

      const updateTableQuery = `
        UPDATE rest_table
        SET tablename = ?, person_capicity = ?, floor = ?, status = ?, created_by = ?
        WHERE tableid = ?
      `;

      db.pool.query(
        updateTableQuery,
        [
          updatedData.tablename,
          updatedData.person_capicity,
          updatedData.floor,
          updatedData.status,
          updatedData.created_by,
          tableid,
        ],
        (updateErr, result) => {
          if (updateErr) {
            console.error("Database update error:", updateErr);
            return res
              .status(500)
              .json({ success: false, message: "Failed to update table" });
          }

          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ success: false, message: "No table updated" });
          }

          return res
            .status(200)
            .json({ success: true, message: "Table updated successfully" });
        },
      );
    });
    }); // close userQuery callback
  } catch (error) {
    console.error("Unexpected error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unexpected error occurred" });
  }
};

module.exports = {
  createTable,
  getTables,
  cleartable,
  syncTables,
  getBookedTable,
  getunBookedTable,
  deleteTable,
  getTableById,
  updateTable,
};
