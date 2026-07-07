const db = require("../utils/db");

const getPaymentMethods = (req, res) => {
  const sql = "SELECT *  FROM payment_method WHERE is_active = 1";
  db.pool.query(sql, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(results);
  });
};
// make payment
// const makePayment = (req, res) => {
//   const { order_id } = req.params;
//   const { payment_method_id, paidAmount, discount } = req.body;

//   console.log(req.body);

//   const checkOrderQuery = "SELECT * FROM customer_order WHERE order_id = ?";
//   db.pool.query(checkOrderQuery, [order_id], (err, orderResult) => {
//     if (err) {
//       console.error("Error checking customer_order:", err);
//       return res.status(500).json({ success: false, message: "An error occurred" });
//     }

//     if (orderResult.length === 0) {
//       console.log("Order not found for order_id:", order_id);
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     // Update customer_order table
//     const updateOrderQuery = `UPDATE customer_order SET customerpaid = ?, order_status = 4 WHERE order_id = ?`;
//     db.pool.query(updateOrderQuery, [paidAmount, order_id], (err, updateOrderResult) => {
//       if (err) {
//         console.error("Error updating customer_order:", err);
//         return res.status(500).json({ success: false, message: "An error occurred" });
//       }

//       if (updateOrderResult.affectedRows === 0) {
//         console.log("No rows updated in customer_order for order_id:", order_id);
//         return res.status(404).json({
//           success: false,
//           message: "No rows updated in customer_order",
//         });
//       }

//       // If table_no is not 0, update rest_table
//       if (orderResult[0].table_no !== 0) {
//         const table_no = orderResult[0].table_no; //  table_no is part of the customer_order table

//         const updateTableQuery = `UPDATE rest_table SET status = 0 WHERE tableid = ?`; // status=1 means booked and status=0 free
//         db.pool.query(updateTableQuery, [table_no], (err, updateTableResult) => {
//           if (err) {
//             console.error("Error updating rest_table:", err);
//             return res.status(500).json({ success: false, message: "An error occurred" });
//           }

//           if (updateTableResult.affectedRows === 0) {
//             console.log("No rows updated in rest_table for tableid:", table_no);
//             return res.status(404).json({
//               success: false,
//               message: "No rows updated in rest_table",
//             });
//           }
//         });
//       }

//       // Update bill table
//       const updateBillQuery = `
//         UPDATE bill
//         SET
//           payment_method_id = ?,
//           bill_date = NOW(),
//           bill_time = CURTIME(),
//           discount = ?,      
//           bill_amount = ?,
//           bill_status = 1
//         WHERE order_id = ?
//       `;
//       db.pool.query(
//         updateBillQuery,
//         [payment_method_id, discount, paidAmount, order_id],
//         (err, updateBillResult) => {
//           if (err) {
//             console.error("Error updating bill:", err);
//             return res.status(500).json({ success: false, message: "An error occurred" });
//           }

//           if (updateBillResult.affectedRows === 0) {
//             console.log("No rows updated in bill for order_id:", order_id);
//             return res.status(404).json({ success: false, message: "No rows updated in bill" });
//           }

//           // Check and log SQL warnings
//           db.pool.query("SHOW WARNINGS", (err, warnings) => {
//             if (err) {
//               console.error("Error showing warnings:", err);
//             } else {
//               console.log("SQL Warnings:", warnings);
//             }
//           });

//           res.status(200).json({ success: true, message: "Payment done successfully" });
//         }
//       );
//     });
//   });
// };




const makePayment = (req, res) => {
  const { order_id } = req.params;
  const { payment_method_id, paidAmount, discount, service_charge } = req.body;
  const userId = req.id;

  console.log(req.body);

  db.pool.query("SELECT is_admin, created_by FROM user WHERE id = ?", [userId], (userErr, userData) => {
    if (userErr || !userData.length) {
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? userId : created_by;

  const checkOrderQuery = "SELECT * FROM customer_order WHERE order_id = ? AND created_by = ?";
  db.pool.query(checkOrderQuery, [order_id, creatorId], (err, orderResult) => {
    if (err) {
      console.error("Error checking customer_order:", err);
      return res.status(500).json({ success: false, message: "An error occurred while checking order." });
    }

    if (orderResult.length === 0) {
      console.log("Order not found for order_id:", order_id);
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Update customer_order table
    const updateOrderQuery = `UPDATE customer_order SET customerpaid = ?, order_status = 4 WHERE order_id = ?`;
    db.pool.query(updateOrderQuery, [paidAmount, order_id], (err, updateOrderResult) => {
      if (err) {
        console.error("Error updating customer_order:", err);
        return res.status(500).json({ success: false, message: "An error occurred while updating customer_order." });
      }

      if (updateOrderResult.affectedRows === 0) {
        console.log("No rows updated in customer_order for order_id:", order_id);
        return res.status(404).json({ success: false, message: "No rows updated in customer_order." });
      }

      const table_no = orderResult[0].table_no;

      // Update rest_table if table_no is not 0
      const updateTable = table_no !== 0 
        ? new Promise((resolve, reject) => {
            const updateTableQuery = `UPDATE rest_table SET status = 0, occupied_seats = 0 WHERE tableid = ?`; // status=1 means booked, status=0 means free
            db.pool.query(updateTableQuery, [table_no], (err, updateTableResult) => {
              if (err) {
                console.error("Error updating rest_table:", err);
                reject({ success: false, message: "An error occurred while updating rest_table." });
              } else if (updateTableResult.affectedRows === 0) {
                console.log("No rows updated in rest_table for tableid:", table_no);
                reject({ success: false, message: "No rows updated in rest_table." });
              } else {
                resolve();
              }
            });
          })
        : Promise.resolve();

      // Update bill table
      updateTable.then(() => {
        const updateBillQuery = `
          UPDATE bill
          SET
            payment_method_id = ?,
            bill_date = NOW(),
            service_charge = ?,
            bill_time = CURTIME(),
            discount = ?,      
            bill_amount = ?,
            bill_status = 1
          WHERE order_id = ?
        `;
        db.pool.query(updateBillQuery, [payment_method_id, service_charge, discount, paidAmount, order_id], (err, updateBillResult) => {
          if (err) {
            console.error("Error updating bill:", err);
            return res.status(500).json({ success: false, message: "An error occurred while updating bill." });
          }

          if (updateBillResult.affectedRows === 0) {
            console.log("No rows updated in bill for order_id:", order_id);
            return res.status(404).json({ success: false, message: "No rows updated in bill." });
          }

          res.status(200).json({ success: true, message: "Payment done successfully." });
        });
      }).catch(error => {
        return res.status(500).json(error);
      });
    });
  });
  }); // end user lookup
};
module.exports = { getPaymentMethods, makePayment };
