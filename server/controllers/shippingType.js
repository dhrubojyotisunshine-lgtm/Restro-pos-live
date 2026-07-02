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
const getAllShippingMethods = (req, res) => {
  const id = req.id; // from auth middleware
  const { searchItem } = req.query;
  console.log("searccccccch",searchItem)
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [id], (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = data[0].is_admin;
    const created_by = data[0].created_by;
 
    let getShippingMethodsQuery;
    let queryParams;
 
    if (isAdmin === 1) {
      // Admin: fetch shipping methods created by themselves
      if (!searchItem || searchItem.trim() === "") {
        getShippingMethodsQuery = `
          SELECT * FROM shipping_method
          WHERE created_by = ?
          ORDER BY  ship_id DESC
        `;
        queryParams = [id];
      } else {
        const searchQuery = `%${searchItem}%`;
        getShippingMethodsQuery = `
          SELECT * FROM shipping_method
          WHERE created_by = ?
          AND (shipping_method LIKE ? OR shiptype LIKE ?)
          ORDER BY  ship_id DESC
        `;
        queryParams = [id, searchQuery, searchQuery];
      }
    } else {
      // Non-admin: check if created by someone
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view shipping methods." });
      }
 
      if (!searchItem || searchItem.trim() === "") {
        getShippingMethodsQuery = `
          SELECT * FROM shipping_method
          WHERE created_by = ?
          ORDER BY  ship_id DESC
        `;
        queryParams = [created_by];
      } else {
        const searchQuery = `%${searchItem}%`;
        getShippingMethodsQuery = `
          SELECT * FROM shipping_method
          WHERE created_by = ?
          AND (shipping_method LIKE ? OR shiptype LIKE ?)
          ORDER BY  ship_id DESC
        `;
        queryParams = [created_by, searchQuery, searchQuery];
      }
    }
 
    db.pool.query(getShippingMethodsQuery, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching shipping methods:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch shipping methods", error: err });
      }
 
      res.status(200).json({ success: true, data: results, message: "Shipping methods fetched successfully" });
    });
  });
};

 const createShippingMethod = (req, res) => {
  const { shipping_method, shippingrate, payment_method, is_active = 1, shiptype } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription
      const created_by = user_id;
 
      const insertQuery = `
        INSERT INTO shipping_method (shipping_method, shippingrate, payment_method, is_active, shiptype, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [shipping_method, shippingrate, payment_method, is_active, shiptype, created_by];
 
      db.pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'Failed to create shipping method' });
        }
        return res.status(200).json({ success: true, message: 'Shipping method created successfully', id: result.insertId });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create shipping methods." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO shipping_method (shipping_method, shippingrate, payment_method, is_active, shiptype, created_by)
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            const values = [shipping_method, shippingrate, payment_method, is_active, shiptype, created_by];
 
            db.pool.query(insertQuery, values, (err, result) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Failed to create shipping method' });
              }
              return res.status(200).json({ success: true, message: 'Shipping method created successfully', id: result.insertId });
            });
 
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};

  const deleteShippingMethod = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.id;
      const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
      db.pool.query(userQuery, [userId], (err, userResult) => {
        if (err) return res.status(500).json({ success: false, message: "Server error" });
        if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
        const { is_admin, created_by } = userResult[0];
        const creatorId = is_admin === 1 ? userId : created_by;
        if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

        const query = "DELETE FROM shipping_method WHERE ship_id = ? AND created_by = ?";
        db.pool.query(query, [id, creatorId], (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to delete shipping method" });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Shipping method not found" });
          }
          res.status(200).json({ success: true, message: "Shipping method deleted successfully" });
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "An unexpected error occurred" });
    }
  };
const getShippingMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const query = "SELECT * FROM shipping_method WHERE ship_id = ? AND created_by = ?";
      db.pool.query(query, [id, creatorId], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Failed to fetch shipping method" });
        } else if (results.length === 0) {
          return res.status(404).json({ success: false, message: "Shipping method not found" });
        } else {
          return res.status(200).json({ success: true, data: results[0] });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};

const updateShippingMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipping_method, shippingrate, is_active } = req.body;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by: uc } = userResult[0];
      const creatorId = is_admin === 1 ? userId : uc;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const ownerCheckQuery = "SELECT created_by FROM shipping_method WHERE ship_id = ? AND created_by = ?";
      db.pool.query(ownerCheckQuery, [id, creatorId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Server error" });
        if (!rows.length) return res.status(404).json({ success: false, message: "Shipping method not found" });

        const query = `UPDATE shipping_method SET shipping_method = ?, shippingrate = ?, is_active = ?, created_by = ? WHERE ship_id = ?`;
        db.pool.query(query, [shipping_method, shippingrate, is_active, rows[0].created_by, id], (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to update shipping method" });
          }
          res.status(200).json({ success: true, message: "Shipping method updated successfully" });
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};
  module.exports={
    getAllShippingMethods,
    createShippingMethod,
    deleteShippingMethod,
    getShippingMethodById,
    updateShippingMethod
  } 