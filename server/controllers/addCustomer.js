const db = require("../utils/db");
const fs = require("fs");
const path = require("path");

const getCustomers = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { SearchItem } = req.query;
 
    // First, get the user's role and creator info
    const userQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(userQuery, [id], (err, userResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userResult.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      const isAdmin = userResult[0].is_admin;
      const creatorId = isAdmin === 1 ? id : userResult[0].created_by;
 
      if (!creatorId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to customer data" });
      }
 
      // Build customer query
      let getCustomersQuery = `
        SELECT customer_id, customer_name, customer_email, customer_phone, customer_address
        FROM customer_info
        WHERE created_by = ?
      `;
      let queryParams = [creatorId];
 
      if (SearchItem && SearchItem.trim() !== "") {
        const search = `%${SearchItem}%`;
        getCustomersQuery += `
          AND (
            customer_name LIKE ?
            OR customer_email LIKE ?
            OR customer_phone LIKE ?
            OR customer_address LIKE ?
          )
        `;
        queryParams.push(search, search, search, search);
      }
 
      getCustomersQuery += ` ORDER BY customer_id DESC`;
 
      db.pool.query(getCustomersQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching customers:", err);
          return res.status(500).json({ success: false, message: "An error occurred", error: err });
        }
 
        return res.status(200).json({
          success: true,
          data: result,
          message: "Customers fetched successfully"
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};

// const createCustomer = (req, res) => {
//   try {
//     const { customer_name, customer_email, customer_address, customer_phone } = req.body;
//     const user_id = req.id;
 
//     const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
//     db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
//       if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });
 
//       if (results.length > 0) {
//         // User has a subscription
//         const created_by = user_id;
//         insertCustomer(customer_name, customer_email, customer_address, customer_phone, created_by, res);
//       } else {
//         // Check if user was created by someone
//         const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
//         db.pool.query(checkCreatedByQuery, [user_id], (err, data) => {
//           if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });
 
//           if (data.length === 0 || !data[0].created_by) {
//             return res.status(403).json({ success: false, message: "You are not authorized to create customers." });
//           }
 
//           const created_by = data[0].created_by;
 
//           db.pool.query(checkSubscriptionQuery, [created_by], (err, creatorResults) => {
//             if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });
 
//             if (creatorResults.length > 0) {
//               insertCustomer(customer_name, customer_email, customer_address, customer_phone, created_by, res);
//             } else {
//               return res.status(403).json({ success: false, message: "Your creator does not have an active subscription." });
//             }
//           });
//         });
//       }
//     });
//   } catch (error) {
//     console.error("createCustomer error:", error);
//     res.status(500).json({ success: false, message: "Unexpected error occurred" });
//   }
// };





 
// // ЁЯЫая╕П Helper function with created_by field
// const insertCustomer = (name, email, address, phone, created_by, res) => {
//   const query = `INSERT INTO customer_info (customer_name, customer_email, customer_address, customer_phone, created_by) VALUES (?, ?, ?, ?, ?)`;
//   const values = [name, email, address, phone, created_by];
 
//   db.pool.query(query, values, (err, result) => {
//     if (err) {
//       console.error("Database insert error:", err);
//       return res.status(500).json({ success: false, message: "Failed to create customer" });
//     }
 
//     return res.status(201).json({ success: true, message: "Customer created successfully" });
//   });
// };
 


const createCustomer = (req, res) => {
  try {
    const { customer_name, customer_email, customer_address, customer_phone } = req.body;
    const user_id = req.id;

    const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
    db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });

      if (results.length > 0) {
        // User has a subscription
        const created_by = user_id;
        insertCustomer(customer_name, customer_email, customer_address, customer_phone, created_by, res);
      } else {
        // Check if user was created by someone
        const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
        db.pool.query(checkCreatedByQuery, [user_id], (err, data) => {
          if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });

          if (data.length === 0 || !data[0].created_by) {
            return res.status(403).json({ success: false, message: "You are not authorized to create customers." });
          }

          const created_by = data[0].created_by;

          db.pool.query(checkSubscriptionQuery, [created_by], (err, creatorResults) => {
            if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });

            if (creatorResults.length > 0) {
              insertCustomer(customer_name, customer_email, customer_address, customer_phone, created_by, res);
            } else {
              return res.status(403).json({ success: false, message: "Your creator does not have an active subscription." });
            }
          });
        });
      }
    });
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({ success: false, message: "Unexpected error occurred" });
  }
};

// 🔹 Helper function with duplicate check
const insertCustomer = (name, email, address, phone, created_by, res) => {
  // Step 1: Check duplicate email/phone
  const checkDuplicateQuery = "SELECT * FROM customer_info WHERE customer_email = ? OR customer_phone = ?";
  db.pool.query(checkDuplicateQuery, [email, phone], (err, results) => {
    if (err) {
      console.error("Duplicate check error:", err);
      return res.status(500).json({ success: false, message: "Failed to check duplicates" });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: "Customer with this email or phone already exists" });
    }

    // Step 2: Insert if no duplicate
    const insertQuery = `
      INSERT INTO customer_info (customer_name, customer_email, customer_address, customer_phone, created_by) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [name, email, address, phone, created_by];

    db.pool.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return res.status(500).json({ success: false, message: "Failed to create customer" });
      }

      return res.status(201).json({ success: true, message: "Customer created successfully" });
    });
  });
};


const getCustomerById = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const getCustomerByIdQuery = `SELECT customer_id,created_by, customer_name, customer_email, customer_phone, customer_address FROM customer_info WHERE customer_id = ?`;
 
    db.pool.query(getCustomerByIdQuery, [customer_id], (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'An error occurred' });
      } else if (result.length === 0) {
        res.status(404).json({ success: false, message: 'Customer not found' });
      } else {
        res.status(200).json({ success: true, data: result[0], message: "Customer fetched successfully" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};;

// const updateCustomer = async (req, res) => {
//   try {
//     const { customer_id } = req.params;
//     const {
//       customer_name,
//       customer_email,
//       customer_address,
//       customer_phone,
//       created_by,
//     } = req.body;
 
//     // Fetch the current data of the customer
//     const fetchCurrentDataSql = "SELECT * FROM customer_info WHERE customer_id = ?";
//     db.pool.query(fetchCurrentDataSql, [customer_id], async (fetchErr, fetchData) => {
//       if (fetchErr) {
//         console.error("Database fetch error: ", fetchErr);
//         return res.status(500).json({ error: "Internal Server Error" });
//       }
 
//       if (fetchData.length === 0) {
//         return res.status(404).json({ success: false, message: 'Customer not found' });
//       }
 
//       const currentData = fetchData[0];
 
//       // Merge current and new data
//       const updatedData = {
//         customer_name: customer_name !== undefined ? customer_name : currentData.customer_name,
//         customer_email: customer_email !== undefined ? customer_email : currentData.customer_email,
//         customer_address: customer_address !== undefined ? customer_address : currentData.customer_address,
//         customer_phone: customer_phone !== undefined ? customer_phone : currentData.customer_phone,
//         created_by: created_by !== undefined ? created_by : currentData.created_by
//       };
 
//       // Update the customer with the merged data
//       const updateCustomerQuery = `UPDATE customer_info SET customer_name = ?, customer_email = ?, customer_address = ?, customer_phone = ?,created_by=? WHERE customer_id = ?`;
//       db.pool.query(updateCustomerQuery, [
//         updatedData.customer_name,
//         updatedData.customer_email,
//         updatedData.customer_address,
//         updatedData.customer_phone,
//         updatedData.created_by,
//         customer_id
//       ], (err, result) => {
//         if (err) {
//           console.error("Database query error: ", err);
//           return res.status(500).json({ success: false, message: 'An error occurred' });
//         } else if (result.affectedRows === 0) {
//           return res.status(404).json({ success: false, message: 'Customer not found' });
//         } else {
//           return res.status(200).json({ success: true, message: "Customer updated successfully" });
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Update customer error: ", error);
//     return res.status(500).json({ success: false, message: 'An error occurred' });
//   }
// };
const updateCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const {
      customer_name,
      customer_email,
      customer_address,
      customer_phone,
      created_by,
    } = req.body;

    // Fetch the current data of the customer
    const fetchCurrentDataSql = "SELECT * FROM customer_info WHERE customer_id = ?";
    db.pool.query(fetchCurrentDataSql, [customer_id], async (fetchErr, fetchData) => {
      if (fetchErr) {
        console.error("Database fetch error: ", fetchErr);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (fetchData.length === 0) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const currentData = fetchData[0];

      // Merge current and new data
      const updatedData = {
        customer_name: customer_name !== undefined ? customer_name : currentData.customer_name,
        customer_email: customer_email !== undefined ? customer_email : currentData.customer_email,
        customer_address: customer_address !== undefined ? customer_address : currentData.customer_address,
        customer_phone: customer_phone !== undefined ? customer_phone : currentData.customer_phone,
        created_by: created_by !== undefined ? created_by : currentData.created_by
      };

      // ✅ Check for duplicate email or phone before update
      const checkDuplicateSql = `
        SELECT * FROM customer_info
        WHERE (customer_email = ? OR customer_phone = ?)
        AND customer_id != ?`;
      
      db.pool.query(checkDuplicateSql, [
        updatedData.customer_email,
        updatedData.customer_phone,
        customer_id
      ], (dupErr, dupResults) => {
        if (dupErr) {
          console.error("Database duplicate check error: ", dupErr);
          return res.status(500).json({ success: false, message: 'Error checking duplicates' });
        }

        if (dupResults.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Email or Phone number already exists for another customer"
          });
        }

        // ✅ No duplicates → proceed with update
        const updateCustomerQuery = `
          UPDATE customer_info 
          SET customer_name = ?, customer_email = ?, customer_address = ?, customer_phone = ?, created_by = ?
          WHERE customer_id = ?`;
        
        db.pool.query(updateCustomerQuery, [
          updatedData.customer_name,
          updatedData.customer_email,
          updatedData.customer_address,
          updatedData.customer_phone,
          updatedData.created_by,
          customer_id
        ], (err, result) => {
          if (err) {
            console.error("Database query error: ", err);
            return res.status(500).json({ success: false, message: 'An error occurred' });
          } else if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
          } else {
            return res.status(200).json({ success: true, message: "Customer updated successfully" });
          }
        });
      });
    });
  } catch (error) {
    console.error("Update customer error: ", error);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params; 

    const deleteCustomerQuery = `DELETE FROM customer_info WHERE customer_id = ?`;
    
    db.pool.query(deleteCustomerQuery, [customer_id], (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "An error occurred" });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ success: false, message: "Customer not found" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Customer deleted successfully" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

module.exports = { getCustomers, createCustomer , deleteCustomer,getCustomerById,updateCustomer};

