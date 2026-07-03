const db = require("../utils/db");
exports.createPlan = async (req, res) => {
    try {
        const {
            package_name,
            price_interval,
            price,
            number_of_active_users,
            interval_value,
            package_description,
            number_of_invoice,
            status,
            trial_days,
            currency,
        } = req.body;
 
        const query = `
            INSERT INTO subscription_plans
            (
                package_name,
                price_interval,
                price_with_currency,
                number_of_active_users,
                interval_value,
                package_description,
                number_of_invoice,
                status,
                trial_days,
                currency
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
 
        const values = [
            package_name,
            price_interval,
            price,
            number_of_active_users,
            interval_value,
            package_description || null,
            number_of_invoice || null,
            status || 'Active',
            trial_days || 0,
            currency
        ];
 
        const [result] = await db.pool.promise().query(query, values);
 
        res.status(201).json({
            message: 'Subscription plan created successfully',
            id: result.insertId
        });
    } catch (err) {
        console.error("Error in createPlan:", err);
        res.status(500).json({ error: err.message });
    }
};
exports.getAllPlans = async (req, res) => {
    try {
        const [rows] = await db.pool.promise().query(`SELECT * FROM subscription_plans`);
        res.status(200).json({data:rows});
    } catch (err) {
        console.error('Error in getAllPlans:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.getPlanById = async (req, res) => {
    try {
        const { id } = req.params;
 
        const [rows] = await db.pool.promise().query(
            `SELECT * FROM subscription_plans WHERE plan_id = ?`,
            [id]
        );
 
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }
 
        res.status(200).json({data:rows[0]});
    } catch (err) {
        console.error('Error in getPlanById:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
 
        const [result] = await db.pool.promise().query(
            `DELETE FROM subscription_plans WHERE plan_id = ?`,
            [id]
        );
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }
 
        res.status(200).json({ message: 'Subscription plan deleted successfully' });
    } catch (err) {
        console.error('Error in deletePlan:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.updatePlan = async (req, res) => {
    try {
        const {
            package_name,
            price_interval,
            price,
            number_of_active_users,
            interval_value,
            package_description,
            number_of_invoice,
            status,
            trial_days,
            currency,
        } = req.body;
 
        const { id } = req.params; // Plan ID from URL
 
        const query = `
            UPDATE subscription_plans SET
                package_name = ?,
                price_interval = ?,
                price_with_currency = ?,
                number_of_active_users = ?,
                interval_value = ?,
                package_description = ?,
                number_of_invoice = ?,
                status = ?,
                trial_days = ?,
                currency = ?
            WHERE plan_id = ?
        `;
 
        const values = [
            package_name,
            price_interval,
            price,
            number_of_active_users,
            interval_value,
            package_description || null,
            number_of_invoice || null,
            status || 'Active',
            trial_days || 0,
            currency,
            id
        ];
 
        const [result] = await db.pool.promise().query(query, values);
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }
 
        res.status(200).json({
            message: 'Subscription plan updated successfully',
            id: id
        });
    } catch (err) {
        console.error("Error in updatePlan:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getAllSubscriptions = (req, res) => {
    // Corrected query without the restrictive WHERE clause
    const query = `
        SELECT
            rs.restaurant_name,
            rs.status,
            rs.sl_no,
            sp.package_name,
            sup.package_status,
            sup.start_date,
            sup.trial_date,
            sup.end_date,
            sp.price_with_currency,
            sup.payment_method AS paid_via,
            sup.user_plan_id,
            IF(sp.price_with_currency = 0, 'FREE', 'PAID') AS transaction_id
        FROM superadmin_user_plans sup
        JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
        JOIN user u ON sup.user_id = u.id
        LEFT JOIN restaurant_settings rs ON rs.user_id = u.id
        ORDER BY sup.start_date DESC
    `;

    db.pool.query(query, (err, result) => {
        if (err) {
            console.error("Error fetching subscriptions:", err);
            return res.status(500).json({ error: 'Database error', details: err });
        }

        res.status(200).json(result);
    });
};

// exports.updateSubscriptionStatus = async (req, res) => {
//   const user_plan_id = req.params.id;
//   const { status } = req.body;

//   if (!user_plan_id || !status) {
//     return res.status(400).json({ message: "User plan ID and status are required." });
//   }

//   const validStatuses = ["approved", "pending", "declined"];
//   if (!validStatuses.includes(status.toLowerCase())) {
//     return res.status(400).json({ message: "Invalid status value." });
//   }

//   try {
//     // Get subscription + plan detail
//     const [sub] = await db.pool.promise().query(
//       `SELECT sup.*, sp.interval_value, sp.price_interval
//        FROM superadmin_user_plans sup
//        JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
//        WHERE sup.user_plan_id = ?`,
//       [user_plan_id]
//     );

//     if (sub.length === 0) {
//       return res.status(404).json({ message: "Subscription not found" });
//     }

//     let startDate = null;
//     let endDate = null;

//     if (status.toLowerCase() === "approved") {
//       const plan = sub[0];

//       // Find last approved subscription of same user
//       const [lastApproved] = await db.pool.promise().query(
//         `SELECT * FROM superadmin_user_plans 
//          WHERE user_id = ? AND package_status = 'approved' 
//          ORDER BY end_date DESC LIMIT 1`,
//         [plan.user_id]
//       );

//       if (lastApproved.length > 0 && lastApproved[0].end_date) {
//         // Queue after last subscription
//         startDate = new Date(lastApproved[0].end_date);
//         startDate.setDate(startDate.getDate() + 1);
//       } else {
//         // No active subscription → start now
//         startDate = new Date();
//       }

//       // ✅ calculate end date based on plan data
//       endDate = new Date(startDate);
//       const interval = plan.interval_value || 1;

//       switch (plan.price_interval.toLowerCase()) {
//         case "day":
//           endDate.setDate(endDate.getDate() + interval);
//           break;
//         case "month":
//           endDate.setMonth(endDate.getMonth() + interval);
//           break;
//         case "year":
//           endDate.setFullYear(endDate.getFullYear() + interval);
//           break;
//         default:
//           endDate.setMonth(endDate.getMonth() + interval); // fallback
//       }
//     }

//     // Update record
//     const updateQuery = `
//       UPDATE superadmin_user_plans
//       SET package_status = ?, start_date = ?, end_date = ?
//       WHERE user_plan_id = ?
//     `;
//     await db.pool.promise().query(updateQuery, [
//       status.toLowerCase(),
//       startDate,
//       endDate,
//       user_plan_id,
//     ]);

//     return res.status(200).json({
//       message: `Status updated to '${status}' successfully.`,
//       start_date: startDate,
//       end_date: endDate,
//     });
//   } catch (err) {
//     console.error("Error in updateSubscriptionStatus:", err);
//     res.status(500).json({ message: "Database error", error: err });
//   }
// };


exports.updateSubscriptionStatus = async (req, res) => {
  const user_plan_id = req.params.id;
  const { status } = req.body;

  if (!user_plan_id || !status) {
    return res.status(400).json({ message: "User plan ID and status are required." });
  }

  const validStatuses = ["approved", "pending", "declined"];
  if (!validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const [sub] = await db.pool.promise().query(
      `SELECT sup.*, sp.interval_value, sp.price_interval, sp.trial_days
       FROM superadmin_user_plans sup
       JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
       WHERE sup.user_plan_id = ?`,
      [user_plan_id]
    );

    if (sub.length === 0) return res.status(404).json({ message: "Subscription not found" });

    const plan = sub[0];
    const isRenewApproval = plan.package_status === 'renew_requested';
    let startDate = null;
    let endDate = null;

    if (status.toLowerCase() === "approved") {
      if (isRenewApproval) {
        // Renew flow: start_date = today, supersede all current approved plans
        startDate = new Date();
      } else {
        // Normal approval: start after last approved plan or today
        const [lastApproved] = await db.pool.promise().query(
          `SELECT * FROM superadmin_user_plans
           WHERE user_id = ? AND package_status = 'approved'
           ORDER BY end_date DESC LIMIT 1`,
          [plan.user_id]
        );

        if (lastApproved.length > 0 && lastApproved[0].end_date) {
          startDate = new Date(lastApproved[0].end_date);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          startDate = new Date();
        }
      }

      endDate = new Date(startDate);
      switch (plan.price_interval.toLowerCase()) {
        case "day":
          endDate.setDate(endDate.getDate() + plan.interval_value);
          break;
        case "month":
          endDate.setMonth(endDate.getMonth() + plan.interval_value);
          break;
        case "year":
          endDate.setFullYear(endDate.getFullYear() + plan.interval_value);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + plan.interval_value);
      }

      if (plan.trial_days) {
        endDate.setDate(endDate.getDate() + plan.trial_days);
      }
    }

    // If approving a renew_requested plan, supersede all current approved plans first
    if (status.toLowerCase() === "approved" && isRenewApproval) {
      await db.pool.promise().query(
        `UPDATE superadmin_user_plans SET package_status = 'superseded'
         WHERE user_id = ? AND package_status = 'approved'`,
        [plan.user_id]
      );
    }

    await db.pool.promise().query(
      `UPDATE superadmin_user_plans
       SET package_status = ?, start_date = ?, end_date = ?
       WHERE user_plan_id = ?`,
      [status.toLowerCase(), startDate, endDate, user_plan_id]
    );

    return res.status(200).json({
      message: `Status updated to '${status}' successfully.`,
      start_date: startDate,
      end_date: endDate,
    });

  } catch (err) {
    console.error("Error in updateSubscriptionStatus:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

exports.getSubscriptionsStatusById = async (req, res) => {
    const id = req.params.id;
    db.pool.query(
        `SELECT
            package_status,
            start_date,
            end_date,
            trial_date,
            user_plan_id
         FROM
            superadmin_user_plans  
         WHERE user_plan_id = ?`,
        [id], // <-- Correctly pass 'id' as query parameter
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(200).json({ data: results });
        }
    );
};

exports.editSubscriptiondate = async (req, res) => {
    const  user_plan_id = req.params.id;
    const { trial_date, end_date,start_date } = req.body;
 
    if (!user_plan_id || !trial_date || !end_date) {
        return res.status(400).json({ message: "All fields are required." });
    }
 
    const updateQuery = `
        UPDATE superadmin_user_plans
        SET trial_date = ?, end_date = ?, start_date =?
        WHERE user_plan_id = ?
    `;
 
    db.pool.query(updateQuery, [trial_date, end_date, start_date,user_plan_id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err });
        }
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Subscription not found" });
        }
 
        res.status(200).json({ message: "Subscription updated successfully" });
    });
};