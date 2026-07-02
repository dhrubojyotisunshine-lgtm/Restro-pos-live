const db = require("../utils/db");
const bcrypt = require("bcryptjs");
const path=require('path')
const fs=require('fs')




// exports.createCompany = async (req, res) => {
//   const {
//     restaurant_name,
//     address,
//     website,
//     date_format,
//     time_zone,
//     status,
//     country,
//     state,
//     city,
//     zipcode,
//     currency_symbol,
//     currency_position,
//     plan_id,
//     admin_name,
//     phone_number,
//     email,
//     password,
   
//   } = req.body;
 
//   const invoice_logo = req.file ? req.file.filename : "";
//   const startDate = new Date();
 
//   try {
//     if (!admin_name || !email || !password) {
//       return res.status(400).json({ error: "Admin name, email, and password are required." });
//     }
 
//     // Check if email already exists
//     const checkEmailExistQuery = `SELECT email FROM user WHERE email = ?`;
//     const existingUser = await new Promise((resolve, reject) => {
//       db.pool.query(checkEmailExistQuery, [email], (err, result) => {
//         if (err) return reject(err);
//         resolve(result);
//       });
//     });
 
//     if (existingUser.length > 0) {
//       return res.status(409).json({ warning: "Email already exists. Please try another email." });
//     }
 
//     // Proceed if email doesn't exist
//     const hashedPassword = await bcrypt.hash(password, 10);
 
//     const nameParts = admin_name.trim().split(" ");
//     const firstname = nameParts[0] || "";
//     const lastname = nameParts.slice(1).join(" ") || "";
 
//     // Insert into user table
//     const userInsertQuery = `
//       INSERT INTO user (firstname, lastname, email, password, subscription_id, is_admin)
//       VALUES (?, ?, ?, ?, ?, 1)
//     `;
//     const userResult = await new Promise((resolve, reject) => {
//       db.pool.query(userInsertQuery, [firstname, lastname, email, hashedPassword, plan_id], (err, result) => {
//         if (err) return reject(err);
//         resolve(result);
//       });
//     });
 
//     const user_id = userResult.insertId;
 
//     // Insert into restaurant_settings table
//     const restaurantInsertQuery = `
//       INSERT INTO restaurant_settings
//       (restaurant_name, invoice_logo, address, website, date_format, phone_number, time_zone, status,country,state,city,zipcode,currency_symbol, currency_position, plan_id, user_id)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
//     `;
 
//     await new Promise((resolve, reject) => {
//       db.pool.query(
//         restaurantInsertQuery,
//         [
//           restaurant_name,
//           invoice_logo,
//           address || "",
//           website || "",
//           date_format || "YYYY-MM-DD",
//           phone_number || "",
//           time_zone || "UTC",
//           status || "Active",
//           country,
//           state,
//           city,
//           zipcode,
         
//           currency_symbol || "$",
//           currency_position || "left",
//           plan_id || "basic",
//           user_id
//         ],
//         (err, result) => {
//           if (err) return reject(err);
//           resolve(result);
//         }
//       );
//     });
 
//     // Get plan details
//       const [planRows] = await db.pool
//          .promise()
//          .query(
//           `SELECT  plan_id, package_name, price_interval, interval_value,trial_days FROM subscription_plans WHERE plan_id = ?`,
//           [plan_id]
//          );
   
//       if (planRows.length === 0) {
//          return res.status(404).json({ error: 'Plan not found' });
//       }
   
//       const plan = planRows[0];
//       const { price_interval, interval_value,trial_days } = plan;
   
//       const start = new Date(startDate || new Date());
//       const end = new Date(start);
   
//       if (price_interval === "Day") {
//          end.setDate(end.getDate() + interval_value);
//       } else if (price_interval === "Month") {
//          end.setMonth(end.getMonth() + interval_value);
//       } else if (price_interval === "Year") {
//          end.setFullYear(end.getFullYear() + interval_value);
//       }
     
//   console.log("trial_days",plan.trial_days)
//   const finalEnd = new Date(end);
// finalEnd.setDate(finalEnd.getDate() + trial_days);
//       // Format dates as YYYY-MM-DD
//       const formatDate = (date) => {
//          const yyyy = date.getFullYear();
//          const mm = String(date.getMonth() + 1).padStart(2, '0');
//          const dd = String(date.getDate()).padStart(2, '0');
//          return `${yyyy}-${mm}-${dd}`;
//       };
   
//       const formattedStartDate = formatDate(start);
//       const formattedEndDate = formatDate(finalEnd);
//       const trial_date = formattedStartDate + trial_days;
//       const trialEnd = new Date(start);
//       trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
//       const formattedTrialEndDate = formatDate(trialEnd);
     
       
   
 
//     // Insert into superadmin_user_plans
//     await new Promise((resolve, reject) => {
//       db.pool.query(
//         `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date,trial_date,package_status) VALUES (?, ?, ?, ?, ?, "approved")`,
//         [
//           user_id,
//           plan_id,
         
//           formattedStartDate,
//           formattedEndDate,
//           formattedTrialEndDate,
         
//         ],
//         (err) => {
//           if (err) return reject(err);
//           resolve();
//         }
//       );
//     });
 
//     res.status(201).json({ message: "Restaurant setting created successfully", user_id });
 
//   } catch (error) {
//     console.error("Database Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


exports.createCompany = async (req, res) => {
  const {
    restaurant_name,
    address,
    website,
    date_format,
    time_zone,
    status,
    country,
    state,
    city,
    zipcode,
    currency_symbol,
    currency_position,
    plan_id,
    admin_name,
    phone_number,
    email,
    password,
   
  } = req.body;
 
  const invoice_logo = req.file ? req.file.filename : "";
  const startDate = new Date();
 console.log("mobile",req.body)
  try {
    if (!admin_name || !email || !password) {
      return res.status(400).json({ error: "Admin name, email, and password are required." });
    }
 
    // Check if email already exists
    const checkEmailExistQuery = `SELECT email FROM user WHERE email = ?`;
    const existingEmail = await new Promise((resolve, reject) => {
      db.pool.query(checkEmailExistQuery, [email], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
 
    if (existingEmail.length > 0) {
      return res.status(409).json({ warning: "Email already exists. Please try another email." });
    }

    // Check if phone number already exists
    const checkPhoneExistQuery = `SELECT phone_number FROM restaurant_settings WHERE phone_number = ?`;
    const existingPhone = await new Promise((resolve, reject) => {
      db.pool.query(checkPhoneExistQuery, [phone_number], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    if (existingPhone.length > 0) {
      return res.status(409).json({ warning: "Phone number already exists. Please try another phone number." });
    }
 
    // Proceed if email and phone number don't exist
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const nameParts = admin_name.trim().split(" ");
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";
 
    // Insert into user table
    const userInsertQuery = `
      INSERT INTO user (firstname, lastname, email, password, subscription_id, is_admin)
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    const userResult = await new Promise((resolve, reject) => {
      db.pool.query(userInsertQuery, [firstname, lastname, email, hashedPassword, plan_id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
 
    const user_id = userResult.insertId;
 
    // Insert into restaurant_settings table
    const restaurantInsertQuery = `
      INSERT INTO restaurant_settings
      (restaurant_name, invoice_logo, address, website, date_format, phone_number, time_zone, status,country,state,city,zipcode,currency_symbol, currency_position, plan_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
    `;
 
    await new Promise((resolve, reject) => {
      db.pool.query(
        restaurantInsertQuery,
        [
          restaurant_name,
          invoice_logo,
          address || "",
          website || "",
          date_format || "YYYY-MM-DD",
          phone_number,
          time_zone || "UTC",
          status || "Active",
           country,
          state,
          city,
           zipcode,
         
          currency_symbol || "$",
          currency_position || "left",
          plan_id || "basic",
          user_id
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
 
    // Get plan details
       const [planRows] = await db.pool
         .promise()
         .query(
           `SELECT  plan_id, package_name, price_interval, interval_value,trial_days FROM subscription_plans WHERE plan_id = ?`,
           [plan_id]
         );
   
       if (planRows.length === 0) {
         return res.status(404).json({ error: 'Plan not found' });
       }
   
       const plan = planRows[0];
       const { price_interval, interval_value,trial_days } = plan;
   
       const start = new Date(startDate || new Date());
       const end = new Date(start);
   
       if (price_interval === "Day") {
         end.setDate(end.getDate() + interval_value);
       } else if (price_interval === "Month") {
         end.setMonth(end.getMonth() + interval_value);
       } else if (price_interval === "Year") {
         end.setFullYear(end.getFullYear() + interval_value);
       }
     
   console.log("trial_days",plan.trial_days)
  const finalEnd = new Date(end);
finalEnd.setDate(finalEnd.getDate() + trial_days);
       // Format dates as YYYY-MM-DD
       const formatDate = (date) => {
         const yyyy = date.getFullYear();
         const mm = String(date.getMonth() + 1).padStart(2, '0');
         const dd = String(date.getDate()).padStart(2, '0');
         return `${yyyy}-${mm}-${dd}`;
       };
   
       const formattedStartDate = formatDate(start);
       const formattedEndDate = formatDate(finalEnd);
       const trial_date = formattedStartDate + trial_days;
       const trialEnd = new Date(start);
       trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
       const formattedTrialEndDate = formatDate(trialEnd);
     
       
   
 
    // Insert into superadmin_user_plans
    await new Promise((resolve, reject) => {
      db.pool.query(
        `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date,trial_date,package_status) VALUES (?, ?, ?, ?, ?, "approved")`,
        [
          user_id,
          plan_id,
         
          formattedStartDate,
          formattedEndDate,
          formattedTrialEndDate,
         
        ],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
 
    res.status(201).json({ message: "Restaurant setting created successfully", user_id });
 
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// exports.getCompany = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         rs.sl_no,
//         rs.restaurant_name,
//         rs.invoice_logo,
//         rs.address,
//         rs.website,
//         rs.date_format,
//         rs.phone_number,
//         rs.time_zone,
//         rs.status,
//         rs.currency_symbol,
//         rs.currency_position,
//         rs.plan_id,
//         sp.package_name AS plan_name,
//         CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
//         u.email,
//         sup.start_date,
//         sup.end_date,
//         DATEDIFF(sup.end_date, CURDATE()) AS remaining_days
//       FROM restaurant_settings rs
//       LEFT JOIN user u ON rs.user_id = u.id
//       LEFT JOIN subscription_plans sp ON rs.plan_id = sp.plan_id
//       LEFT JOIN superadmin_user_plans sup ON rs.user_id = sup.user_id
//       ORDER BY rs.sl_no DESC
//     `;
 
//     const [rows] = await db.pool.promise().query(query);
 
//     res.status(200).json({ data: rows });
//   } catch (error) {
//     console.error("Error fetching restaurant settings:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


//final according to city state and country
// exports.getCompany = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         rs.sl_no,
//         rs.restaurant_name,
//         rs.invoice_logo,
//         rs.address,
//         rs.website,
//         rs.date_format,
//         rs.phone_number,
//         rs.time_zone,
//         rs.status,
//         c.name AS country,
//         s.name AS state,
//         ci.name AS city,
//         rs.currency_symbol,
//         rs.currency_position,
//         rs.plan_id,
//         sp.package_name AS plan_name,
//         CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
//         u.email,
//         sup.start_date,
//         sup.end_date,
//         DATEDIFF(sup.end_date, CURDATE()) AS remaining_days
//       FROM restaurant_settings rs
//       LEFT JOIN user u ON rs.user_id = u.id
//       LEFT JOIN subscription_plans sp ON rs.plan_id = sp.plan_id
//       LEFT JOIN superadmin_user_plans sup ON rs.user_id = sup.user_id
//       LEFT JOIN countries c ON rs.country = c.id
//       LEFT JOIN states s ON rs.state = s.id
//       LEFT JOIN cities ci ON rs.city = ci.id
//       ORDER BY rs.sl_no DESC
//     `;

//     const [rows] = await db.pool.promise().query(query);
//     res.status(200).json({ data: rows });
//   } catch (error) {
//     console.error("Error fetching restaurant settings:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
// exports.getCompany = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         rs.sl_no,
//         rs.restaurant_name,
//         rs.invoice_logo,
//         rs.address,
//         rs.website,
//         rs.date_format,
//         rs.phone_number,
//         rs.time_zone,
//         rs.status,
//         rs.user_id,
//         sp.package_name AS plan_name,
//         c.name AS country,
//         s.name AS state,
//         ci.name AS city,
//         rs.currency_symbol,
//         rs.currency_position,
//         rs.plan_id,
//         CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
//         u.email
//       FROM restaurant_settings rs
//       LEFT JOIN subscription_plans sp ON rs.plan_id = sp.plan_id
//       LEFT JOIN countries c ON rs.country = c.id
//       LEFT JOIN states s ON rs.state = s.id
//       LEFT JOIN cities ci ON rs.city = ci.id
//       LEFT JOIN user u ON rs.user_id = u.id
//       ORDER BY rs.sl_no DESC
//     `;

//     const [rows] = await db.pool.promise().query(query);
//     res.status(200).json({ data: rows });
//   } catch (error) {
//     console.error("Error fetching restaurant settings:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

//pre
// exports.getCompany = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         rs.sl_no,
//         rs.restaurant_name,
//         rs.invoice_logo,
//         rs.address,
//         rs.website,
//         rs.date_format,
//         rs.phone_number,
//         rs.time_zone,
//         rs.status,
//         rs.user_id,
//         c.name AS country,
//         c.id AS country_id,
//         s.name AS state,
//         s.id AS state_id,
//         ci.name AS city,
//         ci.id AS city_id,
//         tz.id AS timezoneid,
//         tz.timezone_name,
//         cs.id AS currencyid,
//         cs.currency_name,
        
//         rs.currency_symbol,
//         rs.currency_position,
//         rs.plan_id,
//         CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
//         u.email
//       FROM restaurant_settings rs
//       LEFT JOIN countries c ON rs.country = c.id
//       LEFT JOIN states s ON rs.state = s.id
//       LEFT JOIN cities ci ON rs.city = ci.id
//       LEFT JOIN user u ON rs.user_id = u.id
//       LEFT JOIN timezones tz ON rs.time_zone = tz.id
//       LEFT JOIN currency_symbols cs ON rs.currency_symbol = cs.id
//       ORDER BY rs.sl_no DESC
//     `;

//     const [rows] = await db.pool.promise().query(query);
//     res.status(200).json({ data: rows });
//   } catch (error) {
//     console.error("Error fetching restaurant settings:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
exports.getCompany = async (req, res) => {
  try {
    const query = `
      SELECT
        rs.sl_no,
        rs.restaurant_name,
        rs.invoice_logo,
        rs.address,
        rs.website,
        rs.date_format,
        rs.phone_number,
        rs.time_zone,
        rs.status,
        rs.user_id,
        c.name AS country,
        c.id AS country_id,
        s.name AS state,
        s.id AS state_id,
        ci.name AS city,
        ci.id AS city_id,
        tz.id AS timezoneid,
        tz.timezone_name,
        cs.id AS currencyid,
        cs.currency_name,
        rs.currency_symbol,
        rs.currency_position,
        rs.plan_id,
        CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
        u.email,
        
        -- Plan details from superadmin_user_plans
        sup.start_date,
        sup.end_date,
        sup.plan_id AS current_plan_id,
        sup.package_status,
        
        -- Current package name from subscription_plans
        sp.package_name AS current_package_name

      FROM restaurant_settings rs
      LEFT JOIN countries c ON rs.country = c.id
      LEFT JOIN states s ON rs.state = s.id
      LEFT JOIN cities ci ON rs.city = ci.id
      LEFT JOIN user u ON rs.user_id = u.id
      LEFT JOIN timezones tz ON rs.time_zone = tz.id
      LEFT JOIN currency_symbols cs ON rs.currency_symbol = cs.id
      
      -- join with latest plan
      LEFT JOIN (
          SELECT t1.*
          FROM superadmin_user_plans t1
          INNER JOIN (
            SELECT user_id, MAX(user_plan_id) AS latest_plan
            FROM superadmin_user_plans
            WHERE package_status = 'approved'
            GROUP BY user_id
          ) t2 ON t1.user_id = t2.user_id AND t1.user_plan_id = t2.latest_plan
      ) sup ON rs.user_id = sup.user_id
      
      -- join with subscription_plans to get package_name
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id

      ORDER BY rs.sl_no DESC
    `;

    const [rows] = await db.pool.promise().query(query);
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("Error fetching restaurant settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCompany = async (req, res) => {
    const sl_no = req.params.id;
   
    try {
      if (!sl_no) {
        return res.status(400).json({ error: "sl_no is required." });
      }
   
      // Get user_id from restaurant_settings
      const [rows] = await db.pool.promise().query(
        `SELECT user_id FROM restaurant_settings WHERE sl_no = ?`,
        [sl_no]
      );
   
      if (rows.length === 0) {
        return res.status(404).json({ error: "Restaurant setting not found." });
      }
   
      const user_id = rows[0].user_id;
   
      // Delete from superadmin_user_plans
      await db.pool.promise().query(
        `DELETE FROM superadmin_user_plans WHERE user_id = ?`,
        [user_id]
      );
   
      // Delete from restaurant_settings
      await db.pool.promise().query(
        `DELETE FROM restaurant_settings WHERE sl_no = ?`,
        [sl_no]
      );
   
      // Delete from user
      await db.pool.promise().query(
        `DELETE FROM user WHERE id = ?`,
        [user_id]
      );
   
      res.status(200).json({ message: "Restaurant setting and related data deleted successfully." });
   
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
};



//getbyid final

exports.getCompanyById = async (req, res) => {
  const { id } = req.params;
 
  try {
    const query = `
      SELECT
        rs.sl_no,
        rs.restaurant_name,
        rs.invoice_logo,
        rs.address,
        rs.website,
        rs.date_format,
        rs.phone_number,
        rs.time_zone,
        rs.zipcode,
        rs.status,
        rs.user_id,
        c.name AS country,
        c.id AS country_id,
        s.name AS state,
        s.id AS state_id,
        ci.name AS city,
        ci.id AS city_id,
           tz.id AS timezoneid,
        tz.timezone_name,
        cs.id AS currencyid,
        cs.currency_name,
        rs.currency_symbol,
        rs.currency_position,
        rs.plan_id,
        CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
        u.email
      FROM restaurant_settings rs
      LEFT JOIN countries c ON rs.country = c.id
      LEFT JOIN states s ON rs.state = s.id
      LEFT JOIN cities ci ON rs.city = ci.id
      LEFT JOIN user u ON rs.user_id = u.id
      LEFT JOIN timezones tz ON rs.time_zone = tz.id
      LEFT JOIN currency_symbols cs ON rs.currency_symbol = cs.id
      WHERE rs.sl_no = ?
      LIMIT 1
    `;
 
    const [rows] = await db.pool.promise().query(query, [id]);
 
    if (rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
 
    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching company by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// exports.updatecompany = async (req, res) => {
//   const sl_no=req.params.id;
//   const {
   
//     restaurant_name,
//     address,
//     website,
//     date_format,
//     timezoneid,
//     status,
//      country_id,
//           state_id,
//           city_id,
//           zipcode,
         

//     currencyid,
//     currency_position,
//     plan_id,
//     admin_name,
//     phone_number,
//     email,
//     password
//   } = req.body;
//   console.log("dataofupdatecomapnyapi",req.body)
 
//   const invoice_logo = req.file ? req.file.filename : null;
 
//   try {
//     if (!sl_no || !admin_name || !email) {
//       return res.status(400).json({ error: "sl_no, admin name, and email are required." });
//     }
 
//     // Get existing user_id from restaurant_settings
//     const [restaurantRows] = await db.pool.promise().query(
//       `SELECT user_id FROM restaurant_settings WHERE sl_no = ?`,
//       [sl_no]
//     );
 
//     if (restaurantRows.length === 0) {
//       return res.status(404).json({ error: "Restaurant setting not found" });
//     }
 
//     const user_id = restaurantRows[0].user_id;
 
//     // Split admin_name into firstname and lastname
//     const nameParts = admin_name.trim().split(" ");
//     const firstname = nameParts[0] || "";
//     const lastname = nameParts.slice(1).join(" ") || "";
 
//     // Optional password update
//     let userUpdateQuery = `UPDATE user SET firstname = ?, lastname = ?, email = ?`;
//     const userUpdateParams = [firstname, lastname, email];
 
//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       userUpdateQuery += `, password = ?`;
//       userUpdateParams.push(hashedPassword);
//     }
 
//     userUpdateQuery += ` WHERE id = ?`;
//     userUpdateParams.push(user_id);
 
//     await db.pool.promise().query(userUpdateQuery, userUpdateParams);
 
//     // Update restaurant_settings
//     const restaurantUpdateQuery = `
//       UPDATE restaurant_settings SET
//         restaurant_name = ?,
//         ${invoice_logo ? "invoice_logo = ?," : ""}
//         address = ?,
//         website = ?,
//         date_format = ?,
//         phone_number = ?,
//         time_zone = ?,
//         status = ?,
//          country=?,
//           state=?,
//           city=?,
//           zipcode=?,
         
//         currency_symbol = ?,
//         currency_position = ?,
//         plan_id = ?
//       WHERE sl_no = ?
//     `;
 
//     const restaurantUpdateParams = [
//       restaurant_name,
//       ...(invoice_logo ? [invoice_logo] : []),
//       address || "",
//       website || "",
//       date_format || "YYYY-MM-DD",
//       phone_number || "",
//       timezoneid || "UTC",
//       status || "active",
//       country_id,
//           state_id,
//           city_id,
//           zipcode,
         
//       currencyid || "$",
//       currency_position || "left",
//       plan_id,
//       sl_no
//     ];
 
//     await db.pool.promise().query(restaurantUpdateQuery, restaurantUpdateParams);
 
//     // Get subscription plan details
//     const [planRows] = await db.pool
//       .promise()
//       .query(`SELECT price_interval, interval_value,trial_days FROM subscription_plans WHERE plan_id = ?`, [plan_id]);
 
//     if (planRows.length === 0) {
//       return res.status(404).json({ error: "Subscription plan not found" });
//     }
//  const plan= planRows[0];
//     const { price_interval, interval_value,trial_days  } = planRows[0];
 
//     // Calculate new end date
//     const start = new Date();
//     const end = new Date(start);
 
//     if (price_interval === "Day") {
//       end.setDate(end.getDate() + interval_value);
//     } else if (price_interval === "Month") {
//       end.setMonth(end.getMonth() + interval_value);
//     } else if (price_interval === "Year") {
//       end.setFullYear(end.getFullYear() + interval_value);
//     }
//     console.log("trial_days",plan.trial_days)
//   const finalEnd = new Date(end);
// finalEnd.setDate(finalEnd.getDate() + trial_days);
//     const formatDate = (date) => {
//       const yyyy = date.getFullYear();
//       const mm = String(date.getMonth() + 1).padStart(2, '0');
//       const dd = String(date.getDate()).padStart(2, '0');
//       return `${yyyy}-${mm}-${dd}`;
//     };
 
//     const formattedStartDate = formatDate(start);
//     const formattedEndDate = formatDate(finalEnd);
//   // const trial_days=planRows[0].trial_days;
//       const trial_date = formattedStartDate + trial_days;
//       console.log(trial_date,"t")
//       const trialEnd = new Date(start);
//       console.log(planRows[0].trial_days,"kuchb")
//       trialEnd.setDate(trialEnd.getDate() + planRows[0].trial_days);
//       const formattedTrialEndDate = formatDate(trialEnd);
//     // Update superadmin_user_plans
//     const [existingPlanRows] = await db.pool.promise().query(
//       `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
//       [user_id]
//     );
 
//     if (existingPlanRows.length > 0) {
//       await db.pool.promise().query(
//         `UPDATE superadmin_user_plans SET plan_id = ?, start_date = ?, end_date = ?,trial_date=? WHERE user_id = ?`,
//         [plan_id, formattedStartDate, formattedEndDate,formattedEndDate,formattedTrialEndDate, user_id]
//       );
//     } else {
//       await db.pool.promise().query(
//         `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date,trial_date) VALUES (?, ?, ?, ?)`,
//         [user_id, plan_id, formattedStartDate, formattedEndDate,formattedTrialEndDate]
//       );
//     }
 
//     res.status(200).json({ message: "Restaurant setting updated successfully." });
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
//finall api
// exports.updatecompany = async (req, res) => {
//   const sl_no = req.params.id;
//   const {
//     restaurant_name,
//     address,
//     website,
//     date_format,
//     timezoneid,
//     status,
//     country_id,
//     state_id,
//     city_id,
//     zipcode,
//     currencyid,
//     currency_position,
//     plan_id,
//     admin_name,
//     phone_number,
//     email,
//     password
//   } = req.body;
  
//   console.log("dataofupdatecompanyapi", req.body);

//   const invoice_logo = req.file ? req.file.filename : null;

//   try {
//     // Validate required fields
//     if (!sl_no || !admin_name || !email) {
//       return res.status(400).json({ error: "sl_no, admin name, and email are required." });
//     }

//     // Get the existing user_id from restaurant_settings
//     const [restaurantRows] = await db.pool.promise().query(
//       `SELECT user_id FROM restaurant_settings WHERE sl_no = ?`,
//       [sl_no]
//     );

//     if (restaurantRows.length === 0) {
//       return res.status(404).json({ error: "Restaurant setting not found" });
//     }

//     const user_id = restaurantRows[0].user_id;

//     // Split admin_name into firstname and lastname
//     const nameParts = admin_name.trim().split(" ");
//     const firstname = nameParts[0] || "";
//     const lastname = nameParts.slice(1).join(" ") || "";

//     // Optional password update
//     let userUpdateQuery = `UPDATE user SET firstname = ?, lastname = ?, email = ?`;
//     const userUpdateParams = [firstname, lastname, email];

//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       userUpdateQuery += `, password = ?`;
//       userUpdateParams.push(hashedPassword);
//     }

//     userUpdateQuery += ` WHERE id = ?`;
//     userUpdateParams.push(user_id);

//     await db.pool.promise().query(userUpdateQuery, userUpdateParams);

//     // Update restaurant_settings with the received city, state, country, etc.
//     const restaurantUpdateQuery = `
//       UPDATE restaurant_settings SET
//         restaurant_name = ?,
//         ${invoice_logo ? "invoice_logo = ?," : ""}
//         address = ?,
//         website = ?,
//         date_format = ?,
//         phone_number = ?,
//         time_zone = ?,
//         status = ?,
//         country = ?,
//         state = ?,
//         city = ?,
//         zipcode = ?,
//         currency_symbol = ?,
//         currency_position = ?,
//         plan_id = ?
//       WHERE sl_no = ?;
//     `;

//     const restaurantUpdateParams = [
//       restaurant_name,
//       ...(invoice_logo ? [invoice_logo] : []),
//       address || "",
//       website || "",
//       date_format || "YYYY-MM-DD",
//       phone_number || "",
//       timezoneid || "UTC",
//       status || "active",
//       country_id,
//       state_id,
//       city_id,
//       zipcode,
//       currencyid || "$",
//       currency_position || "left",
//       plan_id,
//       sl_no
//     ];

//     await db.pool.promise().query(restaurantUpdateQuery, restaurantUpdateParams);

//     // Get subscription plan details
//     const [planRows] = await db.pool.promise().query(
//       `SELECT price_interval, interval_value, trial_days FROM subscription_plans WHERE plan_id = ?`,
//       [plan_id]
//     );

//     if (planRows.length === 0) {
//       return res.status(404).json({ error: "Subscription plan not found" });
//     }

//     const plan = planRows[0];
//     const { price_interval, interval_value, trial_days } = plan;

//     // Calculate new subscription end date
//     const start = new Date();
//     const end = new Date(start);

//     if (price_interval === "Day") {
//       end.setDate(end.getDate() + interval_value);
//     } else if (price_interval === "Month") {
//       end.setMonth(end.getMonth() + interval_value);
//     } else if (price_interval === "Year") {
//       end.setFullYear(end.getFullYear() + interval_value);
//     }

//     const finalEnd = new Date(end);
//     finalEnd.setDate(finalEnd.getDate() + trial_days);

//     const formatDate = (date) => {
//       const yyyy = date.getFullYear();
//       const mm = String(date.getMonth() + 1).padStart(2, '0');
//       const dd = String(date.getDate()).padStart(2, '0');
//       return `${yyyy}-${mm}-${dd}`;
//     };

//     const formattedStartDate = formatDate(start);
//     const formattedEndDate = formatDate(finalEnd);

//     // Update trial end date based on trial days
//     const trialEnd = new Date(start);
//     trialEnd.setDate(trialEnd.getDate() + trial_days);
//     const formattedTrialEndDate = formatDate(trialEnd);

//     // Update superadmin_user_plans
//     const [existingPlanRows] = await db.pool.promise().query(
//       `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
//       [user_id]
//     );

//     if (existingPlanRows.length > 0) {
//       await db.pool.promise().query(
//         `UPDATE superadmin_user_plans SET plan_id = ?, start_date = ?, end_date = ?, trial_date = ? WHERE user_id = ?`,
//         [plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate, user_id]
//       );
//     } else {
//       await db.pool.promise().query(
//         `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date, trial_date) VALUES (?, ?, ?, ?, ?)`,
//         [user_id, plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate]
//       );
//     }

//     res.status(200).json({ message: "Restaurant setting updated successfully." });
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
exports.updatecompany = async (req, res) => {
  const sl_no = req.params.id;
  const {
    restaurant_name,
    address,
    website,
    date_format,
    timezoneid,
    status,
    country_id,
    state_id,
    city_id,
    zipcode,
    currencyid,
    currency_position,
    plan_id,
    admin_name,
    phone_number,
    email,
    password
  } = req.body;

  console.log("dataofupdatecompanyapi", req.body);

  const invoice_logo = req.file ? req.file.filename : null;

  try {
    // Validate required fields
    if (!sl_no || !admin_name || !email) {
      return res.status(400).json({ error: "sl_no, admin name, and email are required." });
    }

    // Get the existing user_id from restaurant_settings
    const [restaurantRows] = await db.pool.promise().query(
      `SELECT user_id FROM restaurant_settings WHERE sl_no = ?`,
      [sl_no]
    );

    if (restaurantRows.length === 0) {
      return res.status(404).json({ error: "Restaurant setting not found" });
    }

    const user_id = restaurantRows[0].user_id;

    // ✅ Check if email already exists for another user
    const [emailCheck] = await db.pool.promise().query(
      `SELECT id FROM user WHERE email = ? AND id != ?`,
      [email, user_id]
    );
    if (emailCheck.length > 0) {
      return res.status(400).json({ error: "Email already exists. Please use a different one." });
    }

    // ✅ Check if phone number already exists for another restaurant
    const [phoneCheck] = await db.pool.promise().query(
      `SELECT sl_no FROM restaurant_settings WHERE phone_number = ? AND sl_no != ?`,
      [phone_number, sl_no]
    );
    if (phoneCheck.length > 0) {
      return res.status(400).json({ error: "Phone number already exists. Please use a different one." });
    }

    // Split admin_name into firstname and lastname
    const nameParts = admin_name.trim().split(" ");
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";

    // Optional password update
    let userUpdateQuery = `UPDATE user SET firstname = ?, lastname = ?, email = ?`;
    const userUpdateParams = [firstname, lastname, email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userUpdateQuery += `, password = ?`;
      userUpdateParams.push(hashedPassword);
    }

    userUpdateQuery += ` WHERE id = ?`;
    userUpdateParams.push(user_id);

    await db.pool.promise().query(userUpdateQuery, userUpdateParams);

    // Update restaurant_settings with the received city, state, country, etc.
    const restaurantUpdateQuery = `
      UPDATE restaurant_settings SET
        restaurant_name = ?,
        ${invoice_logo ? "invoice_logo = ?," : ""}
        address = ?,
        website = ?,
        date_format = ?,
        phone_number = ?,
        time_zone = ?,
        status = ?,
        country = ?,
        state = ?,
        city = ?,
        zipcode = ?,
        currency_symbol = ?,
        currency_position = ?,
        plan_id = ?
      WHERE sl_no = ?;
    `;

    const restaurantUpdateParams = [
      restaurant_name,
      ...(invoice_logo ? [invoice_logo] : []),
      address || "",
      website || "",
      date_format || "YYYY-MM-DD",
      phone_number || "",
      timezoneid || "UTC",
      status || "active",
      country_id,
      state_id,
      city_id,
      zipcode,
      currencyid || "$",
      currency_position || "left",
      plan_id,
      sl_no
    ];

    await db.pool.promise().query(restaurantUpdateQuery, restaurantUpdateParams);

    // Get subscription plan details
    const [planRows] = await db.pool.promise().query(
      `SELECT price_interval, interval_value, trial_days FROM subscription_plans WHERE plan_id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    const plan = planRows[0];
    const { price_interval, interval_value, trial_days } = plan;

    // Calculate new subscription end date
    const start = new Date();
    const end = new Date(start);

    if (price_interval === "Day") {
      end.setDate(end.getDate() + interval_value);
    } else if (price_interval === "Month") {
      end.setMonth(end.getMonth() + interval_value);
    } else if (price_interval === "Year") {
      end.setFullYear(end.getFullYear() + interval_value);
    }

    const finalEnd = new Date(end);
    finalEnd.setDate(finalEnd.getDate() + trial_days);

    const formatDate = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const formattedStartDate = formatDate(start);
    const formattedEndDate = formatDate(finalEnd);

    // Update trial end date based on trial days
    const trialEnd = new Date(start);
    trialEnd.setDate(trialEnd.getDate() + trial_days);
    const formattedTrialEndDate = formatDate(trialEnd);

    // Update superadmin_user_plans
    const [existingPlanRows] = await db.pool.promise().query(
      `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
      [user_id]
    );

    if (existingPlanRows.length > 0) {
      await db.pool.promise().query(
        `UPDATE superadmin_user_plans SET plan_id = ?, start_date = ?, end_date = ?, trial_date = ? WHERE user_id = ?`,
        [plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate, user_id]
      );
    } else {
      await db.pool.promise().query(
        `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date, trial_date) VALUES (?, ?, ?, ?, ?)`,

        [user_id, plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate]
      );
    }

    res.status(200).json({ message: "Restaurant setting updated successfully." });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports.updatecompany = async (req, res) => {
//   const sl_no = req.params.id;
//   const {
//     restaurant_name,
//     address,
//     website,
//     date_format,
//     time_zone,
//     status,
//     country,         // Array: ['CountryName', 'CountryID']
//     state,           // Array: ['StateName', 'StateID']
//     city,            // Array: ['CityName', 'CityID']
//     zipcode,
//     currency_symbol,  // Array: ['CurrencyName', 'CurrencyID']
//     currency_position,
//     plan_id,
//     admin_name,
//     phone_number,
//     email,
//     password
//   } = req.body;

//   console.log("dataofupdatecomapnyapi", req.body);

//   const invoice_logo = req.file ? req.file.filename : null;

//   try {
//     // Validation checks for required fields
//     if (!sl_no || !admin_name || !email) {
//       return res.status(400).json({ error: "sl_no, admin name, and email are required." });
//     }

//     // Get existing user_id from restaurant_settings
//     const [restaurantRows] = await db.pool.promise().query(
//       `SELECT user_id FROM restaurant_settings WHERE sl_no = ?`,
//       [sl_no]
//     );

//     if (restaurantRows.length === 0) {
//       return res.status(404).json({ error: "Restaurant setting not found" });
//     }

//     const user_id = restaurantRows[0].user_id;

//     // Split admin_name into firstname and lastname
//     const nameParts = admin_name.trim().split(" ");
//     const firstname = nameParts[0] || "";
//     const lastname = nameParts.slice(1).join(" ") || "";

//     // Optional password update
//     let userUpdateQuery = `UPDATE user SET firstname = ?, lastname = ?, email = ?`;
//     const userUpdateParams = [firstname, lastname, email];

//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       userUpdateQuery += `, password = ?`;
//       userUpdateParams.push(hashedPassword);
//     }

//     userUpdateQuery += ` WHERE id = ?`;
//     userUpdateParams.push(user_id);

//     await db.pool.promise().query(userUpdateQuery, userUpdateParams);

//     // Update restaurant_settings
//     const restaurantUpdateQuery = `
//       UPDATE restaurant_settings SET
//         restaurant_name = ?,
//         ${invoice_logo ? "invoice_logo = ?," : ""}
//         address = ?,
//         website = ?,
//         date_format = ?,
//         phone_number = ?,
//         time_zone = ?,
//         status = ?,
//         country = ?,  -- Use country ID
//         state = ?,    -- Use state ID
//         city = ?,     -- Use city ID
//         zipcode = ?,
//         currency_symbol = ?,  -- Use currency ID
//         currency_position = ?,
//         plan_id = ?
//       WHERE sl_no = ?
//     `;

//     // Pass the correct values for country, state, city, and currency
//     const restaurantUpdateParams = [
//       restaurant_name,
//       ...(invoice_logo ? [invoice_logo] : []),
//       address || "",
//       website || "",
//       date_format || "YYYY-MM-DD",
//       phone_number || "",
//       time_zone || "UTC",
//       status || "active",
//       country[1] || country[0], // Use country ID from the array (second element)
//       state[1] || state[0],     // Use state ID from the array (second element)
//       city[1] || city[0],       // Use city ID from the array (second element)
//       zipcode || "",
//       currency_symbol[1] || currency_symbol[0], // Use currency ID from the array (second element)
//       currency_position || "left",
//       plan_id,
//       sl_no
//     ];

//     await db.pool.promise().query(restaurantUpdateQuery, restaurantUpdateParams);

//     // Get subscription plan details
//     const [planRows] = await db.pool.promise().query(
//       `SELECT price_interval, interval_value, trial_days FROM subscription_plans WHERE plan_id = ?`, 
//       [plan_id]
//     );

//     if (planRows.length === 0) {
//       return res.status(404).json({ error: "Subscription plan not found" });
//     }

//     const plan = planRows[0];
//     const { price_interval, interval_value, trial_days } = plan;

//     // Calculate new end date
//     const start = new Date();
//     const end = new Date(start);

//     if (price_interval === "Day") {
//       end.setDate(end.getDate() + interval_value);
//     } else if (price_interval === "Month") {
//       end.setMonth(end.getMonth() + interval_value);
//     } else if (price_interval === "Year") {
//       end.setFullYear(end.getFullYear() + interval_value);
//     }

//     const finalEnd = new Date(end);
//     finalEnd.setDate(finalEnd.getDate() + trial_days);

//     const formatDate = (date) => {
//       const yyyy = date.getFullYear();
//       const mm = String(date.getMonth() + 1).padStart(2, '0');
//       const dd = String(date.getDate()).padStart(2, '0');
//       return `${yyyy}-${mm}-${dd}`;
//     };

//     const formattedStartDate = formatDate(start);
//     const formattedEndDate = formatDate(finalEnd);

//     // Calculate trial end date
//     const trialEnd = new Date(start);
//     trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
//     const formattedTrialEndDate = formatDate(trialEnd);

//     // Update superadmin_user_plans
//     const [existingPlanRows] = await db.pool.promise().query(
//       `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
//       [user_id]
//     );

//     if (existingPlanRows.length > 0) {
//       await db.pool.promise().query(
//         `UPDATE superadmin_user_plans SET plan_id = ?, start_date = ?, end_date = ?, trial_date = ? WHERE user_id = ?`,
//         [plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate, user_id]
//       );
//     } else {
//       await db.pool.promise().query(
//         `INSERT INTO superadmin_user_plans (user_id, plan_id, start_date, end_date, trial_date) VALUES (?, ?, ?, ?, ?)`,
//         [user_id, plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate]
//       );
//     }

//     res.status(200).json({ message: "Restaurant setting updated successfully." });
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.activateCompany = async (req, res) => {
//   const { id } = req.params;
//   if (!id) {
//     return res.status(400).json({ error: "Company ID (sl_no) is required." });
//   }
//   try {
//     // Check if the company exists
//     const [rows] = await db.pool.promise().query(
//       `SELECT * FROM restaurant_settings WHERE sl_no = ?`,
//       [id]
//     );
//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Company not found." });
//     }
//     // Deactivate the company and optionally clear the plan_id
//     await db.pool.promise().query(
//       `UPDATE restaurant_settings SET status = 'Active' WHERE sl_no = ?`,
//       [id]
//     );
//     res.status(200).json({ message: "Company deactivated successfully." });
//   } catch (error) {
//     console.error("activation Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
exports.activateCompany = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Company ID (sl_no) is required." });
  }
  try {
    // Check if the company exists
    const [rows] = await db.pool.promise().query(
      `SELECT * FROM restaurant_settings WHERE sl_no = ?`,
      [id]
    );
    const company=rows[0]
    if (rows.length === 0) {
      return res.status(404).json({ error: "Company not found." });
    }
    // Deactivate the company and optionally clear the plan_id
    await db.pool.promise().query(
      `UPDATE restaurant_settings SET status = 'Active' WHERE sl_no = ?`,
      [id]
    );
      await db.pool.promise().query(
      `UPDATE superadmin_user_plans SET package_status = 'approved' WHERE user_id = ? AND plan_id = ?`,
      [company.user_id, company.plan_id]
    );


    res.status(200).json({ message: "Company activated successfully." });
  } catch (error) {
    console.error("activation Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// exports.deactivateCompany = async (req, res) => {
//   const { id } = req.params;
 
//   if (!id) {
//     return res.status(400).json({ error: "Company ID (sl_no) is required." });
//   }
 
//   try {
//     // Check if the company exists
//     const [rows] = await db.pool.promise().query(
//       `SELECT * FROM restaurant_settings WHERE sl_no = ?`,
//       [id]
//     );
 
//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Company not found." });
//     }
 
//     // Deactivate the company and optionally clear the plan_id
//     await db.pool.promise().query(
//       `UPDATE restaurant_settings SET status = 'deactive' WHERE sl_no = ?`,
//       [id]
//     );
 
//     res.status(200).json({ message: "Company deactivated successfully." });
//   } catch (error) {
//     console.error("Deactivation Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };




exports.deactivateCompany = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Company ID (sl_no) is required." });
  }

  try {
    // Check if the company exists
    const [companyRows] = await db.pool.promise().query(
      `SELECT user_id, plan_id FROM restaurant_settings WHERE sl_no = ?`,
      [id]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: "Company not found." });
    }

    const { user_id, plan_id } = companyRows[0];

    // Deactivate the company
    await db.pool.promise().query(
      `UPDATE restaurant_settings SET status = 'deactive' WHERE sl_no = ?`,
      [id]
    );

    // Update package status if user_id and plan_id exist
    if (user_id && plan_id) {
      await db.pool.promise().query(
        `UPDATE superadmin_user_plans SET package_status = 'declined' WHERE user_id = ? AND plan_id = ?`,
        [user_id, plan_id]
      );
    }

    return res.status(200).json({ message: "Company deactivated successfully." });
  } catch (error) {
    console.error("Deactivation Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


//getcountry city and states

exports.getCountries = (req, res) => {
  db.pool.query('SELECT id,name FROM countries', (err, results) => {
    if (err) {
      console.error("DB Query Error:", err); // <--- Log this
      return res.status(500).json({ message: 'Error fetching countries', error: err.message });
    }
    res.json({ data: results });
  });
};
exports.getStatesByCountry = (req, res) => {
  const { countryId } = req.params;
  db.pool.query('SELECT id, name FROM states WHERE country_id = ?', [countryId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching states', error: err.message });
    }
    res.json({data:results});
  });
};
exports.getCitiesByState = (req, res) => {
  const { stateId } = req.params;
  db.pool.query('SELECT id, name FROM cities WHERE state_id = ?', [stateId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching cities', error: err.message });
    }
    res.json({data:results});
  });
};


//addaddUserSubscriptionAdmin from admin as well s superadmin side
exports.addUserSubscriptionAdmin = async (req, res) => {
  const { email, plan_id, paid_via, transaction_id, is_superadmin } = req.body;
  const created_by = req.id || 19;

  try {
    // 1. Find the user
    const [userRows] = await db.pool.promise().query(
      `SELECT id, is_admin, super_admin FROM user WHERE email = ?`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user_id = userRows[0].id;

    // 2. Get the plan details
    const [planRows] = await db.pool.promise().query(
      `SELECT price_interval, interval_value, trial_days FROM subscription_plans WHERE plan_id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planRows[0];

    // 3. Check if an existing approved plan exists for this user
    const [existingPlan] = await db.pool.promise().query(
      `SELECT user_plan_id FROM superadmin_user_plans WHERE user_id = ? AND package_status = 'approved' ORDER BY user_plan_id DESC LIMIT 1`,
      [user_id]
    );

    // 4. Calculate dates from now using the new plan
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan.price_interval === 'Day') endDate.setDate(endDate.getDate() + plan.interval_value);
    if (plan.price_interval === 'Month') endDate.setMonth(endDate.getMonth() + plan.interval_value);
    if (plan.price_interval === 'Year') endDate.setFullYear(endDate.getFullYear() + plan.interval_value);

    const trialEnd = new Date(startDate);
    trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
    endDate.setDate(endDate.getDate() + plan.trial_days);

    const formatDate = (d) => d.toISOString().slice(0, 10);
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    const formattedTrialEndDate = formatDate(trialEnd);

    const status = is_superadmin ? 'approved' : 'pending';

    if (existingPlan.length > 0) {
      // 5a. Archive old approved plan as history, then insert new active row
      await db.pool.promise().query(
        `UPDATE superadmin_user_plans SET package_status = 'superseded' WHERE user_plan_id = ?`,
        [existingPlan[0].user_plan_id]
      );
    }

    // 5b. Insert new plan row (first-time or renewal/upgrade)
    await db.pool.promise().query(
      `INSERT INTO superadmin_user_plans
        (user_id, plan_id, start_date, end_date, trial_date, package_status, created_by, created_at, payment_type, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
      [user_id, plan_id, formattedStartDate, formattedEndDate, formattedTrialEndDate,
       status, created_by, paid_via, transaction_id]
    );

    const isRenewal = existingPlan.length > 0;
    return res.status(201).json({
      message: isRenewal ? 'Subscription renewed successfully' : 'Subscription added successfully'
    });

  } catch (err) {
    console.error('Error adding subscription:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

//get all the subcription like current running from admin as well as superadmin side
// exports.getUserSubscriptions = async (req, res) => {
//   const { email } = req.params;

//   try {
//     // 1. Get user info
//     const [userRows] = await db.pool.promise().query(
//       `SELECT id FROM user WHERE email = ?`,
//       [email]
//     );

//     if (userRows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const user_id = userRows[0].id;

//     // 2. Get all user's subscription packages ordered by start date
//     const [subscriptionRows] = await db.pool.promise().query(
//       `SELECT 
//         sup.user_plan_id,
//         sup.plan_id,
//         sp.package_name,
//         sup.start_date,
//         sup.trial_date AS trial_end_date,
//         sup.end_date,
        
//         sup.created_by,
//         sup.package_status
//       FROM superadmin_user_plans sup
//       JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
//       WHERE sup.user_id = ?
//       ORDER BY sup.start_date ASC`,
//       [user_id]
//     );

//     const currentDate = new Date();
//     let currentPackage = null;
//     let nextPackage = null;
//     const allPackages = [];

//     for (const pkg of subscriptionRows) {
//       const packageInfo = {
//         packageId: pkg.user_plan_id,
//         planId: pkg.plan_id,
//         packageName: pkg.package_name,
//         startDate: pkg.start_date,
//         trialEndDate: pkg.trial_end_date,
//         endDate: pkg.end_date,
//         createdAt: pkg.created_at,
//         createdBy: pkg.created_by,
//         status: pkg.package_status
//       };

//       allPackages.push(packageInfo);

//       const startDate = new Date(pkg.start_date);
//       const endDate = new Date(pkg.end_date);

//       if (currentDate >= startDate && currentDate <= endDate) {
//         currentPackage = packageInfo;
//       } else if (currentDate < startDate && (!nextPackage || new Date(nextPackage.startDate) > startDate)) {
//         nextPackage = packageInfo;
//       }
//     }

//     if (!currentPackage && allPackages.length > 0 && new Date(allPackages[0].startDate) > currentDate) {
//       nextPackage = allPackages[0];
//     }

//     const [companyDetailsRows] = await db.pool.promise().query(
//       `SELECT * FROM restaurant_settings WHERE user_id = ?`,
//       [user_id]
//     );

//     const companyDetails = companyDetailsRows[0] || null;

//     return res.status(200).json({
//       subscriptions: allPackages,
//       currentPackage,
//       nextPackage,
//       currentDate,
//       companyDetails
//     });

//   } catch (err) {
//     console.error('Error fetching user subscriptions:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };



exports.getUserSubscriptions = async (req, res) => {
  const { email } = req.params;
  

  try {
    // 1. Get user info
    const [userRows] = await db.pool.promise().query(
      `SELECT id FROM user WHERE email = ?`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user_id = userRows[0].id;

    // 2. Get all user's subscription packages ordered by start date
    const [subscriptionRows] = await db.pool.promise().query(
      `SELECT 
        sup.user_plan_id,
        sup.plan_id,
        sp.package_name,
        sup.start_date,
        sup.trial_date AS trial_end_date,
        sup.end_date,
       
        sup.created_at,
        sup.package_status
      FROM superadmin_user_plans sup
      JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      WHERE sup.user_id = ?
      ORDER BY sup.start_date ASC`,
      [user_id]
    );

    const currentDate = new Date();
    let currentPackage = null;
    let nextPackage = null;
    const allPackages = [];

    for (const pkg of subscriptionRows) {
      const packageInfo = {
        packageId: pkg.user_plan_id,
        planId: pkg.plan_id,
        packageName: pkg.package_name,
        startDate: pkg.start_date,
        trialEndDate: pkg.trial_end_date,
        endDate: pkg.end_date,
        createdAt: pkg.created_at,
       
        status: pkg.package_status
      };

      allPackages.push(packageInfo);

      const startDate = new Date(pkg.start_date);
      const endDate = new Date(pkg.end_date);

      if (currentDate >= startDate && currentDate <= endDate) {
        currentPackage = packageInfo;
      } else if (currentDate < startDate && (!nextPackage || new Date(nextPackage.startDate) > startDate)) {
        nextPackage = packageInfo;
      }
    }

    // Edge case: no active package, but future package exists
    if (!currentPackage && allPackages.length > 0 && new Date(allPackages[0].startDate) > currentDate) {
      nextPackage = allPackages[0];
    }

    // 3. Get company details
    const [companyDetailsRows] = await db.pool.promise().query(
      `SELECT * FROM restaurant_settings WHERE user_id = ?`,
      [user_id]
    );

    const companyDetails = companyDetailsRows[0] || null;

    // 4. Return response
    return res.status(200).json({
      subscriptions: allPackages,
      currentPackage,
      nextPackage,
      currentDate,
      companyDetails
    });

  } catch (err) {
    console.error('Error fetching user subscriptions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


//Manage button
exports.getManagedetail = async (req, res) => {
  const user_id = req.params.id;

  try {
    const query = `
      SELECT 
        rs.sl_no,
        rs.restaurant_name,
        rs.user_id,
        rs.address,
        rs.website,
        rs.phone_number,
        rs.country,
        rs.state,
        rs.city,
        rs.zipcode,
        rs.time_zone,
        u.email,
        u.firstname,
        u.lastname,
        CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
        sup.user_plan_id,
        sup.plan_id,
        sp.package_name,
        sp.price_interval,
        sp.interval_value,
        sup.start_date,
        sup.end_date,
        sup.trial_date,
        sup.package_status
      FROM restaurant_settings rs
      LEFT JOIN user u ON rs.user_id = u.id
      LEFT JOIN superadmin_user_plans sup ON rs.user_id = sup.user_id
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      WHERE rs.user_id = ?
    `;

    const [rows] = await db.pool.promise().query(query, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No restaurant found" });
    }

    // Extract common info from the first row
    const first = rows[0];
    const common_info = {
      sl_no: first.sl_no,
      restaurant_name: first.restaurant_name,
      address: first.address,
      website: first.website,
      phone_number: first.phone_number,
      country: first.country,
      state: first.state,
      city: first.city,
      zipcode: first.zipcode,
      time_zone: first.time_zone,
      user_id: first.user_id,
      email: first.email,
      firstname: first.firstname,
      lastname: first.lastname,
      admin_name: first.admin_name,
      created_by_name: "Superadmin"
    };

    // Extract plans
    const plans = rows.map(row => ({
      user_plan_id: row.user_plan_id,
      plan_id: row.plan_id,
      package_name: row.package_name,
      price_interval: row.price_interval,
      interval_value: row.interval_value,
      start_date: row.start_date,
      end_date: row.end_date,
      trial_date: row.trial_date,
      package_status: row.package_status
    }));

    res.status(200).json({ common_info, plans });

  } catch (error) {
    console.error("Error fetching restaurant settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


//Done View api of subcription in admin side
exports.adminViewapi = async (req, res) => {
  const user_plan_id = req.params.id;
console.log("id",user_plan_id)
  try {
    // Get user's subscription details
    const [subscriptionRows] = await db.pool.promise().query(
      `SELECT 
        sup.*, sp.*, rs.*
      FROM superadmin_user_plans sup
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      LEFT JOIN restaurant_settings rs ON sup.user_id = rs.user_id
      WHERE sup.user_plan_id = ?`,
      [user_plan_id]
    );

    if (subscriptionRows.length === 0) {
      return res.status(404).json({ error: 'Error in fetching data' });
    }

    const subscription = subscriptionRows[0];
    const created_by = subscription.created_by;

    // Get creator's name
    const [userRows] = await db.pool.promise().query(

      `SELECT CONCAT(firstname, ' ', lastname) AS full_name FROM user WHERE id = ?`,
      [created_by]
    );

    const creatorName = userRows.length ? userRows[0].full_name : 'Unknown';

    return res.status(200).json({
      subscription,
      created_by_name: creatorName,
    });

  } catch (err) {
    console.error('Error fetching details:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
//Manage api
// exports.getAdminPackages1 = async (req, res) => {
//   try {
//     const user_id = 78;

//     // Fetch plans with subscription details
//     const [rows] = await db.pool.promise().query(
//       `SELECT 
//           sup.user_plan_id,
//           sup.user_id,
//           sup.plan_id,
//           sup.start_date,
//           sup.end_date,
//           sup.trial_date,
//           sup.package_status,
//           sup.created_by,
//           sup.created_at,
//           sp.*,
//           sp.interval_value,
//           sp.price_interval,
//         u.*
//       FROM superadmin_user_plans sup
//       LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
//       LEFT JOIN user u ON sup.user_id = u.id
//       WHERE sup.user_id = ?
//       ORDER BY sup.start_date DESC`,
//       [user_id]
//     );

//     const formattedRows = await Promise.all(rows.map(async (plan) => {
//       const formatDate = (date) =>
//         date instanceof Date
//           ? date.toISOString().slice(0, 10)
//           : new Date(date).toISOString().slice(0, 10);

//       const formattedPlan = {
//         ...plan,
//         start_date: formatDate(plan.start_date),
//         end_date: formatDate(plan.end_date),
//         trial_date: formatDate(plan.trial_date),
//       };
// console.log("plancreared",plan)
//       // Resolve the creator’s name
//       if (plan.created_by) {
//         const [[creator]] = await db.pool.promise().query(
//           `SELECT super_admin, is_admin, CONCAT(firstname, ' ', lastname) AS full_name
//           FROM user
//           WHERE id = ?`,
//           [plan.created_by]
//         );

//         if (creator) {
//           if (creator.super_admin === 2) {
//             formattedPlan.created_by_name = 'Superadmin';
//           } else if (creator.is_admin === 1) {
//             formattedPlan.created_by_name = creator.full_name;
//           } else {
//             formattedPlan.created_by_name = 'Unknown Creator';
//           }
//         } else {
//           formattedPlan.created_by_name = 'Unknown Creator';
//         }
//       } else {
//         formattedPlan.created_by_name = 'Unknown Creator';
//       }

//       return formattedPlan;
//     }));

//     return res.status(200).json({ success: true, data: formattedRows });
//   } catch (error) {
//     console.error("Error fetching admin packages:", error);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

exports.getAdminPackages1 = async (req, res) => {
  try {
    const user_id = 78;

    // Fetch plans with subscription and user details including creator info
    const [rows] = await db.pool.promise().query(
      `SELECT 
        sup.*,
        sp.package_name,
        sp.currency,
        sp.price_interval,
        sp.price_with_currency,
        sp.number_of_active_users,
        sp.interval_value,
        sp.package_description,
        sp.number_of_invoice,
        u.firstname AS user_firstname,
        u.lastname AS user_lastname,
        u.is_admin,
        u.super_admin,
        creator.firstname AS creator_firstname,
        creator.lastname AS creator_lastname,
        creator.super_admin AS creator_super_admin
      FROM superadmin_user_plans sup
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      LEFT JOIN user u ON sup.user_id = u.id
      LEFT JOIN user creator ON sup.created_by = creator.id
      WHERE sup.user_id = ?
      ORDER BY sup.start_date DESC`,
      [user_id]
    );

    const formattedRows = rows.map((plan) => {
      const formatDate = (date) =>
        date instanceof Date
          ? date.toISOString().slice(0, 10)
          : new Date(date).toISOString().slice(0, 10);

      const formattedPlan = {
        ...plan,
        start_date: plan.start_date ? formatDate(plan.start_date) : null,
        end_date: plan.end_date ? formatDate(plan.end_date) : null,
        trial_date: plan.trial_date ? formatDate(plan.trial_date) : null,
        created_by_name: (() => {
          if (plan.creator_super_admin === 2) {
            return 'Superadmin';
          } else if (plan.is_admin === 1) {
            return `${plan.creator_firstname || ''} ${plan.creator_lastname || ''}`.trim();
          } else {
            return 'Unknown Creator';
          }
        })()
      };

      return formattedPlan;
    });

    return res.status(200).json({ success: true, data: formattedRows });
  } catch (error) {
    console.error("Error fetching admin packages:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};


//pre
// exports.getManagedetail = async (req, res) => {
//   const user_id = req.params.id;

//   try {
//     const query = `
//       SELECT 
//         rs.sl_no,
//         rs.restaurant_name,
//         rs.user_id,
//         rs.address,
//         rs.website,
//         rs.phone_number,
//         rs.country,
//         rs.state,
//         rs.city,
//         rs.zipcode,
//         rs.time_zone,
//         u.email,
//         u.firstname,
//         u.lastname,
//         CONCAT(u.firstname, ' ', u.lastname) AS admin_name,
//         sup.user_plan_id,
//         sup.plan_id,
//         sp.package_name,
//         sp.price_interval,
//         sp.interval_value,
//         sup.start_date,
//         sup.end_date,
//         sup.trial_date,
//         sup.package_status
//       FROM restaurant_settings rs
//       LEFT JOIN user u ON rs.user_id = u.id
//       LEFT JOIN superadmin_user_plans sup ON rs.user_id = sup.user_id
//       LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
//       WHERE rs.user_id = ?
//     `;

//     const [rows] = await db.pool.promise().query(query, [user_id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "No restaurant found" });
//     }

//     // Extract common info from the first row
//     const first = rows[0];
//     const common_info = {
//       sl_no: first.sl_no,
//       restaurant_name: first.restaurant_name,
//       address: first.address,
//       website: first.website,
//       phone_number: first.phone_number,
//       country: first.country,
//       state: first.state,
//       city: first.city,
//       zipcode: first.zipcode,
//       time_zone: first.time_zone,
//       user_id: first.user_id,
//       email: first.email,
//       firstname: first.firstname,
//       lastname: first.lastname,
//       admin_name: first.admin_name,
//       created_by_name: "Superadmin"
//     };

//     // Extract plans
//     const plans = rows.map(row => ({
//       user_plan_id: row.user_plan_id,
//       plan_id: row.plan_id,
//       package_name: row.package_name,
//       price_interval: row.price_interval,
//       interval_value: row.interval_value,
//       start_date: row.start_date,
//       end_date: row.end_date,
//       trial_date: row.trial_date,
//       package_status: row.package_status
//     }));

//     res.status(200).json({ common_info, plans });

//   } catch (error) {
//     console.error("Error fetching restaurant settings:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
exports.getManagedetail = async (req, res) => {
  const user_id = req.params.id;

  try {
    const query = `
      SELECT 
        rs.sl_no,
        rs.restaurant_name,
        rs.user_id,
        rs.address,
        rs.website,
        rs.phone_number,
        rs.zipcode,
        rs.time_zone,
        
        -- Country / State / City names
        c.name AS country_name,
        c.id AS country_id,
        s.name AS state_name,
        s.id AS state_id,
        ci.name AS city_name,
        ci.id AS city_id,

        u.email,
        u.firstname,
        u.lastname,
        CONCAT(u.firstname, ' ', u.lastname) AS admin_name,

        sup.user_plan_id,
        sup.plan_id,
        sp.package_name,
        sp.price_interval,
        sp.interval_value,
        sup.start_date,
        sup.end_date,
        sup.trial_date,
        sup.package_status

      FROM restaurant_settings rs
      LEFT JOIN user u ON rs.user_id = u.id
      LEFT JOIN superadmin_user_plans sup ON rs.user_id = sup.user_id
      LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
      LEFT JOIN countries c ON rs.country = c.id
      LEFT JOIN states s ON rs.state = s.id
      LEFT JOIN cities ci ON rs.city = ci.id
      WHERE rs.user_id = ?
    `;

    const [rows] = await db.pool.promise().query(query, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No restaurant found" });
    }

    // Extract common info from the first row
    const first = rows[0];
    const common_info = {
      sl_no: first.sl_no,
      restaurant_name: first.restaurant_name,
      address: first.address,
      website: first.website,
      phone_number: first.phone_number,
      zipcode: first.zipcode,
      time_zone: first.time_zone,
      user_id: first.user_id,
      email: first.email,
      firstname: first.firstname,
      lastname: first.lastname,
      admin_name: first.admin_name,
      created_by_name: "Superadmin",
      
      // Add human-readable country/state/city
      country_id: first.country_id,
      country_name: first.country_name,
      state_id: first.state_id,
      state_name: first.state_name,
      city_id: first.city_id,
      city_name: first.city_name
    };

    // Extract plans
    const plans = rows.map(row => ({
      user_plan_id: row.user_plan_id,
      plan_id: row.plan_id,
      package_name: row.package_name,
      price_interval: row.price_interval,
      interval_value: row.interval_value,
      start_date: row.start_date,
      end_date: row.end_date,
      trial_date: row.trial_date,
      package_status: row.package_status
    }));

    res.status(200).json({ common_info, plans });

  } catch (error) {
    console.error("Error fetching restaurant settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


//currecnysymbol api
exports.getCurrencySymbols = (req, res) => {
  db.pool.query('SELECT id, currency_name, currency_code, symbol FROM currency_symbols', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching currency symbols', error: err.message });
    }
    res.json({ data: results });
  });
};
//timezoneapi
exports.getTimezonesall = (req, res) => {
  db.pool.query('SELECT id, timezone_name FROM timezones', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching timezones', error: err.message });
    }
    res.json({ data: results });
  });
};

// License key for the logged-in admin based on their active subscription
exports.getAdminSubscriptionKey = async (req, res) => {
  try {
    const userId = req.id;

    const [plans] = await db.pool.promise().query(
      `SELECT sup.user_plan_id, sup.plan_id, sup.start_date, sup.end_date, sup.package_status
       FROM superadmin_user_plans sup
       WHERE sup.user_id = ? AND sup.package_status = 'approved'
       ORDER BY sup.user_plan_id DESC LIMIT 1`,
      [userId]
    );

    if (plans.length === 0) {
      return res.status(200).json({
        success: false,
        expired: true,
        message: "No active subscription found. Please purchase a plan.",
      });
    }

    const plan = plans[0];
    const now = new Date();
    const endDate = new Date(plan.end_date);

    if (endDate < now) {
      return res.status(200).json({
        success: false,
        expired: true,
        message: "Your subscription has expired. Please renew your plan.",
      });
    }

    // Build license key: LTC-ADM{userId padded}-PKG{planId padded}-{startDate YYYYMMDD}-STG{planRowId padded}
    const adminPart = "ADM" + String(userId).padStart(3, "0");
    const pkgPart = "PKG" + String(plan.plan_id).padStart(2, "0");
    const startDate = new Date(plan.start_date);
    const datePart =
      startDate.getFullYear().toString() +
      String(startDate.getMonth() + 1).padStart(2, "0") +
      String(startDate.getDate()).padStart(2, "0");
    const hashPart = "STG" + String(plan.user_plan_id).padStart(5, "0");

    const subscriptionKey = `LTC-${adminPart}-${pkgPart}-${datePart}-${hashPart}`;

    return res.status(200).json({
      success: true,
      expired: false,
      data: { subscription_key: subscriptionKey },
    });
  } catch (err) {
    console.error("Error in getAdminSubscriptionKey:", err);
    return res.status(500).json({ error: err.message });
  }
};

