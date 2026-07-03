const db = require("../utils/db");

const dbQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    db.pool.query(query, values, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
};

const createLoyaltyPoint = (req, res) => {
  const { amount, earn_point, status } = req.body;
  const user_id = req.id; // Provided by authentication middleware

  if (!amount || !earn_point) {
    return res
      .status(400)
      .json({ success: false, message: "Amount and Earn Point are required" });
  }

  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Database error", error: err });

    const handleInsert = (created_by) => {
      const checkExistingQuery =
        "SELECT * FROM loyality_point_setting WHERE created_by = ?";
      db.pool.query(
        checkExistingQuery,
        [created_by],
        (err, existingResults) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, message: "Database error", error: err });

          if (existingResults.length > 0) {
            return res.status(409).json({
              success: false,
              message:
                "Loyalty point setting already exists you can update it :)",
            });
          }

          const insertQuery = `
          INSERT INTO loyality_point_setting (amount, earn_point, status, created_by)
          VALUES (?, ?, ?, ?)
        `;
          const values = [amount, earn_point, status, created_by];

          db.pool.query(insertQuery, values, (err) => {
            if (err)
              return res.status(500).json({
                success: false,
                message: "Database error",
                error: err,
              });
            return res.status(201).json({
              success: true,
              message: "Loyalty point setting created successfully.",
            });
          });
        },
      );
    };

    if (results.length > 0) {
      // User has a subscription
      handleInsert(user_id);
    } else {
      // Check who created the user
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err)
          return res
            .status(500)
            .json({ success: false, message: "Database error", error: err });

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to create loyalty points.",
          });
        }

        const creator_id = data[0].created_by;

        // Check if creator has a subscription
        db.pool.query(
          checkSubscriptionQuery,
          [creator_id],
          (err, creatorResults) => {
            if (err)
              return res.status(500).json({
                success: false,
                message: "Database error",
                error: err,
              });

            if (creatorResults.length > 0) {
              handleInsert(creator_id);
            } else {
              return res.status(403).json({
                success: false,
                message: "Creator does not have an active subscription.",
              });
            }
          },
        );
      });
    }
  });
};

// Get all loyalty point settings or search by criteria
const getLoyaltyPoints = (req, res) => {
  try {
    const id = req.id; // from auth middleware
    const { search } = req.query;

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

      let query = "";
      let params = [];

      if (isAdmin === 1) {
        // Admin: fetch own loyalty points
        if (!search || search.trim() === "") {
          query =
            "SELECT * FROM loyality_point_setting WHERE created_by = ? ORDER BY id DESC";
          params = [id];
        } else {
          const searchTerm = `%${search}%`;
          query = `
            SELECT * FROM loyality_point_setting
            WHERE created_by = ? AND (amount LIKE ? OR earn_point LIKE ?)
            ORDER BY id DESC
          `;
          params = [id, searchTerm, searchTerm];
        }
      } else {
        // Sub-user: fetch based on creator
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view loyalty points.",
          });
        }

        if (!search || search.trim() === "") {
          query =
            "SELECT * FROM loyality_point_setting WHERE created_by = ? ORDER BY id DESC";
          params = [created_by];
        } else {
          const searchTerm = `%${search}%`;
          query = `
            SELECT * FROM loyality_point_setting
            WHERE created_by = ? AND (amount LIKE ? OR earn_point LIKE ?)
            ORDER BY id DESC
          `;
          params = [created_by, searchTerm, searchTerm];
        }
      }

      db.pool.query(query, params, (err, results) => {
        if (err) {
          console.error("Error fetching loyalty points:", err);
          return res
            .status(500)
            .json({ success: false, message: "An error occurred", error: err });
        }

        res.status(200).json({
          success: true,
          data: results,
          message: "Loyalty points fetched successfully",
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

const deleteLoyaltyPoint = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "DELETE FROM loyality_point_setting WHERE id = ? AND created_by = ?";
    db.pool.query(query, [id, creatorId], (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "An error occurred" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Loyalty point setting not found" });
      }

      res.status(200).json({
        success: true,
        message: "Loyalty point setting deleted successfully",
      });
    });
  });
};
const getLoyaltyPointById = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "SELECT * FROM loyality_point_setting WHERE id = ? AND created_by = ?";
    db.pool.query(query, [id, creatorId], (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "An error occurred" });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Loyalty point setting not found" });
      }

      res.status(200).json({ success: true, data: results[0] });
    });
  });
};

const updateLoyaltyPoint = (req, res) => {
  const { id } = req.params;
  const { amount, earn_point, status } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const checkQuery = "SELECT id FROM loyality_point_setting WHERE id = ? AND created_by = ?";
    db.pool.query(checkQuery, [id, creatorId], (err, checkResult) => {
      if (err) return res.status(500).json({ success: false, message: "An error occurred" });
      if (!checkResult.length) return res.status(404).json({ success: false, message: "Loyalty point setting not found" });

      const query =
        "UPDATE loyality_point_setting SET amount = ?, earn_point = ?, status = ?, created_by = ? WHERE id = ? AND created_by = ?";
      db.pool.query(
        query,
        [amount, earn_point, status, creatorId, id, creatorId],
        (err, result) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ success: false, message: "An error occurred" });
          }

          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ success: false, message: "Loyalty point setting not found" });
          }

          res.status(200).json({
            success: true,
            message: "Loyalty point setting updated successfully",
          });
        },
      );
    });
  });
};
//   const getCustomerBillDetails = async (req, res) => {
//   console.log("API hit: getCustomerBillDetails");

//   const { search } = req.query;
//   const id = req.id;
//   try {

//     const userQuery = `SELECT is_admin, created_by FROM user WHERE id = ?`;
//     db.pool.query(userQuery, [id], (err, userData) => {
//       if (err) {
//         return res.status(500).json({ message: "Database error", error: err });
//       }

//       if (userData.length === 0) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       const { is_admin, created_by } = userData[0];
//       const creatorId = is_admin === 1 ? id : created_by;

//       if (!creatorId) {
//         return res.status(403).json({ message: "Unauthorized to view bill details" });
//       }

//       // Step 2: Fetch loyalty settings
//       const loyaltyQuery = `SELECT * FROM loyality_point_setting WHERE status = 1`;
//       db.pool.query(loyaltyQuery, (err, loyaltyResults) => {
//         if (err) {
//           return res.status(500).json({ message: "Loyalty DB query failed", error: err });
//         }

//         if (loyaltyResults.length === 0) {
//           return res.status(404).json({ message: "No loyalty point settings found" });
//         }

//         const { amount, earn_point } = loyaltyResults[0];

//         // Step 3: Build main bill query
//         let billQuery = `
//           SELECT
//               b.customer_id,
//               ci.customer_name,
//               SUM(b.bill_amount) AS total_bill_amount,
//               FLOOR(SUM(b.bill_amount) / ?) * ? AS earning_points
//           FROM bill b
//           LEFT JOIN customer_info ci ON ci.customer_id = b.customer_id
//           WHERE b.create_by = ?
//           GROUP BY b.customer_id, ci.customer_name
//         `;
//         const queryParams = [amount, earn_point, creatorId];

//         if (search && search.trim() !== "") {
//           billQuery += `
//             HAVING ci.customer_name LIKE ?
//             OR b.customer_id LIKE ?
//             OR total_bill_amount LIKE ?
//             OR earning_points LIKE ?
//           `;
//           const likeSearch = `%${search}%`;
//           queryParams.push(likeSearch, likeSearch, likeSearch, likeSearch);
//         }

//         db.pool.query(billQuery, queryParams, (err, billResults) => {
//           if (err) {
//             console.error("Bill query error:", err);
//             return res.status(500).json({ message: "Customer bill query failed", error: err });
//           }

//           res.status(200).json({ success: true, data: billResults });
//         });
//       });
//     });
//   } catch (err) {
//     console.error("Server error:", err);
//     res.status(500).json({ message: "Unexpected server error", error: err.message || err });
//   }
// };
const getCustomerBillDetails = (req, res) => {
  console.log("API hit: getCustomerBillDetails");

  const { search } = req.query;
  const id = req.id;

  const userQuery = `SELECT is_admin, created_by FROM user WHERE id = ?`;
  db.pool.query(userQuery, [id], (err, userData) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (userData.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? id : created_by;

    if (!creatorId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view bill details" });
    }

    const loyaltyQuery = `SELECT amount, earn_point FROM loyality_point_setting WHERE status = 1 AND created_by = ? LIMIT 1`;
    db.pool.query(loyaltyQuery, [creatorId], (err, loyaltyResults) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Loyalty DB query failed", error: err });
      }

      if (loyaltyResults.length === 0) {
        return res
          .status(404)
          .json({ message: "No loyalty point settings found" });
      }

      const { amount, earn_point } = loyaltyResults[0];

      // Base query
      let billQuery = `
        SELECT
          b.customer_id,
          ci.customer_name,
          SUM(b.bill_amount) AS total_bill_amount,
          FLOOR(SUM(b.bill_amount) / ?) * ? AS earning_points
        FROM bill b
        LEFT JOIN customer_info ci ON ci.customer_id = b.customer_id
        WHERE b.bill_status = 1 AND b.create_by = ?
      `;

      const queryParams = [amount, earn_point, creatorId];

      if (search && search.trim() !== "") {
        billQuery += ` AND (
          ci.customer_name LIKE ?
          OR b.customer_id LIKE ?
        )`;
        const likeSearch = `%${search}%`;
        queryParams.push(likeSearch, likeSearch);
      }

      billQuery += `
        GROUP BY b.customer_id, ci.customer_name
      `;

      db.pool.query(billQuery, queryParams, (err, billResults) => {
        if (err) {
          console.error("Bill query error:", err);
          return res
            .status(500)
            .json({ message: "Customer bill query failed", error: err });
        }

        res.status(200).json({ success: true, data: billResults });
      });
    });
  });
};

const dueMergePayment = (req, res) => {
  const { orderid, payment_method_id, paidAmount, discount } = req.body;
  const userId = req.id;

  // Validate order IDs
  if (!orderid || !Array.isArray(orderid) || orderid.length === 0) {
    return res.status(400).json({ message: "Invalid order IDs" });
  }

  console.log("Order IDs:", orderid);

  const allOrder = orderid.join(",");

  console.log("Request Body:", req.body);

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

  // Check if orders exist and belong to this tenant
  const checkOrderQuery = "SELECT * FROM customer_order WHERE order_id IN (?) AND created_by = ?";
  db.pool.query(checkOrderQuery, [orderid, creatorId], (err, orderResult) => {
    if (err) {
      console.error("Error checking customer_order:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while checking orders",
      });
    }

    if (orderResult.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update customer_order table
    const updateOrderQuery = `
        UPDATE customer_order 
        SET marge_order_id = ?, customerpaid = ?, order_status = 2 
        WHERE order_id IN (?)
      `;
    db.pool.query(
      updateOrderQuery,
      [allOrder, paidAmount, orderid],
      (err, updateOrderResult) => {
        if (err) {
          console.error("Error updating customer_order:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while updating customer orders",
          });
        }

        if (updateOrderResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "No rows updated in customer_order",
          });
        }

        // Update bill table
        const updateBillQuery = `
          UPDATE bill
          SET
            payment_method_id = ?,
            bill_date = NOW(),
            bill_time = CURTIME(),
            discount = ?,      
            bill_amount = ?,
            bill_status = 0
          WHERE order_id IN (?)
        `;
        db.pool.query(
          updateBillQuery,
          [payment_method_id, discount, paidAmount, orderid],
          (err, updateBillResult) => {
            if (err) {
              console.error("Error updating bill:", err);
              return res.status(500).json({
                success: false,
                message: "An error occurred while updating bill",
              });
            }

            if (updateBillResult.affectedRows === 0) {
              return res
                .status(404)
                .json({ success: false, message: "No rows updated in bill" });
            }
            const data = { ismerge: 1, duemerge: 0 };

            res
              .status(200)
              .json({ success: true, message: "due mergerd", data: data });
          },
        );
      },
    );
  });
  });
};

// const getOngoingOrderDueMerge = async (req, res) => {
//   try {
//     const id = req.id; // Authenticated user ID

//     const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

//     db.pool.query(checkUserQuery, [id], (err, userData) => {
//       if (err) {
//         return res
//           .status(500)
//           .json({ success: false, message: "Database error", error: err });
//       }

//       if (userData.length === 0) {
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found." });
//       }

//       const isAdmin = userData[0].is_admin;
//       const created_by = userData[0].created_by;

//       let userFilterCondition;
//       let queryParams;

//       if (isAdmin === 1) {
//         userFilterCondition = `co.created_by = ?`;
//         queryParams = [id];
//       } else {
//         if (!created_by) {
//           return res.status(403).json({
//             success: false,
//             message: "You are not authorized to view these orders.",
//           });
//         }
//         userFilterCondition = `co.created_by = ?`;
//         queryParams = [created_by];
//       }

//       // Non-Merged Orders
//       const getOnGoingOrdersQuery = `
//         SELECT
//           co.*,
//           c.customer_name,
//           w.firstname AS waiter_first_name,
//           w.lastname AS waiter_last_name,
//           rt.tablename,
//           b.discount,
//           b.service_charge,
//           b.shipping_type,
//           b.VAT,
//           b.bill_amount,
//           b.bill_date,
//           b.bill_status,
//           b.payment_method_id,
//           sm.shipping_method AS shipping_method_name
//         FROM
//           customer_order co
//         LEFT JOIN customer_info c ON co.customer_id = c.customer_id
//         LEFT JOIN user w ON co.waiter_id = w.id
//         LEFT JOIN rest_table rt ON co.table_no = rt.tableid
//         LEFT JOIN bill b ON co.order_id = b.order_id
//         LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
//         WHERE
//           ${userFilterCondition}
//        AND co.status IN ('accepted','in_progress','completed')
// AND (b.bill_status = 0 OR b.bill_status IS NULL)
//           AND co.marge_order_id IS NULL
//         ORDER BY co.order_id DESC
//       `;

//       db.pool.query(
//         getOnGoingOrdersQuery,
//         queryParams,
//         (err, nonMergedOrders) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({
//               success: false,
//               message: "Error fetching non-merged orders.",
//             });
//           }

//           // Merged Orders
//           const getOnGoingOrdersQuery2 = `
//           SELECT
//             GROUP_CONCAT(DISTINCT co.marge_order_id ORDER BY co.marge_order_id ASC) AS marge_order_id,
//             MAX(c.customer_name) AS customer_name,
//             MAX(w.firstname) AS waiter_first_name,
//             MAX(w.lastname) AS waiter_last_name,
//             MAX(rt.tablename) AS tablename,
//             MAX(b.discount) AS discount,
//             MAX(b.service_charge) AS service_charge,
//             MAX(b.shipping_type) AS shipping_type,
//             MAX(b.VAT) AS VAT,
//             MAX(b.bill_amount) AS bill_amount,
//             MAX(b.bill_date) AS bill_date,
//             MAX(b.bill_status) AS bill_status,
//             MAX(b.payment_method_id) AS payment_method_id,
//             MAX(sm.shipping_method) AS shipping_method_name
//           FROM
//             customer_order co
//           LEFT JOIN customer_info c ON co.customer_id = c.customer_id
//           LEFT JOIN user w ON co.waiter_id = w.id
//           LEFT JOIN rest_table rt ON co.table_no = rt.tableid
//           LEFT JOIN bill b ON co.order_id = b.order_id
//           LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
//           WHERE
//             ${userFilterCondition}
//           AND co.status IN ('accepted','in_progress','completed')
// AND (b.bill_status = 0 OR b.bill_status IS NULL)
//             AND co.marge_order_id IS NOT NULL
//           GROUP BY co.marge_order_id
//           ORDER BY co.marge_order_id DESC
//         `;

//           db.pool.query(
//             getOnGoingOrdersQuery2,
//             queryParams,
//             (err, mergedOrders) => {
//               if (err) {
//                 console.error(err);
//                 return res.status(500).json({
//                   success: false,
//                   message: "Error fetching merged orders.",
//                 });
//               }

//               res.status(200).json({
//                 success: true,
//                 NonMergedOrder: nonMergedOrders,
//                 MergeOrder: mergedOrders,
//                 message: "Ongoing Orders fetched successfully",
//               });
//             }
//           );
//         }
//       );
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "An unexpected error occurred" });
//   }
// };

const getOngoingOrderDueMerge = async (req, res) => {
  try {
    const id = req.id; // Authenticated user ID

    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;

      let userFilterCondition;
      let queryParams;

      if (isAdmin === 1) {
        userFilterCondition = "co.created_by = ?";
        queryParams = [id];
      } else {
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view these orders.",
          });
        }
        userFilterCondition = "co.created_by = ?";
        queryParams = [created_by];
      }

      /* 🔥 MAIN FIX
         Ongoing orders = order_status 1 (Accepted) OR 2 (Prepared)
      */
      const ongoingStatusCondition = `co.order_status IN (1, 2)`;

      // ================= NON-MERGED ORDERS =================
      const nonMergedQuery = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        WHERE
          ${userFilterCondition}
          AND ${ongoingStatusCondition}
          AND co.marge_order_id IS NULL
        ORDER BY co.order_id DESC
      `;

      db.pool.query(nonMergedQuery, queryParams, (err, nonMergedOrders) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Error fetching non-merged orders",
          });
        }

        // ================= MERGED ORDERS =================
        const mergedQuery = `
          SELECT
            GROUP_CONCAT(DISTINCT co.marge_order_id ORDER BY co.marge_order_id ASC) AS marge_order_id,
            MAX(c.customer_name) AS customer_name,
            MAX(w.firstname) AS waiter_first_name,
            MAX(w.lastname) AS waiter_last_name,
            MAX(rt.tablename) AS tablename
          FROM customer_order co
          LEFT JOIN customer_info c ON co.customer_id = c.customer_id
          LEFT JOIN user w ON co.waiter_id = w.id
          LEFT JOIN rest_table rt ON co.table_no = rt.tableid
          WHERE
            ${userFilterCondition}
            AND ${ongoingStatusCondition}
            AND co.marge_order_id IS NOT NULL
          GROUP BY co.marge_order_id
          ORDER BY co.marge_order_id DESC
        `;

        db.pool.query(mergedQuery, queryParams, (err, mergedOrders) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              success: false,
              message: "Error fetching merged orders",
            });
          }

          return res.status(200).json({
            success: true,
            NonMergedOrder: nonMergedOrders,
            MergeOrder: mergedOrders,
            message: "Ongoing Orders fetched successfully",
          });
        });
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
    });
  }
};

const getOrderByIdsDUeMerge = async (req, res) => {
  const order_ids = req.params.orderid;
  const userId = req.id;

  if (!order_ids) {
    return res.status(400).json({ message: "Order IDs are required" });
  }

  try {
    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ message: "Unauthorized" });

    // Convert `order_ids` into an array
    const orderIdsArray = order_ids.split(",").map((id) => id.trim());

    // Query to fetch order details for multiple order_ids
    const getOrderDetailsQuery = `
        SELECT
          co.*,
          rt.tablename,
          c.customer_name,
          c.customer_email,
          c.customer_address,
          c.customer_phone,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_id,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name,
          CASE co.order_status
            WHEN 1 THEN 'Pending'
            WHEN 2 THEN 'Processing'
            WHEN 3 THEN 'Ready'
            WHEN 4 THEN 'Served'
            WHEN 5 THEN 'Cancel'
            WHEN 6 THEN 'Hold'
          END AS order_status_name
        FROM
          customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        WHERE
          co.order_id IN (${orderIdsArray.map(() => "?").join(",")}) AND co.created_by = ?;
      `;

    // Query to fetch menu items for multiple order_ids
    const getOrderMenuQuery = `
        SELECT
          om.*,
          f.*,
          v.variantName,
          GROUP_CONCAT(a.add_on_id) AS add_on_ids,
          GROUP_CONCAT(a.add_on_name) AS add_on_names,
          GROUP_CONCAT(a.price) AS add_on_prices
        FROM
          order_menu om
        LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, om.add_on_id)
        LEFT JOIN item_foods f ON om.menu_id = f.ProductsID
        LEFT JOIN variant v ON om.varientid = v.variantid
        WHERE
          om.order_id IN (${orderIdsArray.map(() => "?").join(",")})
        GROUP BY om.menu_id, om.varientid, om.order_id;
      `;

    // Fetch order details
    db.pool.query(
      getOrderDetailsQuery,
      [...orderIdsArray, creatorId],
      (err, orderResults) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching order details",
          });
        }

        // Fetch menu items
        db.pool.query(
          getOrderMenuQuery,
          [...orderIdsArray],
          (err, menuResults) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: "An error occurred while fetching menu items",
              });
            }

            // Process menu results to structure add-on data
            const structuredMenuItems = menuResults.map((item) => {
              const addOnIds = item.add_on_ids
                ? item.add_on_ids.split(",")
                : [];
              const addOnNames = item.add_on_names
                ? item.add_on_names.split(",")
                : [];
              const addOnPrices = item.add_on_prices
                ? item.add_on_prices.split(",")
                : [];
              const addOnQuantities = item.addonsqty
                ? item.addonsqty.split(",")
                : [];

              const addOns = addOnIds.map((id, index) => ({
                add_on_id: id,
                add_on_name: addOnNames[index] || null,
                add_on_price: addOnPrices[index] || null,
                add_on_quantity: addOnQuantities[index] || null,
              }));

              return {
                ...item,
                add_ons: addOns,
              };
            });

            res.status(200).json({
              success: true,
              orderDetails: orderResults,

              menuItems: structuredMenuItems,
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
};

const cancelAllTypeOrder = (req, res) => {
  const order_ids = req.params.order_id; // Expecting multiple IDs as comma-separated values
  const { anyreason } = req.body;
  const userId = req.id;

  if (!order_ids || !anyreason) {
    return res.status(400).json({
      success: false,
      message: "Missing order_ids or cancellation reason",
    });
  }

  // Convert order_ids into an array
  const orderIdsArray = order_ids.split(",").map((id) => id.trim());

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

  // Step 1: Get table_no based on order_ids (scoped to tenant)
  const getTableQuery = `SELECT DISTINCT table_no FROM customer_order WHERE order_id IN (?) AND created_by = ?`;
  db.pool.query(getTableQuery, [orderIdsArray, creatorId], (err, result) => {
    if (err) {
      console.error("Error fetching table_no:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching the table number",
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found with the provided order_ids",
      });
    }

    const tableIds = result.map((row) => row.table_no); // Extract table_no values

    // Step 2: Update table status for affected tables
    const updateTableQuery = `UPDATE rest_table SET status = 0 WHERE tableid IN (?)`;
    db.pool.query(updateTableQuery, [tableIds], (err) => {
      if (err) {
        console.error("Error updating table status:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the table status",
        });
      }

      // Step 3: Update order status and cancellation reason
      const updateOrderQuery = `
          UPDATE customer_order
          SET order_status = 5, anyreason = ?, status = 'rejected'
          WHERE order_id IN (?)`;

      db.pool.query(
        updateOrderQuery,
        [anyreason, orderIdsArray],
        (err, result) => {
          if (err) {
            console.error("Error updating customer_order:", err);
            return res.status(500).json({
              success: false,
              message: "An error occurred while updating the orders",
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: "No orders found with the provided order_ids",
            });
          }

          // Success response
          res.status(200).json({
            success: true,
            message: "Orders canceled successfully",
          });
        },
      );
    });
  });
  });
};

const postsplitorder = async (req, res) => {
  const { order_id, customer_id, total_price, order_menu } = req.body;

  if (
    !order_id ||
    !customer_id ||
    !total_price ||
    !Array.isArray(order_menu) ||
    order_menu.length === 0
  ) {
    return res.status(400).json({
      message: "Required fields are missing or invalid order_menu data",
    });
  }

  try {
    let orderDetailsData = order_menu.map((menu) => {
      const addons = Array.isArray(menu.addons) ? menu.addons : [];
      const addOnIds = addons.map((addon) => addon.addons_id || "").join(",");
      const addOnQuantities = addons
        .map((addon) => addon.addonsqty || 0)
        .join(",");

      return [
        order_id,
        customer_id,
        menu.productvat || 0,
        menu.discount || 0,
        menu.s_charge || 0,
        menu.menuqty * parseFloat(menu.price),
        // menu.total_price || 0,
        0, // Default status: unpaid
        menu.menu_id || null, // Ensure a valid menu ID
        addOnIds || null,
        addOnQuantities || null,
        0, // Default invoiceprint value
      ];
    });

    const insertQuery = `
        INSERT INTO sub_order 
        (order_id, customer_id, vat, discount, s_charge, total_price, status, order_menu_id, adons_id, adons_qty, invoiceprint)
        VALUES ?`;

    db.pool.query(insertQuery, [orderDetailsData], (err, result) => {
      if (err) {
        console.error("Error inserting sub order:", err);
        return res
          .status(500)
          .json({ message: "Internal server error", error: err });
      }

      // Get the inserted `sub_id` values
      const firstInsertedId = result.insertId;
      const insertedIds = Array.from(
        { length: result.affectedRows },
        (_, i) => firstInsertedId + i,
      );

      res.status(201).json({
        message: "Sub order(s) created successfully",

        sub_order_ids: insertedIds,
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ message: "Unexpected error occurred", error: error.message });
  }
};
module.exports = {
  createLoyaltyPoint,
  getLoyaltyPoints,
  deleteLoyaltyPoint,
  getLoyaltyPointById,
  updateLoyaltyPoint,
  getCustomerBillDetails,
  dueMergePayment,
  getOngoingOrderDueMerge,
  getOrderByIdsDUeMerge,
  cancelAllTypeOrder,
  postsplitorder,
};
