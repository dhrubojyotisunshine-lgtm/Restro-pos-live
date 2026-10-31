const db = require("../utils/db");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// const createItemFood = (req, res) => {
//   ... (old version - see git history)
// };

const createItemFood = (req, res) => {
  const {
    CategoryID,
    ProductName,
    descrp,
    productvat,
    special,
    isoffer,
    offerstartdate,
    offerenddate,
    is_custom_quantity,
    status,
    menuid,
    variant,
    addons,
  } = req.body;

  console.log(req.body, "foooooooooood");

  const user_id = req.id;
  const ProductImage = req.file ? req.file.filename : null;

  const isofferint = isoffer === "true" ? 1 : 0;
  const is_custom_quantityint = is_custom_quantity === "true" ? 1 : 0;
  const specialint = special === "true" ? 1 : 0;

  const parsedVariant = JSON.parse(variant || "[]");
  const parsedAddons = JSON.parse(addons || "[]");

  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    const proceedWithInsert = (created_by) => {
      // ⭐ FIRST: FETCH CATEGORY'S KITCHEN ID
      const getKitchenSql =
        "SELECT kitchen_id FROM item_category WHERE CategoryID = ?";

      db.pool.query(getKitchenSql, [CategoryID], (err, kitchenResult) => {
        if (err) {
          return res.status(500).json({
            error: "Error fetching kitchen for category",
            details: err,
          });
        }

        const finalKitchenId = kitchenResult[0]?.kitchen_id || null;

        // ⭐ NOW INSERT PRODUCT WITH AUTO kitchenid
        const sql1 = `
          INSERT INTO item_foods(
            CategoryID, UserIDInserted, kitchenid, ProductName, descrip,
            ProductImage, productvat, special, offerIsavailable,
            offerstartdate, offerendate, is_customqty, ProductsIsActive, menutype
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values1 = [
          CategoryID,
          user_id,
          finalKitchenId, // ⭐ AUTO-ASSIGNED KITCHEN
          ProductName,
          descrp,
          ProductImage,
          productvat,
          specialint,
          isofferint,
          offerstartdate,
          offerenddate,
          is_custom_quantityint,
          status,
          menuid,
        ];

        db.pool.query(sql1, values1, (err, result1) => {
          if (err) {
            console.error("Error inserting into item_foods:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", details: err });
          }

          const insertedItemId = result1.insertId;

          // Insert variants
          const sql2 =
            "INSERT INTO variant(menuid, price, variantName, created_by) VALUES (?, ?, ?, ?)";
          const variantPromises = Array.isArray(parsedVariant)
            ? parsedVariant.map(({ price, variantName }) => {
                const values2 = [insertedItemId, price, variantName, created_by];
                return new Promise((resolve, reject) => {
                  db.pool.query(sql2, values2, (err, result2) => {
                    if (err) reject(err);
                    else resolve(result2);
                  });
                });
              })
            : [];

          // Insert addons
          const sql3 =
            "INSERT INTO menu_add_on (menu_id, add_on_id, is_active) VALUES (?, ?, 1)";
          const addonPromises = Array.isArray(parsedAddons)
            ? parsedAddons.map((addon_id) => {
                const values3 = [insertedItemId, addon_id];
                return new Promise((resolve, reject) => {
                  db.pool.query(sql3, values3, (err, result3) => {
                    if (err) reject(err);
                    else resolve(result3);
                  });
                });
              })
            : [];

          Promise.all([...variantPromises, ...addonPromises])
            .then(() => {
              res.status(201).json({
                message:
                  "Product, variants, and addons created successfully with auto kitchen mapping",
              });
            })
            .catch((err) => {
              console.error("Error inserting variants or addons:", err);
              res
                .status(500)
                .json({ error: "Internal Server Error", details: err });
            });
        });
      });
    };

    if (results.length > 0) {
      proceedWithInsert(user_id);
    } else {
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res
            .status(403)
            .json({ message: "You are not authorized to create item." });
        }

        const creator_id = data[0].created_by;

        db.pool.query(
          checkSubscriptionQuery,
          [creator_id],
          (err, subResults) => {
            if (err) return res.status(500).send(err);

            if (subResults.length > 0) {
              proceedWithInsert(user_id);
            } else {
              return res.status(403).json({
                message: "Creator does not have an active subscription.",
              });
            }
          }
        );
      });
    }
  });
};

const bulkUploadFoodItems = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const userId = req.id;

  try {
    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let foodItems = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(foodItems) || foodItems.length === 0) {
      return res.status(400).json({ error: "Invalid or empty file" });
    }

    // 🔹 Filter out rows where required fields are missing
    foodItems = foodItems.filter(
      (item) => item.ProductName && item.CategoryID && item.status
    );

    if (foodItems.length === 0) {
      return res.status(400).json({ error: "No valid food items to insert" });
    }

    // 🔹 Prepare SQL query (Bulk insert)
    const sql = `
      INSERT INTO item_foods (
        CategoryID, UserIDInserted, kitchenid, ProductName, descrip,
        ProductImage, productvat, special, offerIsavailable,
        offerstartdate, offerendate, is_customqty, ProductsIsActive, menutype
      )
      VALUES ?
    `;

    const values = foodItems.map((item) => [
      item.CategoryID,
      creatorId,
      item.kitchenid || null,
      item.ProductName.trim(),
      item.descrip || null,
      null,
      item.productvat || 0,
      item.special || 0,
      item.isoffer || 0,
      item.offerstartdate || null,
      item.offerenddate || null,
      item.is_custom_quantity || 0,
      item.status || 1,
      item.menuid || null,
    ]);

    // 🔹 Use promise-based query
    const [result] = await db.pool.promise().query(sql, [values]);

    const insertedItemIds = result.insertId;
    const affectedRows = result.affectedRows;

    // 🔹 Handle Variant Insertions
    if (foodItems.some((item) => item.variant)) {
      const variantSql = `INSERT INTO variant (menuid, price, variantName, created_by) VALUES ?`;
      const variantValues = [];

      foodItems.forEach((item, index) => {
        if (item.variant) {
          const variants = JSON.parse(item.variant);
          variants.forEach(({ price, variantName }) => {
            variantValues.push([insertedItemIds + index, price, variantName, creatorId]);
          });
        }
      });

      if (variantValues.length > 0) {
        await db.pool.promise().query(variantSql, [variantValues]);
      }
    }

    // 🔹 Handle Add-on Insertions
    if (foodItems.some((item) => item.addons)) {
      const addonSql = `INSERT INTO menu_add_on (menu_id, add_on_id, is_active) VALUES ?`;
      const addonValues = [];

      foodItems.forEach((item, index) => {
        if (item.addons) {
          const addons = JSON.parse(item.addons);
          addons.forEach((addon_id) => {
            addonValues.push([insertedItemIds + index, addon_id, 1]);
          });
        }
      });

      if (addonValues.length > 0) {
        await db.pool.promise().query(addonSql, [addonValues]);
      }
    }

    res.json({
      message: `${affectedRows} food items inserted successfully`,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const getAllItemFoodDetails = async (req, res) => {
  const id = req.id;
  const { searchItem } = req.query;

  try {
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, data) => {
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
      const createdBy = isAdmin === 1 ? id : data[0].created_by;

      if (!createdBy) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You are not authorized to view food details.",
          });
      }

      let sql = `
        SELECT
          item_foods.*,
          item_category.*,
          k.kitchen_name,
          tbl_menutype.*
        FROM
          item_foods
        LEFT JOIN item_category ON item_foods.CategoryID = item_category.CategoryID
        LEFT JOIN kitchens k ON item_foods.kitchenid = k.id
        LEFT JOIN tbl_menutype ON item_foods.menutype = tbl_menutype.menutypeid
        WHERE
          item_foods.ProductsIsActive = 1
          AND item_foods.UserIDInserted = ?
      `;

      let params = [createdBy];

      if (searchItem && searchItem.trim() !== "") {
        sql += `
          AND (
            item_foods.ProductName LIKE ?
            OR item_category.Name LIKE ?
          )
        `;
        const search = `%${searchItem}%`;
        params.push(search, search);
      }

      sql += ` ORDER BY item_foods.ProductsID DESC`;

      const products = await new Promise((resolve, reject) => {
        db.pool.query(sql, params, (err, results) => {
          if (err) {
            console.error("Error fetching details:", err);
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      if (products.length === 0) {
        return res.status(404).json({ error: "No details found" });
      }

      // Get variants for each product
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const variants = await new Promise((resolve, reject) => {
            const queryVariants = `
              SELECT v.*
              FROM variant v
              WHERE v.menuid = ? AND v.created_by = ?
            `;
            db.pool.query(
              queryVariants,
              [product.ProductsID || product.productsID, createdBy],
              (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result || []);
                }
              }
            );
          });

          return {
            ...product,
            variants,
          };
        })
      );

      res.status(200).json(productsWithDetails);
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

const deleteItemFood = (req, res) => {
  const ProductsID = req.params.ProductsID;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    // Verify ownership before fetching image or deleting
    const sqlFetchImage = `SELECT ProductImage FROM item_foods WHERE ProductsID = ? AND UserIDInserted = ?`;
    db.pool.query(sqlFetchImage, [ProductsID, creatorId], (err, result) => {
      if (err) {
        console.error("Error fetching ProductImage:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", details: err });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const imageFilename = result[0].ProductImage;

      const sqlDeleteVariants = `DELETE FROM variant WHERE menuid = ?`;
      db.pool.query(sqlDeleteVariants, [ProductsID], () => {});

      const sqlDeleteItemFood = `DELETE FROM item_foods WHERE ProductsID = ?`;
      db.pool.query(sqlDeleteItemFood, [ProductsID], (err, result) => {
        if (err) {
          console.error("Error deleting item_food:", err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", details: err });
        }

        // If there was a ProductImage associated, delete the image file
        if (imageFilename) {
          const imagePath = path.join(
            __dirname,
            "../asset/category",
            imageFilename
          );
          if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error("Error deleting image file:", unlinkErr);
                return res
                  .status(500)
                  .json({ error: "Internal Server Error", details: unlinkErr });
              }
              return res.json({
                message: "Product and image file deleted successfully",
              });
            });
          } else {
            return res.json({
              message: "Product  deleted successfully, image file not found",
            });
          }
        } else {
          return res.json({
            message: "Product  deleted successfully, no associated image",
          });
        }
      });
    });
  });
};

const getItemFoodDetails = (req, res) => {
  const ProductsID = req.params.ProductID;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (!userResult.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    // Query to fetch product details — with ownership check
    const productDetailsQuery = `
      SELECT
        item_foods.*,
        item_category.*,
        kitchens.*,
        tbl_menutype.*
      FROM
        item_foods
      LEFT JOIN item_category ON item_foods.CategoryID = item_category.CategoryID
      LEFT JOIN kitchens ON item_foods.kitchenid = kitchens.id
      LEFT JOIN tbl_menutype ON item_foods.menutype = tbl_menutype.menutypeid
      WHERE
        item_foods.ProductsIsActive = 1 AND item_foods.ProductsID = ? AND item_foods.UserIDInserted = ?;
    `;

    // Query to fetch add-ons data
    const addonsQuery = `
      SELECT
        menu_add_on.add_on_id,
        add_ons.price ,
        add_ons.add_on_name
      FROM
        menu_add_on
      LEFT JOIN add_ons ON menu_add_on.add_on_id = add_ons.add_on_id
      WHERE
        menu_add_on.is_active = 1 AND menu_add_on.menu_id = ?;
    `;

    // Query to fetch variants data
    const variantsQuery = `
      SELECT
        variant.*
      FROM
        variant
      WHERE
        variant.menuid = ?;
    `;

    // Execute all queries concurrently
    Promise.all([
      new Promise((resolve, reject) => {
        db.pool.query(productDetailsQuery, [ProductsID, creatorId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.pool.query(addonsQuery, [ProductsID], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.pool.query(variantsQuery, [ProductsID], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      }),
    ])
      .then(([productDetails, addons, variants]) => {
        if (productDetails.length === 0) {
          return res.status(404).json({ error: "No product details found" });
        }

        res.status(200).json({
          productDetails: productDetails[0],
          addons: addons.length > 0 ? addons : [],
          variants: variants.length > 0 ? variants : [],
        });
      })
      .catch((error) => {
        console.error("Error fetching details:", error);
        res.status(500).json({ error: "Internal Server Error", details: error });
      });
  });
};

const updateItemFood = async (req, res) => {
  const {
    CategoryID,
    kitchenid,
    ProductName,
    descrip,
    productvat,
    special,
    offerIsavailable,
    offerstartdate,
    offerenddate,
    is_customqty,
    ProductsIsActive,
    menutypeid,
    variants,
    addons,
    UserIDInserted,
  } = req.body;

  console.log("User ID:", req.id, "updatefood");
  const ProductsID = req.params.ProductID;
  const ProductImage = req.file ? req.file.filename : null;
  const userId = req.id;

  // Convert checkbox values to integers (they come as strings from formData)
  const specialInt = special ? parseInt(special) : 0;
  const offerIsavailableInt = offerIsavailable ? parseInt(offerIsavailable) : 0;
  const is_customqtyInt = is_customqty ? parseInt(is_customqty) : 0;
  const ProductsIsActiveInt = ProductsIsActive ? parseInt(ProductsIsActive) : 1;

  console.log("Received fields:", req.body);
  console.log("Received file:", req.file);

  // Parse variants
  let parsedVariants = [];
  try {
    if (typeof variants === "string") {
      parsedVariants = JSON.parse(variants);
    } else if (Array.isArray(variants)) {
      parsedVariants = variants;
    }
    console.log("Parsed variants:", parsedVariants);
  } catch (error) {
    console.error("Error parsing variants:", variants, error);
    return res.status(400).json({ error: "Invalid variants JSON format" });
  }

  // Parse addons
  let parsedAddons = [];
  try {
    if (typeof addons === "string") {
      parsedAddons = JSON.parse(addons);
    } else if (Array.isArray(addons)) {
      parsedAddons = addons;
    }
    console.log("Parsed addons:", parsedAddons);
  } catch (error) {
    console.error("Error parsing addons:", addons, error);
    return res.status(400).json({ error: "Invalid addons JSON format" });
  }

  // Resolve tenant creatorId
  let creatorId;
  try {
    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const { is_admin, created_by } = userRows[0];
    creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }

  // Fetch existing item_food data — verify ownership
  const sqlFetch = `SELECT * FROM item_foods WHERE ProductsID = ? AND UserIDInserted = ?`;
  db.pool.query(sqlFetch, [ProductsID, creatorId], (err, existingData) => {
    if (err) {
      console.error("Error fetching existing item_food data:", err);
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: err });
    }

    if (existingData.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const existingItem = existingData[0];

    // Use existing data as default for missing fields
    const updatedCategoryID =
      CategoryID !== undefined ? CategoryID : existingItem.CategoryID;
    const updatedKitchenid =
      kitchenid !== undefined ? kitchenid : existingItem.kitchenid;
    const updatedProductName =
      ProductName !== undefined ? ProductName : existingItem.ProductName;
    const updatedDescrp =
      descrip !== undefined ? descrip : existingItem.descrip;
    const updatedProductImage =
      ProductImage !== null ? ProductImage : existingItem.ProductImage;
    const updatedProductvat =
      productvat !== undefined ? productvat : existingItem.productvat;
    const updatedSpecial =
      special !== undefined ? specialInt : existingItem.special;
    const updatedIsOffer =
      offerIsavailable !== undefined
        ? offerIsavailableInt
        : existingItem.offerIsavailable;
    const updatedOfferStartDate =
      offerstartdate !== undefined
        ? offerstartdate
        : existingItem.offerstartdate;
    const updatedOfferEndDate =
      offerenddate !== undefined ? offerenddate : existingItem.offerendate;
    const updatedIsCustomQuantity =
      is_customqty !== undefined ? is_customqtyInt : existingItem.is_customqty;
    const updatedStatus =
      ProductsIsActive !== undefined
        ? ProductsIsActiveInt
        : existingItem.ProductsIsActive;
    const updatedMenuid =
      menutypeid !== undefined ? menutypeid : existingItem.menutype;

    console.log("Update values:", {
      updatedCategoryID,
      updatedKitchenid,
      updatedProductName,
      updatedDescrp,
      updatedProductImage,
      updatedProductvat,
      updatedSpecial,
      updatedIsOffer,
      updatedOfferStartDate,
      updatedOfferEndDate,
      updatedIsCustomQuantity,
      updatedStatus,
      updatedMenuid,
      ProductsID,
    });

    // Update item_foods
    const sql1 = `UPDATE item_foods
                  SET CategoryID = ?, UserIDInserted = ?, kitchenid = ?, ProductName = ?,
                      descrip = ?, ProductImage = ?, productvat = ?, special = ?,
                      offerIsavailable = ?, offerstartdate = ?, offerendate = ?,
                      is_customqty = ?, ProductsIsActive = ?, menutype = ?
                  WHERE ProductsID = ?`;

    const values1 = [
      updatedCategoryID,
      UserIDInserted,
      updatedKitchenid,
      updatedProductName,
      updatedDescrp,
      updatedProductImage,
      updatedProductvat,
      updatedSpecial,
      updatedIsOffer,
      updatedOfferStartDate,
      updatedOfferEndDate,
      updatedIsCustomQuantity,
      updatedStatus,
      updatedMenuid,
      ProductsID,
    ];

    db.pool.query(sql1, values1, (err, result1) => {
      if (err) {
        console.error("Error updating item_foods:", err);
        console.error("SQL:", sql1);
        console.error("Values:", values1);
        return res
          .status(500)
          .json({ error: "Internal Server Error", details: err.message });
      }

      console.log("Item foods updated successfully");

      // Remove existing variants
      const sqlDeleteVariants = `DELETE FROM variant WHERE menuid = ?`;
      db.pool.query(sqlDeleteVariants, [ProductsID], (err) => {
        if (err) {
          console.error("Error deleting existing variants:", err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", details: err });
        }

        console.log("Existing variants deleted");

        // Insert new variants
        if (parsedVariants.length > 0) {
          const sql2 = `INSERT INTO variant (menuid, price, variantName, created_by) VALUES (?, ?, ?, ?)`;
          const variantPromises = parsedVariants.map(
            ({ price, variantName }) => {
              const values2 = [ProductsID, price, variantName, creatorId];
              return new Promise((resolve, reject) => {
                db.pool.query(sql2, values2, (err, result2) => {
                  if (err) {
                    console.error("Error inserting into variant:", err);
                    console.error("Variant values:", values2);
                    reject(err);
                  } else {
                    resolve(result2);
                  }
                });
              });
            }
          );

          Promise.all(variantPromises)
            .then(() => {
              console.log("New variants added successfully");
            })
            .catch((err) => {
              console.error("Error inserting variants:", err);
              return res
                .status(500)
                .json({ error: "Internal Server Error", details: err });
            });
        }

        // Remove existing add-ons
        const sqlDeleteAddons = `DELETE FROM menu_add_on WHERE menu_id = ?`;
        db.pool.query(sqlDeleteAddons, [ProductsID], (err) => {
          if (err) {
            console.error("Error deleting existing add-ons:", err);
            return res
              .status(500)
              .json({ error: "Internal Server Error", details: err });
          }

          console.log("Existing add-ons deleted");

          // Insert new add-ons
          if (parsedAddons.length > 0) {
            const sql3 = `INSERT INTO menu_add_on (menu_id, add_on_id, is_active) VALUES (?, ?, 1)`;
            const addonPromises = parsedAddons.map((addon_id) => {
              const values3 = [ProductsID, addon_id];
              console.log("Inserting addon:", values3);
              return new Promise((resolve, reject) => {
                db.pool.query(sql3, values3, (err, result3) => {
                  if (err) {
                    console.error("Error inserting into menu_add_on:", err);
                    console.error("Addon values:", values3);
                    reject(err);
                  } else {
                    resolve(result3);
                  }
                });
              });
            });

            Promise.all(addonPromises)
              .then(() => {
                console.log("New add-ons added successfully");
                res.status(200).json({
                  message:
                    "Product updated successfully with new variants and add-ons",
                  success: true,
                });
              })
              .catch((err) => {
                console.error("Error inserting add-ons:", err);
                return res
                  .status(500)
                  .json({ error: "Internal Server Error", details: err });
              });
          } else {
            // If no new add-ons, complete the response
            res.status(200).json({
              message: "Product updated successfully",
              success: true,
            });
          }
        });
      });
    });
  });
};
const importFoodItems = (req, res) => {
  const { rows } = req.body;
  const user_id = req.id;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "No data provided" });
  }

  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });

    const resolveCreatedBy = (callback) => {
      if (results.length > 0) {
        callback(user_id);
      } else {
        db.pool.query("SELECT created_by FROM user WHERE id = ?", [user_id], (err, data) => {
          if (err || !data.length || !data[0].created_by) {
            return res.status(403).json({ success: false, message: "You are not authorized to import food items." });
          }
          const created_by = data[0].created_by;
          db.pool.query(checkSubscriptionQuery, [created_by], (err, creatorResults) => {
            if (err) return res.status(500).json({ success: false, message: "Internal server error", error: err });
            if (!creatorResults.length) return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
            callback(created_by);
          });
        });
      }
    };

    resolveCreatedBy((creator_id) => {
      // Fetch categories and menu types for this user
      db.pool.query("SELECT CategoryID, Name, kitchen_id FROM item_category WHERE UserIDInserted = ?", [creator_id], (err, categories) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching categories", error: err });

        db.pool.query("SELECT menutypeid, menutype FROM tbl_menutype WHERE created_by = ?", [creator_id], (err, menuTypes) => {
          if (err) return res.status(500).json({ success: false, message: "Error fetching menu types", error: err });

          // Group rows by Product_Name
          const groups = {};
          rows.forEach((row) => {
            const key = (row.Product_Name || "").trim();
            if (!key) return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
          });

          const productNames = Object.keys(groups);
          let imported = 0, skipped = 0, idx = 0;

          const processNext = () => {
            if (idx >= productNames.length) return res.status(200).json({ success: true, imported, skipped });

            const productName = productNames[idx++];
            const groupRows = groups[productName];
            const firstRow = groupRows[0];

            const categoryName = (firstRow.Category_Name || "").trim().toLowerCase();
            const menuTypeName = (firstRow.Menu_Type || "").trim().toLowerCase();
            const description = (firstRow.Description || "").trim();
            const vat = firstRow.VAT !== undefined ? Number(firstRow.VAT) : 0;
            const status = firstRow.Status !== undefined ? Number(firstRow.Status) : 1;

            const category = categories.find((c) => c.Name.toLowerCase() === categoryName);
            const menuType = menuTypes.find((m) => m.menutype.toLowerCase() === menuTypeName);

            if (!category || !menuType) { skipped++; return processNext(); }

            const kitchenId = category.kitchen_id || null;

            db.pool.query(
              `INSERT INTO item_foods (CategoryID, UserIDInserted, kitchenid, ProductName, descrip, ProductImage, productvat, special, offerIsavailable, offerstartdate, offerendate, is_customqty, ProductsIsActive, menutype) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [category.CategoryID, creator_id, kitchenId, productName, description, null, vat, 0, 0, null, null, 0, status, menuType.menutypeid],
              (err, result) => {
                if (err) { skipped++; return processNext(); }

                const foodId = result.insertId;
                const variants = groupRows
                  .filter((r) => (r.Variant_Name || "").trim())
                  .map((r) => [foodId, Number(r.Price) || 0, (r.Variant_Name || "").trim(), creator_id]);

                if (!variants.length) { imported++; return processNext(); }

                const variantSql = "INSERT INTO variant (menuid, price, variantName, created_by) VALUES ?";
                db.pool.query(variantSql, [variants], (err) => {
                  if (err) { skipped++; } else { imported++; }
                  processNext();
                });
              }
            );
          };

          processNext();
        });
      });
    });
  });
};

module.exports = {
  createItemFood,
  getAllItemFoodDetails,
  deleteItemFood,
  getItemFoodDetails,
  updateItemFood,
  bulkUploadFoodItems,
  importFoodItems,
};
