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



  const getAllSettings = async (req, res) => {
    try {
      // Query to fetch only specific fields
      const getAllQuery = `
        SELECT 
          id, 
          address, 
          email, 
          phone, 
          phone_optional, 
          logo, 
          logo_footer, 
          powerbytxt,
          fevicon,
          restro_name
        FROM common_setting`;
  
      db.pool.query(getAllQuery, (err, results) => {
        if (err) {
          console.error("Error while fetching all settings:", err);
          return res.status(500).json({ success: false, message: "Error fetching settings" });
        }
        res.status(200).json({ success: true, data: results });
      });
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      res.status(500).json({ success: false, message: "An error occurred" });
    }
  };
  

  const createSetting = async (req, res) => {
    try {
      const {
        email,
        phone,
        phone_optional,
        address,
        powerbytxt,
        restro_name
      } = req.body;
  
      // File uploads with fallback to null if no file is uploaded
      const logo = req.files && req.files.logo ? req.files.logo[0].filename : null;
      const logo_footer = req.files && req.files.logo_footer ? req.files.logo_footer[0].filename : null;
      const fevicon = req.files && req.files.fevicon ? req.files.fevicon[0].filename : null;
  
      // Construct data object
      const settingData = {
        email,
        phone,
        phone_optional,
        address,
        powerbytxt,
        restro_name,
        logo,
        logo_footer,
        fevicon
      };
  
      // Insert new record
      const createQuery = "INSERT INTO common_setting SET ?";
      db.pool.query(createQuery, settingData, (err, result) => {
        if (err) {
          console.error("Error while inserting setting:", err);
          return res.status(500).json({ success: false, message: "Error saving setting" });
        }
        res.status(200).json({ success: true, message: "Setting saved successfully" });
      });
  
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      res.status(500).json({ success: false, message: "An error occurred" });
    }
  };


  const updateSetting = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        email,
        phone,
        phone_optional,
        address,
        powerbytxt,
        restro_name
      } = req.body;
  
      // Initialize the settingData object with fields from the request body
      const settingData = {
        email,
        phone,
        phone_optional,
        address,
        powerbytxt,
        restro_name
      };
  
      // Update only the file fields if new files are uploaded
      if (req.files && req.files.logo) {
        settingData.logo = req.files.logo[0].filename;
      }
      if (req.files && req.files.logo_footer) {
        settingData.logo_footer = req.files.logo_footer[0].filename;
      }
      if (req.files && req.files.fevicon) {
        settingData.fevicon = req.files.fevicon[0].filename;
      }
  
      // Construct the SQL query and update
      const updateQuery = "UPDATE common_setting SET ? WHERE id = ?";
      db.pool.query(updateQuery, [settingData, id], (err, result) => {
        if (err) {
          console.error("Error while updating setting:", err);
          return res.status(500).json({ success: false, message: "Error updating setting" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Setting not found" });
        }
        res.status(200).json({ success: true, message: "Setting updated successfully" });
      });
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      res.status(500).json({ success: false, message: "An error occurred" });
    }
  };


  const getSettingById = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Query to fetch specific fields for a given ID
      const getByIdQuery = `
        SELECT 
          id, 
          address, 
          email, 
          phone, 
          phone_optional, 
          logo, 
          logo_footer, 
          powerbytxt,
          fevicon,
          restro_name
        FROM common_setting WHERE id = ?`;
  
      db.pool.query(getByIdQuery, [id], (err, result) => {
        if (err) {
          console.error("Error while fetching setting:", err);
          return res.status(500).json({ success: false, message: "Error fetching setting" });
        }
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "Setting not found" });
        }
        res.status(200).json({ success: true, data: result[0] });
      });
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      res.status(500).json({ success: false, message: "An error occurred" });
    }
  };

  // sound setting

  const createOrUpdateSoundSetting = (req, res) => {
    const nofitysound = req.file ? req.file.path : null;
  
    if (!nofitysound) {
      return res.status(400).json({ success: false, message: 'Missing sound file' });
    }
  
    // Check if a record already exists
    const checkQuery = 'SELECT soundid FROM tbl_soundsetting LIMIT 1';
    db.pool.query(checkQuery, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error checking sound setting', error: err });
      }
  
      if (results.length > 0) {
        console.log("update",results[0].soundid)
        // If a record exists, update it
        const updateQuery = 'UPDATE tbl_soundsetting SET nofitysound = ? WHERE soundid = ?';
        db.pool.query(updateQuery, [nofitysound, results[0].soundid], (updateErr) => {
          if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ success: false, message: 'Error updating sound setting', error: updateErr });
          }
  
          return res.status(200).json({ success: true, message: 'Sound setting updated successfully' });
        });
      } else {
        console.log("post",nofitysound)
        // If no record exists, create a new one
        const insertQuery = 'INSERT INTO tbl_soundsetting (nofitysound) VALUES (?)';
        db.pool.query(insertQuery, [nofitysound], (insertErr, result) => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).json({ success: false, message: 'Error creating sound setting', error: insertErr });
          }
  
          return res.status(201).json({ success: true, message: 'Sound setting created successfully' });
        });
      }
    });
  };









  const getAllSoundSettings = (req, res) => {
    const query = 'SELECT * FROM tbl_soundsetting';
    db.pool.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error fetching sound settings' });
      }
      res.status(200).json({ success: true, data: results });
    });
  };

// const getSubscriptionsByAdmin = async (req, res) => {
//   const user_id = req.params.id;
//   const query = `
//   SELECT
//     sp.package_name,
//     sp.price_with_currency,
//     sup.package_status,
//     DATE_FORMAT(sup.start_date, '%Y-%m-%d') AS start_date,
//     DATE_FORMAT(sup.end_date, '%Y-%m-%d') AS end_date,
//     DATE_FORMAT(sup.trial_date, '%Y-%m-%d') AS trial_date,
//     sup.user_plan_id,
//     sup.user_id,
//     CASE 
//       WHEN sup.package_status = 'approved' AND sup.end_date >= CURDATE() THEN 'Active'
//       WHEN sup.package_status = 'approved' AND sup.end_date < CURDATE() THEN 'Expired'
//       WHEN sup.package_status = 'pending' THEN 'Pending Approval'
//       ELSE 'Unknown'
//     END AS plan_status
//   FROM
//     superadmin_user_plans sup
//   LEFT JOIN
//     subscription_plans sp ON sup.plan_id = sp.plan_id
//   WHERE
//     sup.user_id = ?
//   ORDER BY sup.start_date DESC
// `;

//   db.pool.query(query, [user_id], (err, results) => {
//     if (err) {
//       console.error("Error fetching subscription data:", err);
//       return res.status(500).json({ success: false, message: "Database error", error: err.message });
//     }

//     res.status(200).json({ success: true, data: results });
//   });
// };

// POST /api/subscriptions

const getSubscriptionsByAdmin = async (req, res) => {
  const user_id = req.params.id;

  const query = `
  SELECT
    sp.package_name,
    sp.price_with_currency,
    sup.package_status,
    sup.start_date,
    sup.end_date,
    sup.trial_date,
    sup.user_plan_id,
    sup.user_id,
    sup.plan_id,
    CASE
      WHEN sup.package_status = 'approved' AND sup.end_date >= CURDATE() THEN 'Active'
      WHEN sup.package_status = 'approved' AND sup.end_date < CURDATE() THEN 'Expired'
      WHEN sup.package_status = 'renew_requested' THEN 'Renew Requested'
      WHEN sup.package_status = 'pending' THEN 'Pending'
      WHEN sup.package_status = 'superseded' THEN 'Superseded'
      ELSE 'Unknown'
    END AS plan_status
  FROM superadmin_user_plans sup
  LEFT JOIN subscription_plans sp ON sup.plan_id = sp.plan_id
  WHERE sup.user_id = ?
  ORDER BY sup.start_date DESC
  `;

  db.pool.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error", error: err.message });

    res.status(200).json({ success: true, data: results });
  });
};


const createSubscriptionByAdmin = async (req, res) => {
  try {
    const { user_id, plan_id } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({ success: false, message: "user_id and plan_id are required" });
    }

    const package_status = "pending"; // ✅ default pending

    const insertQuery = `
      INSERT INTO superadmin_user_plans 
      (user_id, plan_id, package_status) 
      VALUES (?, ?, ?)
    `;

    db.pool.query(
      insertQuery,
      [user_id, plan_id, package_status],
      (err, result) => {
        if (err) {
          console.error("Error while creating subscription:", err);
          return res.status(500).json({ success: false, message: "Error creating subscription" });
        }

        res.status(201).json({
          success: true,
          message: "Subscription assigned successfully (pending status)",
          subscription_id: result.insertId,
        });
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const renewPlanByAdmin = async (req, res) => {
  const { user_plan_id } = req.params;
  const userId = req.id;

  try {
    // Verify this plan belongs to the requesting user
    const [rows] = await db.pool.promise().query(
      `SELECT user_plan_id, user_id, package_status FROM superadmin_user_plans WHERE user_plan_id = ?`,
      [user_plan_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const plan = rows[0];

    if (plan.package_status !== 'pending') {
      return res.status(400).json({ success: false, message: "Only pending plans can be requested for renewal" });
    }

    // Change status to renew_requested
    await db.pool.promise().query(
      `UPDATE superadmin_user_plans SET package_status = 'renew_requested' WHERE user_plan_id = ?`,
      [user_plan_id]
    );

    return res.status(200).json({ success: true, message: "Renewal requested. Waiting for Super Admin approval." });
  } catch (error) {
    console.error("renewPlanByAdmin error:", error);
    return res.status(500).json({ success: false, message: "An error occurred" });
  }
};

  module.exports={
    getAllSettings,
    createSetting,
    updateSetting,
    getSettingById,
    createOrUpdateSoundSetting,
    getAllSoundSettings,
    getSubscriptionsByAdmin,
    createSubscriptionByAdmin,
    renewPlanByAdmin
  }