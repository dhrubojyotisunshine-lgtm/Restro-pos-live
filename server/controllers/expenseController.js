const db = require("../utils/db");
const dbQuery = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.pool.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

const getExpenseIten = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;

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

      let getExpenseQuery;
      let queryParams = [];

      if (isAdmin === 1) {
        // Admin: fetch own expense items
        if (!searchItem || searchItem.trim() === "") {
          getExpenseQuery = `
            SELECT * FROM expense_item
            WHERE created_by = ?
        ORDER BY id DESC
 
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getExpenseQuery = `
            SELECT * FROM expense_item
            WHERE created_by = ?
            AND expense_item_name LIKE ?
            ORDER BY id DESC
          `;
          queryParams = [id, searchQuery];
        }
      } else {
        // Non-admin: fetch items created by their creator
        if (!created_by) {
          return res
            .status(403)
            .json({
              success: false,
              message: "You are not authorized to view expense items.",
            });
        }

        if (!searchItem || searchItem.trim() === "") {
          getExpenseQuery = `
            SELECT * FROM expense_item
            WHERE created_by = ?
            ORDER BY id DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getExpenseQuery = `
            SELECT * FROM expense_item
            WHERE created_by = ?
            AND expense_item_name LIKE ?
            ORDER BY id DESC
          `;
          queryParams = [created_by, searchQuery];
        }
      }

      db.pool.query(getExpenseQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching expense items:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching expense items",
            error: err,
          });
        }

        if (!result || result.length === 0) {
          return res.status(200).json({
            success: true,
            data: [],
            message: "No expense items found",
          });
        }

        res.status(200).json({
          success: true,
          data: result,
          message: "Expense items fetched successfully",
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

const postExpenseIten = (req, res) => {
  const { expense_item_name } = req.body;
  const user_id = req.id;

  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery =
    "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });

    if (results.length > 0) {
      // User has a subscription
      const created_by = results[0].user_id;

      const insertQuery =
        "INSERT INTO expense_item (expense_item_name, created_by) VALUES (?, ?)";
      db.pool.query(
        insertQuery,
        [expense_item_name, created_by],
        (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Insert error", error: err });

          return res
            .status(201)
            .json({
              message: "Expense item inserted successfully (via subscription)",
            });
        },
      );
    } else {
      // Step 2: Check who created this user
      const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkCreatedByQuery, [user_id], (err, data) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Database error", error: err });

        if (data.length === 0 || !data[0].created_by) {
          return res
            .status(403)
            .json({
              message: "You are not authorized to create expense items.",
            });
        }

        const created_by = data[0].created_by;

        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery =
          "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(
          checkCreatorSubscriptionQuery,
          [created_by],
          (err, results) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Database error", error: err });

            if (results.length > 0) {
              const insertQuery =
                "INSERT INTO expense_item (expense_item_name, created_by) VALUES (?, ?)";
              db.pool.query(
                insertQuery,
                [expense_item_name, created_by],
                (err, result) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ message: "Insert error", error: err });

                  return res
                    .status(201)
                    .json({
                      message:
                        "Expense item inserted successfully (via creator)",
                    });
                },
              );
            } else {
              return res
                .status(403)
                .json({
                  message: "Creator does not have an active subscription.",
                });
            }
          },
        );
      });
    }
  });
};

const deleteExpenseItem = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM expense_item WHERE id = ?`;
    await dbQuery(sql, [id]);
    res.status(200).json({ message: "Successfully Deleted" });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ message: "An error occurred" });
  }
};
const getExpenseItemById = async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `SELECT * FROM expense_item WHERE id = ?`;
    const result = await dbQuery(sql, [id]);

    if (result.length > 0) {
      res.status(200).json({ data: result[0] });
    } else {
      res.status(404).json({ message: "Expense item not found" });
    }
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ message: "An error occurred" });
  }
};

const updateExpenseItem = async (req, res) => {
  const { id } = req.params;
  const { expense_item_name, created_by } = req.body;

  const sql = `UPDATE expense_item SET expense_item_name = ?,created_by=? WHERE id = ?`;
  const result = await dbQuery(sql, [expense_item_name, created_by, id]);

  if (result.affectedRows > 0) {
    res.status(200).json({ message: "Expense item updated successfully" });
  } else {
    res
      .status(404)
      .json({ message: "Expense item not found or no changes made" });
  }
};

// add expense page

const getExpenses = async (req, res) => {
  try {
    const id = req.id; // From auth middleware
    const { seachItem } = req.query;

    // Step 1: Get user role and creator
    const [user] = await dbQuery(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [id],
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isAdmin = user.is_admin;
    const created_by = user.created_by;

    // Step 2: Construct base SQL and params
    let sql = `
      SELECT e.*, ei.expense_item_name, e.amount, e.date
      FROM expense e
      LEFT JOIN expense_item ei ON ei.id = e.type
    `;

    let whereClauses = [];
    let params = [];

    // Step 3: Determine creator filter based on role
    if (isAdmin === 1) {
      whereClauses.push("e.created_by = ?");
      params.push(id);
    } else {
      if (!created_by) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You are not authorized to view expenses.",
          });
      }
      whereClauses.push("e.created_by = ?");
      params.push(created_by);
    }

    // Step 4: Add search filters
    if (seachItem && seachItem.trim() !== "") {
      whereClauses.push(
        `(ei.expense_item_name LIKE ? OR e.amount LIKE ? OR e.date LIKE ?)`,
      );
      params.push(`%${seachItem}%`, `%${seachItem}%`, `%${seachItem}%`);
    }

    // Step 5: Finalize query
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    sql += ` ORDER BY e.id DESC`;

    // Step 6: Run query
    const results = await dbQuery(sql, params);
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while fetching the expenses",
      });
  }
};

const createExpense = async (req, res) => {
  const { VDate, type, paytype, amount, bankid } = req.body;
  const voucher_no = new Date().toISOString().replace(/[-T:.Z]/g, "");
  const user_id = req.id;
  const createdate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const Vtype = "Expense";

  try {
    // Step 1: Check if user has a subscription
    const [subscription] = await dbQuery(
      "SELECT * FROM superadmin_user_plans WHERE user_id = ?",
      [user_id],
    );

    let created_by = user_id;

    if (!subscription) {
      // Step 2: Check if user was created by someone
      const [userData] = await dbQuery(
        "SELECT created_by FROM user WHERE id = ?",
        [user_id],
      );

      if (!userData || !userData.created_by) {
        return res
          .status(403)
          .json({ message: "You are not authorized to create expense." });
      }

      created_by = userData.created_by;

      // Step 3: Check if the creator has a subscription
      const [creatorSubscription] = await dbQuery(
        "SELECT * FROM superadmin_user_plans WHERE user_id = ?",
        [created_by],
      );

      if (!creatorSubscription) {
        return res
          .status(403)
          .json({ message: "Creator does not have an active subscription." });
      }
    }

    // Insert into expense including created_by
    const sql = `
      INSERT INTO expense (date, type, voucher_no, amount, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await dbQuery(sql, [
      VDate,
      type,
      voucher_no,
      amount,
      created_by,
    ]);

    if (paytype === 1) {
      // Insert into acc_transaction (cash in hand)
      const cashInHandQuery = `
        INSERT INTO acc_transaction (VNo, Vtype, VDate, COAID, Narration, Debit, Credit, IsPosted, CreateBy, CreateDate, IsAppove)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const cashInHandParams = [
        voucher_no,
        Vtype,
        VDate,
        "1020101",
        `${type} Expense ${voucher_no}`,
        0,
        amount,
        1,
        created_by,
        createdate,
        1,
      ];
      await dbQuery(cashInHandQuery, cashInHandParams);
    } else {
      // Insert into bank_summary
      const bankSummaryQuery = `
        INSERT INTO bank_summary (date, ac_type, bank_id, description, deposite_id, dr, cr, ammount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const bankSummaryParams = [
        VDate,
        "Credit (-)",
        bankid,
        `${type} Expense`,
        voucher_no,
        null,
        amount,
        amount,
        1,
      ];
      await dbQuery(bankSummaryQuery, bankSummaryParams);
    }

    res
      .status(201)
      .json({
        success: true,
        message: "Expense created successfully",
        data: result,
      });
  } catch (err) {
    console.error("Error creating expense:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while creating the expense",
      });
  }
};
const deleteExpense = async (req, res) => {
  const voucher_no = req.params.id;

  // SQL query to delete an expense
  const sql = `
    DELETE FROM expense WHERE voucher_no = ?
  `;

  try {
    // Execute the delete query
    const result = await dbQuery(sql, [voucher_no]);

    if (result.affectedRows === 0) {
      // If no rows were affected, the voucher_no might not exist
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    // Optionally, you can also delete related transactions from acc_transaction and bank_summary
    await dbQuery(`DELETE FROM acc_transaction WHERE VNo = ?`, [voucher_no]);
    await dbQuery(`DELETE FROM bank_summary WHERE deposite_id = ?`, [
      voucher_no,
    ]);

    res
      .status(200)
      .json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while deleting the expense",
      });
  }
};
module.exports = {
  getExpenseIten,
  postExpenseIten,
  deleteExpenseItem,
  getExpenseItemById,
  updateExpenseItem,
  getExpenses,
  createExpense,
  deleteExpense,
};
