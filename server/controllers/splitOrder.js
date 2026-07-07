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

const showsplitorder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.id;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const userRows = await dbQuery("SELECT is_admin, created_by FROM user WHERE id = ?", [userId]);
    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    const { is_admin, created_by: userCreatedBy } = userRows[0];
    const creatorId = is_admin === 1 ? userId : userCreatedBy;

    const orderQuery = `
      SELECT co.*, b.*
      FROM customer_order co
      LEFT JOIN bill b ON b.order_id = co.order_id
      WHERE co.order_id = ? AND co.created_by = ?
    `;

    const orderRows = await dbQuery(orderQuery, [orderId, creatorId]);
    const orderResult = orderRows[0];

    if (!orderResult) {
      return res.status(404).json({ message: "Order not found" });
    }

    const menuQuery = `
      SELECT
        s.sub_id,
        s.order_menu_id,
        s.menu_qty,
        s.varient_id,
        v.variantName,
        f.ProductsID,
        f.ProductName,
        f.productvat,
        s.total_price,
        GROUP_CONCAT(a.add_on_id) AS add_on_ids,
        GROUP_CONCAT(a.add_on_name) AS add_on_names,
        GROUP_CONCAT(a.price) AS add_on_prices,
        s.adons_qty AS addonsqty
      FROM sub_order s
      LEFT JOIN item_foods f ON s.order_menu_id = f.ProductsID
      LEFT JOIN variant v ON s.varient_id = v.variantid
      LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, s.adons_id)
      WHERE s.order_id = ? AND s.status = 0
      GROUP BY s.sub_id
    `;

    const menuItems = await dbQuery(menuQuery, [parseInt(orderId, 10)]);

    const structured = menuItems.map((item) => {
      const ids = item.add_on_ids?.split(",") || [];
      const names = item.add_on_names?.split(",") || [];
      const prices = item.add_on_prices?.split(",") || [];
      const qtys = item.addonsqty?.split(",") || [];

      const addOns = ids.map((id, i) => ({
        id,
        name: names[i],
        price: Number(prices[i] || 0),
        quantity: Number(qtys[i] || 1),
      }));

      return {
        sub_id: item.sub_id,
        order_menu_id: item.order_menu_id,
        menu_qty: item.menu_qty,
        varient_id: item.varient_id,
        variantName: item.variantName,
        ProductName: item.ProductName,
        total_price: item.total_price,
        Product_vat: item.productvat,
        add_ons: addOns,
      };
    });

    res.json({
      success: true,
      order: orderResult,
      menuItems: structured,
    });
  } catch (err) {
    console.error("Error in showsplitorder:", err);
    res.status(500).json({ message: "Server error" });
  }
};  
const showsplitorder_sqlite = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // ORDER DETAILS
    const orderQuery = `
      SELECT co.*, b.*
      FROM customer_order co
      LEFT JOIN bill b ON b.order_id = co.order_id
      WHERE co.order_id = ?
    `;

    db.get(orderQuery, [orderId], (err, orderResult) => {
      if (err) return res.status(500).json({ message: "Error fetching order" });

      if (!orderResult) {
        return res.status(404).json({ message: "Order not found" });
      }

      const menuQuery = `
  SELECT
    s.sub_id,
    s.order_menu_id,
    s.menu_qty,
    s.varient_id,
    v.variantName,
    f.ProductsID,
    f.ProductName,
    f.productvat,
    s.total_price,
    GROUP_CONCAT(a.add_on_id) AS add_on_ids,
    GROUP_CONCAT(a.add_on_name) AS add_on_names,
    GROUP_CONCAT(a.price) AS add_on_prices,
    s.adons_qty AS addonsqty
  FROM sub_order s

  LEFT JOIN item_foods f
    ON s.order_menu_id = f.ProductsID

  LEFT JOIN variant v
    ON s.varient_id = v.variantid

  LEFT JOIN add_ons a
    ON s.adons_id IS NOT NULL
    AND ',' || s.adons_id || ',' LIKE '%,' || a.add_on_id || ',%'

  WHERE s.order_id = ? AND s.status = 0

  GROUP BY s.sub_id
`;

      db.all(menuQuery, [parseInt(orderId, 10)], (err, menuItems) => {
        if (err) return res.status(500).json({ message: "Menu error" });

        const structured = menuItems.map((item) => {
          const ids = item.add_on_ids?.split(",") || [];
          const names = item.add_on_names?.split(",") || [];
          const prices = item.add_on_prices?.split(",") || [];
          const qtys = item.addonsqty?.split(",") || [];

          const addOns = ids.map((id, i) => ({
            id,
            name: names[i],
            price: Number(prices[i] || 0),
            quantity: Number(qtys[i] || 1),
          }));

          return {
            sub_id: item.sub_id,
            order_menu_id: item.order_menu_id,
            menu_qty: item.menu_qty,
            varient_id: item.varient_id,
            variantName: item.variantName,
            ProductName: item.ProductName,
            total_price: item.total_price,
            Product_vat: item.productvat,
            add_ons: addOns,
          };
        });

        res.json({
          success: true,
          order: orderResult,
          menuItems: structured,
        });
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
const showsplitorder123 = async (req, res) => {
  try {
      const orderId = req.params.id;

      if (!orderId) {
          return res.status(400).json({ message: "Order ID is required" });
      }

      // Fetch order information
      const orderQuery = `SELECT * FROM customer_order co 
                          LEFT JOIN bill b ON b.order_id = co.order_id 
                          WHERE co.order_id = ?`;
      const [orderResult] = await db.pool.promise().query(orderQuery, [orderId]);

      if (!orderResult || orderResult.length === 0) {
          return res.status(404).json({ message: "Order not found" });
      }

      // Fetch order menu items with structured data
      const getOrderMenuQuery = `
          SELECT 
              s.sub_id,
              s.order_menu_id,
              s.menu_qty,
              s.varient_id,
              v.variantName,
              f.ProductsID,
              f.productvat,
              f.ProductName,
              s.total_price,
              GROUP_CONCAT(a.add_on_id) AS add_on_ids,
              GROUP_CONCAT(a.add_on_name) AS add_on_names,
              GROUP_CONCAT(a.price) AS add_on_prices,
              s.adons_qty
          FROM sub_order s
          LEFT JOIN item_foods f ON s.order_menu_id = f.ProductsID
          LEFT JOIN variant v ON s.varient_id = v.variantid
          LEFT JOIN add_ons a ON FIND_IN_SET(a.add_on_id, s.adons_id)
          WHERE s.order_id = ? AND s.status = 0
          GROUP BY s.sub_id
      `;

      const [menuItemsResult] = await db.pool.promise().query(getOrderMenuQuery, [orderId]);

      // Process and structure the menu items
      const structuredMenuItems = menuItemsResult.map(item => {
          const addOnIds = item.add_on_ids ? item.add_on_ids.split(',') : [];
          const addOnNames = item.add_on_names ? item.add_on_names.split(',') : [];
          const addOnPrices = item.add_on_prices ? item.add_on_prices.split(',') : [];
          const addOnQuantities = item.adons_qty ? item.adons_qty.split(',') : [];

          const addOns = addOnIds.map((id, index) => ({
              id,
              name: addOnNames[index],
              price: parseFloat(addOnPrices[index]),
              quantity: addOnQuantities[index] ? parseInt(addOnQuantities[index], 10) : 1,
          }));

          return {
              sub_id: item.sub_id,
              order_menu_id: item.order_menu_id,
              menu_qty: item.menu_qty,
              varient_id: item.varient_id,
              variantName: item.variantName,
              ProductsID: item.ProductsID,
              ProductName: item.ProductName,
              total_price: item.total_price,
              Product_vat: item.productvat,
              add_ons: addOns,
          };
      });

      res.status(200).json({
          success: true,
          order: orderResult[0],
          menuItems: structuredMenuItems,
          message: "Split order data fetched successfully",
      });
  } catch (error) {
      console.error("Error in showsplitorder:", error);
      res.status(500).json({ message: "Server error", error });
  }
};

  const mergeMakePayment = (req, res) => {
    const orderIds = req.body.orderid;
    const userId = req.id;

    // Validate order IDs
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Invalid order IDs" });
    }

    console.log("Order IDs:", orderIds);

    const allOrder = orderIds.join(",");
    const { payment_method_id, paidAmount, discount } = req.body;

    console.log("Request Body:", req.body);

    db.pool.query("SELECT is_admin, created_by FROM user WHERE id = ?", [userId], (userErr, userData) => {
      if (userErr || !userData.length) {
        return res.status(500).json({ success: false, message: "Internal server error." });
      }
      const { is_admin, created_by } = userData[0];
      const creatorId = is_admin === 1 ? userId : created_by;

    // Check if orders exist AND belong to this admin
    const checkOrderQuery = "SELECT * FROM customer_order WHERE order_id IN (?) AND created_by = ?";
    db.pool.query(checkOrderQuery, [orderIds, creatorId], (err, orderResult) => {
      if (err) {
        console.error("Error checking customer_order:", err);
        return res.status(500).json({ success: false, message: "An error occurred" });
      }

      if (orderResult.length === 0) {
        console.log("Order not found for order IDs:", orderIds);
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (orderResult.length !== orderIds.length) {
        return res.status(403).json({ success: false, message: "You are not authorized to perform this action." });
      }
  
      // Update customer_order table
      const updateOrderQuery = `
        UPDATE customer_order 
        SET marge_order_id = ?, customerpaid = ?, order_status = 4 
        WHERE order_id IN (?)
      `;
      db.pool.query(updateOrderQuery, [allOrder, paidAmount, orderIds], (err, updateOrderResult) => {
        if (err) {
          console.error("Error updating customer_order:", err);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
  
        if (updateOrderResult.affectedRows === 0) {
          console.log("No rows updated in customer_order for order IDs:", orderIds);
          return res.status(404).json({ success: false, message: "No rows updated in customer_order" });
        }
  
        // If table_no is not 0, update rest_table
        const tableNos = orderResult
          .map((order) => order.table_no)
          .filter((table_no) => table_no !== 0);
  
        if (tableNos.length > 0) {
          const updateTableQuery = `
            UPDATE rest_table 
            SET status = 0 
            WHERE tableid IN (?)
          `;
          db.pool.query(updateTableQuery, [tableNos], (err, updateTableResult) => {
            if (err) {
              console.error("Error updating rest_table:", err);
              return res.status(500).json({ success: false, message: "An error occurred" });
            }
  
            if (updateTableResult.affectedRows === 0) {
              console.log("No rows updated in rest_table for table IDs:", tableNos);
            }
          });
        }
  
        // Update bill table
        const updateBillQuery = `
          UPDATE bill
          SET
            payment_method_id = ?,
            bill_date = NOW(),
            bill_time = CURTIME(),
            discount = ?,      
            bill_amount = ?,
            bill_status = 1
          WHERE order_id IN (?)
        `;
        db.pool.query(updateBillQuery, [payment_method_id, discount, paidAmount, orderIds], (err, updateBillResult) => {
          if (err) {
            console.error("Error updating bill:", err);
            return res.status(500).json({ success: false, message: "An error occurred" });
          }
  
          if (updateBillResult.affectedRows === 0) {
            console.log("No rows updated in bill for order IDs:", orderIds);
            return res.status(404).json({ success: false, message: "No rows updated in bill" });
          }
  
          // Log SQL warnings (if any)
          db.pool.query("SHOW WARNINGS", (err, warnings) => {
            if (err) {
              console.error("Error showing warnings:", err);
            } else {
              console.log("SQL Warnings:", warnings);
            }
          });
  
          res.status(200).json({ success: true, message: "Payment done successfully" });
        });
      });
    });
    }); // end user lookup
  };

const paymentSplitOrder = async (req, res) => {
  const { sub_order_ids, paidAmount, payment_method_id, discount } = req.body;
  const userId = req.id;

  if (
    !Array.isArray(sub_order_ids) ||
    sub_order_ids.length === 0 ||
    !Array.isArray(payment_method_id)
  ) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    const userRows = await dbQuery("SELECT is_admin, created_by FROM user WHERE id = ?", [userId]);
    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    const { is_admin, created_by: userCreatedBy } = userRows[0];
    const creatorId = is_admin === 1 ? userId : userCreatedBy;

    // Fetch sub-order details first (read-only) to get order_id for ownership check
    const subOrderDetails = [];

    for (const sub_id of sub_order_ids) {
      const rows = await dbQuery(
        "SELECT * FROM sub_order WHERE sub_id = ?",
        [sub_id]
      );

      if (!rows.length) {
        throw new Error("Sub-order not found");
      }

      subOrderDetails.push(rows[0]);
    }

    const order_id = subOrderDetails[0].order_id;
    const menu_ids = subOrderDetails.map((row) => row.order_menu_id);

    // Ownership check before any mutation
    const ownRows = await dbQuery(
      "SELECT order_id FROM customer_order WHERE order_id = ? AND created_by = ?",
      [order_id, creatorId]
    );
    if (!ownRows.length) {
      return res.status(403).json({ message: "You are not authorized to update this order." });
    }

    for (const sub_id of sub_order_ids) {
      await dbQuery(
        "UPDATE sub_order SET discount = ?, status = 1 WHERE sub_id = ?",
        [discount, sub_id]
      );
    }

    const placeholders = menu_ids.map(() => "?").join(",");

    await dbQuery(
      `UPDATE order_menu
       SET food_status = 1
       WHERE order_id = ?
       AND menu_id IN (${placeholders})`,
      [order_id, ...menu_ids]
    );

    const billRows = await dbQuery(
      "SELECT * FROM bill WHERE order_id = ?",
      [order_id]
    );

    if (!billRows.length) {
      throw new Error("Bill not found");
    }

    const bill_id = billRows[0].bill_id;

    await dbQuery(
      `INSERT INTO multipay_bill
      (order_id, multipayid, payment_type_id, amount)
      VALUES (?, ?, ?, ?)`,
      [order_id, bill_id, payment_method_id[0], paidAmount]
    );

    await dbQuery(
      `UPDATE customer_order
       SET splitpay_status = 1,
           invoiceprint = 2
       WHERE order_id = ?`,
      [order_id]
    );

    const totalOrderRows = await dbQuery(
      `SELECT COUNT(*) AS total
       FROM sub_order
       WHERE status = 0
       AND order_id = ?`,
      [order_id]
    );

    const totalOrder = totalOrderRows[0];

    if (totalOrder.total === 0) {
      const totalDiscountRows = await dbQuery(
        `SELECT SUM(discount) AS totaldiscount
         FROM sub_order
         WHERE order_id = ?`,
        [order_id]
      );

      const totalDiscount =
        totalDiscountRows[0].totaldiscount || 0;

      const billDetailsRows = await dbQuery(
        `SELECT bill_amount
         FROM bill
         WHERE order_id = ?`,
        [order_id]
      );

      const billAmount = billDetailsRows[0].bill_amount;

      const orderRows = await dbQuery(
        `SELECT *
         FROM customer_order
         WHERE order_id = ?`,
        [order_id]
      );

      const orderResult = orderRows[0];

      if (orderResult && orderResult.table_no !== 0) {
        await dbQuery(
          `UPDATE rest_table
           SET status = 0
           WHERE tableid = ?`,
          [orderResult.table_no]
        );
      }

      await dbQuery(
        `UPDATE customer_order
         SET order_status = 4
         WHERE order_id = ?`,
        [order_id]
      );

      await dbQuery(
        `UPDATE bill
         SET bill_status = ?,
             discount = ?,
             bill_amount = ?,
             payment_method_id = ?,
             create_at = ?
         WHERE order_id = ?`,
        [
          1,
          totalDiscount,
          billAmount - totalDiscount,
          payment_method_id[0],
          new Date(),
          order_id,
        ]
      );

      await dbQuery(
        `DELETE FROM table_details
         WHERE order_id = ?`,
        [order_id]
      );

      const finalBillRows = await dbQuery(
        `SELECT *
         FROM bill
         WHERE order_id = ?`,
        [order_id]
      );

      return res.status(200).json({
        message: "Order processed successfully",
        finalBillAmount: finalBillRows[0].bill_amount,
        splitpay_status: orderResult.splitpay_status,
      });
    }

    return res.status(200).json({
      message: "Partial payment received, awaiting remaining payments",
      splitpay_status: 1,
    });
  } catch (error) {
    console.error("Error processing split payment:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
const paymentSplitOrder_sqlite = async (req, res) => {
  const { sub_order_ids, paidAmount, payment_method_id, discount } = req.body;
console.log("=== paymentSplitOrder ===");
console.log("Payload:", req.body);
  if (
    !Array.isArray(sub_order_ids) ||
    sub_order_ids.length === 0 ||
    !Array.isArray(payment_method_id)
  ) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    // Step 1: Update discount and status for each sub_order_id
    for (const sub_id of sub_order_ids) {
      await new Promise((resolve, reject) => {
        
        db.run(
          "UPDATE sub_order SET discount = ?, status = 1 WHERE sub_id = ?",
          [discount, sub_id],
          function (err) {
            if (err) return reject(err);

            console.log(
              `UPDATE sub_order WHERE sub_id=${sub_id}, rows affected=${this.changes}`
            );

            resolve();
          }
        );
      });
    }

    // Step 2: Fetch sub_order details
    const subOrderDetails = await Promise.all(
      sub_order_ids.map(
        (sub_id) =>
          new Promise((resolve, reject) => {
         
            db.get(
                "SELECT * FROM sub_order WHERE sub_id = ?",
                [sub_id],
                (err, row) => {

                  console.log("Searching sub_id:", sub_id);
                  console.log("Result:", row);

                  if (err) return reject(err);

                  if (!row) {
                    console.log("Sub-order not found for sub_id:", sub_id);
                    db.all(
                      "SELECT rowid, * FROM sub_order ORDER BY rowid DESC LIMIT 20",
                      (dumpErr, dumpRows) => {
                        console.log(
                          "Last 20 sub_order rows by rowid:",
                          dumpErr ? dumpErr.message : dumpRows
                        );
                      }
                    );
                    return reject(new Error("Sub-order not found"));
                  }

                  resolve(row);
                }
              );
          }),
      ),
    );

    const order_id = subOrderDetails[0].order_id;
    const menu_ids = subOrderDetails.map((row) => row.order_menu_id);
    console.log("subOrderDetails:", subOrderDetails);
    console.log("order_id:", order_id, typeof order_id);

    // Step 3: Update order_menu food status
    const placeholders = menu_ids.map(() => "?").join(",");
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE order_menu SET food_status = 1 WHERE order_id = ? AND menu_id IN (${placeholders})`,
        [order_id, ...menu_ids],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    // Step 4: Fetch bill details
    const billInfo = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM bill WHERE order_id = ?",
        [order_id],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new Error("Bill not found"));
          resolve(row);
        },
      );
    });

    const bill_id = billInfo.bill_id;

    // Step 5: Insert into multipay_bill
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO multipay_bill (order_id, multipayid, payment_type_id, amount) VALUES (?, ?, ?, ?)",
        [order_id, bill_id, payment_method_id[0], paidAmount],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    // Step 6: Update customer_order
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE customer_order SET splitpay_status = 1, invoiceprint = 2 WHERE order_id = ?",
        [order_id],
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    // Step 7: Check for any remaining sub_orders with status = 0
    const totalOrder = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) AS total FROM sub_order WHERE status = 0 AND order_id = ?",
        [order_id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        },
      );
    });

    if (totalOrder.total === 0) {
      const totalDiscount = await new Promise((resolve, reject) => {
        db.get(
          "SELECT SUM(discount) AS totaldiscount FROM sub_order WHERE order_id = ?",
          [order_id],
          (err, row) => {
            if (err) return reject(err);
            resolve(row.totaldiscount || 0);
          },
        );
      });

      const billDetails = await new Promise((resolve, reject) => {
        db.get(
          "SELECT bill_amount FROM bill WHERE order_id = ?",
          [order_id],
          (err, row) => {
            if (err) return reject(err);
            resolve(row.bill_amount);
          },
        );
      });

      const orderResult = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM customer_order WHERE order_id = ?",
          [order_id],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          },
        );
      });

      // Release table if table_no is not 0
      if (orderResult && orderResult.table_no !== 0) {
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE rest_table SET status = 0, occupied_seats = 0 WHERE tableid = ?",
            [orderResult.table_no],
            (err) => {
              if (err) return reject(err);
              resolve();
            },
          );
        });
      }

      // Update customer_order status
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE customer_order SET order_status = 4 WHERE order_id = ?",
          [order_id],
          (err) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      // Update bill with discount and payment
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE bill SET bill_status = ?, discount = ?, bill_amount = ?, payment_method_id = ?, create_at = ? WHERE order_id = ?`,
          [
            1,
            totalDiscount,
            billDetails,
            payment_method_id[0],
            new Date().toISOString(),
            order_id,
          ],
          (err) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      // Delete table_details
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM table_details WHERE order_id = ?",
          [order_id],
          (err) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      const finalBill = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM bill WHERE order_id = ?",
          [order_id],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          },
        );
      });

      return res.status(200).json({
        message: "Order processed successfully",
        finalBillAmount: finalBill.bill_amount,
        splitpay_status: orderResult.splitpay_status,
      });
    } else {
      return res.status(200).json({
        message: "Partial payment received, awaiting remaining payments",
        splitpay_status: 1,
      });
    }
  } catch (error) {
    console.error("Error processing the order:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
  const paymentSplitOrder123 = async (req, res) => {
        const { sub_order_ids, paidAmount, payment_method_id, discount } = req.body;

        if (!Array.isArray(sub_order_ids) || sub_order_ids.length === 0 ||
        
            !Array.isArray(payment_method_id) ) {
            return res.status(400).json({ message: 'Invalid input data' });
        }

        try {
            // Update discount and status for all `sub_order_ids`
            await Promise.all(sub_order_ids.map(sub_id => 
                db.pool.promise().query('UPDATE sub_order SET discount = ?, status = 1 WHERE sub_id = ?', [discount, sub_id])
            ));

            // // Set `invoiceprint` to 2 for all `sub_order_ids`
            // await Promise.all(sub_order_ids.map(sub_id => 
            //     db.pool.promise().query('UPDATE sub_order SET invoiceprint = 2 WHERE sub_id = ?', [sub_id])
            // ));

            // Fetch all sub_order details
            const subOrderDetails = await Promise.all(sub_order_ids.map(sub_id =>
                db.pool.promise().query('SELECT * FROM sub_order WHERE sub_id = ?', [sub_id])
            ));

            if (subOrderDetails.some(([rows]) => rows.length === 0)) {
                return res.status(404).json({ message: 'One or more sub-orders not found' });
            }

            const order_id = subOrderDetails[0][0][0].order_id; 
            console.log("suborderdetail",subOrderDetails[0][0][0].order_id  )
            console.log(subOrderDetails,"sunorferdertaill")
            const menu_ids = subOrderDetails.map(([rows]) => rows[0].order_menu_id);
        console.log("menu",menu_ids)

            // Update food status for all `menu_id`s related to the provided `sub_order_ids`
            await db.pool.promise().query(
                'UPDATE order_menu SET food_status = 1 WHERE order_id = ? AND menu_id IN (?)',
                [order_id, menu_ids]
            );
    console.log("order",order_id)
            // Fetch bill details
            const [billInfo] = await db.pool.promise().query('SELECT * FROM bill WHERE order_id = ?', [order_id]);
            if (!billInfo.length) {
                return res.status(404).json({ message: 'Bill not found' });
            }

            const bill_id = billInfo[0].bill_id;

            // // Process multiple payments
            // let totalPaidAmount = 0;
            // await Promise.all(paidAmount.map(async (amount, index) => {
            //     totalPaidAmount += parseFloat(amount);
                await db.pool.promise().query(
                    'INSERT INTO multipay_bill (order_id, multipayid, payment_type_id, amount) VALUES (?, ?, ?, ?)', 
                    [order_id, bill_id, payment_method_id[0], paidAmount]
                );
            // }));

            await db.pool.promise().query('UPDATE customer_order SET splitpay_status = 1, invoiceprint = 2 WHERE order_id = ?', [order_id]);

            // Check if all sub-orders are completed
            const [totalOrder] = await db.pool.promise().query('SELECT COUNT(*)AS total FROM sub_order WHERE status = 0 AND order_id = ?', [order_id]);

            if (totalOrder[0].total === 0) {
                const [totalDiscount] = await db.pool.promise().query('SELECT SUM(discount)AS totaldiscount FROM sub_order WHERE order_id = ?', [order_id]);
                const [billDetails] = await db.pool.promise().query('SELECT bill_amount FROM bill WHERE order_id = ?', [order_id]);
                const [orderResult] = await db.pool.promise().query('SELECT * FROM customer_order WHERE order_id = ?', [order_id]);
      console.log("oprder",orderResult[0].table_no)
      console.log("oprder split",orderResult[0].splitpay_status)
                if (orderResult.length && orderResult[0].table_no !== 0) {
                  const table_no = orderResult[0].table_no;
                  await db.pool.promise().query('UPDATE rest_table SET status = 0, occupied_seats = 0 WHERE tableid = ?', [table_no]);
                }

                await db.pool.promise().query('UPDATE customer_order SET order_status = 4 WHERE order_id = ?', [order_id]);

                const updatedBill = {
                    bill_status: 1,
                    discount: totalDiscount[0].totaldiscount || 0,
                    bill_amount: billDetails[0].bill_amount,
                    payment_method_id: payment_method_id[0],
                    create_at: new Date(),
                };

                await db.pool.promise().query('UPDATE bill SET ? WHERE order_id = ?', [updatedBill, order_id]);
                await db.pool.promise().query('DELETE FROM table_details WHERE order_id = ?', [order_id]);
       

                const [finalBill] = await db.pool.promise().query('SELECT * FROM bill WHERE order_id = ?', [order_id]);

                return res.status(200).json({
                    message: 'Order processed successfully',
                    finalBillAmount: finalBill[0].bill_amount,
                    splitpay_status:orderResult[0].splitpay_status,
                });
            } else {
                return res.status(200).json({ message: 'Partial payment received, awaiting remaining payments',  splitpay_status:1});
            }
        } catch (error) {
            console.error('Error processing the order:', error);
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    };
  module.exports={
    showsplitorder,
    mergeMakePayment,
    paymentSplitOrder
  }