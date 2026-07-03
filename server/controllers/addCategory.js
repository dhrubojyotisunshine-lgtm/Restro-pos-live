const db = require("../utils/db");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Get all data of item_category
const getCategory = (req, res) => {
  const id = req.id; // From auth middleware
  const { searchName } = req.query;

  // First, check if the user is admin or was created by someone
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

    let sql, params;
    const searchFilter =
      searchName && searchName.trim() !== "" ? `%${searchName}%` : null;

    if (isAdmin === 1) {
      // Admin: fetch categories created by self
      sql = `
        SELECT
          i.CategoryID,
          i.Name,
          i.parentid,
          i.CategoryImage,
          i.CategoryIsActive,
          i.kitchen_id,
          p.Name AS parent_name,
          p.CategoryID AS parent_id
        FROM item_category i
        LEFT JOIN item_category p ON i.parentid = p.CategoryID
        WHERE i.UserIDInserted = ? ${searchFilter ? "AND i.Name LIKE ?" : ""}
        ORDER BY i.CategoryID DESC
      `;
      params = searchFilter ? [id, searchFilter] : [id];
    } else {
      if (!created_by) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view categories.",
        });
      }

      sql = `
        SELECT
          i.CategoryID,
          i.Name,
          i.parentid,
          i.CategoryImage,
          i.CategoryIsActive,
          p.Name AS parent_name,
          p.CategoryID AS parent_id
        FROM item_category i
        LEFT JOIN item_category p ON i.parentid = p.CategoryID
        WHERE i.UserIDInserted = ? ${searchFilter ? "AND i.Name LIKE ?" : ""}
        ORDER BY i.CategoryID DESC
      `;
      params = searchFilter ? [created_by, searchFilter] : [created_by];
    }

    db.pool.query(sql, params, (err, data) => {
      if (err) {
        console.error("Database query error: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const result = data.map((item) => ({
        ...item,
        parent_name: item.parentid === 0 ? "No Parent" : item.parent_name,
      }));

      return res.json(result);
    });
  });
};

// Post data
const addCategory = (req, res) => {
  const {
    name,
    parentid,
    offerstartdate,
    offerendate,
    status,
    isoffer,
    kitchen_id,
  } = req.body;

  const user_id = req.id;
  const filename = req.file ? req.file.filename : null;

  // ==============================
  // BASIC VALIDATION
  // ==============================
  if (!name || !kitchen_id) {
    return res.status(400).json({
      success: false,
      message: "Name and kitchen_id are required",
    });
  }

  // ==============================
  // SAFE CONVERSIONS (VERY IMPORTANT)
  // ==============================
  const safeParentId = parentid ? Number(parentid) : 0;
  const safeOfferStart = offerstartdate || null;
  const safeOfferEnd = offerendate || null;
  const safeStatus = status == 1 ? 1 : 0;
  const safeIsOffer = isoffer === true || isoffer == 1 ? 1 : 0;
  const safeKitchenId = Number(kitchen_id);

  // ==============================
  // SUBSCRIPTION CHECK
  // ==============================
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.sqlMessage });
    }

    if (results.length > 0) {
      insertCategory(user_id);
    } else {
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";

      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) {
          console.log("User Check Error:", err.sqlMessage);
          return res.status(500).json({ error: err.sqlMessage });
        }

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to add a category.",
          });
        }

        const created_by = data[0].created_by;

        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, creatorResults) => {
            if (err) {
              console.log("Creator Subscription Error:", err.sqlMessage);
              return res.status(500).json({ error: err.sqlMessage });
            }

            if (creatorResults.length > 0) {
              insertCategory(created_by);
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

  // ==============================
  // INSERT CATEGORY
  // ==============================
  function insertCategory(creator_id) {
    const sql = `
      INSERT INTO item_category
      (Name, parentid, offerstartdate, offerendate,
       CategoryIsActive, CategoryImage, isoffer,
       kitchen_id, UserIDInserted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name,
      safeParentId,
      safeOfferStart,
      safeOfferEnd,
      safeStatus,
      filename,
      safeIsOffer,
      safeKitchenId,
      creator_id,
    ];

    db.pool.query(sql, values, (err, result) => {
      if (err) {
        console.log("INSERT ERROR:", err.sqlMessage);
        return res.status(500).json({
          success: false,
          error: err.sqlMessage,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Category added successfully.",
        category_id: result.insertId,
      });
    });
  }
};

const addCategoriesBulk = (req, res) => {
  const userId = req.id;
  let categories = req.body.categories;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: "Invalid or empty data format" });
  }

  // 🔴 Filter out rows where "name" or "status" is missing
  categories = categories.filter(
    (category) => category.name && category.status,
  );

  if (categories.length === 0) {
    return res.status(400).json({ error: "No valid categories to insert" });
  }

  // Resolve creatorId before bulk insert
  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    try {
      const sql = `
        INSERT INTO item_category
        (\`Name\`, \`parentid\`, \`offerstartdate\`, \`offerendate\`, \`CategoryIsActive\`, \`CategoryImage\`, \`isoffer\`, \`UserIDInserted\`)
        VALUES ?
      `;

      const values = categories.map((category) => [
        category.name.trim(),
        category.parentid || null,
        category.offerstartdate || null,
        category.offerendate || null,
        category.status || 1,
        category.filename || null,
        category.isoffer || 0,
        creatorId,
      ]);

      db.pool.query(sql, [values], (err, result) => {
        if (err) {
          console.error("Database query error: ", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        return res.json({
          message: `${result.affectedRows} categories inserted successfully`,
        });
      });
    } catch (error) {
      console.error("Error: ", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

const deletCategory = (req, res) => {
  const id = req.params.id;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    // Verify ownership before fetching/deleting
    const fetchImageSql =
      "SELECT CategoryImage FROM item_category WHERE CategoryID = ? AND UserIDInserted = ?";

    // Query to delete items related to the category in the item_foods table
    const deleteItemRelatedCategory =
      "DELETE FROM item_foods WHERE CategoryID = ?";

    // Query to delete variants related to the items in the variant table
    const deleteRelatedItemVariant =
      "DELETE FROM variant WHERE menuID IN (SELECT ProductsID FROM item_foods WHERE CategoryID = ?)";

    // Query to delete related add-ons in the menu_add_on table
    const deleteRelatedAddon =
      "DELETE FROM menu_add_on WHERE menu_id IN (SELECT ProductsID FROM item_foods WHERE CategoryID = ?)";

    // Query to delete the category itself
    const deleteCategorySql = "DELETE FROM item_category WHERE CategoryID = ?";

    db.pool.query(fetchImageSql, [id, creatorId], (fetchErr, fetchData) => {
      if (fetchErr) {
        console.error("Database fetch error: ", fetchErr);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (fetchData.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      const imageFilename = fetchData[0].CategoryImage;

      // Delete related add-ons
      db.pool.query(
        deleteRelatedAddon,
        [id],
        (addonDeleteErr, addonDeleteData) => {
          if (addonDeleteErr) {
            console.error("Error deleting related add-ons: ", addonDeleteErr);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          // Delete related variants
          db.pool.query(
            deleteRelatedItemVariant,
            [id],
            (variantDeleteErr, variantDeleteData) => {
              if (variantDeleteErr) {
                console.error(
                  "Error deleting related variants: ",
                  variantDeleteErr,
                );
                return res.status(500).json({ error: "Internal Server Error" });
              }

              // Delete related items in the item_foods table
              db.pool.query(
                deleteItemRelatedCategory,
                [id],
                (itemDeleteErr, itemDeleteData) => {
                  if (itemDeleteErr) {
                    console.error(
                      "Error deleting related items: ",
                      itemDeleteErr,
                    );
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  }

                  // Delete the category itself
                  db.pool.query(
                    deleteCategorySql,
                    [id],
                    (deleteErr, deleteData) => {
                      if (deleteErr) {
                        console.error("Error deleting category: ", deleteErr);
                        return res
                          .status(500)
                          .json({ error: "Internal Server Error" });
                      }

                      if (imageFilename) {
                        const filePath = path.join(
                          __dirname,
                          "../asset/category",
                          imageFilename,
                        );
                        if (fs.existsSync(filePath)) {
                          fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) {
                              console.error("Error deleting file: ", unlinkErr);
                              return res
                                .status(500)
                                .json({ error: "File deletion error" });
                            }
                            return res.json({
                              message:
                                "Category, related items, add-ons, and file deleted successfully",
                            });
                          });
                        } else {
                          return res.json({
                            message:
                              "Category, related items, and add-ons deleted successfully, image file not found",
                          });
                        }
                      } else {
                        return res.json({
                          message:
                            "Category, related items, and add-ons deleted successfully, no associated image",
                        });
                      }
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  });
};

const updateCategory = (req, res) => {
  const { id } = req.params;
  const userId = req.id;

  const {
    name,
    parentid,
    offerstartdate,
    offerendate,
    status,
    isoffer,
    kitchen_id,
  } = req.body;

  const filename = req.file ? req.file.filename : null;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Category name is required",
    });
  }

  // ===============================
  // SAFE DATA CONVERSION
  // ===============================
  const safeParentId = parentid ? Number(parentid) : 0;

  const safeOfferStart =
    offerstartdate && offerstartdate !== "null" ? offerstartdate : null;

  const safeOfferEnd =
    offerendate && offerendate !== "null" ? offerendate : null;

  const safeStatus = status === 1 || status === "1" ? 1 : 0;

  const safeIsOffer =
    isoffer === true || isoffer === "true" || isoffer == 1 ? 1 : 0;

  const safeKitchenId = kitchen_id ? Number(kitchen_id) : null;

  const categoryId = Number(id);

  // Resolve creatorId
  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    // ===============================
    // FETCH OLD IMAGE — verify ownership
    // ===============================
    const fetchImageSql =
      "SELECT CategoryImage FROM item_category WHERE CategoryID = ? AND UserIDInserted = ?";

    db.pool.query(fetchImageSql, [categoryId, creatorId], (fetchErr, fetchData) => {
      if (fetchErr) {
        console.log("FETCH ERROR:", fetchErr.sqlMessage);
        return res.status(500).json({
          success: false,
          error: fetchErr.sqlMessage,
        });
      }

      if (fetchData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const currentImageFilename = fetchData[0].CategoryImage;

      // ===============================
      // UPDATE QUERY
      // ===============================
      const sql = `
        UPDATE item_category
        SET
          Name = ?,
          parentid = ?,
          offerstartdate = ?,
          offerendate = ?,
          CategoryIsActive = ?,
          CategoryImage = ?,
          isoffer = ?,
          kitchen_id = ?
        WHERE CategoryID = ?
      `;

      const values = [
        name,
        safeParentId,
        safeOfferStart,
        safeOfferEnd,
        safeStatus,
        filename || currentImageFilename,
        safeIsOffer,
        safeKitchenId,
        categoryId,
      ];

      db.pool.query(sql, values, (err, result) => {
        if (err) {
          console.log("UPDATE ERROR:", err.sqlMessage);
          return res.status(500).json({
            success: false,
            error: err.sqlMessage,
          });
        }

        // ===============================
        // DELETE OLD IMAGE IF NEW UPLOADED
        // ===============================
        if (filename && currentImageFilename) {
          const oldFilePath = path.join(
            __dirname,
            "../asset/category",
            currentImageFilename,
          );

          if (fs.existsSync(oldFilePath)) {
            fs.unlink(oldFilePath, (unlinkErr) => {
              if (unlinkErr) {
                console.log("OLD IMAGE DELETE ERROR:", unlinkErr);
              } else {
                console.log("Old image deleted");
              }
            });
          }
        }

        return res.json({
          success: true,
          message: "Category updated successfully",
        });
      });
    });
  });
};

const getCategoryById = (req, res) => {
  const categoryId = req.params.id;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    let sql = `
      SELECT
       i.*,
        p.Name AS parent_name,
        p.CategoryID AS parent_id
      FROM item_category i
      LEFT JOIN item_category p ON i.parentid = p.CategoryID
      WHERE i.CategoryID = ? AND i.UserIDInserted = ?
    `;

    db.pool.query(sql, [categoryId, creatorId], (err, data) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }

      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found or not accessible.",
        });
      }

      const category = data[0];
      category.parent_name =
        category.parentid === 0 ? "No Parent" : category.parent_name;

      return res.status(200).json({ success: true, data: category });
    });
  });
};
const syncCategory = async (req, res) => {
  try {
    const syncKey = req.headers["x-sync-key"];
    if (syncKey !== "my-secret-key") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cat = req.body;
    if (!cat || !cat.Name) {
      return res.status(400).json({ success: false, message: "Invalid category data" });
    }

    await db.query(
      `INSERT INTO item_category
        (CategoryID, Name, CategoryImage, Position, CategoryIsActive,
         offerstartdate, offerendate, isoffer, parentid, UserIDInserted,
         DateInserted, DateUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         Name = VALUES(Name),
         CategoryImage = VALUES(CategoryImage),
         CategoryIsActive = VALUES(CategoryIsActive),
         DateUpdated = VALUES(DateUpdated)`,
      [
        cat.CategoryID || null,
        cat.Name || null,
        cat.CategoryImage || null,
        cat.Position || 0,
        cat.CategoryIsActive !== undefined ? cat.CategoryIsActive : 1,
        cat.offerstartdate || "0000-00-00",
        cat.offerendate || "0000-00-00",
        cat.isoffer || 0,
        cat.parentid || 0,
        cat.UserIDInserted || null,
        cat.DateInserted || null,
        cat.DateUpdated || null,
      ]
    );

    res.json({ success: true, message: "Category synced" });
  } catch (error) {
    console.error("CATEGORY SYNC ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategory,
  addCategory,
  deletCategory,
  updateCategory,
  addCategoriesBulk,
  getCategoryById,
  syncCategory,
};
