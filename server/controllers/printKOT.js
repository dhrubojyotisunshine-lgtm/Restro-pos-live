const db = require("../utils/db");
const net = require("net");

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Resolves the authoritative creator ID for the calling user.
// Admins own their own data (creatorId = req.id).
// Sub-users share their admin's data (creatorId = user.created_by).
const resolveCreatorId = async (userId) => {
  const rows = await runQuery(
    "SELECT is_admin, created_by FROM user WHERE id = ?",
    [userId],
  );
  if (!rows.length) return null;
  const { is_admin, created_by } = rows[0];
  return is_admin === 1 ? userId : created_by;
};

// Confirms the requesting user owns the given kitchenId.
const verifyKitchenOwnership = async (kitchenId, creatorId) => {
  const rows = await runQuery(
    "SELECT id FROM kitchens WHERE id = ? AND created_by = ?",
    [kitchenId, creatorId],
  );
  return rows.length > 0;
};

// ─── getPendingKOT ────────────────────────────────────────────────────────────
// Issue: No ownership check — any caller could read any kitchen's pending orders
//        by supplying an arbitrary kitchenId.
// Fix:   Verify the caller owns the requested kitchenId via kitchens.created_by.
const getPendingKOT = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    if (!kitchenId) {
      return res.status(400).json({ success: false, message: "Kitchen ID required" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchenId, creatorId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const kotItems = await runQuery(
      `
      SELECT
        k.kot_id,
        k.order_id,
        k.item_name,
        k.qty,

        co.table_no,
        co.saleinvoice,
        co.order_time,
        co.created_by,
        co.waiter_id,

        creator.firstname AS created_by_firstname,
        creator.lastname  AS created_by_lastname,

        waiter.firstname AS waiter_firstname,
        waiter.lastname  AS waiter_lastname

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
      return res.json({ success: true, data: [] });
    }

    const grouped = {};

    kotItems.forEach((item) => {
      if (!grouped[item.order_id]) {
        grouped[item.order_id] = {
          order_id: item.order_id,
          saleinvoice: item.saleinvoice,
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

    return res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    console.error("❌ Pending KOT Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── markKOTPrinted ───────────────────────────────────────────────────────────
// Issue: No ownership check — any caller could mark any kitchen's KOT as printed.
// Fix:   Verify the caller owns kitchenId before executing the UPDATE.
const markKOTPrinted = async (req, res) => {
  try {
    const { kitchenId } = req.body;

    if (!kitchenId) {
      return res.status(400).json({ success: false, message: "Kitchen ID required" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchenId, creatorId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await runQuery(
      "UPDATE kot_items SET printed = 1 WHERE kitchen_id = ? AND (printed = 0 OR printed = '0')",
      [kitchenId],
    );

    return res.json({ success: true, message: "KOT marked as printed" });
  } catch (error) {
    console.error("❌ Mark Printed Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── getPrinterByKitchen ──────────────────────────────────────────────────────
// Issue: No ownership check — any caller could read printer config for any kitchen.
// Fix:   Verify the caller owns kitchenId before returning printer data.
const getPrinterByKitchen = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchenId, creatorId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await runQuery(
      "SELECT printer_type, printer_path, port FROM printer_list WHERE kitchen_id = ? LIMIT 1",
      [kitchenId],
    );

    if (!result.length) {
      return res.status(404).json({ success: false, message: "No printer configured for this kitchen" });
    }

    return res.json({ success: true, data: result[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── getKitchenKotList ────────────────────────────────────────────────────────
// Issue: No tenant filter — returned all kitchen_ids with pending KOT across
//        every admin. Also contained leftover debug queries and console.logs.
// Fix:   Join kitchens table, filter by kc.created_by = creatorId.
//        Debug code removed.
const getKitchenKotList = async (req, res) => {
  try {
    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    const result = await runQuery(
      `SELECT DISTINCT k.kitchen_id
       FROM kot_items k
       JOIN kitchens kc ON k.kitchen_id = kc.id
       WHERE (k.printed = 0 OR k.printed = '0')
         AND kc.created_by = ?`,
      [creatorId],
    );

    res.json({ success: true, data: result });
  } catch (e) {
    console.error("❌ API Error:", e);
    res.status(500).json({ success: false });
  }
};

// ─── getKitchenList ───────────────────────────────────────────────────────────
// Issue: No tenant filter — returned every admin's active KOT items in one query.
// Fix:   Join kitchens table, filter by kc.created_by = creatorId.
const getKitchenList = async (req, res) => {
  try {
    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    const results = await runQuery(
      `SELECT
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
        co.tokenno,
        co.saleinvoice
      FROM kot_items k
      JOIN customer_order co ON k.order_id = co.order_id
      LEFT JOIN rest_table rt ON co.table_no = rt.tableid
      JOIN kitchens kc ON k.kitchen_id = kc.id
      WHERE k.status NOT IN ('completed','rejected')
        AND kc.created_by = ?
      ORDER BY co.order_time DESC`,
      [creatorId],
    );

    const grouped = {};

    results.forEach((row) => {
      const key = `${row.order_id}_${row.kitchen_id}`;

      if (!grouped[key]) {
        grouped[key] = {
          order_id: row.order_id,
          saleinvoice: row.saleinvoice,
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

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    console.error("❌ getKitchenList error:", error);
    res.status(500).json({ success: false });
  }
};

// ─── getKitchenKotHistory ─────────────────────────────────────────────────────
// Issue: No tenant filter — returned the complete KOT history across all admins.
// Fix:   Join kitchens table, filter by kc.created_by = creatorId.
const getKitchenKotHistory = async (req, res) => {
  try {
    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    const result = await runQuery(
      `SELECT
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
        co.saleinvoice,
        rt.tablename,
        co.order_time,
        co.tokenno
      FROM kot_items k
      JOIN customer_order co ON k.order_id = co.order_id
      LEFT JOIN rest_table rt ON co.table_no = rt.tableid
      JOIN kitchens kc ON k.kitchen_id = kc.id
      WHERE kc.created_by = ?
        AND DATE(co.order_time) = CURDATE()
      ORDER BY co.order_time DESC`,
      [creatorId],
    );

    const grouped = {};

    result.forEach((row) => {
      const key = `${row.order_id}_${row.kitchen_id}`;

      if (!grouped[key]) {
        grouped[key] = {
          order_id: row.order_id,
          saleinvoice: row.saleinvoice,
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

    res.json({ success: true, data: Object.values(grouped) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};

// ─── acceptKitchenOrder ───────────────────────────────────────────────────────
// Issue: No ownership check — any caller could accept any admin's KOT items,
//        including triggering status changes visible to another admin's kitchen.
// Fix:   Verify the caller owns kitchen_id before executing the UPDATE.
const acceptKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, item_ids } = req.body;

    if (!order_id || !kitchen_id || !item_ids?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchen_id, creatorId))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const placeholders = item_ids.map(() => "?").join(",");

    await runQuery(
      `UPDATE kot_items
       SET status = 'accepted', accept_time = NOW()
       WHERE order_id = ? AND kitchen_id = ? AND kot_id IN (${placeholders})`,
      [order_id, kitchen_id, ...item_ids],
    );

    res.json({ success: true, message: "Selected items accepted" });
  } catch (err) {
    console.error("❌ ACCEPT ERROR:", err);
    res.status(500).json({ message: "Internal error" });
  }
};

// ─── completeKitchenOrder ─────────────────────────────────────────────────────
// Issue: No ownership check — any caller could complete any admin's order,
//        including triggering customer_order status change to 'completed'.
// Fix:   Verify the caller owns kitchen_id before any UPDATE.
const completeKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, item_ids } = req.body;

    if (!order_id || !kitchen_id || !item_ids?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchen_id, creatorId))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const placeholders = item_ids.map(() => "?").join(",");

    await runQuery(
      `UPDATE kot_items
       SET status = 'completed', ready_time = NOW()
       WHERE order_id = ? AND kitchen_id = ? AND kot_id IN (${placeholders})`,
      [order_id, kitchen_id, ...item_ids],
    );

    const pendingRows = await runQuery(
      "SELECT COUNT(*) AS pending FROM kot_items WHERE order_id = ? AND status != 'completed'",
      [order_id],
    );
    const pending = pendingRows[0].pending;

    if (pending === 0) {
      await runQuery(
        "UPDATE customer_order SET status = 'completed' WHERE order_id = ?",
        [order_id],
      );
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

// ─── rejectKitchenOrder ───────────────────────────────────────────────────────
// Issue: No ownership check — any caller could reject any admin's order
//        (including writing a reject_reason into another admin's data).
// Fix:   Verify the caller owns kitchen_id before any UPDATE.
const rejectKitchenOrder = async (req, res) => {
  try {
    const { order_id, kitchen_id, reason } = req.body;

    if (!order_id || !kitchen_id || !reason) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchen_id, creatorId))) {
      return res.status(403).json({ message: "Access denied" });
    }

    await runQuery(
      "UPDATE kot_items SET status = 'rejected', reject_reason = ? WHERE order_id = ? AND kitchen_id = ?",
      [reason, order_id, kitchen_id],
    );

    await runQuery(
      "UPDATE customer_order SET status = 'rejected' WHERE order_id = ?",
      [order_id],
    );

    return res.json({ success: true, message: "Order rejected by kitchen" });
  } catch (err) {
    console.error("❌ REJECT ERROR:", err);
    res.status(500).json({ message: "Internal error" });
  }
};

function printNetwork(ip, port, text) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.setTimeout(5000);

    client.connect(port, ip, () => {
      client.write(Buffer.from(text + "\n\n\n", "ascii"));
      client.end();
      resolve(true);
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Network printer at ${ip}:${port} timed out`));
    });

    client.on("error", (err) => {
      reject(new Error(`Network printer error: ${err.message}`));
    });
  });
}

function buildRawText(orders) {
  let text = "";

  for (const orderId in orders) {
    const order = orders[orderId];

    text += "--------------------------------\n";
    text += "              KOT\n";
    text += "--------------------------------\n";
    text += `TABLE    : ${order.table_no || "-"}\n`;
    text += `ORDER #  : ${orderId}\n`;
    text += `TOKEN    : ${order.tokenno || "-"}\n`;
    text += "--------------------------------\n";
    text += "ITEM                     QTY\n";
    text += "--------------------------------\n";

    order.items.forEach((i) => {
      const name = String(i.item_name || "").substring(0, 22);
      const qty = String(i.qty || "");
      text += name.padEnd(24, " ") + qty.padStart(3, " ") + "\n";
    });

    text += "--------------------------------\n\n\n";
  }

  return text;
}

// ─── printOrderToKitchens ─────────────────────────────────────────────────────
// Issue: Had auth, but no ownership check — any authenticated admin could trigger
//        print + mark-printed on another admin's kitchenId.
// Fix:   Verify the caller owns kitchenId before fetching or mutating KOT items.
const printOrderToKitchens = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    if (!kitchenId) {
      return res.status(400).json({ success: false, message: "Kitchen ID is required" });
    }

    const creatorId = await resolveCreatorId(req.id);
    if (!creatorId) return res.status(404).json({ success: false, message: "User not found" });

    if (!(await verifyKitchenOwnership(kitchenId, creatorId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const kotItems = await runQuery(
      `
      SELECT
        k.kot_id, k.order_id, k.item_name, k.qty,
        co.table_no, co.order_time, co.tokenno
      FROM kot_items k
      JOIN customer_order co ON k.order_id = co.order_id
      WHERE k.kitchen_id = ? AND (k.printed = 0 OR k.printed = '0')
      ORDER BY k.order_id ASC
      `,
      [kitchenId],
    );

    if (!kotItems.length) {
      return res.json({ success: false, message: "No pending KOT items" });
    }

    // 🔶 TEMPORARY: kitchen visibility must not depend on printer hardware/config.
    // We still attempt to print (best-effort), but any failure here is only a
    // warning — the KOT is always marked printed so it reaches the Kitchen
    // Dashboard/Status regardless. Revisit later: split this into separate
    // "kitchen visibility" vs "print status" flags instead of overloading `printed`.
    let printWarning = null;

    const printerRows = await runQuery(
      "SELECT printer_type, printer_path, port FROM printer_list WHERE kitchen_id = ? LIMIT 1",
      [kitchenId],
    );

    if (!printerRows.length) {
      printWarning = "No printer configured for this kitchen";
    } else {
      const printer = printerRows[0];

      if (printer.printer_type !== "network") {
        printWarning = `Printer type '${printer.printer_type}' is not supported on this server. Only network (IP) printers are supported.`;
      } else if (!printer.printer_path) {
        printWarning = "Printer IP address missing";
      } else {
        const orders = {};
        kotItems.forEach((item) => {
          if (!orders[item.order_id]) {
            orders[item.order_id] = {
              table_no: item.table_no,
              tokenno: item.tokenno,
              items: [],
            };
          }
          orders[item.order_id].items.push(item);
        });

        const rawText = buildRawText(orders);

        try {
          await printNetwork(printer.printer_path, printer.port || 9100, rawText);
        } catch (err) {
          printWarning = `Printing failed: ${err.message}`;
        }
      }
    }

    if (printWarning) {
      console.warn(`⚠️ KOT print skipped/failed for kitchen ${kitchenId}: ${printWarning}`);
    }

    await runQuery(
      "UPDATE kot_items SET printed = 1 WHERE kitchen_id = ? AND (printed = 0 OR printed = '0')",
      [kitchenId],
    );

    return res.json({
      success: true,
      message: printWarning ? "KOT sent to kitchen (printing skipped)" : "KOT printed successfully",
      kitchenId,
      printed_items: kotItems.length,
      printWarning,
    });
  } catch (error) {
    console.error("❌ printOrderToKitchens error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  printOrderToKitchens,
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
