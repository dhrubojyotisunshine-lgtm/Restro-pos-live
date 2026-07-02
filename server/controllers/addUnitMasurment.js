const db = require("../utils/db");

const createUnitMeasurement = (req, res) => {
  const { uom_name, uom_short_code, is_active = 1 } = req.body;
  const user_id = req.id; // Authenticated user ID from middleware
  console.log("measure",user_id)
 
  // Step 1: Check if user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
    if (results.length > 0) {
      // User has a subscription
      const created_by = results[0].user_id;
 
      const insertQuery = `
        INSERT INTO unit_of_measurement (uom_name, uom_short_code, is_active, created_by)
        VALUES (?, ?, ?, ?)
      `;
      const values = [uom_name, uom_short_code, is_active, created_by];
 
      db.pool.query(insertQuery, values, (err) => {
        if (err) return res.status(500).json({ success: false, message: "Insert error", error: err });
        return res.status(201).json({ success: true, message: "Unit of measurement created successfully (via subscription)" });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to create unit of measurement" });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO unit_of_measurement (uom_name, uom_short_code, is_active, created_by)
              VALUES (?, ?, ?, ?)
            `;
            const values = [uom_name, uom_short_code, is_active, created_by];
 
            db.pool.query(insertQuery, values, (err) => {
              if (err) return res.status(500).json({ success: false, message: "Insert error", error: err });
              return res.status(201).json({ success: true, message: "Unit of measurement created successfully (via creator)" });
            });
 
          } else {
            return res.status(403).json({ success: false, message: "Creator does not have an active subscription" });
          }
        });
      });
    }
  });
};

const getUnitMeasurements = async (req, res) => {
  const id = req.id; // User ID from middleware
  const { searchItem } = req.query;
 
  try {
    // Step 1: Check if user exists and get their role
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      let getUnitsQuery;
      let queryParams = [];
 
      if (isAdmin === 1) {
        // Admin: fetch units created by the admin
        if (!searchItem || searchItem.trim() === "") {
          getUnitsQuery = `
            SELECT * FROM unit_of_measurement
            WHERE created_by = ?
            ORDER BY id DESC
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getUnitsQuery = `
            SELECT * FROM unit_of_measurement
            WHERE created_by = ? AND (uom_name LIKE ? OR uom_short_code LIKE ?)
            ORDER BY id DESC
          `;
          queryParams = [id, searchQuery, searchQuery];
        }
      } else {
        // Non-admin: must be created by someone
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view units of measurement." });
        }
 
        if (!searchItem || searchItem.trim() === "") {
          getUnitsQuery = `
            SELECT * FROM unit_of_measurement
            WHERE created_by = ?
            ORDER BY id DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getUnitsQuery = `
            SELECT * FROM unit_of_measurement
            WHERE created_by = ? AND (uom_name LIKE ? OR uom_short_code LIKE ?)
            ORDER BY id DESC
          `;
          queryParams = [created_by, searchQuery, searchQuery];
        }
      }
 
      // Execute final query
      db.pool.query(getUnitsQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching units of measurement:", err);
          return res.status(500).json({ success: false, message: "Error while fetching units", error: err });
        }
 
        res.status(200).json({
          success: true,
          data: result,
          message: "Units of measurement fetched successfully"
        });
      });
    });
 
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};


const deleteUnitMeasurement = async (req, res) => {
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

      const deleteUnit = "DELETE FROM unit_of_measurement WHERE id = ? AND created_by = ?";
      db.pool.query(deleteUnit, [id, creatorId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Unit of measurement not found" });
        }
        return res.status(200).json({ success: true, message: "Unit of measurement deleted successfully" });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const updateUnitMeasurement = async (req, res) => {
  try {
    const { id } = req.params;
    const { uom_name, uom_short_code, is_active } = req.body;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by: uc } = userResult[0];
      const creatorId = is_admin === 1 ? userId : uc;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getUnitQuery = "SELECT * FROM unit_of_measurement WHERE id = ? AND created_by = ?";
      db.pool.query(getUnitQuery, [id, creatorId], (err, results) => {
        if (err) {
          console.error("Error retrieving unit of measurement:", err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving the unit of measurement" });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: "Unit of measurement not found" });
        }
        const currentData = results[0];
        const updatedData = {
          uom_name: uom_name !== undefined ? uom_name : currentData.uom_name,
          uom_short_code: uom_short_code !== undefined ? uom_short_code : currentData.uom_short_code,
          is_active: is_active !== undefined ? is_active : currentData.is_active,
          created_by: currentData.created_by,
        };
        const updateUnitQuery = `UPDATE unit_of_measurement SET uom_name = ?, uom_short_code = ?, is_active = ?, created_by = ? WHERE id = ?`;
        db.pool.query(updateUnitQuery, [updatedData.uom_name, updatedData.uom_short_code, updatedData.is_active, updatedData.created_by, id], (err, result) => {
          if (err) {
            console.error("Error updating unit of measurement:", err);
            return res.status(500).json({ success: false, message: "An error occurred while updating the unit of measurement" });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Unit of measurement not found" });
          }
          return res.status(200).json({ success: true, message: "Unit of measurement updated successfully" });
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};


const getUnitMeasurementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID parameter is required" });
    }

    const userId = req.id;
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getUnitByIdQuery = `SELECT * FROM unit_of_measurement WHERE id = ? AND created_by = ?`;
      db.pool.query(getUnitByIdQuery, [id, creatorId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "Unit of measurement not found" });
        }
        res.status(200).json({ success: true, data: result[0], message: "Unit of measurement fetched successfully" });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};





module.exports = {
  createUnitMeasurement,
  getUnitMeasurements,
  deleteUnitMeasurement,
  updateUnitMeasurement,
  getUnitMeasurementById
};
