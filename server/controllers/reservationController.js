const db = require("../utils/db");

// Create a new reservation of the day

const createUnavailability = (req, res) => {
  const { offdaydate, start_time, end_time, is_active = 1 } = req.body;
  const user_id = req.id;
  console.log(user_id);

  const availtime = `${start_time} - ${end_time}`;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // User has a subscription, proceed to insert
      const created_by = results[0].user_id;

      const insertQuery = `
          INSERT INTO reservationofday (offdaydate, availtime, is_active, created_by)
          VALUES (?, ?, ?, ?)
        `;
      const values = [offdaydate, availtime, is_active, created_by];

      db.pool.query(insertQuery, values, (err) => {
        if (err) return res.status(500).send(err);
        return res.status(201).json({
          message: "Unavailability successfully created (via subscription).",
        });
      });
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({
            message: "You are not authorized to create unavailability.",
          });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, results) => {
            if (err) return res.status(500).send(err);

            if (results.length > 0) {
              const insertQuery = `
                INSERT INTO reservationofday (offdaydate, availtime, is_active, created_by)
                VALUES (?, ?, ?, ?)
              `;
              const values = [offdaydate, availtime, is_active, created_by];

              db.pool.query(insertQuery, values, (err) => {
                if (err) return res.status(500).send(err);
                return res.status(201).json({
                  message: "Unavailability successfully created (via creator).",
                });
              });
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
};

// Get all reservations of the day
const getUnavailability = (req, res) => {
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

      let getReservationsQuery;
      let queryParams;

      if (isAdmin === 1) {
        // Admin: fetch own unavailability
        if (!searchItem || searchItem.trim() === "") {
          getReservationsQuery = `
            SELECT * FROM reservationofday 
            WHERE created_by = ? 
            ORDER BY offdayid DESC
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getReservationsQuery = `
            SELECT * FROM reservationofday 
            WHERE created_by = ? 
            AND (offdaydate LIKE ? OR availtime LIKE ?) 
            ORDER BY offdayid DESC
          `;
          queryParams = [id, searchQuery, searchQuery];
        }
      } else {
        // Non-admin: must be created by someone
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view unavailability.",
          });
        }

        if (!searchItem || searchItem.trim() === "") {
          getReservationsQuery = `
            SELECT * FROM reservationofday 
            WHERE created_by = ? 
            ORDER BY offdayid DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getReservationsQuery = `
            SELECT * FROM reservationofday 
            WHERE created_by = ? 
            AND (offdaydate LIKE ? OR availtime LIKE ?) 
            ORDER BY offdayid DESC
          `;
          queryParams = [created_by, searchQuery, searchQuery];
        }
      }

      db.pool.query(getReservationsQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching unavailability:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching reservations",
            error: err,
          });
        }

        res.status(200).json({
          success: true,
          data: result,
          message: "Unavailability data fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

// Update a reservation of the day
const updateUnavailability = (req, res) => {
  const { id } = req.params;
  const { offdaydate, start_time, end_time, is_active } = req.body;
  const userId = req.id;
  const availtime = `${start_time} - ${end_time}`;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const sql = `UPDATE reservationofday SET offdaydate = ?, availtime = ?, is_active = ? WHERE offdayid = ? AND created_by = ?`;
    const values = [offdaydate, availtime, is_active, id, creatorId];

    db.pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the reservation",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Reservation record not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Reservation updated successfully",
      });
    });
  });
};
// Get Reservation by id

const getUnavailabilitybyid = (req, res) => {
  const { id } = req.params;
  const userId = req.id;
  console.log(id);

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const getReservationsQuery = `SELECT * FROM reservationofday WHERE offdayid = ? AND created_by = ?`;
    db.pool.query(getReservationsQuery, [id, creatorId], (err, result) => {
      if (err) {
        console.error("Error fetching unavailable days:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching unavailable days",
        });
      }

      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          data: result,
          message: "Unavailable days fetched successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          message: `No reservations found for id ${id}`,
        });
      }
    });
  });
};

// const createReservation = (req, res) => {
//   const {
//     customer_name,
//     customer_email,
//     customer_mobile,
//     tablename,
//     person_capacity,
//     formtime,
//     totime,
//     reserveday,
//   } = req.body;

//   const user_id = req.id;

//   // Step 1: Check if the user has a subscription
//   const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
//   db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
//     if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

//     if (results.length > 0) {
//       // User has a subscription, proceed with their own user_id
//       const created_by = user_id;
//       proceedToCreateReservation(created_by);
//     } else {
//       // Step 2: Check if user has a creator
//       const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
//       db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
//         if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

//         if (data.length === 0 || !data[0].created_by) {
//           return res.status(403).json({ success: false, message: "You are not authorized to create a reservation." });
//         }

//         const created_by = data[0].created_by;

//         // Step 3: Check if the creator has a subscription
//         const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
//         db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
//           if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

//           if (results.length > 0) {
//             proceedToCreateReservation(created_by);
//           } else {
//             return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
//           }
//         });
//       });
//     }
//   });

//   // Reservation Logic Here
//   function proceedToCreateReservation(created_by) {
//     const customerInfoSql = `INSERT INTO customer_info (customer_name, customer_email, customer_phone) VALUES (?, ?, ?)`;
//     const customerInfoValues = [customer_name, customer_email, customer_mobile];

//     db.pool.query(customerInfoSql, customerInfoValues, (err, customerResult) => {
//       if (err) {
//         console.error("Error inserting into customer_info:", err);
//         return res.status(500).json({ success: false, message: "Failed to create customer", error: err });
//       }

//       const customer_id = customerResult.insertId;

//       const tblSql = `SELECT * FROM rest_table WHERE tablename = ?`;
//       db.pool.query(tblSql, [tablename], (err, tableResult) => {
//         if (err) {
//           console.error("Error retrieving table information:", err);
//           return res.status(500).json({ success: false, message: "Failed to find table", error: err });
//         }

//         if (tableResult.length === 0) {
//           return res.status(404).json({ success: false, message: "Table not found" });
//         }

//         const tableid = tableResult[0].tableid;

//         const reservationSql = `
//           INSERT INTO tblreservation
//           (cid, tableid, person_capicity, formtime, totime, reserveday, status, created_by)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;

//         const reservationValues = [
//           customer_id,
//           tableid,
//           person_capacity,
//           formtime,
//           totime,
//           reserveday,
//           1, // status
//           created_by
//         ];

//         db.pool.query(reservationSql, reservationValues, (err, reservationResult) => {
//           if (err) {
//             console.error("Error inserting into tblreservation:", err);
//             return res.status(500).json({ success: false, message: "Failed to create reservation", error: err });
//           }

//           res.status(201).json({ success: true, message: "Reservation created successfully" });
//         });
//       });
//     });
//   }
// };
const createReservation = (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_mobile,
    tablename,
    person_capacity,
    formtime,
    totime,
    reserveday,
  } = req.body;

  const user_id = req.id;

  if (
    !customer_name ||
    !customer_email ||
    !customer_mobile ||
    !tablename ||
    !person_capacity ||
    !formtime ||
    !totime ||
    !reserveday
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // 🔹 STEP 1: Subscription Check
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err)
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err,
      });

    if (results.length > 0) {
      proceedToCreateReservation(user_id);
    } else {
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";

      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err)
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to create reservation",
          });
        }

        const created_by = data[0].created_by;

        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, results) => {
            if (err)
              return res.status(500).json({
                success: false,
                message: "Database error",
                error: err,
              });

            if (results.length > 0) {
              proceedToCreateReservation(created_by);
            } else {
              return res.status(403).json({
                success: false,
                message: "Creator has no active subscription",
              });
            }
          },
        );
      });
    }
  });

  // 🔥 MAIN RESERVATION LOGIC
  function proceedToCreateReservation(created_by) {
    // STEP 2: Check Duplicate Customer
    const checkCustomerSql =
      "SELECT * FROM customer_info WHERE customer_email = ? OR customer_phone = ?";

    db.pool.query(
      checkCustomerSql,
      [customer_email, customer_mobile],
      (err, existingCustomers) => {
        if (err)
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err,
          });

        if (existingCustomers.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Customer email or mobile already exists",
          });
        }

        // STEP 3: Insert Customer
        const insertCustomerSql =
          "INSERT INTO customer_info (customer_name, customer_email, customer_phone) VALUES (?, ?, ?)";

        db.pool.query(
          insertCustomerSql,
          [customer_name, customer_email, customer_mobile],
          (err, customerResult) => {
            if (err)
              return res.status(500).json({
                success: false,
                message: "Failed to create customer",
                error: err,
              });

            const customer_id = customerResult.insertId;

            // STEP 4: Get Table
            const getTableSql =
              "SELECT tableid FROM rest_table WHERE tablename = ? AND created_by = ?";

            db.pool.query(
              getTableSql,
              [tablename, created_by],
              (err, tableResult) => {
                if (err)
                  return res.status(500).json({
                    success: false,
                    message: "Database error",
                    error: err,
                  });

                if (tableResult.length === 0) {
                  return res.status(404).json({
                    success: false,
                    message: "Table not found",
                  });
                }

                const tableid = tableResult[0].tableid;

                // 🔥 STEP 5: TIME SLOT CLASH CHECK
                const checkClashSql = `
                  SELECT * FROM tblreservation
                  WHERE tableid = ?
                  AND reserveday = ?
                  AND status = 1
                  AND NOT (totime <= ? OR formtime >= ?)
                `;

                db.pool.query(
                  checkClashSql,
                  [tableid, reserveday, formtime, totime],
                  (err, clashResults) => {
                    if (err)
                      return res.status(500).json({
                        success: false,
                        message: "Database error",
                        error: err,
                      });

                    if (clashResults.length > 0) {
                      return res.status(400).json({
                        success: false,
                        message: "Table already booked for selected time slot",
                      });
                    }

                    // STEP 6: INSERT RESERVATION
                    const reservationSql = `
                      INSERT INTO tblreservation 
                      (cid, tableid, person_capicity, formtime, totime, reserveday, status, created_by)
                      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                    `;

                    db.pool.query(
                      reservationSql,
                      [
                        customer_id,
                        tableid,
                        person_capacity,
                        formtime,
                        totime,
                        reserveday,
                        created_by,
                      ],
                      (err) => {
                        if (err)
                          return res.status(500).json({
                            success: false,
                            message: "Failed to create reservation",
                            error: err,
                          });

                        return res.status(201).json({
                          success: true,
                          message: "Reservation created successfully",
                        });
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }
};

// Delete a reservation of the day
const deleteUnavailability = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const sql = `DELETE FROM reservationofday WHERE offdayid = ? AND created_by = ?`;
    db.pool.query(sql, [id, creatorId], (err, data) => {
      if (err) return res.status(500).send(err);
      if (data.affectedRows === 0) return res.status(404).json({ success: false, message: "Record not found" });
      res.status(200).send("Successfully deleted");
    });
  });
};

// const getavailablereservationtables = async (req, res) => {
//   const { reserveday, formtime, totime } = req.query;
//   const userId = req.id;

//   if (!reserveday || !formtime || !totime) {
//     return res.status(400).json({ error: "Missing required query parameters" });
//   }

//   try {
//     const formattedDate = new Date(reserveday);
//     if (isNaN(formattedDate)) {
//       return res.status(400).json({ error: "Invalid reservation date" });
//     }
//     const formattedDateStr = formattedDate.toISOString().split("T")[0];

//     const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
//     db.pool.query(userQuery, [userId], (err, userResult) => {
//       if (err) {
//         return res.status(500).json({ error: "Failed to fetch user info" });
//       }

//       if (userResult.length === 0) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       const { is_admin, created_by } = userResult[0];
//       const creatorId = is_admin === 1 ? userId : created_by;

//       if (!creatorId) {
//         return res
//           .status(403)
//           .json({ error: "You are not authorized to view available tables" });
//       }

//       const reservedTablesQuery = `
//         SELECT r.tableid
//         FROM tblreservation AS r
//         WHERE r.reserveday = ?
//           AND r.formtime <= ?
//           AND r.totime >= ?
//           AND r.status = 1
//       `;

//       db.pool.query(
//         reservedTablesQuery,
//         [formattedDateStr, formtime, totime],
//         (err, reservedResults) => {
//           if (err) {
//             console.error("Database query error:", err);
//             return res.status(500).json({ error: "Database query failed" });
//           }

//           const reservedTableIds = reservedResults.map((row) => row.tableid);

//           const availableTablesQuery = `
//   SELECT t.*
//   FROM rest_table t
//   LEFT JOIN tblreservation r
//       ON t.tableid = r.tableid
//       AND r.reserveday = ?
//       AND r.status = 1
//       AND NOT (r.totime <= ? OR r.formtime >= ?)
//   WHERE
//       r.tableid IS NULL
//       AND t.status = 0
//       AND t.occupied_seats = 0
//       AND t.created_by = ?
// `;

//           const queryParams = [
//             formattedDateStr,
//             formtime, // for r.totime <= ?
//             totime, // for r.formtime >= ?
//             creatorId,
//           ];

//           db.pool.query(
//             availableTablesQuery,
//             queryParams,
//             (err, availableResults) => {
//               if (err) {
//                 console.error("Database query error:", err);
//                 return res.status(500).json({ error: "Database query failed" });
//               }

//               if (availableResults.length > 0) {
//                 return res.status(200).json({ data: availableResults });
//               } else {
//                 return res.status(200).json({
//                   data: [],
//                   message: "No tables available",
//                 });
//               }
//             },
//           );
//         },
//       );
//     });
//   } catch (error) {
//     console.error("Error in getAvailableReservationTables:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };
// get all reservation data
// const getReservations = async (req, res) => {
//   try {
//     const { searchItem } = req.query;
//     console.log(searchItem);

//     let query = `
//           SELECT
//               ci.customer_name,
//               rt.tablename,
//               r.person_capicity,
//               r.formtime AS start_time,
//               r.totime AS end_time,
//               r.reserveday AS date,
//               r.reserveid,
//               CASE
//                   WHEN r.status = 0 THEN 'free'
//                   WHEN r.status = 1 THEN 'Booked'
//                   ELSE 'unknown'
//               END AS status
//           FROM
//               tblreservation r
//           JOIN
//               customer_info ci ON r.cid = ci.customer_id
//           JOIN
//               rest_table rt ON r.tableid = rt.tableid
//           WHERE 1=1
//       `;

//     let queryParams = [];

//     if (searchItem && searchItem.trim() !== "") {
//       // Append search criteria for fields including status
//       query += ` AND (
//               ci.customer_name LIKE ? OR
//               rt.tablename LIKE ? OR
//               r.person_capicity LIKE ? OR
//               r.formtime LIKE ? OR
//               r.totime LIKE ? OR
//               r.reserveday LIKE ? OR
//               r.reserveid LIKE ? OR
//               (CASE
//                   WHEN r.status = 0 THEN 'free'
//                   WHEN r.status = 1 THEN 'Booked'
//               END) LIKE ?
//           )`;

//       // Add parameters for general search
//       const searchQuery = `%${searchItem}%`;
//       queryParams = [
//         searchQuery, // customer_name
//         searchQuery, // tablename
//         searchQuery, // person_capicity
//         searchQuery, // formtime
//         searchQuery, // totime
//         searchQuery, // reserveday
//         searchQuery, // reserveid
//         searchQuery, // status ('free' or 'Booked')
//       ];
//     }

//     // Add the ORDER BY clause outside of the search conditions
//     query += ` ORDER BY r.reserveid DESC`;

//     // Execute the query
//     db.pool.query(query, queryParams, (err, results) => {
//       if (err) {
//         console.error("Database query error:", err);
//         return res.status(500).json({ error: "Database query error" });
//       }

//       res.status(200).json({ data: results });
//     });
//   } catch (error) {
//     console.error("Error occurred while retrieving reservations:", error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while retrieving reservations" });
//   }
// };

const getavailablereservationtables = async (req, res) => {
  const { reserveday, formtime, totime } = req.query;
  const userId = req.id;

  if (!reserveday || !formtime || !totime) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  try {
    // ✅ FIXED: No timezone conversion
    const formattedDateStr = reserveday;

    // 🔹 Get User Info
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";

    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;

      if (!creatorId) {
        return res.status(403).json({
          error: "You are not authorized to view available tables",
        });
      }

      // 🔥 FINAL SLOT-BASED LOGIC
      const availableTablesQuery = `
  SELECT t.*
  FROM rest_table t
  LEFT JOIN tblreservation r 
    ON t.tableid = r.tableid
    AND r.reserveday = ?
    AND r.status = 1
    AND NOT (r.totime <= ? OR r.formtime >= ?)
  WHERE 
    r.tableid IS NULL
    AND t.created_by = ?
    AND (t.status = 0 OR t.status IS NULL)
`;

      const queryParams = [
        formattedDateStr,
        formtime, // existing reservation ends before new start
        totime, // existing reservation starts after new end
        creatorId,
      ];

      db.pool.query(
        availableTablesQuery,
        queryParams,
        (err, availableResults) => {
          if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Database query failed" });
          }

          return res.status(200).json({
            data: availableResults,
            message:
              availableResults.length > 0
                ? "Tables available"
                : "No tables available",
          });
        },
      );
    });
  } catch (error) {
    console.error("Error in getAvailableReservationTables:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getReservations = async (req, res) => {
  try {
    const id = req.id; // from auth middleware
    const { searchItem } = req.query;
    console.log(req.id);
    // Step 1: Check if user is admin or has a creator
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

      let userIdToUse;

      if (isAdmin === 1) {
        // Admin: use their own ID
        userIdToUse = id;
      } else {
        // Not admin: use creator's ID
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view reservations.",
          });
        }
        userIdToUse = created_by;
      }

      // Step 2: Build the reservation query
      let query = `
        SELECT 
            ci.customer_name, 
            rt.tablename, 
            r.person_capicity, 
            r.formtime AS start_time, 
            r.totime AS end_time, 
            r.reserveday AS date, 
            r.reserveid,
            CASE 
                WHEN r.status = 0 THEN 'free' 
                WHEN r.status = 1 THEN 'Booked' 
                ELSE 'unknown' 
            END AS status 
        FROM 
            tblreservation r
        JOIN 
            customer_info ci ON r.cid = ci.customer_id
        JOIN 
            rest_table rt ON r.tableid = rt.tableid
        WHERE 
            r.created_by = ?
      `;

      let queryParams = [userIdToUse];

      if (searchItem && searchItem.trim() !== "") {
        const searchQuery = `%${searchItem}%`;
        query += `
          AND (
            ci.customer_name LIKE ? OR 
            rt.tablename LIKE ? OR 
            r.person_capicity LIKE ? OR 
            r.formtime LIKE ? OR 
            r.totime LIKE ? OR 
            r.reserveday LIKE ? OR 
            r.reserveid LIKE ? OR
            (CASE 
                WHEN r.status = 0 THEN 'free' 
                WHEN r.status = 1 THEN 'Booked' 
            END) LIKE ?
          )
        `;
        queryParams.push(
          searchQuery, // customer_name
          searchQuery, // tablename
          searchQuery, // person_capicity
          searchQuery, // formtime
          searchQuery, // totime
          searchQuery, // reserveday
          searchQuery, // reserveid
          searchQuery, // status
        );
      }

      query += ` ORDER BY r.reserveid DESC`;

      // Step 3: Execute the final query
      db.pool.query(query, queryParams, (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: "Database query error" });
        }

        res.status(200).json({
          success: true,
          data: results,
          message: "Reservations fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Error occurred while retrieving reservations:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

// get table byidreservation
const getTableByIdreservation = async (req, res) => {
  const { tableid } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

  try {
    const getTableByIdQuery = `
      SELECT tableid, tablename, person_capicity
      FROM rest_table
      WHERE tableid = ? AND created_by = ?
    `;

    db.pool.query(getTableByIdQuery, [tableid, creatorId], (err, results) => {
      if (err) {
        console.error("Error retrieving table by ID:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while retrieving the table",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: results[0],
      });
    });
  } catch (error) {
    console.error("Error in getTableById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
  });
};

// reservation setting
const dbQuery = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.pool.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

const updatereservationsetting = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    const { reservation_open, reservation_close, maxreserveperson } = req.body;

    // Fetch the current settings by id
    const selectSql = "SELECT * FROM setting WHERE id = ?";
    const currentSetting = await dbQuery(selectSql, [id]);

    if (currentSetting.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // Update only the specified fields, while keeping the other fields unchanged
    const updateSql = `
        UPDATE setting 
        SET 
          reservation_open = ?, 
          reservation_close = ?, 
          maxreserveperson = ?
        WHERE id = ?`;

    const updateParams = [
      reservation_open || currentSetting[0].reservation_open, // Use the new value or keep the old one
      reservation_close || currentSetting[0].reservation_close,
      maxreserveperson || currentSetting[0].maxreserveperson,
      id,
    ];

    await dbQuery(updateSql, updateParams);

    res.status(200).json({
      success: true,
      message: "Reservation setting updated successfully",
    });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating reservation setting",
    });
  }
};
// delete reservation
const deleteReservation = (req, res) => {
  const { id } = req.params;
  const userId = req.id;
  console.log(id);

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    const deleteReservationQuery =
      "DELETE FROM tblreservation WHERE reserveid = ? AND created_by = ?";

    db.pool.query(deleteReservationQuery, [id, creatorId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database query error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.status(200).json({ message: "Reservation deleted successfully" });
    });
  });
};
const getReservationById = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    const query = `
        SELECT
            ci.customer_name,
            rt.tablename,
            r.person_capicity,
            r.formtime AS start_time,
            r.totime AS end_time,
            r.reserveday AS date,
            ci.customer_email,
            ci.customer_phone,
            r.created_by,
            r.reserveid,
            CASE
                WHEN r.status = 0 THEN 'free'
                WHEN r.status = 1 THEN 'Booked'
                ELSE 'unknown'
            END AS status
        FROM
            tblreservation r
        JOIN
            customer_info ci ON r.cid = ci.customer_id
        JOIN
            rest_table rt ON r.tableid = rt.tableid
        WHERE
            r.reserveid = ? AND r.created_by = ?
    `;

    db.pool.query(query, [id, creatorId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database query error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      res.status(200).json({ data: result[0] });
    });
  });
};
// const getReservationById = async (req, res) => {
//     const { id } = req.params;

//     const query = `
//         SELECT
//             ci.customer_name,
//             rt.tablename,
//             r.person_capicity,
//             r.formtime AS start_time,
//             r.totime AS end_time,
//             r.reserveday AS date,
//             ci.customer_email,
//             ci.customer_phone,
//             r.reserveid,
//             CASE
//                 WHEN r.status = 0 THEN 'free'
//                 WHEN r.status = 1 THEN 'Booked'
//                 ELSE 'unknown'
//             END AS status
//         FROM
//             tblreservation r
//         JOIN
//             customer_info ci ON r.cid = ci.customer_id
//         JOIN
//             rest_table rt ON r.tableid = rt.tableid
//         WHERE
//             r.reserveid = ?
//     `;

//     try {
//         db.pool.query(query, [id], (err, result) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ error: 'Database query error' });
//             }

//             if (result.length === 0) {
//                 return res.status(404).json({ message: 'Reservation not found' });
//             }

//             res.status(200).json({data:result[0]}); // Return the first result as it's by ID
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'An error occurred while retrieving the reservation' });
//     }
// };
// const updateReservationAndCustomer = (req, res) => {
//   const { reserveid } = req.params;
//   const {
//     customer_name,
//     customer_email,
//     customer_mobile,
//     formtime,
//     totime,
//     reserveday,
//   } = req.body;

//   const getReservationDataQuery = 'SELECT * FROM tblreservation WHERE reserveid = ?';
//   const getCustomerDataQuery = 'SELECT * FROM customer_info WHERE customer_id = ?';
//   const updateCustomerQuery =
//     'UPDATE customer_info SET customer_name = ?, customer_email = ?, customer_phone = ? WHERE customer_id = ?';
//   const updateReservationQuery =
//     'UPDATE tblreservation SET totime = ?, formtime = ?, reserveday = ? WHERE reserveid = ?';

//   try {
//     db.pool.query(getReservationDataQuery, [reserveid], (err, reservationResults) => {
//       if (err) {
//         console.error("Error fetching reservation:", err);
//         return res.status(500).json({ success: false, message: 'Error retrieving reservation data' });
//       }

//       if (reservationResults.length === 0) {
//         return res.status(404).json({ success: false, message: 'Reservation not found' });
//       }

//       const reservationData = reservationResults[0];
//       const customer_id = reservationData.cid;

//       db.pool.query(getCustomerDataQuery, [customer_id], (err, customerResults) => {
//         if (err) {
//           console.error("Error fetching customer:", err);
//           return res.status(500).json({ success: false, message: 'Error retrieving customer data' });
//         }

//         if (customerResults.length === 0) {
//           return res.status(404).json({ success: false, message: 'Customer not found' });
//         }

//         const customerData = customerResults[0];
//         const updatedCustomerData = {
//           customer_name: customer_name ?? customerData.customer_name,
//           customer_email: customer_email ?? customerData.customer_email,
//           customer_phone: customer_mobile ?? customerData.customer_phone,
//         };

//         db.pool.query(
//           updateCustomerQuery,
//           [
//             updatedCustomerData.customer_name,
//             updatedCustomerData.customer_email,
//             updatedCustomerData.customer_phone,
//             customer_id,
//           ],
//           (err, result) => {
//             if (err) {
//               console.error("Error updating customer:", err);
//               return res.status(500).json({ success: false, message: 'Error updating customer info' });
//             }

//             const updatedReservationData = {
//               totime: totime ?? reservationData.totime,
//               formtime: formtime ?? reservationData.formtime,
//               reserveday: reserveday ?? reservationData.reserveday,
//             };

//             db.pool.query(
//               updateReservationQuery,
//               [
//                 updatedReservationData.totime,
//                 updatedReservationData.formtime,
//                 updatedReservationData.reserveday,
//                 reserveid,
//               ],
//               (err, result) => {
//                 if (err) {
//                   console.error("Error updating reservation:", err);
//                   return res.status(500).json({ success: false, message: 'Error updating reservation info' });
//                 }

//                 return res.status(200).json({ success: true, message: 'Reservation and customer info updated successfully' });
//               }
//             );
//           }
//         );
//       });
//     });
//   } catch (error) {
//     console.error("Unhandled error:", error);
//     res.status(500).json({ success: false, message: 'An error occurred while updating reservation and customer info' });
//   }
// };
// const updateReservationAndCustomer = (req, res) => {
//   const { reserveid } = req.params;
//   const {
//     customer_name,
//     customer_email,
//     customer_mobile,
//     formtime,
//     totime,
//     reserveday,
//     created_by, // ✅ Assuming this comes from req.body
//   } = req.body;

//   const getReservationDataQuery = 'SELECT * FROM tblreservation WHERE reserveid = ?';
//   const getCustomerDataQuery = 'SELECT * FROM customer_info WHERE customer_id = ?';
//   const updateCustomerQuery =
//     'UPDATE customer_info SET customer_name = ?, customer_email = ?, customer_phone = ?, created_by = ? WHERE customer_id = ?';
//   const updateReservationQuery =
//     'UPDATE tblreservation SET totime = ?, formtime = ?, reserveday = ? WHERE reserveid = ?';

//   try {
//     db.pool.query(getReservationDataQuery, [reserveid], (err, reservationResults) => {
//       if (err) {
//         console.error("Error fetching reservation:", err);
//         return res.status(500).json({ success: false, message: 'Error retrieving reservation data' });
//       }

//       if (reservationResults.length === 0) {
//         return res.status(404).json({ success: false, message: 'Reservation not found' });
//       }

//       const reservationData = reservationResults[0];
//       const customer_id = reservationData.cid;

//       db.pool.query(getCustomerDataQuery, [customer_id], (err, customerResults) => {
//         if (err) {
//           console.error("Error fetching customer:", err);
//           return res.status(500).json({ success: false, message: 'Error retrieving customer data' });
//         }

//         if (customerResults.length === 0) {
//           return res.status(404).json({ success: false, message: 'Customer not found' });
//         }

//         const customerData = customerResults[0];
//         const updatedCustomerData = {
//           customer_name: customer_name ?? customerData.customer_name,
//           customer_email: customer_email ?? customerData.customer_email,
//           customer_phone: customer_mobile ?? customerData.customer_phone,
//         };

//         db.pool.query(
//           updateCustomerQuery,
//           [
//             updatedCustomerData.customer_name,
//             updatedCustomerData.customer_email,
//             updatedCustomerData.customer_phone,
//             created_by,          // ✅ Correctly passed
//             customer_id          // ✅ Moved to correct position
//           ],
//           (err, result) => {
//             if (err) {
//               console.error("Error updating customer:", err);
//               return res.status(500).json({ success: false, message: 'Error updating customer info' });
//             }

//             const updatedReservationData = {
//               totime: totime ?? reservationData.totime,
//               formtime: formtime ?? reservationData.formtime,
//               reserveday: reserveday ?? reservationData.reserveday,
//             };

//             db.pool.query(
//               updateReservationQuery,
//               [
//                 updatedReservationData.totime,
//                 updatedReservationData.formtime,
//                 updatedReservationData.reserveday,
//                 reserveid
//               ],
//               (err, result) => {
//                 if (err) {
//                   console.error("Error updating reservation:", err);
//                   return res.status(500).json({ success: false, message: 'Error updating reservation info' });
//                 }

//                 return res.status(200).json({ success: true, message: 'Reservation and customer info updated successfully' });
//               }
//             );
//           }
//         );
//       });
//     });
//   } catch (error) {
//     console.error("Unhandled error:", error);
//     res.status(500).json({ success: false, message: 'An error occurred while updating reservation and customer info' });
//   }
// };
const updateReservationAndCustomer = (req, res) => {
  const { reserveid } = req.params;
  const userId = req.id;
  const {
    customer_name,
    customer_email,
    customer_mobile,
    formtime,
    totime,
    reserveday,
  } = req.body;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: userCreatedBy } = userResult[0];
    const creatorId = is_admin === 1 ? userId : userCreatedBy;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const getReservationDataQuery =
      "SELECT * FROM tblreservation WHERE reserveid = ? AND created_by = ?";
    const getCustomerDataQuery =
      "SELECT * FROM customer_info WHERE customer_id = ?";
    const checkDuplicateQuery = `
    SELECT * FROM customer_info
    WHERE (customer_email = ? OR customer_phone = ?) AND customer_id != ?`;
    const updateCustomerQuery =
      "UPDATE customer_info SET customer_name = ?, customer_email = ?, customer_phone = ?, created_by = ? WHERE customer_id = ?";
    const updateReservationQuery =
      "UPDATE tblreservation SET totime = ?, formtime = ?, reserveday = ? WHERE reserveid = ? AND created_by = ?";

    db.pool.query(
      getReservationDataQuery,
      [reserveid, creatorId],
      (err, reservationResults) => {
        if (err) {
          console.error("Error fetching reservation:", err);
          return res.status(500).json({
            success: false,
            message: "Error retrieving reservation data",
          });
        }

        if (reservationResults.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Reservation not found" });
        }

        const reservationData = reservationResults[0];
        const customer_id = reservationData.cid;

        db.pool.query(
          getCustomerDataQuery,
          [customer_id],
          (err, customerResults) => {
            if (err) {
              console.error("Error fetching customer:", err);
              return res.status(500).json({
                success: false,
                message: "Error retrieving customer data",
              });
            }

            if (customerResults.length === 0) {
              return res
                .status(404)
                .json({ success: false, message: "Customer not found" });
            }

            const customerData = customerResults[0];
            const updatedCustomerData = {
              customer_name: customer_name ?? customerData.customer_name,
              customer_email: customer_email ?? customerData.customer_email,
              customer_phone: customer_mobile ?? customerData.customer_phone,
            };

            db.pool.query(
              checkDuplicateQuery,
              [
                updatedCustomerData.customer_email,
                updatedCustomerData.customer_phone,
                customer_id,
              ],
              (err, duplicateResults) => {
                if (err) {
                  console.error("Error checking duplicates:", err);
                  return res.status(500).json({
                    success: false,
                    message: "Error validating customer data",
                  });
                }

                if (duplicateResults.length > 0) {
                  return res.status(400).json({
                    success: false,
                    message:
                      "Email or Mobile number already exists for another customer",
                  });
                }

                db.pool.query(
                  updateCustomerQuery,
                  [
                    updatedCustomerData.customer_name,
                    updatedCustomerData.customer_email,
                    updatedCustomerData.customer_phone,
                    creatorId,
                    customer_id,
                  ],
                  (err) => {
                    if (err) {
                      console.error("Error updating customer:", err);
                      return res.status(500).json({
                        success: false,
                        message: "Error updating customer info",
                      });
                    }

                    const updatedReservationData = {
                      totime: totime ?? reservationData.totime,
                      formtime: formtime ?? reservationData.formtime,
                      reserveday: reserveday ?? reservationData.reserveday,
                    };

                    db.pool.query(
                      updateReservationQuery,
                      [
                        updatedReservationData.totime,
                        updatedReservationData.formtime,
                        updatedReservationData.reserveday,
                        reserveid,
                        creatorId,
                      ],
                      (err) => {
                        if (err) {
                          console.error("Error updating reservation:", err);
                          return res.status(500).json({
                            success: false,
                            message: "Error updating reservation info",
                          });
                        }

                        return res.status(200).json({
                          success: true,
                          message:
                            "Reservation and customer info updated successfully",
                        });
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  });
};

module.exports = {
  createUnavailability,
  getUnavailability,
  deleteUnavailability,
  getUnavailabilitybyid,
  updateUnavailability,
  getReservations,
  updatereservationsetting,
  getavailablereservationtables,
  createReservation,
  getTableByIdreservation,
  deleteReservation,
  getReservationById,
  updateReservationAndCustomer,
};
