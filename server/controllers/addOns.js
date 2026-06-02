const db = require("../utils/db");

// GET request to fetch all add-ons
const getAddOns = (req, res) => {
  const id = req.id; // from auth middleware
  const { searchItem } = req.query;
 
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
 
    let getAddonQuery;
    let queryParams = [];
 
    if (isAdmin === 1) {
      // Admin: fetch own add-ons only
      if (!searchItem || searchItem.trim() === "") {
        getAddonQuery = `
          SELECT * FROM add_ons
          WHERE created_by = ?
        `;
        queryParams = [id];
      } else {
        const searchQuery = `%${searchItem}%`;
        getAddonQuery = `
          SELECT * FROM add_ons
          WHERE created_by = ? AND (add_on_name LIKE ? OR price = ?)
        `;
        queryParams = [id, searchQuery, searchItem];
      }
    } else {
      // Non-admin: must have a creator
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view add-ons." });
      }
 
      if (!searchItem || searchItem.trim() === "") {
        getAddonQuery = `
          SELECT * FROM add_ons
          WHERE created_by = ?
        `;
        queryParams = [created_by];
      } else {
        const searchQuery = `%${searchItem}%`;
        getAddonQuery = `
          SELECT * FROM add_ons
          WHERE created_by = ? AND (add_on_name LIKE ? OR price = ?)
        `;
        queryParams = [created_by, searchQuery, searchItem];
      }
    }
 
    getAddonQuery += " ORDER BY add_on_id DESC";
 
    db.pool.query(getAddonQuery, queryParams, (err, result) => {
      if (err) {
        console.error("Error fetching add-ons:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching add-ons",
          error: err,
        });
      }
 
      res.status(200).json({
        success: true,
        data: result,
        message: "Add-ons fetched successfully",
      });
    });
  });
};

// get active addons
const getActiveAddOns = async (req, res) => {
  try {
    const id = req.id; // From auth middleware
 
    // Step 1: Get user info
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ success: false, message: "Error fetching user info", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      let addonQuery;
      let queryParams;
 
      // Step 2: Construct query based on role
      if (isAdmin === 1) {
        addonQuery = `SELECT * FROM add_ons WHERE is_active = 1 AND created_by = ?`;
        queryParams = [id];
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view add-ons" });
        }
        addonQuery = `SELECT * FROM add_ons WHERE is_active = 1 AND created_by = ?`;
        queryParams = [created_by];
      }
 
      // Step 3: Execute query
      db.pool.query(addonQuery, queryParams, (err, data) => {
        if (err) {
          console.error("Error fetching add-ons:", err);
          return res.status(500).json({ success: false, message: "An error occurred", error: err });
        }
 
        res.status(200).json(data);
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};

// POST request to create a new add-on
const createAddOn = (req, res) => {
  const { add_on_name, price, is_active = 1 } = req.body;
  const user_id = req.id; // from auth middleware
 
  if (!add_on_name || !price) {
    return res.status(400).json({ success: false, message: "add_on_name and price are required." });
  }
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
 
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
    if (results.length > 0) {
      // User has subscription, proceed to insert add-on
      const created_by = user_id;
 
      const insertQuery = `
        INSERT INTO add_ons (add_on_name, price, is_active, created_by)
        VALUES (?, ?, ?, ?)
      `;
      const values = [add_on_name, price, is_active, created_by];
 
      db.pool.query(insertQuery, values, (err) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to create add-on", error: err });
        return res.status(201).json({ success: true, message: "Add-on successfully created (via subscription)." });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
 
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to create add-ons." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if creator has subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
 
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
 
          if (results.length > 0) {
            // Creator has subscription, proceed to insert add-on with creator's id
            const insertQuery = `
              INSERT INTO add_ons (add_on_name, price, is_active, created_by)
              VALUES (?, ?, ?, ?)
            `;
            const values = [add_on_name, price, is_active, created_by];
 
            db.pool.query(insertQuery, values, (err) => {
              if (err) return res.status(500).json({ success: false, message: "Failed to create add-on", error: err });
              return res.status(201).json({ success: true, message: "Add-on successfully created (via creator)." });
            });
 
          } else {
            return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};
 

const createAddOnWithAssign = async (req, res) => {
  try {
    const { addonName, price } = req.body;

    const createaddon = `INSERT INTO add_ons (add_on_name, price, is_active) VALUES ('${addonName}', '${price}', '1')`;

    db.pool.query(createaddon, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "An error occurred" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Add-on created successfully" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

// PUT request to update an add-on by ID
const updateAddOn = (req, res) => {
  try {
    const { add_on_Id } = req.params;
    const { add_on_name, price, is_active, created_by } = req.body;
 
    // Validate required fields if needed here
 
    const updateQuery = `
      UPDATE add_ons
      SET add_on_name = ?, price = ?, is_active = ?, created_by = ?
      WHERE add_on_id = ?
    `;
 
    const values = [add_on_name, price, is_active, created_by, add_on_Id];
 
    db.pool.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "An error occurred while updating add-on." });
      }
      return res.status(200).json({ success: true, message: "Add-on updated successfully." });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
};

const getAddOnsById = async (req, res) => {
  const {id}=req.params;
  try {
    const getaddon = `SELECT * FROM add_ons WHERE add_on_id=?`;
    db.pool.query(getaddon,[id], (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'An error occurred' });
      } else {
        res.status(200).json({ success: true, data: result, message: "Add-ons fetched successfully" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};


// DELETE request to delete an add-on by ID
const deleteAddOn = async (req, res) => {
  //   try {
  const { id } = req.params;

  const deleteaddon = `DELETE FROM add_ons WHERE add_on_id=${id}`;

  db.pool.query(deleteaddon, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ success: false, message: "An error occurred" });
    } else {
      res
        .status(200)
        .json({ success: true, message: "Add-on deleted successfully" });
    }
  });
  //   } catch (error) {
  //     res.status(500).json({ error: "An error occurred" });
  //   }
};

module.exports = {
  deleteAddOn,
  updateAddOn,
  getActiveAddOns,
  createAddOn,
  createAddOnWithAssign,
  getAddOns,
  getAddOnsById
};
