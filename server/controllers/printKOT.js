const db = require("../utils/db");

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

const getPendingKOT = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    if (!kitchenId) {
      return res.status(400).json({
        success: false,
        message: "Kitchen ID required",
      });
    }

    const kotItems = await runQuery(
      `
      SELECT 
        k.kot_id,
        k.order_id,
        k.item_name,
        k.qty,

        co.table_no,
        co.order_time,
        co.created_by,
        co.waiter_id,

        creator.firstname AS created_by_firstname,
        creator.lastname AS created_by_lastname,

        waiter.firstname AS waiter_firstname,
        waiter.lastname AS waiter_lastname

      FROM kot_items k

      JOIN customer_order co 
      ON k.order_id = co.order_id

      LEFT JOIN user creator 
      ON co.created_by = creator.id

      LEFT JOIN user waiter 
      ON co.waiter_id = waiter.id

      WHERE k.kitchen_id = ?
      AND (k.printed = 0 OR k.printed = '0')

      ORDER BY k.order_id ASC
      `,
      [kitchenId],
    );

    if (kotItems.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // 🔹 Group orders
    const grouped = {};

    kotItems.forEach((item) => {
      if (!grouped[item.order_id]) {
        grouped[item.order_id] = {
          order_id: item.order_id,
          table_no: item.table_no,
          order_time: item.order_time,

          created_by:
            `${item.created_by_firstname || ""} ${item.created_by_lastname || ""}`.trim(),

          waiter:
            `${item.waiter_firstname || ""} ${item.waiter_lastname || ""}`.trim(),

          items: [],
        };
      }

      grouped[item.order_id].items.push({
        name: item.item_name,
        qty: item.qty,
      });
    });

    return res.json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error) {
    console.error("❌ Pending KOT Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markKOTPrinted = async (req, res) => {
  try {
    const { kitchenId } = req.body;

    if (!kitchenId) {
      return res.status(400).json({
        success: false,
        message: "Kitchen ID required",
      });
    }

    await runQuery(
      `
      UPDATE kot_items
      SET printed = 1
      WHERE kitchen_id = ?
     AND (printed = 0 OR printed = '0')
      `,
      [kitchenId],
    );

    return res.json({
      success: true,
      message: "KOT marked as printed",
    });
  } catch (error) {
    console.error("❌ Mark Printed Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getPrinterByKitchen = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    const result = await runQuery(
      `
      SELECT printer_type, printer_path, port
      FROM printer_list
      WHERE kitchen_id = ?
      LIMIT 1
      `,
      [kitchenId],
    );

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "No printer configured for this kitchen",
      });
    }

    return res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getKitchenKotList = async (req, res) => {
  try {
    console.log("hello");

    // ✅ CHECK DATABASE NAME
    db.pool.query("SELECT DATABASE() AS dbname", (err, dbResult) => {
      if (err) {
        console.log("DB NAME ERROR:", err);
      } else {
        console.log("✅ Connected DB:", dbResult[0].dbname);
      }
    });

    // ✅ CHECK TOTAL ROWS
    db.pool.query(
      "SELECT COUNT(*) AS total FROM kot_items",
      (err, totalRows) => {
        if (!err) {
          console.log("✅ Total kot_items:", totalRows[0].total);
        }
      },
    );

    // ✅ CHECK PRINTED = 0 ROWS
    db.pool.query(
      "SELECT COUNT(*) AS pending FROM kot_items WHERE printed = 0",
      (err, pendingRows) => {
        if (!err) {
          console.log("✅ Pending printed=0:", pendingRows[0].pending);
        }
      },
    );

    // ✅ ORIGINAL QUERY
    const query = `
  SELECT DISTINCT kitchen_id
  FROM kot_items
  WHERE printed = 0 OR printed = '0'
`;

    db.pool.query(query, (err, result) => {
      if (err) {
        console.log("❌ SQL Error:", err);
        return res.status(500).json({ success: false });
      }

      console.log("✅ Pending Kitchens Result:", result);
      console.log("========== KOT DEBUG END ==========");

      res.json({
        success: true,
        data: result,
      });
    });
  } catch (e) {
    console.log("❌ API Error:", e);
    res.status(500).json({ success: false });
  }
};

const getKitchenList = async (req, res) => {
  try {
    const query = `
      SELECT 
        k.kot_id, 
        k.order_id,
        k.kitchen_id,
        k.item_name,
        k.qty,
        k.status AS kitchen_status,
        k.accept_time,
        k.ready_time,
        co.table_no,
        rt.tablename,
        co.order_time,
        co.tokenno
      FROM kot_items k
      JOIN customer_order co ON k.order_id = co.order_id
      LEFT JOIN rest_table rt ON co.table_no = rt.tableid
      WHERE 
        k.printed = 1
        AND k.status NOT IN ('completed','rejected')
        AND k.status <> ''
      ORDER BY co.order_time DESC
    `;

    db.pool.query(query, (err, results) => {
      if (err) {
        console.error("❌ MySQL error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      const grouped = {};

      results.forEach((row) => {
        const key = `${row.order_id}_${row.kitchen_id}`;

        if (!grouped[key]) {
          grouped[key] = {
            order_id: row.order_id,
            kitchen_id: row.kitchen_id,
            table_no: row.table_no,
            table_name: row.tablename,
            tokenno: row.tokenno,
            items: [],
          };
        }

        grouped[key].items.push({
          id: row.kot_id,
          name: row.item_name,
          qty: row.qty,
          status: row.kitchen_status,
          accept_time: row.accept_time,
          ready_time: row.ready_time,
        });
      });

      res.json({
        success: true,
        data: Object.values(grouped),
      });
    });
  } catch (error) {
    console.error("❌ getKitchenKotList error:", error);
    res.status(500).json({ success: false });
  }
};

const getKitchenKotHistory = async (req, res) => {
  try {
    const query = `
      SELECT 
        k.kot_id,
        k.order_id,
        k.kitchen_id,
        k.item_name,
        k.qty,
        k.status AS item_status,
        k.accept_time,
        k.ready_time,
        k.reject_reason,
        co.table_no,
        rt.tablename,
        co.order_time,
        co.tokenno
      FROM kot_items k
      JOIN customer_order co ON k.order_id = co.order_id
      LEFT JOIN rest_table rt ON co.table_no = rt.tableid
      WHERE k.printed = 1
      ORDER BY co.order_time DESC
    `;

    db.pool.query(query, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }

      const grouped = {};

      result.forEach((row) => {
        const key = `${row.order_id}_${row.kitchen_id}`;

        if (!grouped[key]) {
          grouped[key] = {
            order_id: row.order_id,
            kitchen_id: row.kitchen_id,
            table_no: row.table_no,
            table_name: row.tablename,
            tokenno: row.tokenno,
            order_time: row.order_time,
            items: [],
          };
        }

        grouped[key].items.push({
          id: row.kot_id,
          name: row.item_name,
          qty: row.qty,
          status: row.item_status,
          accept_time: row.accept_time,
          ready_time: row.ready_time,
          reject_reason: row.reject_reason,
        });
      });

      res.json({
        success: true,
        data: Object.values(grouped),
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};

const acceptKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, item_ids } = req.body;

    if (!order_id || !kitchen_id || !item_ids?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    const placeholders = item_ids.map(() => "?").join(",");

    await new Promise((resolve, reject) => {
      db.pool.query(
        `
        UPDATE kot_items
        SET status = 'accepted',
            accept_time = NOW()
        WHERE order_id = ?
          AND kitchen_id = ?
          AND kot_id IN (${placeholders})
        `,
        [order_id, kitchen_id, ...item_ids],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    res.json({ success: true, message: "Selected items accepted" });
  } catch (err) {
    console.error("❌ ACCEPT ERROR:", err);
    res.status(500).json({ message: "Internal error" });
  }
};

const completeKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, item_ids } = req.body;

    if (!order_id || !kitchen_id || !item_ids?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    const placeholders = item_ids.map(() => "?").join(",");

    await new Promise((resolve, reject) => {
      db.pool.query(
        `
        UPDATE kot_items
        SET status = 'completed',
            ready_time = NOW()
        WHERE order_id = ?
          AND kitchen_id = ?
          AND kot_id IN (${placeholders})
        `,
        [order_id, kitchen_id, ...item_ids],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // Check if order fully completed
    const pending = await new Promise((resolve, reject) => {
      db.pool.query(
        `
        SELECT COUNT(*) AS pending 
        FROM kot_items 
        WHERE order_id = ? 
          AND status != 'completed'
        `,
        [order_id],
        (err, rows) => (err ? reject(err) : resolve(rows[0].pending)),
      );
    });

    if (pending === 0) {
      await new Promise((resolve, reject) => {
        db.pool.query(
          `UPDATE customer_order SET status = 'completed' WHERE order_id = ?`,
          [order_id],
          (err) => (err ? reject(err) : resolve()),
        );
      });
    }

    res.json({
      success: true,
      message: pending === 0 ? "Order fully completed" : "Partial completed",
    });
  } catch (err) {
    console.error("❌ COMPLETE ERROR:", err);
    res.status(500).json({ message: "Internal error" });
  }
};

const rejectKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, reason } = req.body;

    if (!order_id || !kitchen_id || !reason) {
      return res.status(400).json({ message: "Missing required data" });
    }

    // kot_items -> REJECTED
    await new Promise((resolve, reject) => {
      db.pool.query(
        `
        UPDATE kot_items
        SET status = 'rejected',
            reject_reason = ?
        WHERE order_id = ? AND kitchen_id = ?
        `,
        [reason, order_id, kitchen_id],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // customer_order -> REJECTED
    await new Promise((resolve, reject) => {
      db.pool.query(
        `
        UPDATE customer_order
        SET status = 'rejected'
        WHERE order_id = ?
        `,
        [order_id],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    return res.json({
      success: true,
      message: "Order rejected by kitchen",
    });
  } catch (err) {
    console.error("❌ REJECT ERROR:", err);
    res.status(500).json({ message: "Internal error" });
  }
};
module.exports = {
  //printOrderToKitchens,
  getPendingKOT,
  markKOTPrinted,
  getPrinterByKitchen,
  getKitchenKotList,
  getKitchenList,
  acceptKitchenOrder,
  rejectKitchenOrder,
  completeKitchenOrder,
  getKitchenKotHistory,
};
