const db = require("../utils/db");
const bcrypt = require("bcryptjs");
const saltRounds = 10; // You can increase this value for more security
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

const getAllEmployeeHistories = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;
 
    // Step 1: Fetch user info
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    const [userData] = await dbQuery(checkUserQuery, [id]);
 
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData.is_admin;
    const created_by = userData.created_by;
 
    let queryParams = [];
    let sql = `
      SELECT
        eh.emp_his_id,
        p.position_name,
        d.department_name,
        dy.type_name,
        eh.first_name,
        eh.last_name,
        eh.email,
        eh.phone,
        eh.hire_date,
        eh.original_hire_date,
        eh.picture
      FROM
        employee_history eh
      LEFT JOIN
        position p ON p.pos_id = eh.pos_id
      LEFT JOIN
        duty_type dy ON eh.duty_type = dy.id
      LEFT JOIN
        department d ON d.dept_id = eh.division_id
    `;
 
    // Step 2: Add WHERE condition based on admin status
    let whereClause = " WHERE eh.created_by = ?";
    queryParams.push(isAdmin === 1 ? id : created_by);
 
    // Step 3: Add search filters if any
    if (searchItem && searchItem.trim() !== "") {
      const searchQuery = `%${searchItem}%`;
      whereClause += ` AND (
        eh.first_name LIKE ? OR
        eh.last_name LIKE ? OR
        CONCAT(eh.first_name, ' ', eh.last_name) LIKE ? OR
        p.position_name LIKE ? OR
        d.department_name LIKE ? OR
        dy.type_name LIKE ? OR
        eh.email LIKE ? OR
        eh.phone LIKE ?
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
 
    sql += whereClause + " ORDER BY eh.emp_his_id DESC";
 
    const results = await dbQuery(sql, queryParams);
 
    if (results.length > 0) {
      const formattedResult = results.map((result) => ({
        emp_his_id: result.emp_his_id,
        photograph: result.picture,
        FirstName: result.first_name,
        LastName: result.last_name,
        Designation: result.position_name,
        Phone: result.phone,
        Email_Address: result.email,
        Division: result.department_name,
        Duty_type: result.type_name,
        Hire_Date: result.hire_date,
        Original_Hire_Date: result.original_hire_date,
      }));
 
      res.status(200).json({ success: true, data: formattedResult });
    } else {
      res.status(200).json({ success: true, data: [] });
    }
  } catch (err) {
    console.error("Error fetching employee histories:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching employee histories",
    });
  }
};





const createDesignation = (req, res) => {
  const { position_name, position_details } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, insert designation
      const created_by = results[0].user_id;
 
      const insertQuery = `
        INSERT INTO \`position\` (position_name, position_details, created_by)
        VALUES (?, ?, ?)
      `;
      const values = [position_name, position_details, created_by];
 
      db.pool.query(insertQuery, values, (err, results) => {
        if (err) return res.status(500).send(err);
        return res.status(201).json({ success: true, message: "Position created successfully (via subscription).", data: results });
      });
 
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to create a designation." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            const insertQuery = `
              INSERT INTO \`position\` (position_name, position_details, created_by)
              VALUES (?, ?, ?)
            `;
            const values = [position_name, position_details, created_by];
 
            db.pool.query(insertQuery, values, (err, results) => {
              if (err) return res.status(500).send(err);
              return res.status(201).json({ success: true, message: "Position created successfully (via creator).", data: results });
            });
          } else {
            return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};

const getAllPositions = async (req, res) => {
  try {
    const id = req.id; // From auth middleware
    const { searchItem } = req.query;
 
    // Step 1: Fetch user details
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, data) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (data.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = data[0].is_admin;
      const created_by = data[0].created_by;
 
      let sql;
      let queryParams = [];
 
      // Step 2: Determine the creator ID based on admin status
      const creatorId = isAdmin === 1 ? id : created_by;
 
      if (!creatorId) {
        return res.status(403).json({ success: false, message: "You are not authorized to view positions." });
      }
 
      if (!searchItem || searchItem.trim() === "") {
        sql = `
          SELECT * FROM position
          WHERE created_by = ?
          ORDER BY pos_id DESC
        `;
        queryParams = [creatorId];
      } else {
        const searchQuery = `%${searchItem}%`;
        sql = `
          SELECT * FROM position
          WHERE created_by = ?
          AND (position_name LIKE ? OR position_details LIKE ?)
          ORDER BY pos_id DESC
        `;
        queryParams = [creatorId, searchQuery, searchQuery];
      }
 
      // Execute the query
      const results = await dbQuery(sql, queryParams);
      res.status(200).json({ success: true, data: results });
    });
  } catch (err) {
    console.error("Error fetching positions:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching positions",
    });
  }
};

const deletePosition = async (req, res) => {
  const pos_id = req.params.id;

  try {
    // Check if the position exists first
    const checkSql = 'SELECT * FROM `position` WHERE pos_id = ?';
    const positionExists = await dbQuery(checkSql, [pos_id]);

    if (positionExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    // Proceed with deletion
    const sql = 'DELETE FROM `position` WHERE pos_id = ?';
    const results = await dbQuery(sql, [pos_id]);

    res.status(200).json({ success: true, message: 'Position deleted successfully', data: results });
  } catch (err) {
    console.error('Error deleting position:', err);
    res.status(500).json({ success: false, message: 'An error occurred while deleting the position' });
  }
};
const getPositionById = async (req, res) => {
  const pos_id  = req.params.id;
  try {
    const sql = 'SELECT pos_id, position_name, position_details FROM `position` WHERE pos_id = ?';
    const results = await dbQuery(sql, [pos_id]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    res.status(200).json({ success: true, data: results[0] });
  } catch (err) {
    console.error('Error fetching position by ID:', err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching the position' });
  }
};


const updatePosition = async (req, res) => {
  const pos_id = req.params.id;
  const { position_name, position_details, created_by } = req.body;
 
  try {
    // Step 1: Check if the position exists
    const checkSql = 'SELECT * FROM `position` WHERE pos_id = ?';
    const positionExists = await dbQuery(checkSql, [pos_id]);
 
    if (positionExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
 
    // Step 2: Fallback to existing values if not provided or empty
    const updatedName = position_name?.trim() || positionExists[0].position_name;
    const updatedDetails = position_details?.trim() || positionExists[0].position_details;
    const updatedCreatedBy = created_by?.trim() || positionExists[0].created_by;
 
    // Step 3: Update the position
    const updateSql = `
      UPDATE \`position\`
      SET position_name = ?, position_details = ?, created_by = ?
      WHERE pos_id = ?
    `;
    const results = await dbQuery(updateSql, [
      updatedName,
      updatedDetails,
      updatedCreatedBy,
      pos_id
    ]);
 
    // Step 4: Respond to client
    res.status(200).json({
      success: true,
      message: 'Position updated successfully',
      data: {
        pos_id,
        position_name: updatedName,
        position_details: updatedDetails,
        created_by: updatedCreatedBy
      }
    });
  } catch (err) {
    console.error('Error updating position:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the position'
    });
  }
};
const getALlDutyTypes = async (req, res) => {
  try {
    const sql = "SELECT * FROM duty_type";
    const result = await dbQuery(sql);
    res.status(200).send({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

const getAllFrequencyType = async (req, res) => {
  try {
    const sql = "SELECT * FROM pay_frequency";
    const result = await dbQuery(sql);
    res.status(200).send({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

const getAllRateTypes = async (req, res) => {
  try {
    const sql = "SELECT * FROM rate_type";
    const result = await dbQuery(sql);
    res.status(200).send({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

const maritalSaatus = async (req, res) => {
  try {
    const sql = "SELECT * FROM marital_info";
    const result = await dbQuery(sql);
    res.status(200).send({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};
const getGender = async (req, res) => {
  try {
    const sql = "SELECT * FROM gender";
    const result = await dbQuery(sql);
    res.status(200).send({ data: result });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

// const createEmployeeHistory = async (req, res) => {
//   console.log(req.body)
//   const generateEmployeeID = () => {
//     return "EMP" + Math.floor(Math.random() * 100000);
//   };
 
//   const user_id = req.id;
//   console.log("Requesting User ID:", user_id);
 
//   const {
//     pos_id, first_name, last_name, email, phone, zip, division_id, duty_type,
//     voluntary_termination, dob, gender, marital_status, home_email, home_phone,
//     emerg_contct, emrg_w_phone, termination_reason, hire_date, original_hire_date,
//     termination_date, rehire_date, rate_type, rate, pay_frequency, pay_frequency_txt,
//     country, state, city
//   } = req.body;
 
//   const picture = req.file ? req.file.filename : null;
 
//   try {
//     // Step 1: Check if email already exists
//     const checkEmailSql = `
//       SELECT email FROM user WHERE email = ? 
//       UNION 
//       SELECT email FROM employee_history WHERE email = ?
//     `;
//     const emailExists = await dbQuery(checkEmailSql, [email, email]);
 
//     if (emailExists.length > 0) {
//       return res.status(400).json({ message: "Email already exists. Try a different one." });
//     }
 
//     // Step 2: Check subscription of the requesting user
//     let created_by = null;
//     const subQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
//     const subResult = await dbQuery(subQuery, [user_id]);
 
//     if (subResult.length > 0) {
//       created_by = user_id;
//     } else {
//       // Check if user was created by someone else
//       const creatorQuery = "SELECT created_by FROM user WHERE id = ?";
//       const creatorResult = await dbQuery(creatorQuery, [user_id]);
 
//       if (creatorResult.length === 0 || !creatorResult[0].created_by) {
//         return res.status(403).json({ message: "You are not authorized to create employee history." });
//       }
 
//       const creator_id = creatorResult[0].created_by;
//       const creatorSubResult = await dbQuery(subQuery, [creator_id]);
 
//       if (creatorSubResult.length === 0) {
//         return res.status(403).json({ message: "Creator does not have an active subscription." });
//       }
 
//       created_by = creator_id;
//     }
 
//     // Step 3: Insert into employee_history table
//     const employee_id = generateEmployeeID();
 
//     const insertSql = `
//       INSERT INTO employee_history (
//         employee_id, pos_id, first_name, last_name, email, phone, country, state, city,
//         zip, division_id, duty_type, voluntary_termination, dob, gender, marital_status,
//         home_email, home_phone, emerg_contct, emrg_w_phone, termination_reason, hire_date,
//         original_hire_date, termination_date, rehire_date, rate_type, rate, pay_frequency,
//         pay_frequency_txt, picture, created_by
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;
 
//     const result = await dbQuery(insertSql, [
//       employee_id, pos_id, first_name, last_name, email, phone, country, state, city,
//       zip, division_id, duty_type, voluntary_termination, dob, gender, marital_status,
//       home_email, home_phone, emerg_contct, emrg_w_phone, termination_reason, hire_date,
//       original_hire_date, termination_date, rehire_date, rate_type, rate, pay_frequency,
//       pay_frequency_txt, picture, created_by
//     ]);
 
//     return res.status(200).json({
//       success: true,
//       employee_id,
//       message: "Employee history successfully created."
//     });
 
//   } catch (err) {
//     console.error("Error creating employee history:", err);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
const createEmployeeHistory = async (req, res) => {
  console.log(req.body)
  const generateEmployeeID = () => {
    return "EMP" + Math.floor(Math.random() * 100000);
  };

  const user_id = req.id;
  console.log("Requesting User ID:", user_id);

  const {
    pos_id, first_name, last_name, email, phone, zip, division_id, duty_type,
    voluntary_termination, dob, gender, marital_status, home_email, home_phone,
    emerg_contct, emrg_w_phone, termination_reason, hire_date, original_hire_date,
    termination_date, rehire_date, rate_type, rate, pay_frequency, pay_frequency_txt,
    country, state, city
  } = req.body;

  const picture = req.file ? req.file.filename : null;

  try {
    // ✅ Step 1: Check duplicate email or phone across user & employee_history
    const checkDuplicatesSql = `
      SELECT email, phone FROM employee_history WHERE email = ? OR phone = ?
      UNION
      SELECT email, NULL as phone FROM user WHERE email = ?
    `;
    const duplicates = await dbQuery(checkDuplicatesSql, [email, phone, email]);

    if (duplicates.length > 0) {
      let emailExists = false;
      let phoneExists = false;

      duplicates.forEach(d => {
        if (d.email === email) emailExists = true;
        if (d.phone === phone) phoneExists = true;
      });

      if (emailExists && phoneExists) {
        return res.status(400).json({ message: "Email and phone already exist" });
      } else if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      } else if (phoneExists) {
        return res.status(400).json({ message: "Phone already exists" });
      }
    }

    // ✅ Step 2: Check subscription of the requesting user
    let created_by = null;
    const subQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
    const subResult = await dbQuery(subQuery, [user_id]);

    if (subResult.length > 0) {
      created_by = user_id;
    } else {
      // Check if user was created by someone else
      const creatorQuery = "SELECT created_by FROM user WHERE id = ?";
      const creatorResult = await dbQuery(creatorQuery, [user_id]);

      if (creatorResult.length === 0 || !creatorResult[0].created_by) {
        return res.status(403).json({ message: "You are not authorized to create employee history." });
      }

      const creator_id = creatorResult[0].created_by;
      const creatorSubResult = await dbQuery(subQuery, [creator_id]);

      if (creatorSubResult.length === 0) {
        return res.status(403).json({ message: "Creator does not have an active subscription." });
      }

      created_by = creator_id;
    }

    // ✅ Step 3: Insert into employee_history table
    const employee_id = generateEmployeeID();

    const insertSql = `
      INSERT INTO employee_history (
        employee_id, pos_id, first_name, last_name, email, phone, country, state, city,
        zip, division_id, duty_type, voluntary_termination, dob, gender, marital_status,
        home_email, home_phone, emerg_contct, emrg_w_phone, termination_reason, hire_date,
        original_hire_date, termination_date, rehire_date, rate_type, rate, pay_frequency,
        pay_frequency_txt, picture, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbQuery(insertSql, [
      employee_id, pos_id, first_name, last_name, email, phone, country, state, city,
      zip, division_id, duty_type, voluntary_termination, dob, gender, marital_status,
      home_email, home_phone, emerg_contct, emrg_w_phone, termination_reason, hire_date,
      original_hire_date, termination_date, rehire_date, rate_type, rate, pay_frequency,
      pay_frequency_txt, picture, created_by
    ]);

    return res.status(200).json({
      success: true,
      employee_id,
      message: "Employee history successfully created."
    });

  } catch (err) {
    console.error("Error creating employee history:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params; // emp_his_id
    console.log("Deleting Employee History ID:", id);
 
    // Step 1: Get the user_id from employee_history
    const getUserIdSql = "SELECT user_id FROM employee_history WHERE emp_his_id = ?";
    const userResult = await dbQuery(getUserIdSql, [id]);
 
    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: "Employee history not found" });
    }
 
    const userId = userResult[0].user_id;
 
    // Step 2: Delete employee history record
    const deleteHistorySql = "DELETE FROM employee_history WHERE emp_his_id = ?";
    const historyResult = await dbQuery(deleteHistorySql, [id]);
 
    // Step 3: If user_id exists, delete user record
    if (userId) {
      const deleteUserSql = "DELETE FROM user WHERE id = ?";
      await dbQuery(deleteUserSql, [userId]);
    }
 
    // Step 4: Send response
    return res.status(200).json({
      success: true,
      message: "Employee history and associated user deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting employee history:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting employee history",
    });
  }
};


const getemployeeBYID = async (req, res) => {
  try {
    const { id } = req.params;
 
    // SQL query
    let sql = `
      SELECT
       eh.emp_his_id,
       eh.first_name,
        eh.last_name,
        eh.email,
        eh.phone,
        eh.country,
        eh.state,
        eh.city,
        eh.zip,
        eh.division_id,
        d.department_name AS division_name,
       
        eh.pos_id ,
        p.position_name AS designation_name,
        eh.duty_type  AS duty_type,
        dy.type_name AS duty_typename,
        eh.voluntary_termination,
        eh.dob,
        eh.gender,
        g.gender_name,
        eh.marital_status ,
        ms.marital_sta,
        eh.picture,
        eh.home_email,
        eh.home_phone,
        eh.emerg_contct,
        eh.emrg_w_phone,
        eh.hire_date,
        eh.original_hire_date,
        eh.termination_reason,
        eh.hire_date,
        eh.original_hire_date,
        eh.termination_date,
        eh.rehire_date,
         eh.rate_type  ,  
        rt.r_type_name ,
        eh.rate,
         eh.pay_frequency ,
        pf.frequency_name,
        eh.pay_frequency_txt,
        eh.created_by
       
      FROM
        employee_history eh
      LEFT JOIN
        position p ON p.pos_id = eh.pos_id
      LEFT JOIN
        duty_type dy ON eh.duty_type = dy.id
      LEFT JOIN
        department d ON d.dept_id = eh.division_id
      LEFT JOIN
        pay_frequency pf ON eh.pay_frequency = pf.id
      LEFT JOIN
        marital_info ms ON eh.marital_status = ms.id
      LEFT JOIN
        gender g ON g.id = eh.gender
      LEFT JOIN
        rate_type rt ON eh.rate_type = rt.id
      WHERE
        eh.emp_his_id = ?
    `;
 
    // Execute the query
    const results = await dbQuery(sql, [id]);
 
    // Send successful response
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("Error fetching employee histories:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while fetching employee histories",
      });
  }
};

// const updateEmployeeHistory = async (req, res) => {
//   try {
//     const { id } = req.params;
 
//     const {
//       first_name,
//       last_name,
//       email,
//       phone,
//       country,
//       state,
//       city,
//       zip,
//       division_id,
//       pos_id,
//       duty_type,
//       voluntary_termination,
//       dob,
//       gender,
//       marital_status,
//       home_email,
//       home_phone,
//       emerg_contct,
//       emrg_w_phone,
//       termination_reason,
//       hire_date,
//       original_hire_date,
//       termination_date,
//       rehire_date,
//       rate_type,
//       rate,
//       pay_frequency,
//       pay_frequency_txt,
//       created_by,
//     } = req.body;
 
//     const picture = req.file ? req.file.filename : null;
 
//     // Fetch current employee data
//     const result = await dbQuery(
//       "SELECT * FROM employee_history WHERE emp_his_id = ?",
//       [id]
//     );
 
//     if (result.length === 0) {
//       return res.status(404).json({ message: "Employee not found" });
//     }
 
//     const currentData = result[0];
 
//     const updateData = {
//       pos_id: pos_id || currentData.pos_id,
//       first_name: first_name || currentData.first_name,
//       last_name: last_name || currentData.last_name,
//       email: email || currentData.email,
//       phone: phone || currentData.phone,
//       country: country || currentData.country,
//       state: state || currentData.state,
//       city: city || currentData.city,
//       zip: zip || currentData.zip,
//       division_id: division_id || currentData.division_id,
//       duty_type: duty_type || currentData.duty_type,
//       voluntary_termination:
//         voluntary_termination || currentData.voluntary_termination,
//       dob: dob || currentData.dob,
//       gender: gender || currentData.gender,
//       marital_status: marital_status || currentData.marital_status,
//       home_email: home_email || currentData.home_email,
//       home_phone: home_phone || currentData.home_phone,
//       emerg_contct: emerg_contct || currentData.emerg_contct,
//       emrg_w_phone: emrg_w_phone || currentData.emrg_w_phone,
//       termination_reason: termination_reason || currentData.termination_reason,
//       hire_date: hire_date || currentData.hire_date,
//       original_hire_date: original_hire_date || currentData.original_hire_date,
//       termination_date: termination_date || currentData.termination_date,
//       rehire_date: rehire_date || currentData.rehire_date,
//       rate_type: rate_type || currentData.rate_type,
//       rate: rate || currentData.rate,
//       pay_frequency: pay_frequency || currentData.pay_frequency,
//       pay_frequency_txt: pay_frequency_txt || currentData.pay_frequency_txt,
//       picture: picture || currentData.picture,
//       created_by: created_by || currentData.created_by,
//     };
 
//     // Update employee_history table
//     const updateSql = `
//       UPDATE employee_history
//       SET pos_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, country = ?, state = ?, city = ?, zip = ?, division_id = ?,
//           duty_type = ?, voluntary_termination = ?, dob = ?, gender = ?, marital_status = ?, home_email = ?, home_phone = ?, emerg_contct = ?,
//           emrg_w_phone = ?, termination_reason = ?, hire_date = ?, original_hire_date = ?, termination_date = ?, rehire_date = ?, rate_type = ?,
//           rate = ?, pay_frequency = ?, pay_frequency_txt = ?, picture = ?, created_by = ?
//       WHERE emp_his_id = ?;
//     `;
 
//     await dbQuery(updateSql, [
//       updateData.pos_id,
//       updateData.first_name,
//       updateData.last_name,
//       updateData.email,
//       updateData.phone,
//       updateData.country,
//       updateData.state,
//       updateData.city,
//       updateData.zip,
//       updateData.division_id,
//       updateData.duty_type,
//       updateData.voluntary_termination,
//       updateData.dob,
//       updateData.gender,
//       updateData.marital_status,
//       updateData.home_email,
//       updateData.home_phone,
//       updateData.emerg_contct,
//       updateData.emrg_w_phone,
//       updateData.termination_reason,
//       updateData.hire_date,
//       updateData.original_hire_date,
//       updateData.termination_date,
//       updateData.rehire_date,
//       updateData.rate_type,
//       updateData.rate,
//       updateData.pay_frequency,
//       updateData.pay_frequency_txt,
//       updateData.picture,
//       updateData.created_by,
//       id,
//     ]);
 
//     return res.status(200).json({
//       message: "Employee record updated successfully",
//       id,
//     });
//   } catch (err) {
//     console.error("Error updating employee record:", err);
//     return res.status(500).send("Server error");
//   }
// };
const updateEmployeeHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      first_name,
      last_name,
      email,
      phone,
      country,
      state,
      city,
      zip,
      division_id,
      pos_id,
      duty_type,
      voluntary_termination,
      dob,
      gender,
      marital_status,
      home_email,
      home_phone,
      emerg_contct,
      emrg_w_phone,
      termination_reason,
      hire_date,
      original_hire_date,
      termination_date,
      rehire_date,
      rate_type,
      rate,
      pay_frequency,
      pay_frequency_txt,
      created_by,
    } = req.body;

    const picture = req.file ? req.file.filename : null;

    // Fetch current employee data
    const result = await dbQuery(
      "SELECT * FROM employee_history WHERE emp_his_id = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const currentData = result[0];

    const updateData = {
      pos_id: pos_id || currentData.pos_id,
      first_name: first_name || currentData.first_name,
      last_name: last_name || currentData.last_name,
      email: email || currentData.email,
      phone: phone || currentData.phone,
      country: country || currentData.country,
      state: state || currentData.state,
      city: city || currentData.city,
      zip: zip || currentData.zip,
      division_id: division_id || currentData.division_id,
      duty_type: duty_type || currentData.duty_type,
      voluntary_termination:
        voluntary_termination || currentData.voluntary_termination,
      dob: dob || currentData.dob,
      gender: gender || currentData.gender,
      marital_status: marital_status || currentData.marital_status,
      home_email: home_email || currentData.home_email,
      home_phone: home_phone || currentData.home_phone,
      emerg_contct: emerg_contct || currentData.emerg_contct,
      emrg_w_phone: emrg_w_phone || currentData.emrg_w_phone,
      termination_reason: termination_reason || currentData.termination_reason,
      hire_date: hire_date || currentData.hire_date,
      original_hire_date: original_hire_date || currentData.original_hire_date,
      termination_date: termination_date || currentData.termination_date,
      rehire_date: rehire_date || currentData.rehire_date,
      rate_type: rate_type || currentData.rate_type,
      rate: rate || currentData.rate,
      pay_frequency: pay_frequency || currentData.pay_frequency,
      pay_frequency_txt: pay_frequency_txt || currentData.pay_frequency_txt,
      picture: picture || currentData.picture,
      created_by: created_by || currentData.created_by,
    };

    // ✅ Check for duplicate email or phone (excluding current record)
    const dupCheckSql = `
      SELECT * FROM employee_history
      WHERE (email = ? OR phone = ?)
      AND emp_his_id != ?
    `;
    const dupResults = await dbQuery(dupCheckSql, [
      updateData.email,
      updateData.phone,
      id,
    ]);

    if (dupResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email or Phone number already exists for another employee",
      });
    }

    // ✅ Update employee_history table
    const updateSql = `
      UPDATE employee_history
      SET pos_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, country = ?, state = ?, city = ?, zip = ?, division_id = ?,
          duty_type = ?, voluntary_termination = ?, dob = ?, gender = ?, marital_status = ?, home_email = ?, home_phone = ?, emerg_contct = ?,
          emrg_w_phone = ?, termination_reason = ?, hire_date = ?, original_hire_date = ?, termination_date = ?, rehire_date = ?, rate_type = ?,
          rate = ?, pay_frequency = ?, pay_frequency_txt = ?, picture = ?, created_by = ?
      WHERE emp_his_id = ?;
    `;

    await dbQuery(updateSql, [
      updateData.pos_id,
      updateData.first_name,
      updateData.last_name,
      updateData.email,
      updateData.phone,
      updateData.country,
      updateData.state,
      updateData.city,
      updateData.zip,
      updateData.division_id,
      updateData.duty_type,
      updateData.voluntary_termination,
      updateData.dob,
      updateData.gender,
      updateData.marital_status,
      updateData.home_email,
      updateData.home_phone,
      updateData.emerg_contct,
      updateData.emrg_w_phone,
      updateData.termination_reason,
      updateData.hire_date,
      updateData.original_hire_date,
      updateData.termination_date,
      updateData.rehire_date,
      updateData.rate_type,
      updateData.rate,
      updateData.pay_frequency,
      updateData.pay_frequency_txt,
      updateData.picture,
      updateData.created_by,
      id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Employee record updated successfully",
      id,
    });
  } catch (err) {
    console.error("Error updating employee record:", err);
    return res.status(500).send("Server error");
  }
};

// department






const deleteDepartment = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM department WHERE dept_id = ?";
  
  db.pool.query(sql, [id], (err, data) => {
    if (err) {
      console.error("Database query error: ", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    return res.json({ message: "Department deleted successfully" });
  });
};





const getDepartmentById = (req, res) => {
  const { id } = req.params;

  // SQL query to fetch department by id
  const fetchDepartmentSql = 'SELECT * FROM department WHERE dept_id = ?';
  
  db.pool.query(fetchDepartmentSql, [id], (fetchErr, fetchData) => {
    if (fetchErr) {
      console.error('Database fetch error:', fetchErr);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }

    if (fetchData.length === 0) {
      return res.status(404).json({ success: false, message: 'Department record not found' });
    }

    // Return the department data if found
    res.status(200).json({ success: true, data: fetchData[0] });
  });
};

// get all devision


const getAllDivision = async (req, res) => {
  try {
    const id = req.id; // Extracted from auth middleware
    const { searchItem } = req.query;
 
    // Step 1: Get user info (is_admin and created_by)
    const userSql = "SELECT is_admin, created_by FROM user WHERE id = ?";
    const [user] = await dbQuery(userSql, [id]);
 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 
    const isAdmin = user.is_admin;
    const created_by = user.created_by;
 
    let sql;
    let queryParams = [];
 
    // Step 2: Role-based filtering + optional search
    if (isAdmin === 1) {
      // Admin: can fetch their own divisions
      if (!searchItem || searchItem.trim() === "") {
        sql = `SELECT dept_id AS division_id, department_name AS division_name, parent_id
               FROM department WHERE parent_id > 0 AND created_by = ?`;
        queryParams = [id];
      } else {
        sql = `SELECT dept_id AS division_id, department_name AS division_name, parent_id
               FROM department
               WHERE parent_id > 0 AND created_by = ? AND department_name LIKE ?`;
        queryParams = [id, `%${searchItem}%`];
      }
    } else {
      // Non-admin: only view divisions created by their admin
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view divisions." });
      }
 
      if (!searchItem || searchItem.trim() === "") {
        sql = `SELECT dept_id AS division_id, department_name AS division_name, parent_id
               FROM department WHERE parent_id > 0 AND created_by = ?`;
        queryParams = [created_by];
      } else {
        sql = `SELECT dept_id AS division_id, department_name AS division_name, parent_id
               FROM department
               WHERE parent_id > 0 AND created_by = ? AND department_name LIKE ?`;
        queryParams = [created_by, `%${searchItem}%`];
      }
    }
 
    sql += " ORDER BY dept_id DESC";
 
    // Step 3: Fetch divisions
    const result = await dbQuery(sql, queryParams);
 
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No departments found" });
    }
 
    // Step 4: Append parent department names
    const departmentsWithParentNames = await Promise.all(
      result.map(async (dept) => {
        if (dept.parent_id > 0) {
          const parentDeptSql = "SELECT department_name FROM department WHERE dept_id = ?";
          const parentDept = await dbQuery(parentDeptSql, [dept.parent_id]);
          return {
            ...dept,
            parent_department_name: parentDept?.[0]?.department_name || null,
          };
        }
        return { ...dept, parent_department_name: null };
      })
    );
 
    res.status(200).json({ data: departmentsWithParentNames });
 
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ success: false, message: "Server error", error: err });
  }
};


//for division list

const departmentDropdown = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
 
    // Step 1: Get is_admin and created_by for the user
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    const [userData] = await db.pool.promise().query(checkUserQuery, [id]);
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const createdBy = userData[0].created_by;
 
    // Step 2: Decide whose departments to show
    let creatorId;
 
    if (isAdmin === 1) {
      creatorId = id;
    } else {
      if (!createdBy) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
      }
      creatorId = createdBy;
    }
 
    // Step 3: Query departments created by the determined creatorId
    const departmentQuery = "SELECT * FROM department WHERE parent_id = 0 AND created_by = ?";
    const [departments] = await db.pool.promise().query(departmentQuery, [creatorId]);
 
    // Step 4: Format and return the department dropdown list
    const list = departments.map(dept => ({
      parent_id: dept.dept_id,
      department_name: dept.department_name
    }));
 
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching department dropdown:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const createDivison = (req, res) => {
  const { department_name, parent_id } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
 
    if (results.length > 0) {
      // User has a subscription, proceed to insert
      const created_by = user_id;
 
      const sql = `INSERT INTO department (department_name, parent_id, created_by) VALUES (?, ?, ?)`;
      db.pool.query(sql, [department_name, parent_id, created_by], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json({ message: 'Department added (via subscription)', departmentId: result.insertId });
      });
 
    } else {
      // Step 2: Check if the user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create department." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).json({ error: err.message });
 
          if (results.length > 0) {
            const sql = `INSERT INTO department (department_name, parent_id, created_by) VALUES (?, ?, ?)`;
            db.pool.query(sql, [department_name, parent_id, created_by], (err, result) => {
              if (err) return res.status(500).json({ error: err.message });
              return res.status(201).json({ message: 'Department added (via creator)', departmentId: result.insertId });
            });
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};

const deleteDivison = (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM department WHERE dept_id = ?';
  db.pool.query(sql, [id], (err, result) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Department not found' });
      }
      res.json({ message: 'Department deleted' });
  });
};

// get by id

const getALldivisionbyId= async (req, res) => {
  const  {id} =req.params;
  try {
    const sql = 'SELECT * FROM department WHERE dept_id=?';
    const result = await dbQuery(sql,[id]);

    // Check if result has any data
    if (!result || result.length === 0) {
      return res.status(404).send({ message: "No data found" });
    }

    // Process parent_id for each department
    const departmentsWithParentNames = await Promise.all(
      result.map(async (dept) => {
        if (dept.parent_id !== 0) {
          const result2Query = "SELECT department_name FROM department WHERE dept_id = ?";
          const parentDept = await dbQuery(result2Query, [dept.parent_id]);

          // If a parent department exists, add the parent department name
          if (parentDept.length > 0) {
            return { ...dept, parent_department_name: parentDept[0].department_name };
          }
        }
        // If no parent_id, return department as it is
        return { ...dept, parent_department_name: null };
      })
    );

    res.status(200).send({ data: departmentsWithParentNames });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const updateDivison = (req, res) => {
  const { id } = req.params;
  const { department_name, parent_id, created_by } = req.body;
 
  // Step 1: Fetch the current department data
  const fetchCurrentDataSql = 'SELECT * FROM department WHERE dept_id = ?';
  db.pool.query(fetchCurrentDataSql, [id], (fetchErr, fetchData) => {
    if (fetchErr) {
      console.error('Database fetch error:', fetchErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
 
    if (fetchData.length === 0) {
      return res.status(404).json({ success: false, message: 'Department record not found' });
    }
 
    const currentData = fetchData[0];
 
    // Step 2: Prepare the updated data
    const updatedData = {
      department_name: department_name !== undefined ? department_name : currentData.department_name,
      parent_id: parent_id !== undefined ? parent_id : currentData.parent_id,
      created_by: created_by !== undefined ? created_by : currentData.created_by, // fallback to existing
    };
 
    // Step 3: Update the department record
    const updateSql = `
      UPDATE department
      SET department_name = ?, parent_id = ?, created_by = ?
      WHERE dept_id = ?
    `;
    db.pool.query(updateSql, [
      updatedData.department_name,
      updatedData.parent_id,
      updatedData.created_by,
      id
    ], (updateErr, result) => {
      if (updateErr) {
        console.error('Database update error:', updateErr);
        return res.status(500).json({ success: false, message: 'An error occurred' });
      }
     
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Department record not found' });
      }
 
      return res.status(200).json({ success: true, message: 'Department updated successfully' });
    });
  });
};




const updateDepartment = (req, res) => {
  const { id } = req.params;
  const { department_name, created_by } = req.body;
 
  // Step 1: Fetch the current department data
  const fetchCurrentDataSql = 'SELECT * FROM department WHERE dept_id = ?';
  db.pool.query(fetchCurrentDataSql, [id], (fetchErr, fetchData) => {
    if (fetchErr) {
      console.error('Database fetch error:', fetchErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
 
    if (fetchData.length === 0) {
      return res.status(404).json({ success: false, message: 'Department record not found' });
    }
 
    const currentData = fetchData[0];
 
    // Step 2: Prepare the updated data
    const updatedData = {
      department_name: department_name !== undefined ? department_name : currentData.department_name,
      created_by: created_by !== undefined ? created_by : currentData.created_by
    };
 
    // Step 3: Update the department record
    const updateSql = `
      UPDATE department
      SET department_name = ?, created_by = ?
      WHERE dept_id = ?
    `;
    db.pool.query(updateSql, [
      updatedData.department_name,
      updatedData.created_by,
      id
    ], (updateErr, result) => {
      if (updateErr) {
        console.error('Database update error:', updateErr);
        return res.status(500).json({ success: false, message: 'An error occurred' });
      } else if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Department record not found' });
      } else {
        return res.status(200).json({ success: true, message: 'Department updated successfully' });
      }
    });
  });
};

const getDepartments = (req, res) => {
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
 
      let getDepartmentsQuery;
      let queryParams = [];
 
      if (isAdmin === 1) {
        // Admin: fetch own created departments
        if (!searchItem || searchItem.trim() === "") {
          getDepartmentsQuery = `SELECT * FROM department WHERE created_by = ? ORDER BY dept_id DESC`;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getDepartmentsQuery = `SELECT * FROM department WHERE created_by = ? AND department_name LIKE ? ORDER BY dept_id DESC`;
          queryParams = [id, searchQuery];
        }
      } else {
        // Non-admin: access departments created by their creator
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view departments." });
        }
 
        if (!searchItem || searchItem.trim() === "") {
          getDepartmentsQuery = `SELECT * FROM department WHERE created_by = ? ORDER BY dept_id DESC`;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getDepartmentsQuery = `SELECT * FROM department WHERE created_by = ? AND department_name LIKE ? ORDER BY dept_id DESC`;
          queryParams = [created_by, searchQuery];
        }
      }
 
      db.pool.query(getDepartmentsQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Database query error: ", err);
          return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching departments',
            error: err
          });
        }
 
        return res.status(200).json({
          success: true,
          data: result,
          message: 'Departments fetched successfully',
        });
      });
    });
  } catch (error) {
    console.error("Error in getDepartments: ", error);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred',
    });
  }
};
const addDepartment = (req, res) => {
  const { department_name } = req.body;
  const user_id = req.id;
 
  // Step 1: Check if user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, proceed
      const created_by = user_id;
 
      const sql = "INSERT INTO department (department_name, created_by) VALUES (?, ?)";
      const values = [department_name, created_by];
 
      db.pool.query(sql, values, (err, data) => {
        if (err) {
          console.error("Database query error: ", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        return res.status(201).json({ message: "Department added successfully", departmentId: data.insertId });
      });
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to add a department." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            const sql = "INSERT INTO department (department_name, created_by) VALUES (?, ?)";
            const values = [department_name, created_by];
 
            db.pool.query(sql, values, (err, data) => {
              if (err) {
                console.error("Database query error: ", err);
                return res.status(500).json({ error: "Internal Server Error" });
              }
              return res.status(201).json({ message: "Department added successfully", departmentId: data.insertId });
            });
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};

 
 
module.exports = {
  getAllEmployeeHistories,
  createDesignation,
  getAllPositions,
  getAllDivision,
  getALlDutyTypes,
  getAllFrequencyType,
  getAllRateTypes,
  maritalSaatus,
  getGender,
  createEmployeeHistory,
  deleteEmployee,
  getemployeeBYID,
  updateEmployeeHistory,
  getDepartments,
  addDepartment,
  deleteDepartment,
  updateDepartment,
  getDepartmentById,
  departmentDropdown,
  createDivison,
  deleteDivison,
  getALldivisionbyId,
  updateDivison,
  deletePosition,
  getPositionById,
  updatePosition
  
};
