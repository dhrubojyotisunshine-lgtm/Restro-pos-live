const db = require("../utils/db");
// Add kitchen data
const addKitchen = (req, res) => {
  const { kitchen_name } = req.body;
  const user_id = req.id;

  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  // Step 1: Check if current user has a subscription
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // User has a subscription
      const created_by = user_id;

      const insertQuery = `
        INSERT INTO kitchens (kitchen_name, created_by)
        VALUES (?, ?)
      `;
      db.pool.query(insertQuery, [kitchen_name, created_by], (err) => {
        if (err) {
          console.error("Error inserting kitchen:", err);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }
        return res
          .status(200)
          .json({
            success: true,
            message: "Kitchen created successfully (via subscription).",
          });
      });
    } else {
      // Step 2: Check if user has a creator
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res
            .status(403)
            .json({
              success: false,
              message: "You are not authorized to create kitchens.",
            });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if creator has a subscription
        db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);

          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO kitchens (kitchen_name, created_by)
              VALUES (?, ?)
            `;
            db.pool.query(insertQuery, [kitchen_name, created_by], (err) => {
              if (err) {
                console.error("Error inserting kitchen:", err);
                return res
                  .status(500)
                  .json({ success: false, message: "Database error" });
              }
              return res
                .status(200)
                .json({
                  success: true,
                  message: "Kitchen created successfully (via creator).",
                });
            });
          } else {
            return res
              .status(403)
              .json({
                success: false,
                message: "Creator does not have an active subscription.",
              });
          }
        });
      });
    }
  });
};

// get Kitchen data
const getKitchen = (req, res) => {
  const id = req.id;
  // From auth middleware
  const { searchItem } = req.query;

  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

  db.pool.query(checkUserQuery, [id], (err, userData) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error", error: err });
    }

    if (userData.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;

    let query;
    let params;

    if (isAdmin === 1) {
      // Admin: fetch kitchens they created
      if (!searchItem || searchItem.trim() === "") {
        query = `SELECT * FROM kitchens WHERE created_by = ? ORDER BY id DESC`;
        params = [id];
      } else {
        const search = `%${searchItem}%`;
        query = `SELECT * FROM kitchens WHERE created_by = ? AND kitchen_name LIKE ? ORDER BY id DESC`;
        params = [id, search];
      }
    } else {
      // Non-admin: fetch kitchens created by their creator
      if (!created_by) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You are not authorized to view kitchens.",
          });
      }

      if (!searchItem || searchItem.trim() === "") {
        query = `SELECT * FROM kitchens WHERE created_by = ? ORDER BY id DESC`;
        params = [created_by];
      } else {
        const search = `%${searchItem}%`;
        query = `SELECT * FROM kitchens WHERE created_by = ? AND kitchen_name LIKE ? ORDER BY id DESC`;
        params = [created_by, search];
      }
    }

    db.pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching kitchens:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: err });
      }
      return res.status(200).json(results);
    });
  });
};

const getKitchenById = (req, res) => {
  const kitchenId = req.params.id;
  const userId = req.id;

  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [userId], (err, userData) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!userData.length) return res.status(404).json({ success: false, message: "User not found" });

    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? userId : created_by;

    const query = "SELECT * FROM kitchens WHERE id = ? AND created_by = ?";
    db.pool.query(query, [kitchenId, creatorId], (err, results) => {
      if (err) {
        console.error("Error fetching kitchen:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Kitchen not found" });
      }
      res.status(200).json(results[0]);
    });
  });
};

// Delete Kitchen data
const deleteKitchenById = (req, res) => {
  const kitchenId = req.params.id;
  const userId = req.id;

  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [userId], (err, userData) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!userData.length) return res.status(404).json({ success: false, message: "User not found" });

    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? userId : created_by;

    const checkOwnership = "SELECT id FROM kitchens WHERE id = ? AND created_by = ?";
    db.pool.query(checkOwnership, [kitchenId, creatorId], (err, owned) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (!owned.length) return res.status(403).json({ success: false, message: "You are not authorized to delete this kitchen." });

      db.pool.query("DELETE FROM kitchens WHERE id = ?", [kitchenId], (err, result) => {
        if (err) {
          console.error("Error deleting kitchen:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Kitchen not found" });
        }
        res.status(200).json({ success: true, message: "Kitchen deleted successfully" });
      });
    });
  });
};

// update Kitchen

const updateKitchenByKitchenId = (req, res) => {
  const kitchenId = req.params.id;
  const { kitchen_name } = req.body;
  console.log("k", kitchen_name);
  const userId = req.id;

  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [userId], (err, userData) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!userData.length) return res.status(404).json({ success: false, message: "User not found" });

    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? userId : created_by;

    const checkOwnership = "SELECT id FROM kitchens WHERE id = ? AND created_by = ?";
    db.pool.query(checkOwnership, [kitchenId, creatorId], (err, owned) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (!owned.length) return res.status(403).json({ success: false, message: "You are not authorized to update this kitchen." });

      db.pool.query("UPDATE kitchens SET kitchen_name = ? WHERE id = ?", [kitchen_name, kitchenId], (err, result) => {
        if (err) {
          console.error("Error updating kitchen:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Kitchen not found" });
        }
        res.status(200).json({ success: true, message: "Kitchen updated successfully" });
      });
    });
  });
};

module.exports = {
  addKitchen,
  getKitchen,
  deleteKitchenById,
  updateKitchenByKitchenId,
  getKitchenById,
};
