const db = require("../utils/db");

const createPrinter = (req, res) => {
  const { printer_name, printer_type, printer_path, kitchen_id, port, capability_profile, character_per_line } =
    req.body;
  const user_id = req.id;

  // 🔹 1. BASIC VALIDATION
  if (!printer_name || !printer_type || !printer_path || !kitchen_id) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // 🔹 2. ALLOW ONLY VALID TYPES
  const allowedTypes = ["windows", "network"];
  if (!allowedTypes.includes(printer_type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid printer type. Use windows or network only",
    });
  }

  // 🔹 3. TYPE-SPECIFIC VALIDATION
  if (printer_type === "network") {
    const ipRegex =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

    if (!ipRegex.test(printer_path)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IP address format",
      });
    }

    if (port && (isNaN(port) || port <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid port number",
      });
    }
  }

  if (printer_type === "windows") {
    if (printer_path.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid printer name",
      });
    }
  }

  // 🔹 4. CHECK SUBSCRIPTION (SAME LOGIC AS BEFORE)
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      // user has subscription
      insertPrinter(user_id);
    } else {
      // check creator
      const checkUserCreatedByQuery =
        "SELECT created_by FROM user WHERE id = ?";

      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (!data.length || !data[0].created_by) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to create printers.",
          });
        }

        const created_by = data[0].created_by;

        db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);

          if (results.length > 0) {
            insertPrinter(created_by);
          } else {
            return res.status(403).json({
              success: false,
              message: "Creator does not have an active subscription.",
            });
          }
        });
      });
    }
  });

  // 🔹 5. COMMON INSERT LOGIC + DUPLICATE KITCHEN CHECK
  function insertPrinter(created_by) {
    db.pool.query(
      "SELECT id FROM printer_list WHERE kitchen_id = ?",
      [kitchen_id],
      (err, existing) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ success: false });
        }

        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            message: "This kitchen already has a printer assigned",
          });
        }

        const insertQuery = `
          INSERT INTO printer_list
          (printer_name, printer_type, printer_path, port, kitchen_id, created_by, capability_profile, character_per_line)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.pool.query(
          insertQuery,
          [
            printer_name,
            printer_type,
            printer_path,
            port || 9100,
            kitchen_id,
            created_by,
            capability_profile || 'Default',
            character_per_line || 32,
          ],
          (err, result) => {
            if (err) {
              console.error("Error inserting printer:", err);
              return res.status(500).json({
                success: false,
                message: "Database error",
              });
            }

            return res.status(200).json({
              success: true,
              message: "Printer added successfully",
              id: result.insertId,
            });
          },
        );
      },
    );
  }
};

const getPrinters = (req, res) => {
  const id = req.id;
  const { searchItem } = req.query;

  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

  db.pool.query(checkUserQuery, [id], (err, userData) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (!userData.length) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isAdmin = userData[0].is_admin === 1;
    const ownerId = isAdmin ? id : userData[0].created_by;

    if (!ownerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view printers",
      });
    }

    let sql = `
      SELECT 
        pl.id,
        pl.printer_name,
        pl.printer_type,
        pl.printer_path,
        pl.kitchen_id,
        pl.created_by,
        pl.created_at,
        k.kitchen_name
      FROM printer_list pl
      LEFT JOIN kitchens k ON pl.kitchen_id = k.id
      WHERE pl.created_by = ?
    `;

    const params = [ownerId];

    if (searchItem && searchItem.trim()) {
      const search = `%${searchItem.trim()}%`;
      sql += `
        AND (
          pl.printer_name LIKE ? OR
          pl.printer_type LIKE ? OR
          pl.printer_path LIKE ? OR
          k.kitchen_name LIKE ?
        )
      `;
      params.push(search, search, search, search);
    }

    sql += " ORDER BY pl.id DESC";

    db.pool.query(sql, params, (err, results) => {
      if (err) {
        console.error("❌ Error fetching printers:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      res.status(200).json({
        success: true,
        data: results || [],
        message: "Printers fetched successfully",
      });
    });
  });
};

const getPrinterById = (req, res) => {
  const printerId = req.params.id;
  const userId = req.id;

  if (isNaN(printerId)) {
    return res.status(400).json({ message: "Invalid printer ID" });
  }

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "SELECT * FROM printer_list WHERE id = ? AND created_by = ?";
    db.pool.query(query, [printerId, creatorId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Printer not found" });
      }
      return res.status(200).json({ printer: results[0] });
    });
  });
};

const updatePrinter = (req, res) => {
  const printerId = req.params.id;
  const { printer_name, printer_type, printer_path, kitchen_id } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const ownerCheckQuery = "SELECT id FROM printer_list WHERE id = ? AND created_by = ?";
    db.pool.query(ownerCheckQuery, [printerId, creatorId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (!rows.length) return res.status(404).json({ success: false, message: "Printer not found" });

      const query = `UPDATE printer_list SET printer_name = ?, printer_type = ?, printer_path = ?, kitchen_id = ? WHERE id = ?`;
      db.pool.query(query, [printer_name, printer_type, printer_path, kitchen_id, printerId], (err, result) => {
        if (err) {
          console.error("Error updating printer:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }
        res.status(200).json({ success: true, message: "Printer updated successfully" });
      });
    });
  });
};

const deletePrinter = (req, res) => {
  const printerId = req.params.id;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const query = "DELETE FROM printer_list WHERE id = ? AND created_by = ?";
    db.pool.query(query, [printerId, creatorId], (err, result) => {
      if (err) {
        console.error("Error deleting printer:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Printer not found" });
      }
      res.status(200).json({ success: true, message: "Printer deleted successfully" });
    });
  });
};

module.exports = {
  createPrinter,
  getPrinters,
  deletePrinter,
  getPrinterById,
  updatePrinter,
};
