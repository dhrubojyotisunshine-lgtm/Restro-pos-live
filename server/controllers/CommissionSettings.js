const db = require("../utils/db");


const createCommissionSetting = (req, res) => {
  const { pos_id, rate } = req.body;
  const user_id = req.id;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, proceed to insert
      const created_by = results[0].user_id;
 
      const insertQuery = `
        INSERT INTO payroll_commission_setting (pos_id, rate, created_by)
        VALUES (?, ?, ?)
      `;
      const values = [pos_id, rate, created_by];
 
      db.pool.query(insertQuery, values, (err, results) => {
        if (err) return res.status(500).send(err);
        return res.status(201).json({ success: true, message: "Commission setting created successfully (via subscription).", data: { id: results.insertId, pos_id, rate } });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create commission settings." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO payroll_commission_setting (pos_id, rate, created_by)
              VALUES (?, ?, ?)
            `;
            const values = [pos_id, rate, created_by];
 
            db.pool.query(insertQuery, values, (err, results) => {
              if (err) return res.status(500).send(err);
              return res.status(201).json({ success: true, message: "Commission setting created successfully (via creator).", data: { id: results.insertId, pos_id, rate } });
            });
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};

const getCommissionSettingById = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = `
      SELECT pcs.*, p.position_name, pcs.rate
      FROM payroll_commission_setting pcs
      LEFT JOIN position p ON pcs.pos_id = p.pos_id
      WHERE pcs.id = ? AND pcs.created_by = ?
    `;
    db.pool.query(query, [id, creatorId], (err, results) => {
      if (err) {
        console.error("Database fetch error:", err);
        return res.status(500).json({ success: false, message: "An error occurred while fetching the commission setting" });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Commission setting not found" });
      }
      res.status(200).json({ success: true, data: results[0] });
    });
  });
};

  const getAllCommissionSettings = (req, res) => {
  const id = req.id; // from middleware
  const { searchItem } = req.query;
 
  // Step 1: Check if the user is admin and get creator ID
  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    let baseQuery = `
      SELECT pcs.*, p.position_name
      FROM payroll_commission_setting pcs
      LEFT JOIN position p ON pcs.pos_id = p.pos_id
    `;
 
    let queryConditions = "";
    let queryParams = [];
 
    // Admins: use own id, non-admins: use created_by
    let ownerId;
    if (isAdmin === 1) {
      ownerId = id;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view commission settings." });
      }
      ownerId = created_by;
    }
 
    // Add ownership condition
    queryConditions += ` WHERE pcs.created_by = ?`;
    queryParams.push(ownerId);
 
    // Add search filter if any
    if (searchItem && searchItem.trim() !== "") {
      queryConditions += ` AND (p.position_name LIKE ? OR pcs.rate LIKE ?)`;
      const searchValue = `%${searchItem}%`;
      queryParams.push(searchValue, searchValue);
    }
 
    const finalQuery = baseQuery + queryConditions + ` ORDER BY pcs.id DESC`;
 
    db.pool.query(finalQuery, queryParams, (err, results) => {
      if (err) {
        console.error('Database fetch error:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while fetching commission settings' });
      }
 
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'No records found' });
      }
 
      res.status(200).json({ success: true, data: results });
    });
  });
};

  
const updateCommissionSetting = (req, res) => {
  const { id } = req.params;
  const { rate } = req.body;
  const userId = req.id;
  console.log(req.body);

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: uc } = userResult[0];
    const creatorId = is_admin === 1 ? userId : uc;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "SELECT * FROM payroll_commission_setting WHERE id = ? AND created_by = ?";
    db.pool.query(query, [id, creatorId], (err, results) => {
      if (err) {
        console.error("Database fetch error:", err);
        return res.status(500).json({ success: false, message: "An error occurred while fetching the commission setting" });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Commission setting not found" });
      }
      const currentData = results[0];
      const updateData = {
        rate: rate !== undefined ? rate : currentData.rate,
        created_by: currentData.created_by,
      };
      const updateQuery = "UPDATE payroll_commission_setting SET rate = ?, created_by = ? WHERE id = ?";
      db.pool.query(updateQuery, [updateData.rate, updateData.created_by, id], (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res.status(500).json({ success: false, message: "An error occurred while updating the commission setting" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Commission setting not found" });
        }
        res.status(200).json({ success: true, message: "Commission setting updated successfully" });
      });
    });
  });
};
  

const deleteCommissionSetting = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "DELETE FROM payroll_commission_setting WHERE id = ? AND created_by = ?";
    db.pool.query(query, [id, creatorId], (err, result) => {
      if (err) {
        console.error("Database delete error:", err);
        return res.status(500).json({ success: false, message: "An error occurred while deleting the commission setting" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Commission setting not found" });
      }
      res.status(200).json({ success: true, message: "Commission setting deleted successfully" });
    });
  });
};
const createUserPosition = (req, res) => {
  const { user_id, pos_id } = req.body;
  const creator_id = req.id;
 
  if (!user_id || !pos_id) {
    return res.status(400).json({ success: false, message: "user_id and pos_id are required." });
  }
 
  // Step 1: Check if the creator has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [creator_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
 
    if (results.length > 0) {
      // Creator has a subscription
      const insertQuery = "INSERT INTO user_position (user_id, pos_id, created_by) VALUES (?, ?, ?)";
      db.pool.query(insertQuery, [user_id, pos_id, creator_id], (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Database error", error: err });
        }
        return res.status(201).json({ success: true, message: "User position created successfully", id: result.insertId });
      });
 
    } else {
      // Step 2: Check if the creator was created by someone else
      const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkCreatedByQuery, [creator_id], (err, data) => {
        if (err) return res.status(500).json({ success: false, error: err });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to create user positions." });
        }
 
        const higher_creator_id = data[0].created_by;
 
        // Step 3: Check if that higher-level creator has a subscription
        db.pool.query(checkSubscriptionQuery, [higher_creator_id], (err, subResults) => {
          if (err) return res.status(500).json({ success: false, error: err });
 
          if (subResults.length > 0) {
            const insertQuery = "INSERT INTO user_position (user_id, pos_id, created_by) VALUES (?, ?, ?)";
            db.pool.query(insertQuery, [user_id, pos_id, higher_creator_id], (err, result) => {
              if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err });
              }
              return res.status(201).json({ success: true, message: "User position created successfully (via creator)", id: result.insertId });
            });
          } else {
            return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};
 
// Get all user-position entries
const getAllUserPositions = (req, res) => {
  const id = req.id; // Authenticated user ID
 
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
 
    let fetchQuery = `
      SELECT
        up.*,
        p.position_name,
        CONCAT(u.firstname, " ", u.lastname) AS full_name
      FROM user_position up
      LEFT JOIN user u ON u.id = up.user_id
      LEFT JOIN position p ON up.pos_id = p.pos_id
      WHERE up.created_by = ?
      ORDER BY up.id DESC
    `;
 
    const queryParam = isAdmin === 1 ? id : created_by;
 
    if (!queryParam) {
      return res.status(403).json({ success: false, message: "You are not authorized to view user positions." });
    }
 
    db.pool.query(fetchQuery, [queryParam], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Query failed", error: err });
      }
 
      res.status(200).json({
        success: true,
        data: results,
        message: "User positions fetched successfully",
      });
    });
  });
};
// Get one by ID
const getUserPositionById = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = `
      SELECT
        up.*,
        p.position_name,
        CONCAT(u.firstname, " ", u.lastname) AS full_name
      FROM user_position up
      LEFT JOIN user u ON u.id = up.user_id
      LEFT JOIN position p ON up.pos_id = p.pos_id
      WHERE up.id = ? AND up.created_by = ?
    `;
    db.pool.query(query, [id, creatorId], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, error: err });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      res.status(200).json({ success: true, data: results[0] });
    });
  });
};

const updateUserPosition = (req, res) => {
  const { id } = req.params;
  const { user_id, pos_id } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: uc } = userResult[0];
    const creatorId = is_admin === 1 ? userId : uc;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const ownerCheckQuery = "SELECT created_by FROM user_position WHERE id = ? AND created_by = ?";
    db.pool.query(ownerCheckQuery, [id, creatorId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err });
      if (!rows.length) return res.status(404).json({ success: false, message: "User position not found" });

      const updateQuery = "UPDATE user_position SET user_id = ?, pos_id = ?, created_by = ? WHERE id = ?";
      db.pool.query(updateQuery, [user_id, pos_id, rows[0].created_by, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err });
        res.status(200).json({ success: true, message: "Updated successfully" });
      });
    });
  });
};

const deleteUserPosition = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    db.pool.query("DELETE FROM user_position WHERE id = ? AND created_by = ?", [id, creatorId], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err });
      if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "User position not found" });
      res.status(200).json({ success: true, message: "Deleted successfully" });
    });
  });
};

module.exports={
    deleteCommissionSetting,
    updateCommissionSetting,
    getAllCommissionSettings,
    createCommissionSetting,
    getCommissionSettingById,
    createUserPosition,
    getAllUserPositions,
    getUserPositionById,
    updateUserPosition,
    deleteUserPosition

}