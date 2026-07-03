const db = require("../utils/db");
const { ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");

// get Category

const getCategoryList = async (req, res) => {
  try {
    const userId = req.id  || 79;

    // Step 1: Get is_admin and created_by for the logged-in user
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userData) => {
      if (err) {
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
      const createdBy = userData[0].created_by;

      let creatorId;
      if (isAdmin === 1) {
        creatorId = userId; // Admins see their own categories
      } else {
        if (!createdBy) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view category list.",
          });
        }
        creatorId = createdBy; // Non-admins can only see categories created by their admin
      }

      // Step 2: Fetch categories created by the authorized creatorId
      const getCategoryListQuery = `
        SELECT
          parent.CategoryID AS parentCategoryID,
          parent.Name AS parentCategoryName,
          parent.CategoryIsActive AS parentCategoryIsActive,
          parent.parentid AS parentParentID,
          child.CategoryID AS childCategoryID,
          child.Name AS childCategoryName,
          child.CategoryIsActive AS childCategoryIsActive,
          child.parentid AS childParentID
        FROM
          item_category parent
        LEFT JOIN
          item_category child ON child.parentid = parent.CategoryID AND child.UserIDInserted = ?
        WHERE
          parent.parentid = 0
          AND parent.CategoryIsActive = 1
          AND parent.UserIDInserted = ?
          AND (child.CategoryIsActive = 1 OR child.CategoryID IS NULL)
        ORDER BY
          parent.CategoryID, child.CategoryID;
      `;

      db.pool.query(
        getCategoryListQuery,
        [creatorId, creatorId],
        (err, results) => {
          if (err) {
            console.error("Error fetching category list:", err);
            return res
              .status(500)
              .json({ success: false, message: "An error occurred" });
          }

          const categoryMap = {};

          results.forEach((row) => {
            const parentID = row.parentCategoryID;
            if (!categoryMap[parentID]) {
              categoryMap[parentID] = {
                CategoryID: row.parentCategoryID,
                CategoryName: row.parentCategoryName,
                CategoryIsActive: row.parentCategoryIsActive,
                ParentID: row.parentParentID,
                children: [],
              };
            }
            if (row.childCategoryID) {
              categoryMap[parentID].children.push({
                CategoryID: row.childCategoryID,
                CategoryName: row.childCategoryName,
                CategoryIsActive: row.childCategoryIsActive,
                ParentID: row.childParentID,
              });
            }
          });

          const categoryList = Object.values(categoryMap);
          res.status(200).json({
            success: true,
            data: categoryList,
            message: "Category list fetched successfully",
          });
        },
      );
    });
  } catch (error) {
    console.error("Error in getCategoryList:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const id = req.id; // From auth middleware
    const { categoryId, searchTerm = "" } = req.query;
    const { parentid } = req.params;

    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
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

      let creatorId;
      if (isAdmin === 1) {
        creatorId = id;
      } else {
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view products.",
          });
        }
        creatorId = created_by;
      }

      // Build query
      let queryProducts = `
        SELECT f.*, m.*, k.kitchen_name, p.*
        FROM item_foods f
        LEFT JOIN tbl_menutype m ON f.menutype = m.menutypeid
        LEFT JOIN tbl_kitchen k ON f.kitchenid = k.kitchenid
        LEFT JOIN printers p ON k.printer_id = p.id
      `;

      let params = [];
      let whereConditions = [`f.ProductsIsActive = 1`, `f.UserIDInserted = ?`];
      params.push(creatorId);

      if (categoryId) {
        whereConditions.push(`f.CategoryID = ?`);
        params.push(categoryId);
      } else if (parentid) {
        queryProducts += ` LEFT JOIN item_category c ON f.CategoryID = c.CategoryID`;
        whereConditions.push(`c.parentid = ?`);
        params.push(parentid);
      }

      if (searchTerm) {
        whereConditions.push(`(f.ProductName LIKE ? OR f.descrip LIKE ?)`);
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      if (whereConditions.length > 0) {
        queryProducts += ` WHERE ` + whereConditions.join(" AND ");
      }

      queryProducts += ` ORDER BY f.ProductsID DESC`;

      // Fetch main products
      const products = await new Promise((resolve, reject) => {
        db.pool.query(queryProducts, params, (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      if (products.length === 0) {
        return res.status(404).json({ error: "No products found" });
      }

      // Fetch variants and add-ons
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          // Variants — join through item_foods to enforce company isolation
          const variants = await new Promise((resolve, reject) => {
            const queryVariants = `
              SELECT v.* FROM variant v
              INNER JOIN item_foods f ON v.menuid = f.ProductsID
              WHERE v.menuid = ? AND f.UserIDInserted = ?;`;
            db.pool.query(
              queryVariants,
              [product.ProductsID, creatorId],
              (err, results) => {
                if (err) return reject(err);
                resolve(results || []);
              },
            );
          });

          // Add-ons — filter by created_by to enforce company isolation
          const addons = await new Promise((resolve, reject) => {
            const queryAddons = `
              SELECT a.*
              FROM menu_add_on ma
              LEFT JOIN add_ons a ON ma.add_on_id = a.add_on_id
              WHERE ma.is_active = 1 AND ma.menu_id = ? AND a.created_by = ?;
            `;
            db.pool.query(queryAddons, [product.ProductsID, creatorId], (err, results) => {
              if (err) return reject(err);
              resolve(results || []);
            });
          });

          return {
            ...product,
            variants,
            addons,
          };
        }),
      );

      res.status(200).json(productsWithDetails);
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

const orderPlace_electron = (req, res) => {
  const {
    customer_id,
    customer_type,
    waiter_id,
    order_details,
    grand_total,
    VAT = 0,
    discount = 0,
    table_id = 0,
    persons = 0,
    print_kot = true,
  } = req.body;

  const created_by = req.id || 1;

  if (
    !customer_id ||
    !Array.isArray(order_details) ||
    order_details.length === 0 ||
    !grand_total
  ) {
    console.log("❌ Validation failed");
    return res.status(400).json({ message: "Invalid request data" });
  }

  db.get(
    "SELECT MAX(order_id) AS maxOrderId FROM customer_order",
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });

      const invoiceId = result?.maxOrderId ? result.maxOrderId + 1 : 1;
      console.log("🧾 Generated invoiceId:", invoiceId);

      db.get(
        `SELECT tokenno FROM customer_order
         WHERE order_date = DATE('now') AND tokenno IS NOT NULL
         ORDER BY order_id DESC LIMIT 1`,
        (err, tokenRow) => {
          let tokenNo = "T1";
          if (tokenRow?.tokenno) {
            const num = parseInt(tokenRow.tokenno.replace("T", ""), 10);
            tokenNo = `T${num + 1}`;
          }

          console.log("🎫 Generated token:", tokenNo);

          const orderQuery = `
            INSERT INTO customer_order (
              saleinvoice, customer_id, cutomertype, waiter_id,
              order_date, order_time, table_no,
              tokenno, totalamount,
              order_status, orderacceptreject, splitpay_status, created_by
            )
            VALUES (?, ?, ?, ?, DATE('now'), TIME('now'), ?, ?, ?, 2, 1, 0, ?)
          `;

          db.run(
            orderQuery,
            [
              invoiceId,
              customer_id,
              customer_type,
              waiter_id || 0,
              table_id,
              tokenNo,
              grand_total,
              created_by,
            ],
            function (err) {
              if (err) return res.status(500).json({ message: err.message });

              const orderId = this.lastID;
              console.log("✅ Order created, orderId:", orderId);

              // 👉 ADD HERE
              if (table_id && persons > 0) {
                db.get(
                  `SELECT person_capicity, occupied_seats 
     FROM rest_table 
     WHERE tableid = ?`,
                  [table_id],
                  (err, table) => {
                    if (err || !table) {
                      console.error("Table not found");
                      return;
                    }

                    const available =
                      table.person_capicity - table.occupied_seats;

                    if (persons > available) {
                      console.log("❌ Not enough seats");
                      return;
                    }

                    const newOccupied = table.occupied_seats + persons;

                    db.run(
                      `UPDATE rest_table 
   SET occupied_seats = ?, 
       status = CASE 
         WHEN ? = 0 THEN 'free'
         WHEN ? < person_capicity THEN 'partial'
         ELSE 'booked'
       END
   WHERE tableid = ?`,
                      [newOccupied, newOccupied, newOccupied, table_id],
                      (err) => {
                        if (err)
                          console.error("Seat update failed:", err.message);
                        else console.log("✅ Seats updated:", newOccupied);
                      },
                    );
                  },
                );
              }

              const orderMenuRows = [];
              const kotItems = {};
              const usedKitchens = new Set();
              let completed = 0;

              order_details.forEach((detail) => {
                console.log("🍽 Processing item:", detail);

                db.get(
                  "SELECT ProductName, kitchenid FROM item_foods WHERE ProductsID = ?",
                  [detail.ProductsID],
                  (err, food) => {
                    if (err) {
                      console.error("DB error:", err);
                      return res.status(500).json({ message: err.message });
                    }

                    console.log("📦 Food from DB:", food);

                    if (!food) {
                      return res.status(400).json({
                        message: `Food not found ${detail.ProductsID}`,
                      });
                    }

                    const kitchenId = Number(food.kitchenid);

                    console.log("🏠 kitchenId resolved:", kitchenId);

                    if (!kitchenId || isNaN(kitchenId)) {
                      console.error("❌ Invalid kitchen for product:", food);
                      return res.status(400).json({
                        message: `Kitchen not assigned to product: ${food.ProductName}`,
                      });
                    }

                    usedKitchens.add(kitchenId);

                    orderMenuRows.push([
                      orderId,
                      detail.ProductsID,
                      detail.price,
                      detail.quantity,
                      "",
                      "",
                      detail.variantid || 0,
                      kitchenId,
                      0,
                      0,
                      0,
                    ]);

                    let itemName = food.ProductName;
                    if (detail.addons?.length) {
                      const addons = detail.addons
                        .map((a) => a.add_on_name)
                        .join(", ");
                      itemName += ` (Addons: ${addons})`;
                    }

                    if (!kotItems[kitchenId]) kotItems[kitchenId] = [];
                    kotItems[kitchenId].push({
                      name: itemName,
                      qty: detail.quantity,
                    });

                    completed++;
                    if (completed === order_details.length) {
                      finalize().catch((err) => {
                        console.error("❌ Finalize failed:", err.message);
                        return res.status(500).json({
                          success: false,
                          message: err.message,
                        });
                      });
                    }
                  },
                );
              });

              async function finalize() {
                console.log("📥 orderMenuRows:", orderMenuRows);
                console.log("📥 kotItems:", kotItems);

                const placeholders = orderMenuRows
                  .map(() => `(?,?,?,?,?,?,?,?,?,?,?)`)
                  .join(",");

                await new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO order_menu (
        order_id, menu_id, price, menuqty,
        add_on_id, addonsqty, varientid,
        kitchen_id, food_status, allfoodready, kot_status
      ) VALUES ${placeholders}`,
                    orderMenuRows.flat(),
                    (err) => {
                      if (err) return reject(err);
                      resolve();
                    },
                  );
                });

                // Split Pay needs a sub_order row per line item (same shape
                // holdOrders.js already creates for drafts), tagged
                // source_type='normal' so origin stays distinguishable.
                
                const subOrderRows = order_details.map((detail) => [
                  orderId,
                  customer_id,
                  VAT,
                  discount,
                  detail.ProductsID,
                  detail.price,
                  detail.quantity,
                  "",
                  "",
                  0,
                  detail.variantid || 0,
                  "normal",
                ]);

                const subOrderPlaceholders = subOrderRows
                  .map(() => `(?,?,?,?,?,?,?,?,?,?,?,?)`)
                  .join(",");

                await new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO sub_order (
        order_id, customer_id, vat, discount, order_menu_id,
        total_price, menu_qty, adons_id, adons_qty, status, varient_id,
        source_type
      ) VALUES ${subOrderPlaceholders}`,
                    subOrderRows.flat(),
                    (err) => {
                      if (err) return reject(err);
                      resolve();
                    },
                  );
                });

                // paymentSplitOrder requires a bill row to exist (same
                // pattern already used by holdOrders.js/webUser.js); orderPlace()
                // never created one, which blocked Split Pay for every normal order.
                const update_by = created_by;
                const update_date = new Date().toISOString().split("T")[0];
                const service_charge = 0;
                const total_amount =
                  grand_total -
                  service_charge -
                  (VAT || 0) -
                  (discount || 0);

                await new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO bill (
        customer_id, create_by, update_by, update_date, order_id,
        total_amount, discount, service_charge, shipping_type, VAT,
        bill_amount, bill_date, bill_time, create_at,
        bill_status, payment_method_id, create_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), TIME('now'), DATE('now'), 0, 0, DATE('now'))`,
                    [
                      customer_id,
                      created_by,
                      update_by,
                      update_date,
                      orderId,
                      total_amount,
                      discount || 0,
                      service_charge,
                      null,
                      VAT || 0,
                      grand_total,
                    ],
                    (err) => {
                      if (err) return reject(err);
                      resolve();
                    },
                  );
                });

                for (const kitchenId in kotItems) {
                  for (const item of kotItems[kitchenId]) {
                    await new Promise((resolve, reject) => {
                      db.run(
                        `INSERT INTO kot_items(order_id, kitchen_id, item_name, qty, printed)
           VALUES (?, ?, ?, ?, ?)`,
                        [
                          orderId,
                          kitchenId,
                          item.name,
                          item.qty,
                          print_kot ? 0 : 1,
                        ],
                        (err) => {
                          if (err) return reject(err);
                          resolve();
                        },
                      );
                    });
                  }
                }

                if (print_kot) {
                  for (const kitchenId of usedKitchens) {
                    await printKOTForKitchen(kitchenId, orderId);
                  }
                }

                return res.json({
                  success: true,
                  message: "Order placed successfully",
                  kitchens: [...usedKitchens],
                });
              }
            },
          );
        },
      );
    },
  );
};
const orderPlace = async (req, res) => {
  try {
    const {
      customer_id,
      customer_type,
      waiter_id,
      order_details,
      grand_total,
      table_id,
      persons = 0,
    } = req.body;

    const create_by = req.id;

    // 🔹 VALIDATION
    if (
      !customer_id ||
      !Array.isArray(order_details) ||
      order_details.length === 0 ||
      !grand_total
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const waiterId = waiter_id || 0;
    const tableId = table_id || 0;

    // 🔥 STEP 1: GET LAST ORDER ID (for invoice) — per company
    const lastOrder = await runQuery(
      "SELECT MAX(CAST(saleinvoice AS UNSIGNED)) AS maxInvoice FROM customer_order WHERE created_by = ?",
      [create_by]
    );

    const invoiceId = lastOrder[0].maxInvoice ? parseInt(lastOrder[0].maxInvoice) + 1 : 1;

    // 🔥 STEP 1.5: INVOICE LIMIT CHECK
    const userRow = await runQuery("SELECT is_admin, created_by FROM user WHERE id = ?", [create_by]);
    const creatorId = (userRow[0]?.is_admin === 1) ? create_by : (userRow[0]?.created_by || create_by);

    const planRows = await runQuery(
      `SELECT sp.number_of_invoice
       FROM superadmin_user_plans sup
       JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
       WHERE sup.user_id = ?
       ORDER BY sup.user_plan_id DESC LIMIT 1`,
      [creatorId]
    );

    const invoiceLimit = planRows[0]?.number_of_invoice ?? null;

    if (invoiceLimit !== null) {
      const countRows = await runQuery(
        "SELECT COUNT(*) AS invoice_count FROM customer_order WHERE created_by = ? AND order_status != 5",
        [creatorId]
      );
      const currentCount = countRows[0]?.invoice_count || 0;
      if (currentCount >= invoiceLimit) {
        return res.status(403).json({
          success: false,
          message: `Invoice limit reached (${currentCount}/${invoiceLimit}). Please upgrade your plan.`,
        });
      }
    }

    // 🔥 STEP 2: TOKEN GENERATION — per company per day
    const lastToken = await runQuery(
      `SELECT tokenno
       FROM customer_order
       WHERE order_date = CURDATE() AND created_by = ?
       ORDER BY order_id DESC
       LIMIT 1`,
      [create_by]
    );

    let tokenNo = "T1";
    if (lastToken.length > 0 && lastToken[0].tokenno) {
      const num = parseInt(lastToken[0].tokenno.replace("T", ""), 10);
      tokenNo = `T${num + 1}`;
    }

    // 🔥 STEP 3: INSERT ORDER
    const orderInsert = await runQuery(
      `INSERT INTO customer_order (
        saleinvoice,
        customer_id,
        cutomertype,
        waiter_id,
        order_date,
        order_time,
        table_no,
        tokenno,
        totalamount,
        order_status,
        orderacceptreject,
        splitpay_status,
        created_by
      )
      VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, 2, 1, 0, ?)`,
      [
        invoiceId,
        customer_id,
        customer_type,
        waiterId,
        tableId,
        tokenNo,
        grand_total,
        create_by,
      ]
    );

    const orderId = orderInsert.insertId;

    // 🔥 STEP 4: TABLE UPDATE (SAFE)
    if (tableId && persons > 0) {
      const table = await runQuery(
        `SELECT person_capicity, occupied_seats 
         FROM rest_table 
         WHERE tableid = ?`,
        [tableId]
      );

      if (!table.length) throw new Error("Table not found");

      const available = table[0].person_capicity - table[0].occupied_seats;

      if (persons > available) {
        throw new Error("Not enough seats available");
      }

      await runQuery(
        `UPDATE rest_table 
         SET occupied_seats = occupied_seats + ? 
         WHERE tableid = ?`,
        [persons, tableId]
      );
    }

    // 🔥 STEP 5: BILL INSERT (FIXED — IMPORTANT)
    await runQuery(
      `INSERT INTO bill (
        order_id,
        customer_id,
        total_amount,
        bill_amount,
        discount,
        service_charge,
        payment_method_id,
        bill_date,
        bill_time,
        bill_status,
        create_by,
        create_date,
        update_by,
        update_date
      )
      VALUES (?, ?, ?, ?, 0, 0, 1, CURDATE(), CURTIME(), 0, ?, CURDATE(), ?, CURDATE())`,
      [
        orderId,
        customer_id,
        grand_total,
        grand_total,
        create_by,
        create_by,
      ]
    );

    // 🔥 STEP 6: PROCESS ORDER ITEMS (OPTIMIZED)
    const orderMenuRows = [];
    const kotItems = {};
    const usedKitchens = new Set();

    for (const detail of order_details) {
      const food = await runQuery(
        `SELECT ProductName, kitchenid 
         FROM item_foods 
         WHERE ProductsID = ?`,
        [detail.ProductsID]
      );

      if (!food.length) {
        throw new Error(`Product not found: ${detail.ProductsID}`);
      }

      const kitchenId = Number(food[0].kitchenid);

      if (!kitchenId) {
        throw new Error(`Kitchen not assigned for product ${detail.ProductsID}`);
      }

      usedKitchens.add(kitchenId);

      orderMenuRows.push([
        orderId,
        detail.ProductsID,
        detail.price,
        detail.quantity,
        "",
        "",
        detail.variantid || 0,
        kitchenId,
        0,
        0,
        0,
      ]);

      let kotName = food[0].ProductName;

      if (detail.addons?.length) {
        kotName += ` (Addons: ${detail.addons.map(a => a.add_on_name).join(", ")})`;
      }

      if (!kotItems[kitchenId]) kotItems[kitchenId] = [];
      kotItems[kitchenId].push({
        name: kotName,
        qty: detail.quantity,
      });
    }

    // 🔥 STEP 7: INSERT ORDER MENU (BULK)
    await runQuery(
      `INSERT INTO order_menu (
        order_id,
        menu_id,
        price,
        menuqty,
        add_on_id,
        addonsqty,
        varientid,
        kitchen_id,
        food_status,
        allfoodready,
        kot_status
      ) VALUES ?`,
      [orderMenuRows]
    );
    
    // ADD THIS NEW BLOCK HERE after 7
    const subOrderRows = order_details.map((detail) => [
      orderId,
      customer_id,
      0,
      0,
      detail.ProductsID,
      detail.price,
      detail.quantity,
      "",
      "",
      0,
      detail.variantid || 0,
      "normal",
    ]);
    
    await runQuery(
      `INSERT INTO sub_order (
        order_id, customer_id, vat, discount, order_menu_id,
        total_price, menu_qty, adons_id, adons_qty, status, varient_id,
        source_type
      ) VALUES ?`,
      [subOrderRows]
    );

    // 🔥 STEP 8: KOT ITEMS
    for (const kitchenId in kotItems) {
      for (const item of kotItems[kitchenId]) {
        await runQuery(
          `INSERT INTO kot_items (
            order_id,
            kitchen_id,
            item_name,
            qty,
            printed
          ) VALUES (?, ?, ?, ?, 0)`,
          [orderId, kitchenId, item.name, item.qty]
        );
      }
    }

    // 🔥 STEP 9: PRINTER CHECK (WARNING ONLY)
    const missingPrinters = [];

    for (const kitchenId of usedKitchens) {
      const printer = await runQuery(
        `SELECT id FROM printer_list WHERE kitchen_id = ?`,
        [kitchenId]
      );

      if (!printer.length) missingPrinters.push(kitchenId);
    }

    // 🔥 FINAL RESPONSE
    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId,
      invoiceId,
      tokenNo,
      warning:
        missingPrinters.length
          ? `Printer not configured for kitchens: ${missingPrinters.join(", ")}`
          : null,
    });

  } catch (error) {
    console.error("ORDER ERROR:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};
const orderPlace_customererrorless = async (req, res) => {
  try {
    const {
      customer_id,
      customer_type,
      waiter_id,
      order_details,
      grand_total,
      table_id,
      persons = 0,
    } = req.body;

    const create_by = req.id;

    // 🔹 BASIC VALIDATION
    if (
      !customer_id ||
      !Array.isArray(order_details) ||
      order_details.length === 0 ||
      !grand_total
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const waiterId = waiter_id || 0;
    const tableId = table_id || 0;

    // 🔹 GENERATE INVOICE ID — per company
    const maxOrderIdResult = await runQuery(
      "SELECT MAX(CAST(saleinvoice AS UNSIGNED)) AS maxOrderId FROM customer_order WHERE created_by = ?",
      [create_by]
    );

    const invoiceId = maxOrderIdResult[0].maxOrderId
      ? parseInt(maxOrderIdResult[0].maxOrderId) + 1
      : 1;

    // 🔹 AUTO-GENERATE TOKEN (DAY-WISE) — per company
    const lastTokenResult = await runQuery(
      `
      SELECT tokenno
      FROM customer_order
      WHERE order_date = CURDATE()
        AND tokenno IS NOT NULL
        AND created_by = ?
      ORDER BY order_id DESC
      LIMIT 1
      `,
      [create_by]
    );

    let tokenNo = "T1";

    if (lastTokenResult.length > 0) {
      const lastToken = lastTokenResult[0].tokenno; // e.g. T12
      const num = parseInt(lastToken.replace("T", ""), 10);
      tokenNo = `T${num + 1}`;
    }

    // 🔹 INSERT ORDER (TOKEN INCLUDED)
    const orderInsertResult = await runQuery(
      `
      INSERT INTO customer_order (
        saleinvoice,
        customer_id,
        cutomertype,
        waiter_id,
        order_date,
        order_time,
        table_no,
        tokenno,
        totalamount,
        order_status,
        orderacceptreject,
        splitpay_status,
        created_by
      )
      VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, 2, 1, 0, ?)
      `,
      [
        invoiceId,
        customer_id,
        customer_type,
        waiterId,
        tableId,
        tokenNo,
        grand_total,
        create_by,
      ],
    );

    const orderId = orderInsertResult.insertId;

    // ✅ UPDATE OCCUPIED SEATS (MYSQL)
    if (tableId && persons > 0) {
      const tableResult = await runQuery(
        `SELECT person_capicity, occupied_seats 
     FROM rest_table 
     WHERE tableid = ?`,
        [tableId],
      );

      if (tableResult.length === 0) {
        throw new Error("Table not found");
      }

      const table = tableResult[0];
      const available = table.person_capicity - table.occupied_seats;

      if (persons > available) {
        throw new Error("Not enough seats available");
      }

      const newOccupied = table.occupied_seats + persons;

      await runQuery(
        `
    UPDATE rest_table
    SET occupied_seats = ?
    WHERE tableid = ?
    `,
        [newOccupied, tableId],
      );
    }

    await runQuery(
      `
  INSERT INTO bill (
    order_id,
    customer_id,
    bill_status,
    bill_amount,
    discount,
    service_charge,
    payment_method_id,
    bill_date,
    bill_time
  )
  VALUES (?, ?, 0, 0, 0, 0, 1, CURDATE(), CURTIME())
  `,
      [orderId, customer_id],
    );

    // 🔹 DATA HOLDERS
    const orderMenuRows = [];
    const kotItems = {};
    const usedKitchens = new Set();

    // 🔹 LOOP ITEMS
    for (const detail of order_details) {
      // 🔥 FETCH PRODUCT + KITCHEN
      const foodResult = await runQuery(
        "SELECT ProductName, kitchenid FROM item_foods WHERE ProductsID = ?",
        [detail.ProductsID],
      );

      if (foodResult.length === 0) {
        throw new Error(`Food item not found: ${detail.ProductsID}`);
      }

      const kitchenId = Number(foodResult[0].kitchenid);

      console.log("Kitchen ID:", kitchenId);

      if (!kitchenId || kitchenId === 0) {
        throw new Error(
          `Kitchen not assigned to this item (Product ID ${detail.ProductsID})`,
        );
      }

      usedKitchens.add(kitchenId);

      // 🔹 ORDER MENU
      orderMenuRows.push([
        orderId,
        detail.ProductsID,
        detail.price,
        detail.quantity,
        "",
        "",
        detail.variantid || 0,
        kitchenId,
        0,
        0,
        0,
      ]);

      // 🔹 KOT ITEM NAME (WITH ADDONS)
      let kotItemName = foodResult[0].ProductName;

      if (detail.addons && detail.addons.length > 0) {
        const addonNames = detail.addons.map((a) => a.add_on_name).join(", ");
        kotItemName = `${kotItemName} (Addons: ${addonNames})`;
      }

      if (!kotItems[kitchenId]) kotItems[kitchenId] = [];
      kotItems[kitchenId].push({
        name: kotItemName,
        qty: detail.quantity,
      });
    }

    // 🔹 INSERT ORDER MENU
    await runQuery(
      `
      INSERT INTO order_menu (
        order_id,
        menu_id,
        price,
        menuqty,
        add_on_id,
        addonsqty,
        varientid,
        kitchen_id,
        food_status,
        allfoodready,
        kot_status
      ) VALUES ?
      `,
      [orderMenuRows],
    );

    // 🔹 INSERT KOT ITEMS
    for (const kitchenId in kotItems) {
      for (const item of kotItems[kitchenId]) {
        await runQuery(
          `
          INSERT INTO kot_items (
            order_id,
            kitchen_id,
            item_name,
            qty,
            printed
          ) VALUES (?, ?, ?, ?, 0)
          `,
          [orderId, kitchenId, item.name, item.qty],
        );
      }
    }

    // 🔹 PRINTER CONFIG CHECK (ONLY WARNING)
    const missingPrinters = [];

    for (const kitchenId of usedKitchens) {
      const printerCheck = await runQuery(
        "SELECT id FROM printer_list WHERE kitchen_id = ?",
        [kitchenId],
      );

      if (printerCheck.length === 0) {
        missingPrinters.push(kitchenId);
      }
    }

    // 🔹 FINAL RESPONSE
    return res.status(200).json({
      success: true,
      message: "Order placed successfully (KOT enabled)",
      orderId,
      invoiceId,
      tokenNo, // 👈 FRONTEND CAN SHOW TOKEN
      kitchens: [...usedKitchens],
      warning:
        missingPrinters.length > 0
          ? `Printer not configured for kitchen(s): ${missingPrinters.join(
              ", ",
            )}`
          : null,
    });
  } catch (error) {
    console.error("❌ Order Place Error:", error.message);
    return res.status(500).json({
      message: error.message,
    });
  }
};
const orderPlace123 = async (req, res) => {
  try {
    const {
      customer_id,
      customer_type,
      waiter_id,
      order_details,
      grand_total,
      table_id,
      persons = 0,
    } = req.body;

    const create_by = req.id;

    // 🔹 BASIC VALIDATION
    if (
      !customer_id ||
      !Array.isArray(order_details) ||
      order_details.length === 0 ||
      !grand_total
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const waiterId = waiter_id || 0;
    const tableId = table_id || 0;

    // 🔹 GENERATE INVOICE ID — per company
    const maxOrderIdResult = await runQuery(
      "SELECT MAX(CAST(saleinvoice AS UNSIGNED)) AS maxOrderId FROM customer_order WHERE created_by = ?",
      [create_by]
    );

    const invoiceId = maxOrderIdResult[0].maxOrderId
      ? parseInt(maxOrderIdResult[0].maxOrderId) + 1
      : 1;

    // 🔹 AUTO-GENERATE TOKEN (DAY-WISE) — per company
    const lastTokenResult = await runQuery(
      `
      SELECT tokenno
      FROM customer_order
      WHERE order_date = CURDATE()
        AND tokenno IS NOT NULL
        AND created_by = ?
      ORDER BY order_id DESC
      LIMIT 1
      `,
      [create_by]
    );

    let tokenNo = "T1";

    if (lastTokenResult.length > 0) {
      const lastToken = lastTokenResult[0].tokenno; // e.g. T12
      const num = parseInt(lastToken.replace("T", ""), 10);
      tokenNo = `T${num + 1}`;
    }

    // 🔹 INSERT ORDER (TOKEN INCLUDED)
    const orderInsertResult = await runQuery(
      `
      INSERT INTO customer_order (
        saleinvoice,
        customer_id,
        cutomertype,
        waiter_id,
        order_date,
        order_time,
        table_no,
        tokenno,
        totalamount,
        order_status,
        orderacceptreject,
        splitpay_status,
        created_by
      )
      VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, 2, 1, 0, ?)
      `,
      [
        invoiceId,
        customer_id,
        customer_type,
        waiterId,
        tableId,
        tokenNo,
        grand_total,
        create_by,
      ],
    );

    const orderId = orderInsertResult.insertId;

    // ✅ UPDATE OCCUPIED SEATS (MYSQL)
    if (tableId && persons > 0) {
      const tableResult = await runQuery(
        `SELECT person_capicity, occupied_seats 
     FROM rest_table 
     WHERE tableid = ?`,
        [tableId],
      );

      if (tableResult.length === 0) {
        throw new Error("Table not found");
      }

      const table = tableResult[0];
      const available = table.person_capicity - table.occupied_seats;

      if (persons > available) {
        throw new Error("Not enough seats available");
      }

      const newOccupied = table.occupied_seats + persons;

      await runQuery(
        `
    UPDATE rest_table
    SET occupied_seats = ?
    WHERE tableid = ?
    `,
        [newOccupied, tableId],
      );
    }

    await runQuery(
      `
  INSERT INTO bill (
    order_id,
    bill_status,
    bill_amount,
    discount,
    service_charge,
    payment_method_id,
    bill_date,
    bill_time
  )
  VALUES (?, 0, 0, 0, 0, 1, CURDATE(), CURTIME())
  `,
      [orderId],
    );

    // 🔹 DATA HOLDERS
    const orderMenuRows = [];
    const kotItems = {};
    const usedKitchens = new Set();

    // 🔹 LOOP ITEMS
    for (const detail of order_details) {
      // 🔥 FETCH PRODUCT + KITCHEN
      const foodResult = await runQuery(
        "SELECT ProductName, kitchenid FROM item_foods WHERE ProductsID = ?",
        [detail.ProductsID],
      );

      if (foodResult.length === 0) {
        throw new Error(`Food item not found: ${detail.ProductsID}`);
      }

      const kitchenId = Number(foodResult[0].kitchenid);

      console.log("Kitchen ID:", kitchenId);

      if (!kitchenId || kitchenId === 0) {
        throw new Error(
          `Kitchen not assigned to this item (Product ID ${detail.ProductsID})`,
        );
      }

      usedKitchens.add(kitchenId);

      // 🔹 ORDER MENU
      orderMenuRows.push([
        orderId,
        detail.ProductsID,
        detail.price,
        detail.quantity,
        "",
        "",
        detail.variantid || 0,
        kitchenId,
        0,
        0,
        0,
      ]);

      // 🔹 KOT ITEM NAME (WITH ADDONS)
      let kotItemName = foodResult[0].ProductName;

      if (detail.addons && detail.addons.length > 0) {
        const addonNames = detail.addons.map((a) => a.add_on_name).join(", ");
        kotItemName = `${kotItemName} (Addons: ${addonNames})`;
      }

      if (!kotItems[kitchenId]) kotItems[kitchenId] = [];
      kotItems[kitchenId].push({
        name: kotItemName,
        qty: detail.quantity,
      });
    }

    // 🔹 INSERT ORDER MENU
    await runQuery(
      `
      INSERT INTO order_menu (
        order_id,
        menu_id,
        price,
        menuqty,
        add_on_id,
        addonsqty,
        varientid,
        kitchen_id,
        food_status,
        allfoodready,
        kot_status
      ) VALUES ?
      `,
      [orderMenuRows],
    );

    // 🔹 INSERT KOT ITEMS
    for (const kitchenId in kotItems) {
      for (const item of kotItems[kitchenId]) {
        await runQuery(
          `
          INSERT INTO kot_items (
            order_id,
            kitchen_id,
            item_name,
            qty,
            printed
          ) VALUES (?, ?, ?, ?, 0)
          `,
          [orderId, kitchenId, item.name, item.qty],
        );
      }
    }

    // 🔹 PRINTER CONFIG CHECK (ONLY WARNING)
    const missingPrinters = [];

    for (const kitchenId of usedKitchens) {
      const printerCheck = await runQuery(
        "SELECT id FROM printer_list WHERE kitchen_id = ?",
        [kitchenId],
      );

      if (printerCheck.length === 0) {
        missingPrinters.push(kitchenId);
      }
    }

    // 🔹 FINAL RESPONSE
    return res.status(200).json({
      success: true,
      message: "Order placed successfully (KOT enabled)",
      orderId,
      invoiceId,
      tokenNo, // 👈 FRONTEND CAN SHOW TOKEN
      kitchens: [...usedKitchens],
      warning:
        missingPrinters.length > 0
          ? `Printer not configured for kitchen(s): ${missingPrinters.join(
              ", ",
            )}`
          : null,
    });
  } catch (error) {
    console.error("❌ Order Place Error:", error.message);
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getTodayOrders = async (req, res) => {
  try {
    const userId = req.id;
    const { searchItem } = req.query;

    // Step 1: User role check
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: userErr,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view orders.",
        });
      }

      const allowedCreatorId = isAdmin ? userId : createdBy;

      // Step 2: BASE QUERY (🔥 FIXED)
      let getTodayOrdersQuery = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE
          DATE(co.order_date) = CURDATE()
          AND co.created_by = ?
      `;

      const params = [allowedCreatorId];

      // Step 3: Search filter (simplified & safe)
      if (searchItem && searchItem.trim() !== "") {
        const searchQuery = `%${searchItem}%`;

        getTodayOrdersQuery += `
          AND (
            co.saleinvoice LIKE ?
            OR c.customer_name LIKE ?
            OR w.firstname LIKE ?
            OR w.lastname LIKE ?
            OR CONCAT(w.firstname, ' ', w.lastname) LIKE ?
            OR rt.tablename LIKE ?
            OR b.bill_amount LIKE ?
            OR co.status LIKE ?
          )
        `;

        params.push(
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
        );
      }

      getTodayOrdersQuery += ` ORDER BY co.order_id DESC`;

      // Step 4: Execute
      db.pool.query(getTodayOrdersQuery, params, (err, result) => {
        if (err) {
          console.error("Error fetching today orders:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching orders",
          });
        }

        return res.status(200).json({
          success: true,
          data: result,
          message: "Today's orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error,
    });
  }
};

const getWaiter = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware

    // Step 1: Fetch current user info
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        console.error("Error fetching user info:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: err });
      }

      if (userData.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;

      // Step 2: Determine who created the waiter role
      let roleCreatorId;

      if (isAdmin === 1) {
        roleCreatorId = id;
      } else {
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view waiters.",
          });
        }
        roleCreatorId = created_by;
      }

      // Step 3: Get Waiter role created by this user
      const fkRoleIdQuery = `
        SELECT role_id 
        FROM sec_role_tbl 
        WHERE LOWER(role_name) = 'waiter' AND create_by = ?
      `;

      db.pool.query(fkRoleIdQuery, [roleCreatorId], (err, roleData) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Error fetching role ID" });
        }

        if (roleData.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Waiter role not found for this user",
          });
        }

        const fkRoleId = roleData[0].role_id;

        // Step 4: Get waiter users linked to that role
        const getWaiterQuery = `
          SELECT 
            au.fk_role_id, 
            u.* 
          FROM 
            sec_user_access_tbl au
          LEFT JOIN 
            user u 
          ON 
            au.fk_user_id = u.id
          WHERE 
            au.fk_role_id = ? AND u.created_by = ?
        `;

        db.pool.query(
          getWaiterQuery,
          [fkRoleId, roleCreatorId],
          (err, data) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: "Error fetching waiter data",
              });
            }

            res.status(200).json({
              success: true,
              data,
              message: "Waiter data fetched successfully",
            });
          },
        );
      });
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};
//   get QR order

const getQROrders = async (req, res) => {
  const userId = req.id; // From auth middleware
  const { searchItem } = req.query;

  try {
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr) {
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: userErr });
      }

      if (userData.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view QR orders.",
        });
      }

      const allowedCreatorId = isAdmin ? userId : createdBy;

      // Base query
      let getQROrdersQuery = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type AS shipping_type_id,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name
        FROM
          customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE
          co.cutomertype = 99
          AND co.created_by = ?
      `;

      const params = [allowedCreatorId];

      // Optional search filtering
      if (searchItem) {
        const searchQuery = `%${searchItem}%`;

        getQROrdersQuery += `
          AND (
            co.saleinvoice LIKE ?
            OR c.customer_name LIKE ?
            OR w.firstname LIKE ?
            OR w.lastname LIKE ?
            OR CONCAT(w.firstname, ' ', w.lastname) LIKE ?
            OR sm.shipping_method LIKE ?
            OR co.shipping_date LIKE ?
            OR rt.tablename LIKE ?
            OR co.order_date LIKE ?
            OR b.bill_amount LIKE ?
            OR (
              (b.bill_status = 1 AND 'paid' LIKE ?)
              OR (b.bill_status = 0 AND 'due' LIKE ?)
            )
          )
        `;
        params.push(
          searchQuery,
          searchQuery, // saleinvoice
          searchQuery, // customer_name
          searchQuery, // firstname
          searchQuery, // lastname
          searchQuery, // shipping_method
          searchQuery, // shipping_date
          searchQuery, // tablename
          searchQuery, // order_date
          searchQuery, // bill_amount
          searchQuery, // 'paid'
          searchQuery, // 'due'
        );
      }

      // Final ordering
      getQROrdersQuery += ` ORDER BY co.order_id DESC`;

      // Execute final query
      db.pool.query(getQROrdersQuery, params, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching QR orders",
            error: err,
          });
        }

        res.status(200).json({
          success: true,
          data: result,
          message: "QR Orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred", error });
  }
};

// allOrderList
const allOrderList = async (req, res) => {
  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "An error occurred" });
      }
      const { is_admin, created_by } = userData[0];
      if (!is_admin && !created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view orders." });
      }
      const creatorId = is_admin === 1 ? userId : created_by;

      const getAllOrderList = `
       SELECT
        co.*,
        c.customer_name,
        w.firstname AS waiter_first_name,
        w.lastname AS waiter_last_name,
        rt.tablename,
        b.discount,
        b.service_charge,
        b.shipping_type,
        b.VAT,
        b.bill_amount,
        b.bill_date,
          b.bill_time,
        b.bill_status,
        b.payment_method_id,
        sm.shipping_method AS shipping_method_name
        FROM
        customer_order co
        LEFT JOIN
        customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN
        user w ON co.waiter_id = w.id
          LEFT JOIN
          rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN
        bill b ON co.order_id = b.order_id
        LEFT JOIN
        shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE co.created_by = ?
        ORDER BY
        co.order_id DESC;
      `;

      db.pool.query(getAllOrderList, [creatorId], (err, result) => {
        if (err) {
          console.log(err);
          res.status(500).json({ success: false, message: "An error occurred" });
        } else {
          res.status(200).json({
            success: true,
            data: result,
            message: "All Orders fetched successfully",
          });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getOrderById = async (req, res) => {
  const order_id = req.params.order_id;
  if (!order_id) {
    return res.status(400).json({ message: "Order ID is required" });
  }
  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "An error occurred while fetching order details" });
      }
      const { is_admin, created_by } = userData[0];
      const creatorId = is_admin === 1 ? userId : created_by;

    // Query to fetch order details, customer info, waiter info, and bill details
    const getOrderDetailsQuery = `
  SELECT
  co.*,
  rt.tablename,
  c.customer_name,
  c.customer_email,
  c.customer_address,
  c.customer_phone,
  w.firstname AS waiter_first_name,
  w.lastname AS waiter_last_name,
  b.discount,
  b.service_charge,
  b.shipping_type,
  b.VAT,
  b.bill_amount,
  b.bill_date,
  b.bill_status,
  b.payment_method_id,
  ct.customer_type,
  co.created_by,
  sm.shipping_method AS shipping_method_name,
  CASE co.order_status
  WHEN 1 THEN 'Pending'
  WHEN 2 THEN 'Processing'
  WHEN 3 THEN 'Ready'
  WHEN 4 THEN 'Served'
  WHEN 5 THEN 'Cancel'
  WHEN 6 THEN 'Hold'
  END as order_status_name
  FROM
  customer_order co
  LEFT JOIN customer_info c ON co.customer_id = c.customer_id
  LEFT JOIN user w ON co.waiter_id = w.id
  LEFT JOIN bill b ON co.order_id = b.order_id
  LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
  LEFT JOIN customer_type ct ON co.cutomertype = ct.customer_type_id
  LEFT JOIN rest_table rt ON co.table_no = rt.tableid
  WHERE
  co.order_id = ? AND co.created_by = ?;
  `;
    // Query to fetch menu items associated with the order
    const getOrderMenuQuery = `
  SELECT
  om.*,
  f.*,
  v.variantName,
  GROUP_CONCAT(a.add_on_id) AS add_on_ids,
  GROUP_CONCAT(a.add_on_name) AS add_on_names,
  GROUP_CONCAT(a.price) AS add_on_prices
  FROM
  order_menu om
  LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, om.add_on_id) AND a.created_by = ?
  LEFT JOIN item_foods f ON om.menu_id = f.ProductsID AND f.UserIDInserted = ?
  LEFT JOIN variant v ON om.varientid = v.variantid
  WHERE
  om.order_id = ?
  GROUP BY om.menu_id, om.varientid;
  `;
    db.pool.query(getOrderDetailsQuery, [order_id, creatorId], (err, orderResult) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching order details",
        });
      }
      if (!orderResult.length) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      db.pool.query(getOrderMenuQuery, [creatorId, creatorId, order_id], (err, menuResult) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching menu items",
          });
        }
        // Process menuResult to structure add-on data
        const structuredMenuItems = menuResult.map((item) => {
          const addOnIds = item.add_on_ids ? item.add_on_ids.split(",") : [];
          const addOnNames = item.add_on_names
            ? item.add_on_names.split(",")
            : [];
          const addOnPrices = item.add_on_prices
            ? item.add_on_prices.split(",")
            : [];
          const addOnQuantities = item.addonsqty
            ? item.addonsqty.split(",")
            : [];
          const addOns = addOnIds.map((id, index) => ({
            add_on_id: id,
            add_on_name: addOnNames[index] || null,
            add_on_price: addOnPrices[index] || null,
            add_on_quantity: addOnQuantities[index] || null,
          }));
          return {
            ...item,
            add_ons: addOns,
          };
        });
        res.status(200).json({
          orderDetails: orderResult,
          menuItems: structuredMenuItems,
        });
      });
    });
    }); // end user lookup
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getOngoingOrder = async (req, res) => {
  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "An error occurred" });
      }
      const { is_admin, created_by } = userData[0];
      if (!is_admin && !created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view orders." });
      }
      const creatorId = is_admin === 1 ? userId : created_by;

      const getOnGoingOrdersQuery = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
           b.discount,
            b.service_charge,
            b.shipping_type,
            b.VAT,
            b.bill_amount,
            b.bill_date,
            b.bill_status,
            b.payment_method_id,
            sm.shipping_method AS shipping_method_name
        FROM
          customer_order co
         LEFT JOIN
          customer_info c ON co.customer_id = c.customer_id
         LEFT JOIN
          user w ON co.waiter_id = w.id
           LEFT JOIN
          rest_table rt ON co.table_no = rt.tableid
           LEFT JOIN
        bill b ON co.order_id = b.order_id
        LEFT JOIN
        shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE
        co.orderacceptreject = 1
        AND co.order_status = 2
          AND  b.bill_status = 0
          AND co.created_by = ?
        ORDER BY
          co.order_id DESC;
      `;
      // co.customerpaid = co.totalamount inclue into query when needed
      db.pool.query(getOnGoingOrdersQuery, [creatorId], (err, result) => {
        if (err) {
          console.log(err);
          res.status(500).json({ success: false, message: "An error occurred" });
        } else {
          res.status(200).json({
            success: true,
            data: result,
            message: "Ongoing Orders fetched successfully",
          });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const cancelorder = (req, res) => {
  const { order_id } = req.params;
  const { anyreason } = req.body;

  // Validate input
  if (!order_id || !anyreason) {
    return res.status(400).json({
      success: false,
      message: "Missing order_id or cancellation reason",
    });
  }

  const userId = req.id;
  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
    if (userErr || !userData.length) {
      return res.status(500).json({ success: false, message: "An error occurred" });
    }
    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? userId : created_by;

  // Step 1: Get table_no based on order_id, verifying ownership
  const getTableQuery = `SELECT table_no FROM customer_order WHERE order_id = ? AND created_by = ?`;
  db.pool.query(getTableQuery, [order_id, creatorId], (err, result) => {
    if (err) {
      console.error("Error fetching table_no:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching the table number",
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No order found with the provided order_id",
      });
    }

    const tableid = result[0].table_no;

    // Step 2: Update table status
    const updateTableQuery = `UPDATE rest_table SET status = 0 WHERE tableid = ?`;
    db.pool.query(updateTableQuery, [tableid], (err) => {
      if (err) {
        console.error("Error updating table status:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the table status",
        });
      }

      // Step 3: Update order status and cancellation reason
      const updateOrderQuery = `
        UPDATE customer_order 
        SET order_status = 5, anyreason = ?
        WHERE order_id = ?`;

      db.pool.query(updateOrderQuery, [anyreason, order_id], (err, result) => {
        if (err) {
          console.error("Error updating customer_order:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while updating the order",
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "No order found with the provided order_id",
          });
        }

        // Success response
        res.status(200).json({
          success: true,
          message: "Order canceled successfully",
        });
      });
    });
  });
  }); // end user lookup
};

const cancelOrdersList = async (req, res) => {
  const id = req.id; // From auth middleware
  const { searchItem } = req.query;

  try {
    // Step 1: User role check
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (userErr, userData) => {
      if (userErr) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: userErr,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view rejected orders.",
        });
      }

      const allowedCreatorId = isAdmin ? id : createdBy;

      // Step 2: MAIN QUERY (🔥 FIXED)
      let cancelOrdersQuery = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          ct.customer_type AS customer_type_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN customer_type ct ON co.cutomertype = ct.customer_type_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE
          co.order_status = 5
          AND co.created_by = ?
      `;

      const params = [allowedCreatorId];

      // Step 3: Search filter
      if (searchItem && searchItem.trim() !== "") {
        const searchQuery = `%${searchItem}%`;

        cancelOrdersQuery += `
          AND (
            co.order_id LIKE ?
            OR c.customer_name LIKE ?
            OR w.firstname LIKE ?
            OR w.lastname LIKE ?
            OR ct.customer_type LIKE ?
            OR rt.tablename LIKE ?
            OR b.bill_amount LIKE ?
            OR b.bill_date LIKE ?
            OR co.order_date LIKE ?
          )
        `;

        params.push(
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
        );
      }

      cancelOrdersQuery += ` ORDER BY co.order_id DESC`;

      // Step 4: Execute
      db.pool.query(cancelOrdersQuery, params, (err, result) => {
        if (err) {
          console.error("Error fetching rejected orders:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred",
            error: err,
          });
        }

        return res.status(200).json({
          success: true,
          data: result,
          message: "Rejected orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

const completeOrders = async (req, res) => {
  const id = req.id;
  const { SearchItem } = req.query;

  try {
    // Step 1: User access check
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (userErr, userData) => {
      if (userErr) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: userErr,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view completed orders.",
        });
      }

      const allowedCreatorId = isAdmin ? id : createdBy;

      // Step 2: Get date format
      const getDateFormatQuery = `
        SELECT date_format 
        FROM restaurant_settings 
        WHERE user_id = ? 
        ORDER BY sl_no DESC 
        LIMIT 1
      `;

      db.pool.query(
        getDateFormatQuery,
        [allowedCreatorId],
        (dfErr, dfResult) => {
          if (dfErr) {
            return res.status(500).json({
              success: false,
              message: "Error fetching date format",
              error: dfErr,
            });
          }

          const dateFormat =
            dfResult.length > 0 ? dfResult[0].date_format : "Y/M/D";

          // Step 3: MAIN QUERY (🔥 FIXED)
          let getCompleteOrders = `
            SELECT
              co.*,
              c.customer_name,
              w.firstname AS waiter_first_name,
              w.lastname AS waiter_last_name,
              rt.tablename,
              b.discount,
              b.service_charge,
              b.shipping_type,
              b.VAT,
              b.bill_amount,
              b.bill_date,
              b.bill_status,
              b.payment_method_id,
              sm.shipping_method AS shipping_method_name,
              ct.customer_type AS customer_type_name
            FROM customer_order co
            LEFT JOIN customer_info c ON co.customer_id = c.customer_id
            LEFT JOIN user w ON co.waiter_id = w.id
            LEFT JOIN rest_table rt ON co.table_no = rt.tableid
            LEFT JOIN bill b ON co.order_id = b.order_id
            LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
            LEFT JOIN customer_type ct ON co.cutomertype = ct.customer_type_id
            WHERE
              co.status = 'completed'
              AND co.created_by = ?
          `;

          const params = [allowedCreatorId];

          // Step 4: Search filter
          if (SearchItem && SearchItem.trim() !== "") {
            const searchQuery = `%${SearchItem}%`;

            getCompleteOrders += `
              AND (
                c.customer_name LIKE ?
                OR w.firstname LIKE ?
                OR w.lastname LIKE ?
                OR CONCAT(w.firstname, ' ', w.lastname) LIKE ?
                OR rt.tablename LIKE ?
                OR b.bill_amount LIKE ?
                OR ct.customer_type LIKE ?
                OR co.order_id LIKE ?
                OR co.order_date LIKE ?
              )
            `;

            params.push(
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
              searchQuery,
            );
          }

          getCompleteOrders += ` ORDER BY co.order_id DESC`;

          // Step 5: Execute
          db.pool.query(getCompleteOrders, params, (err, result) => {
            if (err) {
              console.error("Error fetching completed orders:", err);
              return res.status(500).json({
                success: false,
                message: "An error occurred",
                error: err,
              });
            }

            // Step 6: Date formatter
            const formatDate = (dateString) => {
              if (!dateString) return null;
              const date = new Date(dateString);
              const pad = (n) => n.toString().padStart(2, "0");

              const day = pad(date.getDate());
              const month = pad(date.getMonth() + 1);
              const year = date.getFullYear();

              switch (dateFormat) {
                case "D/M/Y":
                  return `${day}/${month}/${year}`;
                case "M/D/Y":
                  return `${month}/${day}/${year}`;
                case "Y/M/D":
                  return `${year}/${month}/${day}`;
                default:
                  return `${year}-${month}-${day}`;
              }
            };

            const formattedResult = result.map((row) => ({
              ...row,
              bill_date: row.bill_date ? formatDate(row.bill_date) : null,
              order_date: row.order_date ? formatDate(row.order_date) : null,
            }));

            return res.status(200).json({
              success: true,
              data: formattedResult,
              message: "Completed orders fetched successfully",
            });
          });
        },
      );
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error,
    });
  }
};

const OrderListBySearchFilter = async (req, res) => {
  try {
    const id = req.id; // From auth middleware
    const { from, to, searchName } = req.query;

    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;

      let creatorId;
      if (isAdmin === 1) {
        creatorId = id;
      } else {
        if (!created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view this data.",
          });
        }
        creatorId = created_by;
      }

      let getAllOrderList = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name,
          CASE
            WHEN co.order_status = 4 THEN 1
            ELSE 0
          END AS can_show_invoice,
          (SELECT CASE
            WHEN COUNT(*) = 0 THEN 'Not Sent'
            WHEN SUM(k.status = 'rejected') > 0 THEN 'Rejected'
            WHEN SUM(k.status = 'completed') = COUNT(*) THEN 'All Ready'
            WHEN SUM(k.status = 'accepted') > 0 THEN 'Cooking'
            ELSE 'Waiting'
          END FROM kot_items k WHERE k.order_id = co.order_id) AS kitchen_status
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE co.created_by = ?
          AND co.order_status IN (1,2,3,4,5)
      `;

      const params = [creatorId];
      let additionalWhere = [];

      // Date filter
      if (from && to) {
        additionalWhere.push("co.order_date BETWEEN ? AND ?");
        params.push(from, to);
      }

      // Search filter
      if (searchName) {
        const searchQuery = `%${searchName}%`;
        additionalWhere.push(`(
          c.customer_name LIKE ?
          OR CONCAT(w.firstname, ' ', w.lastname) LIKE ?
          OR rt.tablename LIKE ?
          OR b.bill_amount LIKE ?
          OR co.saleinvoice LIKE ?
          OR co.order_date LIKE ?
          OR co.shipping_date LIKE ?
          OR (b.bill_status = 1 AND 'paid' LIKE ?)
          OR (b.bill_status = 0 AND 'due' LIKE ?)
        )`);

        params.push(
          searchQuery, // customer
          searchQuery, // waiter
          searchQuery, // table
          searchQuery, // bill amount
          searchQuery, // invoice
          searchQuery, // order date
          searchQuery, // shipping date
          searchQuery, // paid
          searchQuery, // due
        );
      }

      if (additionalWhere.length > 0) {
        getAllOrderList += " AND " + additionalWhere.join(" AND ");
      }

      getAllOrderList += " ORDER BY co.order_id DESC";

      db.pool.query(getAllOrderList, params, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred",
          });
        }

        return res.status(200).json({
          success: true,
          data: result,
          message: "All Orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

const pendingOrders = async (req, res) => {
  const id = req.id; // From auth middleware
  const { searchItem } = req.query;

  try {
    // Step 1: Fetch user info
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (userErr, userData) => {
      if (userErr) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: userErr,
        });
      }

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view pending orders.",
        });
      }

      const allowedCreatorId = isAdmin ? id : createdBy;

      // Step 2: BASE QUERY — 🔥 FIX HERE
      let getPendingOrders = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name,
          ct.customer_type AS customer_type_name
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN user w ON co.waiter_id = w.id
        LEFT JOIN rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN bill b ON co.order_id = b.order_id
        LEFT JOIN shipping_method sm ON b.shipping_type = sm.ship_id
        LEFT JOIN customer_type ct ON co.cutomertype = ct.customer_type_id
        WHERE
          co.status = 'pending'
          AND co.order_status != 5
          AND co.created_by = ?
      `;

      const params = [allowedCreatorId];

      // Step 3: Search filter
      if (searchItem && searchItem.trim() !== "") {
        const searchQuery = `%${searchItem}%`;

        getPendingOrders += `
          AND (
            co.saleinvoice LIKE ?
            OR c.customer_name LIKE ?
            OR w.firstname LIKE ?
            OR w.lastname LIKE ?
            OR rt.tablename LIKE ?
            OR co.order_date LIKE ?
            OR b.bill_amount LIKE ?
            OR co.shipping_date LIKE ?
            OR (b.bill_status = 1 AND 'paid' LIKE ?)
            OR (b.bill_status = 0 AND 'due' LIKE ?)
          )
        `;

        params.push(
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
          searchQuery,
        );
      }

      // Step 4: Order by latest
      getPendingOrders += ` ORDER BY co.order_id DESC`;

      // Step 5: Execute
      db.pool.query(getPendingOrders, params, (err, result) => {
        if (err) {
          console.error("Error fetching pending orders:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred",
            error: err,
          });
        }

        return res.status(200).json({
          success: true,
          data: result,
          message: "Pending Orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

const getOnlineOrders = async (req, res) => {
  const id = req.id; // From auth middleware
  console.log("id", req.id);

  const { searchItem } = req.query;

  try {
    // Step 1: Fetch user info
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], (userErr, userData) => {
      if (userErr) {
        return res
          .status(500)
          .json({ success: false, message: "Database error", error: userErr });
      }

      if (userData.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;

      if (!isAdmin && !createdBy) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view online orders.",
        });
      }

      const allowedCreatorId = isAdmin ? id : createdBy;

      // Step 2: Base query
      let getOnlineOrdersQuery = `
        SELECT
          co.*,
          c.customer_name,
          c.customer_phone AS customer_number,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type AS shipping_type_id,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name
        FROM
          customer_order co
        LEFT JOIN
          customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN
          user w ON co.waiter_id = w.id
        LEFT JOIN
          rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN
          bill b ON co.order_id = b.order_id
        LEFT JOIN
          shipping_method sm ON b.shipping_type = sm.ship_id
        WHERE
          co.cutomertype = 2
          AND co.created_by = ?
      `;

      const params = [allowedCreatorId];

      // Step 3: Search filter
      if (searchItem && searchItem.trim() !== "") {
        const searchQuery = `%${searchItem}%`;

        getOnlineOrdersQuery += `
          AND (
            co.saleinvoice LIKE ?
            OR c.customer_name LIKE ?
            OR w.firstname LIKE ?
            OR w.lastname LIKE ?
            OR CONCAT(w.firstname, ' ', w.lastname) LIKE ?
            OR sm.shipping_method LIKE ?
            OR co.shipping_date LIKE ?
            OR rt.tablename LIKE ?
            OR co.order_date LIKE ?
            OR b.bill_amount LIKE ?
            OR b.bill_date LIKE ?
            OR (b.bill_status = 1 AND 'paid' LIKE ?)
            OR (b.bill_status = 0 AND 'due' LIKE ?)
          )
        `;

        params.push(
          searchQuery, // saleinvoice
          searchQuery, // customer_name
          searchQuery, // waiter firstname
          searchQuery, // waiter lastname
          searchQuery, // waiter full name
          searchQuery, // shipping method
          searchQuery, // shipping date
          searchQuery, // table name
          searchQuery, // order date
          searchQuery, // bill amount
          searchQuery, // bill date
          searchQuery, // paid
          searchQuery, // due
        );
      }

      // Step 4: Ordering
      getOnlineOrdersQuery += ` ORDER BY co.order_id DESC`;

      // Step 5: Execute query
      db.pool.query(getOnlineOrdersQuery, params, (err, result) => {
        if (err) {
          console.error("Error fetching online orders:", err);
          return res
            .status(500)
            .json({ success: false, message: "An error occurred", error: err });
        }

        res.status(200).json({
          success: true,
          data: result,
          message: "Online Orders fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

const getQrorderdata = async (req, res) => {
  try {
    const { categoryId, searchTerm = "" } = req.query;

    // ✅ Support both QR (query) + login (req.id)
    const userId = req.id || 79;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // 🔹 Get user info
    const checkUserQuery =
      "SELECT created_by, is_admin FROM user WHERE id = ?";

    db.pool.query(checkUserQuery, [userId], async (err, userData) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }

      if (userData.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;

      let creatorId;

      if (isAdmin === 1) {
        creatorId = userId;
      } else {
        if (!created_by) {
          return res.status(403).json({
            error: "You are not authorized to view products",
          });
        }
        creatorId = created_by;
      }

      // ✅ FIXED QUERY (NO SELECT *)
      let queryProducts = `
        SELECT 
          f.ProductsID,
          f.ProductName,
          f.ProductImage,
          f.productvat,
          f.CategoryID,
          f.kitchenid,
          k.kitchen_name,
          m.menutype

        FROM item_foods f
        LEFT JOIN tbl_menutype m ON f.menutype = m.menutypeid
        LEFT JOIN tbl_kitchen k ON f.kitchenid = k.kitchenid

        WHERE f.ProductsIsActive = 1
        AND f.UserIDInserted = ?
      `;

      let params = [creatorId];

      // ✅ Category filter
      if (categoryId) {
        queryProducts += ` AND f.CategoryID = ?`;
        params.push(categoryId);
      }

      // ✅ Search filter
      if (searchTerm) {
        queryProducts += ` AND (f.ProductName LIKE ? OR f.descrip LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      queryProducts += ` ORDER BY f.ProductsID DESC`;

      // 🔹 Fetch products
      const products = await new Promise((resolve, reject) => {
        db.pool.query(queryProducts, params, (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });

      if (products.length === 0) {
        return res.status(404).json({ error: "No products found" });
      }

      // 🔥 Variants + Addons
      const detailedProducts = await Promise.all(
        products.map(async (product) => {
          // 🔹 Variants — join through item_foods to enforce company isolation
          const variants = await new Promise((resolve, reject) => {
            db.pool.query(
              `SELECT v.variantid, v.menuid, v.variantName, v.price
               FROM variant v
               INNER JOIN item_foods f ON v.menuid = f.ProductsID
               WHERE v.menuid = ? AND f.UserIDInserted = ?`,
              [product.ProductsID, creatorId],
              (err, results) => {
                if (err) return reject(err);
                resolve(results || []);
              }
            );
          });

          // 🔹 Addons — filter by created_by to enforce company isolation
          const addons = await new Promise((resolve, reject) => {
            db.pool.query(
              `SELECT a.*
               FROM menu_add_on ma
               LEFT JOIN add_ons a ON ma.add_on_id = a.add_on_id
               WHERE ma.is_active = 1 AND ma.menu_id = ? AND a.created_by = ?`,
              [product.ProductsID, creatorId],
              (err, results) => {
                if (err) return reject(err);
                resolve(results || []);
              }
            );
          });

          return {
            ProductName: product.ProductName,
            ProductImage: product.ProductImage,
            productvat: product.productvat,
            CategoryID: product.CategoryID,
            ProductsID: product.ProductsID,
            kitchen_name: product.kitchen_name,
            kitchenid: product.kitchenid, // ✅ अब 100% आएगा
            menutype: product.menutype,
            variants,
            addons,
          };
        })
      );

      res.status(200).json(detailedProducts);
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const Placeqrorder = (req, res) => {
  const {
    order_details,
    grand_total,

    VAT,

    table_id = 7,
    customer_type = 99,

    customer_name,
    customer_note,
    customer_phone,
  } = req.body;

  const create_by = req.id || 178;

  // Validate required fields
  if (
    !order_details ||
    !Array.isArray(order_details) ||
    order_details.length === 0 ||
    !grand_total
  ) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  // Insert customer info
  const customer_query = `INSERT INTO customer_info (customer_name, customer_phone) VALUES (?, ?)`;
  db.pool.query(
    customer_query,
    [customer_name, customer_phone],
    (err, result) => {
      if (err) {
        console.error("Error inserting customer:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      const customer_id = result.insertId;
      console.log("c", customer_id);
      // const total_amount = grand_total - VAT ;
      // Insert the order
      const orderQuery = `INSERT INTO customer_order
      (saleinvoice, cutomertype, isthirdparty, waiter_id, order_date, order_time, table_no, totalamount, order_status, orderacceptreject, splitpay_status, customer_note, customer_id, created_by)
      VALUES (?, ?, 0, 0, NOW(), CURTIME(), ?, ?, 1, 1, 0, ?, ?, ?)`;

      const maxOrderIdQuery =
        "SELECT MAX(saleinvoice) AS maxOrderId FROM customer_order WHERE created_by = ?";
      db.pool.query(maxOrderIdQuery, [create_by], (err, result) => {
        if (err) {
          console.error("Error getting max order ID:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        const maxOrderId = parseInt(result[0]?.maxOrderId || 0);
        const invoiceId = maxOrderId + 1;
        console.log("grand total aaya ", grand_total);
        db.pool.query(
          orderQuery,
          [
            invoiceId,
            customer_type,
            table_id,
            grand_total,
            customer_note,
            customer_id,
            create_by,
          ],

          (err, result) => {
            if (err) {
              console.error("Error inserting order:", err);
              return res.status(500).json({ message: "Internal server error" });
            }

            const orderId = result.insertId;

            // Insert order details
            const orderDetailsQuery = `INSERT INTO order_menu 
          (order_id, menu_id, price, menuqty, add_on_id, addonsqty, varientid, food_status, allfoodready)
          VALUES ?`;
            const orderDetailsData = order_details.map((detail) => {
              const addOnIds = Array.isArray(detail.checkedaddons)
                ? detail.checkedaddons.map((addon) => addon.add_on_id).join(",")
                : null;
              const addOnQuantities = Array.isArray(detail.checkedaddons)
                ? detail.checkedaddons
                    .map((addon) => addon.add_on_quantity)
                    .join(",")
                : null;
              // console.log("order details", detail);
              return [
                orderId,
                detail.ProductsID,
                // detail.productID,

                detail.price,
                detail.quantity,
                addOnIds,
                addOnQuantities,
                detail.variantid || null,
                0, // food_status
                0, // allfoodready
              ];
            });

            db.pool.query(orderDetailsQuery, [orderDetailsData], (err) => {
              if (err) {
                console.error("Error inserting order details:", err);
                return res
                  .status(500)
                  .json({ message: "Internal server error" });
              }

              // Update table status to booked
              const updateTableStatusQuery =
                "UPDATE rest_table SET status = 1 WHERE tableid = ?";
              db.pool.query(updateTableStatusQuery, [table_id], (err) => {
                if (err) {
                  console.error("Error updating table status:", err);
                  return res
                    .status(500)
                    .json({ message: "Internal server error" });
                }

                const total_amount = grand_total - VAT;
                const shipping_type = customer_type === 99 ? 1 : null;

                // Insert into bill table
                const invoiceQuery = `INSERT INTO bill 
              (create_by, order_id, total_amount,payment_method_id,shipping_type, VAT, bill_amount, bill_date, bill_time, create_at, bill_status, create_date)
              VALUES (?, ?,  ?, 0, ?, ?, ?, NOW(), CURTIME(), NOW(), 0,  NOW())`;

                const billData = [
                  create_by,
                  orderId,
                  total_amount,

                  shipping_type,
                  VAT,
                  grand_total,
                ];

                db.pool.query(invoiceQuery, billData, (err) => {
                  if (err) {
                    console.error("Error inserting invoice:", err);
                    return res
                      .status(500)
                      .json({ message: "Internal server error" });
                  }

                  // Insert into table details if customer_type is 99
                  if (customer_type === 99) {
                    const additionalQuery = `INSERT INTO table_details 
                  (table_id, customer_id, order_id, time_enter, created_at)
                  VALUES (?, ?, ?, CURTIME(), NOW())`;

                    db.pool.query(
                      additionalQuery,
                      [table_id, customer_id, orderId],
                      (err) => {
                        if (err) {
                          console.error("Error inserting table data:", err);
                          return res
                            .status(500)
                            .json({ message: "Internal server error" });
                        }
                      },
                    );
                  }

                  const io = req.app.get("io");

                  io.emit("new_qr_order", {
                    orderId,
                    table_id,
                    customer_type,
                  });

                  // Success response
                  res.status(201).json({
                    message: "Order placed successfully",
                    orderId,
                    invoiceId,
                  });
                });
              });
            });
          },
        );
      });
    },
  );
};

const getAllQrOrders = (req, res) => {
  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ error: "Internal Server Error" });
      }
      const { is_admin, created_by } = userData[0];
      if (!is_admin && !created_by) {
        return res.status(403).json({ error: "You are not authorized to view orders." });
      }
      const creatorId = is_admin === 1 ? userId : created_by;

      const query = `
        SELECT
          co.order_id,
          co.table_no,
          co.totalamount,
          co.order_status,
          co.order_date,
          co.order_time,
          c.customer_name,
          c.customer_phone
        FROM customer_order co
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id
        WHERE co.cutomertype = 99
        AND co.order_status = 1
        AND co.created_by = ?
        ORDER BY co.order_id DESC
      `;

      db.pool.query(query, [creatorId], (err, result) => {
        if (err) {
          console.error("Error fetching QR orders:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json(result);
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};

const getQrOrderById = async (req, res) => {
  const order_id = req.params.id;

  if (!order_id) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "An error occurred while fetching order details" });
      }
      const { is_admin, created_by } = userData[0];
      const creatorId = is_admin === 1 ? userId : created_by;

      // Query to fetch order details, customer info, waiter info, and bill details
      const getOrderDetailsQuery = `
            SELECT
                co.*,
                c.customer_name,
                c.customer_email,
                c.customer_address,
                c.customer_phone,
                w.firstname AS waiter_first_name,
                w.lastname AS waiter_last_name,
                b.discount,
                b.service_charge,
                b.shipping_type,
                b.VAT,
                b.bill_id,
                b.bill_amount,
                b.bill_date,
                b.bill_status,
                b.payment_method_id,
                CASE co.order_status
                  WHEN 1 THEN 'Pending'
                  WHEN 2 THEN 'Processing'
                  WHEN 3 THEN 'Ready'
                  WHEN 4 THEN 'Served'
                  WHEN 5 THEN 'Cancel'
                  WHEN 6 THEN 'Hold'
                END as order_status_name
            FROM
                customer_order co
                LEFT JOIN customer_info c ON co.customer_id = c.customer_id
                LEFT JOIN user w ON co.waiter_id = w.id
                LEFT JOIN bill b ON co.order_id = b.order_id
            WHERE
                co.order_id = ? AND co.created_by = ?;
        `;

      // Query to fetch menu items associated with the order
      const getOrderMenuQuery = `
            SELECT
                om.*,
                f.*,
                v.variantName,
                GROUP_CONCAT(a.add_on_id) AS add_on_ids,
                GROUP_CONCAT(a.add_on_name) AS add_on_names,
                GROUP_CONCAT(a.price) AS add_on_prices
            FROM
                order_menu om
                LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, om.add_on_id)
                LEFT JOIN item_foods f ON om.menu_id = f.ProductsID
                LEFT JOIN variant v ON om.varientid = v.variantid
            WHERE
                om.order_id = ?
            GROUP BY om.menu_id, om.varientid;
        `;

      db.pool.query(getOrderDetailsQuery, [order_id, creatorId], (err, orderResult) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching order details",
          });
        }

        if (!orderResult.length) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }

        db.pool.query(getOrderMenuQuery, [order_id], (err, menuResult) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              success: false,
              message: "An error occurred while fetching menu items",
            });
          }

          // Process menuResult to structure add-on data
          const structuredMenuItems = menuResult.map((item) => {
            const addOnIds = item.add_on_ids ? item.add_on_ids.split(",") : [];
            const addOnNames = item.add_on_names ? item.add_on_names.split(",") : [];
            const addOnPrices = item.add_on_prices ? item.add_on_prices.split(",") : [];
            const addOnQuantities = item.addonsqty ? item.addonsqty.split(",") : [];

            const addOns = addOnIds.map((id, index) => ({
              add_on_id: id,
              add_on_name: addOnNames[index] || null,
              add_on_price: addOnPrices[index] || null,
              add_on_quantity: addOnQuantities[index] || null,
            }));

            return {
              ...item,
              add_ons: addOns,
            };
          });

          res.status(200).json({
            orderDetails: orderResult,
            menuItems: structuredMenuItems,
          });
        });
      });
    }); // end user lookup
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const Updateqrorder = (req, res) => {
  const order_id = req.params.id;
  console.log("order id", order_id);
  const {
    order_details,
    grand_total,
    VAT,
    table_id,
    customer_name,
    customer_phone,
    customer_note,
  } = req.body;

  const update_by = req.id;

  // Validate required fields
  if (
    !order_id ||
    !order_details ||
    !Array.isArray(order_details) ||
    order_details.length === 0 ||
    !grand_total
  ) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [update_by], (userErr, userData) => {
    if (userErr || !userData.length) {
      return res.status(500).json({ message: "Internal server error" });
    }
    const { is_admin, created_by } = userData[0];
    const creatorId = is_admin === 1 ? update_by : created_by;

    const checkOwnershipQuery = "SELECT order_id FROM customer_order WHERE order_id = ? AND created_by = ?";
    db.pool.query(checkOwnershipQuery, [order_id, creatorId], (ownErr, ownResult) => {
      if (ownErr) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!ownResult.length) {
        return res.status(404).json({ message: "No order found with the provided order_id" });
      }

  // Update customer info
  const updateCustomerQuery = `UPDATE customer_info SET customer_name = ?, customer_phone = ? WHERE customer_id = (SELECT customer_id FROM customer_order WHERE order_id = ?)`;
  db.pool.query(
    updateCustomerQuery,
    [customer_name, customer_phone, order_id],
    (err) => {
      if (err) {
        console.error("Error updating customer:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      // Update order
      const updateOrderQuery = `UPDATE customer_order SET table_no = ?, totalamount = ?, customer_note = ? WHERE order_id = ?`;
      db.pool.query(
        updateOrderQuery,
        [table_id, grand_total, customer_note, order_id],
        (err) => {
          if (err) {
            console.error("Error updating order:", err);
            return res.status(500).json({ message: "Internal server error" });
          }

          // Delete existing order details
          const deleteOrderDetailsQuery = `DELETE FROM order_menu WHERE order_id = ?`;
          db.pool.query(deleteOrderDetailsQuery, [order_id], (err) => {
            if (err) {
              console.error("Error deleting order details:", err);
              return res.status(500).json({ message: "Internal server error" });
            }

            // Insert updated order details
            const insertOrderDetailsQuery = `INSERT INTO order_menu 
          (order_id, menu_id, price, menuqty, add_on_id, addonsqty, varientid, food_status, allfoodready)
          VALUES ?`;

            const orderDetailsData = order_details.map((detail) => {
              const addOnIds = Array.isArray(detail.checkedaddons)
                ? detail.checkedaddons.map((addon) => addon.add_on_id).join(",")
                : null;
              const addOnQuantities = Array.isArray(detail.checkedaddons)
                ? detail.checkedaddons
                    .map((addon) => addon.add_on_quantity)
                    .join(",")
                : null;
              return [
                order_id,
                detail.ProductsID,
                detail.price,
                detail.quantity,
                addOnIds,
                addOnQuantities,
                detail.variantid || null,
                0, // food_status
                0, // allfoodready
              ];
            });

            db.pool.query(
              insertOrderDetailsQuery,
              [orderDetailsData],
              (err) => {
                if (err) {
                  console.error("Error inserting updated order details:", err);
                  return res
                    .status(500)
                    .json({ message: "Internal server error" });
                }

                // Update table status
                const updateTableStatusQuery = `UPDATE rest_table SET status = 1 WHERE tableid = ?`;
                db.pool.query(updateTableStatusQuery, [table_id], (err) => {
                  if (err) {
                    console.error("Error updating table status:", err);
                    return res
                      .status(500)
                      .json({ message: "Internal server error" });
                  }

                  // Update bill
                  const total_amount = grand_total - VAT;
                  const updateBillQuery = `UPDATE bill SET 
              total_amount = ?,
              VAT = ?,
              bill_amount = ?,
              update_by = ?,
              update_date = NOW()
              WHERE order_id = ?`;

                  db.pool.query(
                    updateBillQuery,
                    [total_amount, VAT, grand_total, update_by, order_id],
                    (err) => {
                      if (err) {
                        console.error("Error updating bill:", err);
                        return res
                          .status(500)
                          .json({ message: "Internal server error" });
                      }

                      // Success response
                      res.status(200).json({
                        message: "Order updated successfully",
                        order_id,
                      });
                    },
                  );
                });
              },
            );
          });
        },
      );
    },
  );
    }); // end ownership check
  }); // end user lookup
};

const getQrOrderDetailsById = async (req, res) => {
  const order_id = req.params.id;

  if (!order_id) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const userId = req.id;
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "An error occurred while fetching order details" });
      }
      const { is_admin, created_by } = userData[0];
      const creatorId = is_admin === 1 ? userId : created_by;

      // Query to fetch order details, customer info, waiter info, and bill details
      const getOrderDetailsQuery = `
            SELECT
                co.*,
                c.customer_name,
                c.customer_email,
                c.customer_address,
                c.customer_phone,
                w.firstname AS waiter_first_name,
                w.lastname AS waiter_last_name,
                b.discount,
                b.service_charge,
                b.shipping_type,
                b.VAT,
                b.bill_id,
                b.bill_amount,
                b.bill_date,
                b.bill_status,
                b.payment_method_id,
                CASE co.order_status
                  WHEN 1 THEN 'Pending'
                  WHEN 2 THEN 'Processing'
                  WHEN 3 THEN 'Ready'
                  WHEN 4 THEN 'Served'
                  WHEN 5 THEN 'Cancel'
                  WHEN 6 THEN 'Hold'
                END as order_status_name
            FROM
                customer_order co
                LEFT JOIN customer_info c ON co.customer_id = c.customer_id
                LEFT JOIN user w ON co.waiter_id = w.id
                LEFT JOIN bill b ON co.order_id = b.order_id
            WHERE
                co.order_id = ? AND co.created_by = ?;
        `;

      // Query to fetch menu items associated with the order
      const getOrderMenuQuery = `
            SELECT
                om.*,
                om.menuqty AS quantity,
                f.*,
                v.variantName,
                om.varientid AS variantid,
                GROUP_CONCAT(a.add_on_id) AS add_on_ids,
                GROUP_CONCAT(a.add_on_name) AS add_on_names,
                GROUP_CONCAT(a.price) AS add_on_prices
            FROM
                order_menu om
                LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, om.add_on_id)
                LEFT JOIN item_foods f ON om.menu_id = f.ProductsID
                LEFT JOIN variant v ON om.varientid = v.variantid
            WHERE
                om.order_id = ?
            GROUP BY om.menu_id, om.varientid;
        `;

      db.pool.query(getOrderDetailsQuery, [order_id, creatorId], (err, orderResult) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching order details",
          });
        }

        if (!orderResult.length) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }

        db.pool.query(getOrderMenuQuery, [order_id], (err, menuResult) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              success: false,
              message: "An error occurred while fetching menu items",
            });
          }

          // Process menuResult to structure add-on data
          const structuredMenuItems = menuResult.map((item) => {
            const addOnIds = item.add_on_ids ? item.add_on_ids.split(",") : [];
            const addOnNames = item.add_on_names ? item.add_on_names.split(",") : [];
            const addOnPrices = item.add_on_prices ? item.add_on_prices.split(",") : [];
            const addOnQuantities = item.addonsqty ? item.addonsqty.split(",") : [];

            const addOns = addOnIds.map((id, index) => ({
              add_on_id: id,
              add_on_name: addOnNames[index] || null,
              add_on_price: addOnPrices[index] || null,
              add_on_quantity: addOnQuantities[index] || null,
            }));

            return {
              ...item,
              add_ons: addOns,
            };
          });

          res.status(200).json({
            orderDetails: orderResult,
            menuItems: structuredMenuItems,
          });
        });
      });
    }); // end user lookup
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

module.exports = {
  getCategoryList,
  getProductsByCategory,
  orderPlace,
  getTodayOrders,
  getWaiter,
  getQROrders,
  allOrderList,
  getOrderById,
  getOngoingOrder,
  cancelorder,
  cancelOrdersList,
  completeOrders,
  OrderListBySearchFilter,
  pendingOrders,
  getOnlineOrders,
  getAllQrOrders,
  getQrorderdata,
  Placeqrorder,
  getQrOrderById,
  Updateqrorder,
  getQrOrderDetailsById,
};
