const db = require("../utils/db");

const getTableBySale = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Base SQL query
    let sql = `
      SELECT 
        
        t.tableid, 
        t.tablename,
        co.order_id,
        co.order_date,
        SUM(co.totalamount) AS total_amount
      FROM rest_table t
      JOIN customer_order co ON co.table_no = t.tableid
      JOIN bill b ON b.order_id = co.order_id
      WHERE co.order_status = 4 
        AND b.bill_status = 1
    `;

    const params = [];

    // Apply date filtering only if both from and to dates are provided
    if (from && to) {
      sql += ` AND co.order_date BETWEEN ? AND ?`;
      params.push(from, to);
    }

    sql += ` GROUP BY t.tableid`;
    sql += ` ORDER BY co.order_id DESC`;

    // Debugging SQL and params
    console.log('Final SQL:', sql);
    console.log('Params:', params);

    const results = await dbQuery(sql, params);

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching table by sale report:', err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching the table by sale report' });
  }
};


const getMenuTypeById = async (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  try {
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getMenuTypeByIdQuery = "SELECT * FROM tbl_menutype WHERE menutypeid = ? AND created_by = ?";
      db.pool.query(getMenuTypeByIdQuery, [id, creatorId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving the menu type", error: err.message });
        } else if (results.length === 0) {
          return res.status(404).json({ success: false, message: `Menu type with id ${id} not found` });
        } else {
          return res.status(200).json({ success: true, data: results[0] });
        }
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "An error occurred on the server", error: error.message });
  }
};




const createMenuType = async (req, res) => {
  try {
    const { menutype, status } = req.body;
    const user_id = req.id; // Assuming this is populated from middleware
 
    // Validate input
    if (!menutype) {
      return res.status(400).json({
        success: false,
        message: "Menu type is required",
      });
    }
 
    // Step 1: Check if user has a subscription
    const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
    db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
      if (results.length > 0) {
        insertMenuType(user_id); // User has subscription
      } else {
        // Step 2: Check if user was created by someone
        const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
        db.pool.query(checkCreatedByQuery, [user_id], (err, data) => {
          if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
          if (data.length === 0 || !data[0].created_by) {
            return res.status(403).json({ success: false, message: "You are not authorized to create menu type" });
          }
 
          const created_by = data[0].created_by;
 
          // Step 3: Check if creator has a subscription
          db.pool.query(checkSubscriptionQuery, [created_by], (err, creatorResults) => {
            if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
            if (creatorResults.length > 0) {
              insertMenuType(created_by); // Use creator's ID
            } else {
              return res.status(403).json({ success: false, message: "Creator does not have an active subscription" });
            }
          });
        });
      }
    });
 
    // Function to insert menu type (without menu_icon)
    function insertMenuType(creator_id) {
      const createMenuTypeQuery = `
        INSERT INTO tbl_menutype (menutype, status, created_by)
        VALUES (?, ?, ?)
      `;
      const values = [menutype, status, creator_id];
 
      db.pool.query(createMenuTypeQuery, values, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while creating the menu type",
            error: err.message,
          });
        } else {
          return res.status(201).json({
            success: true,
            message: "Menu type created successfully",
          });
        }
      });
    }
 
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred on the server",
      error: error.message,
    });
  }
};
 
const getAllMenuTypes = async (req, res) => {
  const { searchItem } = req.query;
  const userId = req.id; // Populated from auth middleware
 
  try {
    // Step 1: Get user role and creator
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error while fetching user info",
          error: err.message,
        });
      }
 
      if (userResult.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
 
      if (!creatorId) {
        return res.status(403).json({ success: false, message: "Unauthorized to view menu types" });
      }
 
      // Step 2: Build the menu type query
      let getAllMenuTypesQuery;
      let queryParams;
 
      if (!searchItem || searchItem.trim() === "") {
        getAllMenuTypesQuery = `
          SELECT * FROM tbl_menutype
          WHERE created_by = ?
          ORDER BY menutypeid DESC
        `;
        queryParams = [creatorId];
      } else {
        const searchQuery = `%${searchItem}%`;
        getAllMenuTypesQuery = `
          SELECT * FROM tbl_menutype
          WHERE created_by = ? AND menutype LIKE ?
          ORDER BY menutypeid DESC
        `;
        queryParams = [creatorId, searchQuery];
      }
 
      // Step 3: Execute the query
      db.pool.query(getAllMenuTypesQuery, queryParams, (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving the menu types",
            error: err.message,
          });
        }
 
        return res.status(200).json({ success: true, data: results });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected server error occurred",
      error: error.message,
    });
  }
};
 
const updateMenuType = async (req, res) => {
  try {
    const { menutypeid } = req.params;
    const { menutype, status } = req.body;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by: uc } = userResult[0];
      const creatorId = is_admin === 1 ? userId : uc;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const ownerCheckQuery = "SELECT created_by FROM tbl_menutype WHERE menutypeid = ? AND created_by = ?";
      db.pool.query(ownerCheckQuery, [menutypeid, creatorId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Server error" });
        if (!rows.length) return res.status(404).json({ success: false, message: "Menu type not found" });

        const updateMenuTypeQuery = `UPDATE tbl_menutype SET menutype = ?, status = ?, created_by = ? WHERE menutypeid = ?`;
        db.pool.query(updateMenuTypeQuery, [menutype, status, rows[0].created_by, menutypeid], (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "An error occurred while updating the menu type", error: err.message });
          }
          return res.status(200).json({ success: true, message: "Menu type updated successfully" });
        });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, message: "An error occurred on the server", error: error.message });
  }
};
 
 
const deleteMenuType = async (req, res) => {
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

      const deleteMenuTypeQuery = "DELETE FROM tbl_menutype WHERE menutypeid = ? AND created_by = ?";
      db.pool.query(deleteMenuTypeQuery, [id, creatorId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: "An error occurred while deleting the menu type", error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Menu type not found" });
        }
        res.status(200).json({ success: true, message: "Menu type deleted successfully" });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "An error occurred on the server", error: error.message });
  }
};
 
 
module.exports = {
  deleteMenuType,
  updateMenuType,
  getAllMenuTypes,
  createMenuType,
  getTableBySale,
  getMenuTypeById
};
