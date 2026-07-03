const db = require("../utils/db");
const axios =require("axios")
const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const nodemailer=require("nodemailer")
const bcrypt = require('bcryptjs');
const saltRounds = 10; // You can increase this value for more security

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


const addUser = async (req, res) => {
  try {
    // Clean request body
    const body = {};
    for (let key in req.body) {
      body[key.trim()] = req.body[key];
    }
 
    const id = req.id; // Assuming user ID from middleware (e.g., token auth)
    const { firstname, lastname, about, email, password, status, is_admin, super_admin } = body;
 
    // Validate required fields
    if (!firstname || !lastname || !email || !password || status === undefined) {
      return res.status(400).send({ error: "Missing required fields" });
    }
 
    // Check if email already exists
    const checkEmailQuery = "SELECT COUNT(*) AS count FROM user WHERE email = ?";
    db.pool.query(checkEmailQuery, [email], (err, result) => {
      if (err) return res.status(500).send({ error: "Error checking email", details: err.message });
      if (result[0].count > 0) return res.status(409).send({ error: "Email already in use" });
 
      // ✅ Super admin bypasses subscription check
      if (parseInt(super_admin) === 1) {
        return insertUser(null); // Pass null for subscription_id
      }
 
      // 🔍 Fetch subscription plan for regular user
      const subscriptionQuery = "SELECT plan_id FROM superadmin_user_plans WHERE user_id = ? AND package_status = 'approved' ORDER BY user_plan_id DESC LIMIT 1";
      db.pool.query(subscriptionQuery, [id], (err, subscriptionResult) => {
        if (err) return res.status(500).send({ error: "Error fetching subscription", details: err.message });
        if (subscriptionResult.length === 0) return res.status(404).send({ error: "Subscription not found" });
 
        const subscription_id = subscriptionResult[0].plan_id;
 
        // Get subscription plan details
        const getSubscriptionQuery = "SELECT * FROM subscription_plans WHERE plan_id = ?";
        db.pool.query(getSubscriptionQuery, [subscription_id], (err, subscriptionData) => {
          if (err) return res.status(500).send({ error: "Error fetching subscription plan", details: err.message });
          if (subscriptionData.length === 0) return res.status(404).send({ error: "Subscription plan not found" });
 
          const subscription = subscriptionData[0];
          const userLimit = subscription.number_of_active_users;
 
          // Count users under this subscription
          const countUsersQuery = "SELECT COUNT(*) AS totalUsers FROM user WHERE created_by = ?";
          db.pool.query(countUsersQuery, [id], async (err, userCountResult) => {
            if (err) return res.status(500).send({ error: "Error counting users", details: err.message });
 
            const totalUsers = userCountResult[0].totalUsers;
            console.log("userlimit",userLimit,"totausers",totalUsers)
 
            // 🚫 If plan is limited and limit reached
            if (userLimit !== 0 && totalUsers >= userLimit) {
              return res.status(403).send({ error: "User creation limit reached for your plan" });
            }
 
            // ✅ Insert user
            insertUser(subscription_id);
          });
        });
      });
 
      // ✅ Common function to insert user
      async function insertUser(subscription_id) {
        try {
          const image = req.file ? req.file.filename : null;
          const last_login = new Date().toISOString();
          const hashedPassword = await bcrypt.hash(password, 10);
 
          const insertUserQuery = `
            INSERT INTO user
              (firstname, lastname, about, email, password, image, last_login, last_logout, status, is_admin, subscription_id, created_by, super_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const values = [
            firstname,
            lastname,
            about,
            email,
            hashedPassword,
            image,
            last_login,
            null,         // last_logout
            status,
            is_admin,
            subscription_id,
            id,
            super_admin
          ];
 
          db.pool.query(insertUserQuery, values, (err, data) => {
            if (err) {
              return res.status(500).send({ error: "Error adding user", details: err.message });
            }
            return res.status(201).send({ message: "User added successfully", data });
          });
        } catch (err) {
          return res.status(500).send({ error: "Insert error", details: err.message });
        }
      }
    });
  } catch (err) {
    return res.status(500).send({ error: "Internal server error", details: err.message });
  }
};

const addBulkUsers = async (req, res) => {
    try {
      if (!req.body.users || !Array.isArray(req.body.users) || req.body.users.length === 0) {
        return res.status(400).json({ error: "Invalid or empty file uploaded" });
      }

      const callerUserId = req.id;
      const [callerRows] = await db.pool.promise().query(
        "SELECT is_admin, created_by FROM user WHERE id = ?", [callerUserId]
      );
      if (!callerRows.length) return res.status(404).json({ error: "User not found" });
      const { is_admin, created_by: callerCreatedBy } = callerRows[0];
      const creatorId = is_admin === 1 ? callerUserId : callerCreatedBy;
      if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

      const users = req.body.users;

      for (let user of users) {
        const { firstname, lastname, about, email, password, status, is_admin: userIsAdmin } = user;

        if (!firstname || !lastname || !email || !password || status === undefined) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const checkEmailQuery = "SELECT COUNT(*) AS count FROM user WHERE email = ?";
        const [existingUser] = await db.pool.promise().query(checkEmailQuery, [email]);

        if (existingUser[0].count > 0) {
          return res.status(409).json({ error: `User with email ${email} already exists` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery = `
          INSERT INTO user (firstname, lastname, about, email, password, status, is_admin, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.pool.promise().query(insertUserQuery, [
          firstname, lastname, about, email, hashedPassword, status, userIsAdmin, creatorId
        ]);
      }

      res.status(200).json({ message: "Users uploaded successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  
  // const getUsers = async (req, res) => {
  //   const { searchItem } = req.query; // Assuming searchItem comes from query parameters
  //   let sql = "SELECT * FROM user WHERE 1=1";
  
  //   if (searchItem) {
  //     sql += ` AND (firstname LIKE ? 
  //                  OR lastname LIKE ? 
  //                  OR about LIKE ? 
  //                  OR email LIKE ? 
  //                  OR last_login LIKE ? 
  //                  OR last_logout LIKE ? 
  //                  OR ip_address LIKE ? 
  //                  OR status=1 AND 'active' LIKE ? 
  //                    OR status=0 AND 'inactive' LIKE ? 
  
  //                  OR CONCAT(firstname, ' ', lastname) LIKE ?)`;
  //   }
  
  //   const searchValue = `%${searchItem}%`; // Use wildcard for partial match
  //   const values = [
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //     searchValue,
  //   ];
  //   sql+=` ORDER BY id DESC`
  
  //   db.pool.query(sql, searchItem ? values : [], (err, data) => {
  //     if (err) {
  //       return res
  //         .status(500)
  //         .send({ error: "Unable to fetch data", details: err });
  //     }
  //     return res.status(200).send({ data: data });
  //   });
  // };

 const getUsers = async (req, res) => {
  const id = req.id; // from auth middleware
  const { searchItem } = req.query;
 console.log(id)
  // Step 1: Get user details
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
 
    let sql;
    let values = [];
 
    // Step 2: Build SQL based on isAdmin
    if (isAdmin === 1) {
      sql = "SELECT * FROM user WHERE created_by = ?";
      values.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view users." });
      }
      sql = "SELECT * FROM user WHERE created_by = ?";
      values.push(created_by);
    }
 
    // Step 3: Apply search filter if present
    if (searchItem && searchItem.trim() !== "") {
      sql += ` AND (
        firstname LIKE ?
        OR lastname LIKE ?
        OR about LIKE ?
        OR email LIKE ?
        OR last_login LIKE ?
        OR last_logout LIKE ?
        OR ip_address LIKE ?
        OR (status = 1 AND ? LIKE 'active')
        OR (status = 0 AND ? LIKE 'inactive')
        OR CONCAT(firstname, ' ', lastname) LIKE ?
      )`;
 
      const searchValue = `%${searchItem}%`;
      values.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchItem,
        searchItem,
        searchValue
      );
    }
 
    sql += " ORDER BY id DESC";
 
    db.pool.query(sql, values, (err, data) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Unable to fetch users", error: err });
      }
 
      return res.status(200).json({ success: true, data, message: "Users fetched successfully" });
    });
  });
};
  const deleteUser = async (req, res) => {
    const { id } = req.params;
    const callerUserId = req.id;

    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [callerUserId], (err, userResult) => {
      if (err) return res.status(500).json({ error: "Server error" });
      if (!userResult.length) return res.status(404).json({ error: "User not found" });
      const { is_admin, created_by: callerCreatedBy } = userResult[0];
      const creatorId = is_admin === 1 ? callerUserId : callerCreatedBy;
      if (!creatorId) return res.status(403).json({ error: "Unauthorized" });

    const sqlFetchImage = `SELECT image FROM user WHERE id = ? AND created_by = ?`;
    db.pool.query(sqlFetchImage, [id, creatorId], (err, result) => {
      if (err) {
        console.error("Error fetching image:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", details: err });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const imageFilename = result[0].image;

      const sqlDeleteUser = `DELETE FROM user WHERE id = ? AND created_by = ?`;
      db.pool.query(sqlDeleteUser, [id, creatorId], (err, result) => {
        if (err) {
          console.error("Error deleting user:", err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", details: err });
        }
  
        if (imageFilename) {
          const imagePath = path.join(__dirname, "../asset/user", imageFilename);
          if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error("Error deleting image file:", unlinkErr);
                return res
                  .status(500)
                  .json({ error: "Internal Server Error", details: unlinkErr });
              }
              return res.json({
                message: "User and image file deleted successfully",
              });
            });
          } else {
            return res.json({
              message: "User deleted successfully, image file not found",
            });
          }
        } else {
          return res.json({
            message: "User deleted successfully, no associated image",
          });
        }
      });
    });
    });
  };




const getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const callerUserId = req.id;

    const [callerRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [callerUserId]
    );
    if (!callerRows.length) return res.status(404).send({ error: 'User not found' });
    const { is_admin, created_by: callerCreatedBy } = callerRows[0];
    const creatorId = is_admin === 1 ? callerUserId : callerCreatedBy;
    if (!creatorId) return res.status(403).send({ error: 'Unauthorized' });

    // Allow viewing own record or records created by this tenant
    const getUserQuery = 'SELECT * FROM user WHERE id = ? AND (created_by = ? OR id = ?)';

    db.pool.query(getUserQuery, [id, creatorId, callerUserId], (err, result) => {
      if (err) {
        return res.status(500).send({ error: 'Error while fetching user', details: err.message });
      }

      if (result.length === 0) {
        return res.status(404).send({ error: 'User not found' });
      }

      const user = {
        firstname: result[0].firstname,
        lastname: result[0].lastname,
        email: result[0].email,
        about: result[0].about,
        image: result[0].image,
        status: result[0].status,
        is_admin: result[0].is_admin,
      };

      res.status(200).send({ message: 'User retrieved successfully', data: user });
    });
  } catch (err) {
    res.status(500).send({ error: 'Internal server error', details: err.message });
  }
};



  
const logoutUser = async (req, res) => {
  const { id } = req.params;
  
  const sql = `UPDATE user SET last_logout = NOW() WHERE id = ?`;
  db.pool.query(sql, [id], (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send("Logout successful");
    }
  });
};
  

const loginUser = async (req, res) => {
  const { email, password, superadmin } = req.body;

  if (!email) return res.status(400).send({ message: "Email is required" });

  const sql = `SELECT * FROM user WHERE email = ?`;

  db.pool.query(sql, [email], async (err, data) => {
    if (err)
      return res.status(500).send({ error: "Internal server error", details: err.message });
    if (data.length === 0) return res.status(401).send({ message: "Invalid email" });

    const user = data[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1440m"
    });

    const updateLoginSql = `UPDATE user SET last_login = NOW(), authtoken = ? WHERE id = ?`;

    // ✅ Super Admin Impersonation (only by email)
    if (superadmin === true) {
      const superAdminCheckQuery = `SELECT * FROM user WHERE super_admin = 2 LIMIT 1`;

      db.pool.query(superAdminCheckQuery, async (err, saData) => {
        if (err || saData.length === 0) {
          return res
            .status(403)
            .send({ message: "Super Admin privilege required to impersonate" });
        }

        db.pool.query(updateLoginSql, [token, user.id], (updateErr) => {
          if (updateErr) {
            return res
              .status(500)
              .send({ error: "Login update failed", details: updateErr.message });
          }

          const subQuery = `
            SELECT start_date, end_date, plan_id, package_status
            FROM superadmin_user_plans
            WHERE user_id = ?
            ORDER BY user_plan_id DESC
            LIMIT 1
          `;

          db.pool.query(subQuery, [user.id], (subErr, plans) => {
            const plan = plans?.[0] || null;
            return res.status(200).send({
              message: "Admin login successful",
              token,
              userId: user.id,
              username: `${user.firstname} ${user.lastname}`,
              isAdmin: true,
              superAdmin: user.super_admin === 2,
              planData: plan,
              subscriptionStatus: plan
                ? new Date() > new Date(plan.end_date)
                  ? "expired"
                  : "active"
                : "no_subscription"
            });
          });
        });
      });
      return;
    }

    // ✅ Password check for regular login
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).send({ message: "Invalid email or password" });
    }

    // ✅ Super Admin login (normal)
    if (user.super_admin === 2 && !superadmin) {
      db.pool.query(updateLoginSql, [token, user.id], (updateErr) => {
        if (updateErr)
          return res
            .status(500)
            .send({ error: "Login update failed", details: updateErr.message });

        return res.status(200).send({
          message: "Super Admin login successful",
          token,
          userId: user.id,
          username: `${user.firstname} ${user.lastname}`,
          isAdmin: false,
          superAdmin: true,
          websitelink: "https://krayon.softwarestesting.co.in/superadmin",
          subscriptionStatus: "superadmin"
        });
      });
      return;
    }

    // 🔒 Subscription check
    const subQuery = `
      SELECT start_date, end_date, plan_id, package_status
      FROM superadmin_user_plans
      WHERE user_id = ?
      ORDER BY user_plan_id DESC
      LIMIT 1
    `;

    db.pool.query(subQuery, [user.id], (err, plans) => {
      const plan = plans?.[0] || null;
      let subscriptionStatus = "no_subscription";

      if (plan) {
        if (plan.package_status.toLowerCase() !== "approved") {
          subscriptionStatus = "not_approved";
        } else if (new Date() > new Date(plan.end_date)) {
          subscriptionStatus = "expired";
        } else {
          subscriptionStatus = "active";
        }
      }

      db.pool.query(updateLoginSql, [token, user.id], (updateErr) => {
        if (updateErr)
          return res
            .status(500)
            .send({ error: "Login update failed", details: updateErr.message });

        // ✅ Admin login
        if (user.is_admin === 1) {
          return res.status(200).send({
            message: "Admin login successful",
            token,
            userId: user.id,
            username: `${user.firstname} ${user.lastname}`,
            isAdmin: true,
            superAdmin: false,
            planData: plan,
            subscriptionStatus
          });
        }

        // ✅ Normal user → fetch permissions
        const roleQuery = `SELECT fk_role_id FROM sec_user_access_tbl WHERE fk_user_id = ?`;
        db.pool.query(roleQuery, [user.id], (roleErr, roleData) => {
          if (roleErr || roleData.length === 0) {
            return res
              .status(403)
              .send({ message: "Role not assigned or error fetching role" });
          }

          const roleId = roleData[0].fk_role_id;
          const permissionQuery = `SELECT * FROM sec_role_permission WHERE role_id = ?`;

          db.pool.query(permissionQuery, [roleId], (permErr, permData) => {
            if (permErr) {
              return res
                .status(500)
                .send({ error: "Permission fetch failed", details: permErr.message });
            }

            return res.status(200).send({
              message: "Login successful",
              token,
              userId: user.id,
              username: `${user.firstname} ${user.lastname}`,
              isAdmin: false,
              superAdmin: false,
              roleId,
              permData,
              planData: plan,
              subscriptionStatus
            });
          });
        });
      });
    });
  });
};

  const updateUser = async (req, res) => {
  const { id } = req.params;
  const callerUserId = req.id;
  const {
    firstname,
    lastname,
    about,
    email,
    password,
    status,
    is_admin,
  } = req.body;

  // Resolve caller's tenant context
  let creatorId;
  try {
    const [callerRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [callerUserId]
    );
    if (!callerRows.length) return res.status(404).json({ error: "User not found" });
    const { is_admin: callerIsAdmin, created_by: callerCreatedBy } = callerRows[0];
    creatorId = callerIsAdmin === 1 ? callerUserId : callerCreatedBy;
    if (!creatorId) return res.status(403).json({ error: "Unauthorized" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }

  // Fetch target user — must belong to tenant or be the caller themselves
  const fetchCurrentDataSql = "SELECT * FROM user WHERE id = ? AND (created_by = ? OR id = ?)";
  db.pool.query(fetchCurrentDataSql, [id, creatorId, callerUserId], async (fetchErr, fetchData) => {
    if (fetchErr) {
      console.error("Database fetch error: ", fetchErr);
      return res.status(500).json({ error: "Internal Server Error" });
    }
 
    if (fetchData.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
 
    const currentData = fetchData[0];
 
    let newImageFilename = currentData.image;
    if (req.file) {
      newImageFilename = req.file.filename;
 
      if (currentData.image) {
        const oldFilePath = path.join(__dirname, "../assets/users", currentData.image);
        if (fs.existsSync(oldFilePath)) {
          fs.unlink(oldFilePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Error deleting old file: ", unlinkErr);
            }
          });
        }
      }
    }
 
    let hashedPassword = currentData.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }
 
    const sql = `UPDATE user
                SET firstname = ?, lastname = ?, about = ?, email = ?, status = ?, is_admin = ?,
                    password = ?, image = ?, created_by = ?
                WHERE id = ?`;

    const values = [
      firstname || currentData.firstname,
      lastname || currentData.lastname,
      about || currentData.about,
      email || currentData.email,
      status || currentData.status,
      is_admin || currentData.is_admin,
      hashedPassword,
      newImageFilename,
      currentData.created_by,  // always keep stored value
      id
    ];
 
    db.pool.query(sql, values, (err, data) => {
      if (err) {
        console.error("Database query error: ", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
 
      return res.json({ message: "User data updated successfully" });
    });
  });
};


  const getAllCountry = async (req, res) => {
    try {
      const adminId = req.user?.created_by || req.user?.id;
      db.pool.query('SELECT id, name AS countryName FROM countries', (err, results) => {
        if (err) {
          console.error('Error fetching countries from DB:', err);
          return res.status(500).json({ error: 'Failed to retrieve country names' });
        }
        res.status(200).json({ data: results });
      });
    } catch (error) {
      console.error('Error fetching country names:', error);
      res.status(500).json({ error: 'Failed to retrieve country names' });
    }
  };

  const checkIncheckOut = async (req, res) => {
    try {
      const callerUserId = req.id;
      const [callerRows] = await db.pool.promise().query(
        "SELECT is_admin, created_by FROM user WHERE id = ?", [callerUserId]
      );
      if (!callerRows.length) return res.status(404).json({ message: "User not found", success: false });
      const { is_admin, created_by: callerCreatedBy } = callerRows[0];
      const creatorId = is_admin === 1 ? callerUserId : callerCreatedBy;
      if (!creatorId) return res.status(403).json({ message: "Unauthorized", success: false });

      const query = `SELECT id, CONCAT(firstname, ' ', lastname) AS username, last_login, last_logout FROM user WHERE created_by = ? OR id = ?`;

      const result = await dbQuery(query, [creatorId, creatorId]);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "No data found" });
      }
  
      // Function to format date and time
      const formatDateTime = (dateTime) => {
        if (!dateTime) return { date: null, time: null }; // Handle null values gracefully
        const dateObj = new Date(dateTime);
        if (isNaN(dateObj)) {
          throw new Error(`Invalid date value: ${dateTime}`);
        }
        const date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
        const time = dateObj.toTimeString().split(' ')[0]; // Extract HH:MM:SS
        return { date, time };
      };
  
      // Map and format data
      const dataMap = result.map((data) => {
        const loginDateTime = formatDateTime(data.last_login);
        const logoutDateTime = formatDateTime(data.last_logout);
  
        return {
          userid: data.id,
          username: data.username,
          last_login_date: loginDateTime.date,
          last_login_time: loginDateTime.time,
          last_logout_date: logoutDateTime.date,
          last_logout_time: logoutDateTime.time
        };
      });
  
      res.status(200).json({ data: dataMap });
    } catch (err) {
      res.status(500).json({ message: err.message, success: false });
    }
  };


  const ForgetPasswordController = async (req, res) => {
    const { email } = req.body;
    console.log("email",email)

    try {
        // Fetch user from the database
        const rows = await dbQuery('SELECT * FROM user WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const user = rows[0];
        const id = user.id;

        // Generate a JWT token
        const token = jwt.sign(
            { id: id },
            process.env.JWT_SECRET || 'uhkjhkh', // Replace 'uhkjhkh' with a strong secret or use an environment variable
            { expiresIn: '1h' }
        );

        // Configure the email transporter
        const transporter = nodemailer.createTransport({
          host: "mail.theprojectxyz.xyz",
          port: 465, // or 587
          secure: true, 
          auth: {
            user: "akashlakshkar@theprojectxyz.xyz",
            pass: "jBkPx@+Wjj^A",
          },
        });
       
        console.log("userid and token",id,token)
        
        // Email options
        const mailOptions = {
            from: 'support@krayon.upgradu.in',
            to: user.email, // Recipient address
            subject: 'Password Reset Request', // Subject line
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <p><a href="https://krayon.softwarestesting.co.in/frontend/resetpassword/${id}/${token}">Reset Password</a></p>
                <p>If you did not request this, please ignore this email.</p>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        res.status(200).json({ message: 'Password reset link sent to email' });

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const resetPasswordController = async (req, res) => {
  const { id, token } = req.params; // Extract user ID and token from request parameters
  const { password } = req.body; // Extract new password from request body

  try {
      console.log("Reset Password Initiated");
      console.log("User ID and Token:", id, token);

      // Fetch user by ID
      const user = await dbQuery("SELECT * FROM user WHERE id = ?", [id]);
      if (user.length === 0) {
          return res.status(404).json({ error: "User not found." });
      }

      console.log("User Found:", user);

      // Hash the password using bcrypt before storing it (recommended for security)
      const saltRounds = 10; // Number of salt rounds
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user's password in the database
      await dbQuery("UPDATE user SET password = ? WHERE id = ?", [hashedPassword, id]);

      res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
      console.error("Error in Reset Password Controller:", error);
      res.status(500).json({ error: "An error occurred while resetting the password." });
  }
};

const activateExe = async (req, res) => {
  const { email, subscription_key } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const users = await db.query("SELECT * FROM user WHERE email = ? LIMIT 1", [email]);

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    const subQuery = `
      SELECT sup.*, sp.package_name, sp.price_with_currency, sp.number_of_active_users,
             sp.interval_value, sp.currency, sp.price_interval, sp.trial_days,
             sp.number_of_invoice, sp.status AS plan_status, sp.package_description
      FROM superadmin_user_plans sup
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      WHERE sup.user_id = ?
      ORDER BY sup.user_plan_id DESC
      LIMIT 1
    `;
    const subs = await db.query(subQuery, [user.id]);

    if (!subs || subs.length === 0) {
      return res.status(403).json({ success: false, message: "No valid subscription found" });
    }

    const sub = subs[0];

    // If DB has no key yet, store the provided key (first activation or new plan)
    if (!sub.subscription_key && subscription_key) {
      await db.query(
        "UPDATE superadmin_user_plans SET subscription_key = ? WHERE user_plan_id = ?",
        [subscription_key, sub.user_plan_id]
      );
    }

    const restaurants = await db.query(
      "SELECT * FROM restaurant_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );

    const restaurant = restaurants?.[0] || null;

    const plan = {
      plan_id: sub.plan_id,
      package_name: sub.package_name,
      currency: sub.currency,
      price_interval: sub.price_interval,
      price_with_currency: sub.price_with_currency,
      number_of_active_users: sub.number_of_active_users,
      interval_value: sub.interval_value,
      package_description: sub.package_description,
      number_of_invoice: sub.number_of_invoice,
      status: sub.plan_status,
      trial_days: sub.trial_days,
    };

    const subscription = {
      user_plan_id: sub.user_plan_id,
      user_id: sub.user_id,
      plan_id: sub.plan_id,
      payment_type: sub.payment_type,
      payment_method: sub.payment_method,
      start_date: sub.start_date,
      end_date: sub.end_date,
      trial_date: sub.trial_date,
      package_status: sub.package_status,
      created_by: sub.created_by,
      created_at: sub.created_at,
      subscription_key: sub.subscription_key || subscription_key || null,
    };

    return res.json({
      success: true,
      message: "EXE activated successfully",
      data: { user, restaurant, subscription, plan },
    });
  } catch (error) {
    console.error("ACTIVATE EXE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

  module.exports={
    addUser,
    getUsers,
    deleteUser,
    getUserById,
    updateUser,
    loginUser,
    logoutUser,
    getAllCountry,
    checkIncheckOut,
    ForgetPasswordController,
    resetPasswordController,
    addBulkUsers,
    activateExe
  }