const db = require("../utils/db");

const createHoliday = (req, res) => {
  const { holiday_name, start_date, end_date, no_of_days } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
    if (results.length > 0) {
      // User has subscription
      const created_by = user_id;
      const insertQuery = `
        INSERT INTO payroll_holiday (holiday_name, start_date, end_date, no_of_days, created_by)
        VALUES (?, ?, ?, ?, ?)
      `;
      const values = [holiday_name, start_date, end_date, no_of_days, created_by];
 
      db.pool.query(insertQuery, values, (err, result) => {
        if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
        return res.status(201).json({ success: true, message: "Holiday created successfully (via subscription)", holidayId: result.insertId });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create holidays." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if creator has subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO payroll_holiday (holiday_name, start_date, end_date, no_of_days, created_by)
              VALUES (?, ?, ?, ?, ?)
            `;
            const values = [holiday_name, start_date, end_date, no_of_days, created_by];
 
            db.pool.query(insertQuery, values, (err, result) => {
              if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
              return res.status(201).json({ success: true, message: "Holiday created successfully (via creator)", holidayId: result.insertId });
            });
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};
const updateHoliday = (req, res) => {
  const { id } = req.params;
  const { holiday_name, start_date, end_date, no_of_days } = req.body;
  const updated_by = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [updated_by], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Internal Server Error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: uc } = userResult[0];
    const creatorId = is_admin === 1 ? updated_by : uc;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const fetchSql = "SELECT * FROM payroll_holiday WHERE payrl_holi_id = ? AND created_by = ?";
    db.pool.query(fetchSql, [id, creatorId], (fetchErr, fetchData) => {
      if (fetchErr) {
        console.error("Database fetch error:", fetchErr);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (fetchData.length === 0) {
        return res.status(404).json({ success: false, message: "Holiday not found" });
      }
      const currentData = fetchData[0];
      const updatedData = {
        holiday_name: holiday_name !== undefined ? holiday_name : currentData.holiday_name,
        start_date: start_date !== undefined ? start_date : currentData.start_date,
        end_date: end_date !== undefined ? end_date : currentData.end_date,
        no_of_days: no_of_days !== undefined ? no_of_days : currentData.no_of_days,
        created_by: currentData.created_by,
      };
      const updateSql = `UPDATE payroll_holiday SET holiday_name = ?, start_date = ?, end_date = ?, no_of_days = ?, updated_by = ?, created_by = ? WHERE payrl_holi_id = ?`;
      db.pool.query(updateSql, [updatedData.holiday_name, updatedData.start_date, updatedData.end_date, updatedData.no_of_days, updated_by, updatedData.created_by, id], (updateErr, result) => {
        if (updateErr) {
          console.error("Database update error:", updateErr);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Holiday not found" });
        }
        res.status(200).json({ success: true, message: "Holiday updated successfully" });
      });
    });
  });
};
  
  const deleteHoliday = (req, res) => {
    const { id } = req.params;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const sql = "DELETE FROM payroll_holiday WHERE payrl_holi_id = ? AND created_by = ?";
      db.pool.query(sql, [id, creatorId], (err, result) => {
        if (err) {
          console.error("Database deletion error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Holiday not found" });
        }
        res.status(200).json({ success: true, message: "Holiday deleted successfully" });
      });
    });
  };
  
  
  
  
  const getHolidayById = (req, res) => {
    const { id } = req.params;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const fetchSql = "SELECT * FROM payroll_holiday WHERE payrl_holi_id = ? AND created_by = ?";
      db.pool.query(fetchSql, [id, creatorId], (fetchErr, fetchData) => {
        if (fetchErr) {
          console.error("Database fetch error:", fetchErr);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (fetchData.length === 0) {
          return res.status(404).json({ success: false, message: "Holiday not found" });
        }
        res.status(200).json({ success: true, data: fetchData[0] });
      });
    });
  };
  
  
  const getHolidays = (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;
 
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
    db.pool.query(checkUserQuery, [id], (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      let getHolidaysQuery;
      let queryParams;
 
      if (isAdmin === 1) {
        // Admin: fetch own created holidays
        if (!searchItem || searchItem.trim() === "") {
          getHolidaysQuery = `SELECT * FROM payroll_holiday WHERE created_by = ? ORDER BY payrl_holi_id DESC`;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getHolidaysQuery = `
            SELECT * FROM payroll_holiday
            WHERE created_by = ?
            AND (
              holiday_name LIKE ?
              OR start_date LIKE ?
              OR end_date LIKE ?
              OR no_of_days LIKE ?
            )
            ORDER BY payrl_holi_id DESC`;
          queryParams = [id, searchQuery, searchQuery, searchQuery, searchQuery];
        }
      } else {
        // Non-admin: check access through created_by
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view holidays." });
        }
 
        if (!searchItem || searchItem.trim() === "") {
          getHolidaysQuery = `SELECT * FROM payroll_holiday WHERE created_by = ? ORDER BY payrl_holi_id DESC`;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getHolidaysQuery = `
            SELECT * FROM payroll_holiday
            WHERE created_by = ?
            AND (
              holiday_name LIKE ?
              OR start_date LIKE ?
              OR end_date LIKE ?
              OR no_of_days LIKE ?
            )
            ORDER BY payrl_holi_id DESC`;
          queryParams = [created_by, searchQuery, searchQuery, searchQuery, searchQuery];
        }
      }
 
      db.pool.query(getHolidaysQuery, queryParams, (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ success: false, message: "Internal Server Error", error: err });
        }
 
        res.status(200).json({ success: true, data: results, message: "Holiday data fetched successfully" });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};
  // leave type api 

   const createLeaveType = (req, res) => {
  const { leave_type, leave_days } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
    if (results.length > 0) {
      // User has a subscription
      insertLeaveType(res, leave_type, leave_days, user_id); // Pass user_id as created_by
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create leave types." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).json({ error: "Internal Server Error", details: err });
 
          if (results.length > 0) {
            // Creator has a subscription
            insertLeaveType(res, leave_type, leave_days, user_id); // still use user_id as creator of this record
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};
const insertLeaveType = (res, leave_type, leave_days, created_by) => {
  const sql = 'INSERT INTO leave_type (leave_type, leave_days, created_by) VALUES (?, ?, ?)';
  db.pool.query(sql, [leave_type, leave_days, created_by], (err, result) => {
    if (err) {
      console.error("Database query error: ", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(201).json({
      message: "Leave Type created successfully",
      leave_type_id: result.insertId
    });
  });
};

  
  // Get All Leave Types
   const getLeaveTypes = (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;
 
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
    db.pool.query(checkUserQuery, [id], (err, data) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (data.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = data[0].is_admin;
      const created_by = data[0].created_by;
 
      let getLeaveTypesQuery;
      let queryParams = [];
 
      if (isAdmin === 1) {
        // Admin: fetch leave types created by self
        if (!searchItem || searchItem.trim() === "") {
          getLeaveTypesQuery = `
            SELECT * FROM leave_type
            WHERE created_by = ?
            ORDER BY leave_type_id DESC
          `;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getLeaveTypesQuery = `
            SELECT * FROM leave_type
            WHERE created_by = ?
            AND (leave_type LIKE ? OR leave_days LIKE ?)
            ORDER BY leave_type_id DESC
          `;
          queryParams = [id, searchQuery, searchQuery];
        }
      } else {
        // Non-admin: fetch leave types created by the admin who created this user
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view leave types." });
        }
 
        if (!searchItem || searchItem.trim() === "") {
          getLeaveTypesQuery = `
            SELECT * FROM leave_type
            WHERE created_by = ?
            ORDER BY leave_type_id DESC
          `;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getLeaveTypesQuery = `
            SELECT * FROM leave_type
            WHERE created_by = ?
            AND (leave_type LIKE ? OR leave_days LIKE ?)
            ORDER BY leave_type_id DESC
          `;
          queryParams = [created_by, searchQuery, searchQuery];
        }
      }
 
      db.pool.query(getLeaveTypesQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error fetching leave types:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching leave types",
            error: err,
          });
        }
 
        res.status(200).json({
          success: true,
          data: result,
          message: "Leave types fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};
  
  // Update Leave Type
 const updateLeaveType = (req, res) => {
  const { id } = req.params;
  const { leave_type, leave_days } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Internal Server Error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: uc } = userResult[0];
    const creatorId = is_admin === 1 ? userId : uc;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const fetchCurrentDataSql = "SELECT * FROM leave_type WHERE leave_type_id = ? AND created_by = ?";
    db.pool.query(fetchCurrentDataSql, [id, creatorId], (fetchErr, fetchData) => {
      if (fetchErr) {
        console.error("Database fetch error:", fetchErr);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
      }
      if (fetchData.length === 0) {
        return res.status(404).json({ success: false, message: "Leave Type record not found" });
      }
      const currentData = fetchData[0];
      const updatedData = {
        leave_type: leave_type !== undefined ? leave_type : currentData.leave_type,
        leave_days: leave_days !== undefined ? leave_days : currentData.leave_days,
      };
      const updateSql = `UPDATE leave_type SET leave_type = ?, leave_days = ? WHERE leave_type_id = ?`;
      db.pool.query(updateSql, [updatedData.leave_type, updatedData.leave_days, id], (updateErr, result) => {
        if (updateErr) {
          console.error("Database update error:", updateErr);
          return res.status(500).json({ success: false, message: "An error occurred during update" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Leave Type record not found" });
        }
        return res.status(200).json({ success: true, message: "Leave Type updated successfully" });
      });
    });
  });
};
  
  
  const deleteLeaveType = (req, res) => {
    const { id } = req.params;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const sql = "DELETE FROM leave_type WHERE leave_type_id = ? AND created_by = ?";
      db.pool.query(sql, [id, creatorId], (err, result) => {
        if (err) {
          console.error("Database query error: ", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Leave Type record not found" });
        }
        res.status(200).json({ message: "Leave Type deleted successfully" });
      });
    });
  };
  // Get Leave Type by ID
  const getLeaveTypeById = (req, res) => {
    const { id } = req.params;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const getLeaveTypeSql = "SELECT * FROM leave_type WHERE leave_type_id = ? AND created_by = ?";
      db.pool.query(getLeaveTypeSql, [id, creatorId], (err, data) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (data.length === 0) {
          return res.status(404).json({ success: false, message: "Leave Type record not found" });
        }
        res.status(200).json({ success: true, data: data[0] });
      });
    });
  };
  // leave application api
 const createLeaveApply = (req, res) => {
  const {
    emp_his_id,
    apply_strt_date,
    apply_end_date,
    apply_day,
    reason,
    approved_by,
    leave_type_id
  } = req.body;
 
  const user_id = req.id; // From auth middleware
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, use their ID as created_by
      return insertLeaveApply(emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, user_id, res);
    }
 
    // Step 2: Check if user has a creator
    const checkCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
    db.pool.query(checkCreatedByQuery, [user_id], (err, data) => {
      if (err) return res.status(500).send(err);
 
      if (data.length === 0 || !data[0].created_by) {
        return res.status(403).json({ message: "You are not authorized to apply for leave." });
      }
 
      const created_by = data[0].created_by;
 
      // Step 3: Check if the creator has a subscription
      const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
      db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, creatorResults) => {
        if (err) return res.status(500).send(err);
 
        if (creatorResults.length > 0) {
          return insertLeaveApply(emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, created_by, res);
        } else {
          return res.status(403).json({ message: "Creator does not have an active subscription." });
        }
      });
    });
  });
};
 
// 🔧 Helper function with created_by insert
function insertLeaveApply(emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, created_by, res) {
  const sql = `
    INSERT INTO leave_apply
    (employee_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
 
  const values = [
    emp_his_id,
    leave_type_id,
    apply_strt_date,
    apply_end_date,
    apply_day,
    reason,
    approved_by,
    created_by
  ];
 
  db.pool.query(sql, values, (err, data) => {
    if (err) {
      console.error("Error inserting leave application:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
 
    res.status(201).json({
      message: "Leave application created successfully",
      leave_apply_id: data.insertId
    });
  });
}
 
function insertLeaveApply(emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, created_by, res) {
  const sql = `
    INSERT INTO leave_apply
    (employee_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
 
  const values = [
    emp_his_id,
    leave_type_id,
    apply_strt_date,
    apply_end_date,
    apply_day,
    reason,
    approved_by,
    created_by
  ];
 
  db.pool.query(sql, values, (err, data) => {
    if (err) {
      console.error("Error inserting leave application:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
 
    res.status(201).json({
      message: "Leave application created successfully",
      leave_apply_id: data.insertId
    });
  });
}
const getLeaveApplies = (req, res) => {
  const userId = req.id; // from auth middleware
  const { searchItem } = req.query;
 
  const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [userId], (err, userData) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    let sql = `
      SELECT la.employee_id, la.leave_appl_id, eh.first_name, eh.last_name, la.apply_strt_date, la.apply_end_date,
            la.apply_day, la.leave_type_id, lt.leave_type, la.reason, eh.emp_his_id, la.approved_by,
            u.firstname AS approved_by_firstname, u.lastname AS approved_by_lastname
      FROM leave_apply la
      LEFT JOIN employee_history eh ON la.employee_id = eh.emp_his_id
      LEFT JOIN leave_type lt ON la.leave_type_id = lt.leave_type_id
      LEFT JOIN user u ON u.id = la.approved_by
    `;
 
    const queryParams = [];
    const searchQuery = searchItem && searchItem.trim() !== "" ? `%${searchItem}%` : null;
 
    // WHERE clause base condition
    let whereClause = "";
 
    if (isAdmin === 1) {
      whereClause += "WHERE la.created_by = ?";
      queryParams.push(userId);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view leave applications." });
      }
      whereClause += "WHERE la.created_by = ?";
      queryParams.push(created_by);
    }
 
    // Add search conditions if searchItem is provided
    if (searchQuery) {
      whereClause += ` AND (
        eh.first_name LIKE ?
        OR eh.last_name LIKE ?
        OR CONCAT(eh.first_name, ' ', eh.last_name) LIKE ?
        OR lt.leave_type LIKE ?
        OR la.reason LIKE ?
        OR la.apply_strt_date LIKE ?
        OR la.apply_end_date LIKE ?
        OR la.apply_day LIKE ?
      )`;
      queryParams.push(
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery,
        searchQuery
      );
    }
 
    sql += ` ${whereClause} ORDER BY la.leave_appl_id DESC`;
 
    // Execute the query
    db.pool.query(sql, queryParams, (err, data) => {
      if (err) {
        console.error('Error fetching leave applications:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
 
      const result = data.map(emp => ({
        employee_id: emp.employee_id,
        leave_apply_id: emp.leave_appl_id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        apply_strt_date: emp.apply_strt_date,
        apply_end_date: emp.apply_end_date,
        apply_day: emp.apply_day,
        leave_type_id: emp.leave_type_id,
        leave_type: emp.leave_type,
        reason: emp.reason,
        employeehisid: emp.emp_his_id,
        approved_byid: emp.approved_by,
        approved_by_name: `${emp.approved_by_firstname} ${emp.approved_by_lastname}`,
      }));
 
      res.status(200).json({ data: result, message: 'Leave applications fetched successfully' });
    });
  });
};









const getLeaveApplyById = (req, res) => {
  const leave_apply_id = req.params.id;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Internal Server Error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const sql = `
        SELECT la.employee_id, la.leave_appl_id,
               CONCAT(eh.first_name, ' ', eh.last_name) AS employee_name,
               la.apply_strt_date, la.apply_end_date,
               la.apply_day, la.leave_type_id, lt.leave_type, la.reason,
               eh.emp_his_id, la.approved_by,
               CONCAT(u.firstname, ' ', u.lastname) AS approved_by_name,
               la.created_by
        FROM leave_apply la
        LEFT JOIN employee_history eh ON la.employee_id = eh.emp_his_id
        LEFT JOIN leave_type lt ON la.leave_type_id = lt.leave_type_id
        LEFT JOIN user u ON u.id = la.approved_by
        WHERE la.leave_appl_id = ? AND la.created_by = ?
    `;
    db.pool.query(sql, [leave_apply_id, creatorId], (err, data) => {
      if (err) {
        console.error("Error fetching leave application by ID:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (data.length === 0) {
        return res.status(404).json({ success: false, message: "Leave application not found" });
      }
      res.status(200).json({ data: data });
    });
  });
};


const deleteLeaveApply = (req, res) => {
    const leave_apply_id = req.params.id;
    const userId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
      if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const sql = "DELETE FROM leave_apply WHERE leave_appl_id = ? AND created_by = ?";
      db.pool.query(sql, [leave_apply_id, creatorId], (err, result) => {
        if (err) {
          console.error("Error deleting leave application:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Leave application not found" });
        }
        res.status(200).json({ message: "Leave application deleted successfully" });
      });
    });
};
const updateLeaveApply = (req, res) => {
  const leave_apply_id = req.params.id;
  const { emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by } = req.body;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ error: "Internal Server Error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by: uc } = userResult[0];
    const creatorId = is_admin === 1 ? userId : uc;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const ownerCheckQuery = "SELECT created_by FROM leave_apply WHERE leave_appl_id = ? AND created_by = ?";
    db.pool.query(ownerCheckQuery, [leave_apply_id, creatorId], (err, rows) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (!rows.length) return res.status(404).json({ message: "Leave application not found" });

      const sql = `UPDATE leave_apply SET employee_id = ?, leave_type_id = ?, apply_strt_date = ?, apply_end_date = ?, apply_day = ?, reason = ?, approved_by = ?, created_by = ? WHERE leave_appl_id = ?`;
      db.pool.query(sql, [emp_his_id, leave_type_id, apply_strt_date, apply_end_date, apply_day, reason, approved_by, rows[0].created_by, leave_apply_id], (err, result) => {
        if (err) {
          console.error("Error updating leave application:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Leave application not found" });
        }
        res.status(200).json({ message: "Leave application updated successfully" });
      });
    });
  });
};
  
  
const importHolidays = async (req, res) => {
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
        return res.status(403).json({ success: false, message: "You are not authorized to import holidays." });
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

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const holiday_name = (row.Holiday_Name || "").trim();
      const start_date = (row.Start_Date || "").trim();
      const end_date = (row.End_Date || "").trim();
      const no_of_days = row.No_Of_Days || 1;

      if (!holiday_name || !start_date || !end_date || !no_of_days) { skipped++; continue; }

      const [existing] = await db.pool.promise().query(
        "SELECT payrl_holi_id FROM payroll_holiday WHERE holiday_name = ? AND created_by = ?",
        [holiday_name, creator_id]
      );
      if (existing.length > 0) { skipped++; continue; }

      await db.pool.promise().query(
        "INSERT INTO payroll_holiday (holiday_name, start_date, end_date, no_of_days, created_by) VALUES (?, ?, ?, ?, ?)",
        [holiday_name, start_date, end_date, parseInt(no_of_days), creator_id]
      );
      imported++;
    }

    return res.json({ success: true, imported, skipped });
  } catch (error) {
    console.error("Import holidays error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

  module.exports = {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    getHolidayById,
    createLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
  getLeaveTypeById,
  createLeaveApply,
  getLeaveApplies,
  updateLeaveApply,
  deleteLeaveApply,
  getLeaveApplyById,
  importHolidays

  };