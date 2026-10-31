const db = require("../utils/db");

const createIngredient = (req, res) => {
  const { ingredient_name, uom_short_code, min_stock, status } = req.body;
  const user_id = req.id;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // User has subscription, proceed to insert ingredient
      insertIngredient(user_id);
    } else {
      // Step 2: Check if user was created by someone else
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create an ingredient." });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if the creator has a subscription
        db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);

          if (results.length > 0) {
            insertIngredient(created_by);
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });

  // Helper function to insert ingredient
  function insertIngredient(created_by) {
    const createIngredientQuery = `
      INSERT INTO ingredients (ingredient_name, uom_id, min_stock, status, is_active, created_by)
      VALUES (?, ?, ?, ?, 1, ?)
    `;
    const values = [ingredient_name, uom_short_code, min_stock, status, created_by];

    db.pool.query(createIngredientQuery, values, (err, result) => {
      if (err) {
        console.error("Error while creating ingredient:", err);
        return res.status(500).json({ success: false, message: "An error occurred" });
      }
      return res.status(200).json({ success: true, message: "Ingredient created successfully" });
    });
  }
};

const getAllIngredients = async (req, res) => {
  const user_id = req.id; // Assumes this is set by the auth middleware
  const { searchItem } = req.query;

  try {
    // Step 1: Get user's role and creator
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [user_id], (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }

      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;

      let ingredientQuery;
      let queryParams = [];

      // Step 2: Build query based on role and search
      if (isAdmin === 1) {
        if (!searchItem || searchItem.trim() === "") {
          ingredientQuery = `
            SELECT i.*, i.ingredient_name, uom.uom_short_code AS Unit_Name
            FROM ingredients AS i
            INNER JOIN unit_of_measurement AS uom ON i.uom_id = uom.id
            WHERE i.created_by = ?
            ORDER BY i.id DESC
          `;
          queryParams = [user_id];
        } else {
          const searchQuery = `%${searchItem}%`;
          ingredientQuery = `
            SELECT i.*, i.ingredient_name, uom.uom_short_code AS Unit_Name
            FROM ingredients AS i
            INNER JOIN unit_of_measurement AS uom ON i.uom_id = uom.id
            WHERE i.created_by = ?
            AND (i.ingredient_name LIKE ? OR uom.uom_short_code LIKE ?)
            ORDER BY i.id DESC
          `;
          queryParams = [user_id, searchQuery, searchQuery];
        }
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view ingredients." });
        }

        if (!searchItem || searchItem.trim() === "") {
          ingredientQuery = `
            SELECT i.*, i.ingredient_name, uom.uom_short_code AS Unit_Name
            FROM ingredients AS i
            INNER JOIN unit_of_measurement AS uom ON i.uom_id = uom.id
            WHERE i.created_by = ?
            ORDER BY i.id DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          ingredientQuery = `
            SELECT i.*, i.ingredient_name, uom.uom_short_code AS Unit_Name
            FROM ingredients AS i
            INNER JOIN unit_of_measurement AS uom ON i.uom_id = uom.id
            WHERE i.created_by = ?
            AND (i.ingredient_name LIKE ? OR uom.uom_short_code LIKE ?)
            ORDER BY i.id DESC
          `;
          queryParams = [created_by, searchQuery, searchQuery];
        }
      }

      // Step 3: Execute final query
      db.pool.query(ingredientQuery, queryParams, (err, results) => {
        if (err) {
          console.error("Error while retrieving ingredients:", err);
          return res.status(500).json({ success: false, message: "An error occurred while retrieving ingredients" });
        }

        if (results.length === 0) {
          return res.status(404).json({ success: false, message: "No ingredients found" });
        }

        return res.status(200).json({ success: true, data: results });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};



const getIngredientById = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "ID parameter is required" });
  }

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const getIngredientByIdQuery = `
      SELECT i.*, i.ingredient_name, uom.uom_short_code AS Unit_Name
      FROM ingredients AS i
      INNER JOIN unit_of_measurement AS uom ON i.uom_id = uom.id
      WHERE i.id = ? AND i.created_by = ?
    `;

    db.pool.query(getIngredientByIdQuery, [id, creatorId], (err, result) => {
      if (err) {
        console.error("Error while retrieving the ingredient:", err);
        return res
          .status(500)
          .json({
            success: false,
            message: "An error occurred while retrieving the ingredient",
          });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Ingredient not found" });
      }

      res.status(200).json({ success: true, data: result[0] });
    });
  });
};

const updateIngredient = (req, res) => {
  const { id } = req.params;
  const { ingredient_name, uom_id, min_stock, is_active } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Verify ownership before updating
    const query = "SELECT * FROM ingredients WHERE id = ? AND created_by = ?";
    db.pool.query(query, [id, creatorId], (err, results) => {
      if (err) {
        console.error("Error while retrieving ingredient:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while retrieving the ingredient record",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Ingredient not found" });
      }

      const currentData = results[0];

      const updateData = {
        ingredient_name: ingredient_name !== undefined ? ingredient_name : currentData.ingredient_name,
        uom_id: uom_id !== undefined ? uom_id : currentData.uom_id,
        min_stock: min_stock !== undefined ? min_stock : currentData.min_stock,
        is_active: is_active !== undefined ? is_active : currentData.is_active,
        created_by: currentData.created_by, // do NOT update from req.body
      };

      const updateIngredientQuery = `
        UPDATE ingredients
        SET ingredient_name = ?, uom_id = ?, min_stock = ?, is_active = ?, created_by = ?
        WHERE id = ?
      `;

      const values = [
        updateData.ingredient_name,
        updateData.uom_id,
        updateData.min_stock,
        updateData.is_active,
        updateData.created_by,
        id,
      ];

      db.pool.query(updateIngredientQuery, values, (err, result) => {
        if (err) {
          console.error("Error while updating ingredient:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while updating the ingredient",
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Ingredient not found" });
        }

        return res.status(200).json({
          success: true,
          message: "Ingredient updated successfully",
        });
      });
    });
  });
};

const deleteIngredient = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Verify ownership before deleting
    const deleteIngredientQuery = `
      DELETE FROM ingredients
      WHERE id = ? AND created_by = ?
    `;

    db.pool.query(deleteIngredientQuery, [id, creatorId], (err, result) => {
      if (err) {
        console.error("Error while deleting ingredient:", err);
        return res
          .status(500)
          .json({
            success: false,
            message: "An error occurred while deleting ingredient",
          });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Ingredient not found or no changes applied",
          });
      }

      res
        .status(200)
        .json({ success: true, message: "Ingredient deleted successfully" });
    });
  });
};

const getIngredientsDetails = async (req, res) => {
  try {
    const id = req.id;
    const { searchItem } = req.query;


    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { is_admin, created_by } = userRows[0];
    let creatorId;

    if (is_admin === 1) {
      creatorId = id;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view ingredients." });
      }
      creatorId = created_by;
    }


    let query = `
      SELECT
        i.id AS ingredient_id,
        i.ingredient_name,
        i.uom_id,
        uom.uom_name,
        i.stock_qty,
        i.min_stock,
        i.status,
        i.is_active
      FROM ingredients i
      LEFT JOIN unit_of_measurement uom ON i.uom_id = uom.id
      WHERE i.is_active = 1 AND i.created_by = ?
    `;

    let queryParams = [creatorId];

    if (searchItem && searchItem.trim() !== "") {
      const searchQuery = `%${searchItem}%`;
      query += ` AND (i.ingredient_name LIKE ? OR uom.uom_name LIKE ? OR i.stock_qty LIKE ? OR i.min_stock LIKE ?)`;
      queryParams.push(searchQuery, searchQuery, searchQuery, searchQuery);
    }

    query += ` ORDER BY i.id DESC`;

    // Step 3: Execute query
    const [results] = await db.pool.promise().query(query, queryParams);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const importIngredients = async (req, res) => {
  try {
    const user_id = req.id;
    const rows = req.body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data provided" });
    }

    const [subResults] = await db.pool.promise().query(
      "SELECT * FROM superadmin_user_plans WHERE user_id = ?", [user_id]
    );

    let creator_id;
    if (subResults.length > 0) {
      creator_id = user_id;
    } else {
      const [userData] = await db.pool.promise().query(
        "SELECT created_by FROM user WHERE id = ?", [user_id]
      );
      if (userData.length === 0 || !userData[0].created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to import ingredients." });
      }
      const created_by = userData[0].created_by;
      const [creatorSub] = await db.pool.promise().query(
        "SELECT * FROM superadmin_user_plans WHERE user_id = ?", [created_by]
      );
      if (creatorSub.length === 0) {
        return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
      }
      creator_id = created_by;
    }

    const [units] = await db.pool.promise().query(
      "SELECT id, uom_name, uom_short_code FROM unit_of_measurement"
    );

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const ingredient_name = (row.Ingredient_Name || "").trim();
      const unit_name = (row.Unit_Name || "").trim();
      const min_stock = row.Min_Stock || 0;
      const status = row.Status !== undefined ? parseInt(row.Status) : 1;

      if (!ingredient_name || !unit_name) { skipped++; continue; }

      const unit = units.find(u =>
        u.uom_short_code.toLowerCase() === unit_name.toLowerCase() ||
        u.uom_name.toLowerCase() === unit_name.toLowerCase()
      );
      if (!unit) { skipped++; continue; }

      const [existing] = await db.pool.promise().query(
        "SELECT id FROM ingredients WHERE ingredient_name = ? AND created_by = ?",
        [ingredient_name, creator_id]
      );
      if (existing.length > 0) { skipped++; continue; }

      await db.pool.promise().query(
        "INSERT INTO ingredients (ingredient_name, uom_id, min_stock, status, is_active, created_by) VALUES (?, ?, ?, ?, 1, ?)",
        [ingredient_name, unit.id, parseFloat(min_stock), status, creator_id]
      );
      imported++;
    }

    return res.json({ success: true, imported, skipped });
  } catch (error) {
    console.error("Import ingredients error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createIngredient,
  getAllIngredients,
  deleteIngredient,
  getIngredientById,
  updateIngredient,
  getIngredientsDetails,
  importIngredients
};
