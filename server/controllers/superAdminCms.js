const db = require("../utils/db");
// home banner api
exports.createItem = async (req, res) => {
    
    try {
      const { banner_heading, banner_description } = req.body;
   console.log(req.body)
      if (!banner_heading || !banner_description) {
        return res.status(400).json({ error: "Missing required fields." });
      }
   
      const banner_image =
        req.files && req.files.banner_image
          ? req.files.banner_image[0].filename
          : null;
   
   db.pool.query(
        `INSERT INTO superadmin_home_features
         (banner_image, banner_heading, banner_description)
         VALUES (?, ?, ?)`,
        [banner_image, banner_heading, banner_description]
      );
   
      res.status(201).json({ message: "Item created successfully" });
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: error.message });
    }
};
  exports.getAllItems = async (req, res) => {
    try {
        const [rows] = await db.pool.promise().query("SELECT id,banner_image, banner_heading, banner_description FROM superadmin_home_features");
        res.status(200).json({ message: "Items retrieved successfully", data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getItemById = async (req, res) => {
  const { id } = req.params;
  try {
      const [rows] = await db.pool.promise().execute("SELECT id,banner_image, banner_heading, banner_description FROM superadmin_home_features WHERE id = ?", [id]);
      if (rows.length === 0) return res.status(404).json({ message: "Item not found" });
      res.status(200).json(rows[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
exports.updateItem = (req, res) => {
  const { banner_heading, banner_description } = req.body;
  const { id } = req.params;
console.log(req.body)
  if (!id || !banner_heading || !banner_description) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  let banner_image = null;
  if (req.files && req.files.banner_image && req.files.banner_image.length > 0) {
    banner_image = req.files.banner_image[0].filename;
  }

  let query = `UPDATE superadmin_home_features SET banner_heading = ?, banner_description = ?`;
  const values = [banner_heading, banner_description];

  if (banner_image) {
    query += `, banner_image = ?`;
    values.push(banner_image);
  }

  query += ` WHERE id = ?`;
  values.push(id);

  db.pool.query(query, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found with the provided ID." });
    }

    return res.status(200).json({ message: "Item updated successfully" });
  });
};
exports.deleteItem = (req, res) => {
    const { id } = req.params;
    db.pool.query(
      "DELETE FROM superadmin_home_features WHERE id = ?",
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Item not found" });
        }
        res.status(200).json({ message: "Item deleted successfully" });
      }
    );
};
//  home Features Settings api 
exports.createFeatures = async (req, res) => {
  try {
    const {heading, description } = req.body;

    if (!heading || !description) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const image =
      req.files && req.files.image
        ? req.files.image[0].filename
        : null;

 db.pool.query(
      `INSERT INTO superadmin_home_feature1
       (image, heading, description)
       VALUES (?, ?, ?)`,
      [image, heading, description]
    );

    res.status(201).json({ message: "Item created successfully" });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: error.message });
  }
};
exports.getAllhomeFeatures = async (req, res) => {
  try {
      const [rows] = await db.pool.promise().query("SELECT id,image, heading, description FROM superadmin_home_feature1");
      res.status(200).json({ message: "Items retrieved successfully", data: rows });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
exports.deletehomeFeatures= (req, res) => {
  const { id } = req.params;
  db.pool.query(
    "DELETE FROM superadmin_home_feature1 WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(200).json({ message: "Item deleted successfully" });
    }
  );
};

exports.gethomeFeaturesById = async (req, res) => {
  const { id } = req.params;
  try {
      const [rows] = await db.pool.promise().execute("SELECT id,image,heading, description FROM superadmin_home_feature1 WHERE id = ?", [id]);
      if (rows.length === 0) return res.status(404).json({ message: "Item not found" });
      res.status(200).json(rows[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
exports.updatehomeFeatures = (req, res) => {
  const { heading, description } = req.body;
  const { id } = req.params;
  console.log(req.body,id)

  if (!id || !heading || !description) {
      return res.status(400).json({ error: "Missing required fields." });
    }
   

  const image =
    req.files && req.files.image
      ? req.files.image[0].filename
      : null;

  let query = `UPDATE superadmin_home_feature1 SET heading = ?, description = ?`;
  const values = [heading, description];

  if (image) {
    query += `,image = ?`;
    values.push(  image);
  }

  query += ` WHERE id = ?`;
  values.push(id);

  db.pool.query(query, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found with the provided ID." });
    }

    return res.status(200).json({ message: "Item updated successfully" });
  });
};
// general setting
exports.createGeneralSetting = (req, res) => {
  const {
      
      company_name,
      email,
      contact_no,
      address,
      brand_logos_header,
      testimonials_header,
      contact_header,
      contact_description,
      footer_short_description,
      footer_company_link
  } = req.body;
  const company_logo= req.file ? req.file.filename : ""; 
  const sql = `
      INSERT INTO admin_general_settings (
          company_logo, company_name, email, contact_no, address,
          brand_logos_header, testimonials_header, contact_header,
          contact_description, footer_short_description, footer_company_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.pool.query(sql, [
      company_logo, company_name, email, contact_no, address,
      brand_logos_header, testimonials_header, contact_header,
      contact_description, footer_short_description, footer_company_link
  ], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({ message: 'General setting saved successfully', id: result.insertId });
  });
};
exports.getGeneralSettings = (req, res) => {
  db.pool.query('SELECT * FROM admin_general_settings', (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json(result);
  });
};
exports.updateGeneralSetting = (req, res) => {
  const id = req.params.id;
  const {
      company_name,
      email,
      contact_no,
      address,
      brand_logos_header,
      testimonials_header,
      contact_header,
      contact_description,
      footer_short_description,
      footer_company_link
  } = req.body;

  const company_logo = req.file ? req.file.filename : null;
console.log(company_logo,req.body)
  let sql = `
      UPDATE admin_general_settings  SET
          company_name = ?, email = ?, contact_no = ?, address = ?,
          brand_logos_header = ?, testimonials_header = ?, contact_header = ?,
          contact_description = ?, footer_short_description = ?, footer_company_link = ?
  `;

  const values = [
      company_name, email, contact_no, address,
      brand_logos_header, testimonials_header, contact_header,
      contact_description, footer_short_description, footer_company_link
  ];

  
  if (company_logo) {
      sql += `, company_logo = ?`;
      values.push(company_logo);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.pool.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json({ message: 'General setting updated successfully' });
  });
};
exports.deleteGeneralSetting = (req, res) => {
  const id = req.params.id;

  db.pool.query('DELETE FROM admin_general_settings WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json({ message: 'General setting deleted successfully' });
  });
};
exports.getGeneralSettingById = (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM admin_general_settings  WHERE id = ?`;

  db.pool.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) return res.status(404).json({ message: "General setting not found" });

      res.status(200).json(result[0]);
  });
};
// Add category for fetures
exports.createFeatureCategory = (req, res) => {
  const { heading, description, status = 'active' } = req.body;
  const sql = 'INSERT INTO admin_features_category (heading, description, status) VALUES (?, ?, ?)';
 console.log(req.body)
  db.pool.query(sql, [heading, description, status], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Feature category created', category_id: result.insertId });
  });
};
exports.getAllFeatureCategories = (req, res) => {
  const sql = 'SELECT * FROM admin_features_category';

  db.pool.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
  });
};
exports.getFeatureCategoryById = (req, res) => {
  const { category_id } = req.params;
  const sql = 'SELECT * FROM admin_features_category WHERE category_id = ?';

  db.pool.query(sql, [category_id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Feature category not found' });
      res.json(results[0]);
  });
};
exports.updateFeatureCategory = (req, res) => {
  const { category_id } = req.params;
  const { heading, description, status } = req.body;
  const sql = 'UPDATE admin_features_category SET heading = ?, description = ?, status = ? WHERE category_id = ?';

  db.pool.query(sql, [heading, description, status, category_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Feature category updated' });
  });
};
exports.deleteFeatureCategory = (req, res) => {
  const { category_id } = req.params;
  const sql = 'DELETE FROM admin_features_category WHERE category_id = ?';

  db.pool.query(sql, [category_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Feature category deleted' });
  });
};

// Features
exports.createFeature = (req, res) => {
  const { category_id, title,  description } = req.body;
  const image= req.file ? req.file.filename : ""; 
  const sql = 'INSERT INTO adminfeatures (category_id, title, image, description) VALUES (?, ?, ?, ?)';

  db.pool.query(sql, [category_id, title, image, description], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Feature created', feature_id: result.insertId });
  });
};
exports.getAllFeatures = (req, res) => {
  const sql = `
    SELECT af.*, adc.heading, adc.status
    FROM adminfeatures af
    LEFT JOIN admin_features_category adc
      ON af.category_id = adc.category_id AND adc.status = 'active'
  `;
 
  db.pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching features:", err);
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
 
    res.status(200).json(results);
  });
};
exports.getFeatureById = (req, res) => {
  const { id } = req.params;

  const sql = `
  SELECT af.*, adc.heading, adc.status
  FROM adminfeatures af
  LEFT JOIN admin_features_category adc
    ON af.category_id = adc.category_id
  WHERE feature_id = ?
`;

  db.pool.query(sql, [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Feature not found' });
      res.json({data:results[0]});
  });
};
exports.updateFeature = (req, res) => {
  const  feature_id  = req.params.id;
  const { category_id, title,  description } = req.body;
  const image= req.file ? req.file.filename : ""; 
  const sql = 'UPDATE adminfeatures SET category_id = ?, title = ?, image = ?, description = ? WHERE feature_id = ?';

  db.pool.query(sql, [category_id, title, image, description, feature_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Feature updated' });
  });
};
exports.deleteFeature = (req, res) => {
  const  feature_id  = req.params.id;
  const sql = 'DELETE FROM adminfeatures WHERE feature_id = ?';

  db.pool.query(sql, [feature_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Feature deleted' });
  });
};
// Privacy POlicy
// CREATE
exports.createPrivacyPolicy = (req, res) => {
    const { title, content } = req.body;
    const sql = "INSERT INTO admin_privacy_policy (title, content) VALUES (?, ?)";
    db.pool.query(sql, [title, content], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: 'Privacy Policy created', id: result.insertId });
    });
};
// READ ALL
exports.getPrivacyPolicies = (req, res) => {
    db.pool.query("SELECT * FROM admin_privacy_policy", (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json(result);
    });
};
// READ BY ID
exports.getPrivacyPolicyById = (req, res) => {
    const { id } = req.params;
    db.pool.query("SELECT * FROM admin_privacy_policy WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        if (result.length === 0) return res.status(404).json({ message: 'Not found' });
        res.status(200).json(result[0]);
    });
};
// UPDATE
exports.updatePrivacyPolicy = (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const sql = "UPDATE admin_privacy_policy SET title = ?, content = ? WHERE id = ?";
    db.pool.query(sql, [title, content, id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json({ message: 'Privacy Policy updated' });
    });
};
// DELETE
exports.deletePrivacyPolicy = (req, res) => {
    const { id } = req.params;
    db.pool.query("DELETE FROM admin_privacy_policy WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(200).json({ message: 'Privacy Policy deleted' });
    });
};
// SuperAdmin settiing
// SuperAdmin settiing

exports.getAdminSettings = (req, res) => {
    const sql = 'SELECT * FROM admin_settings';
    db.pool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({data:results});
    });
};
exports.getAdminSettingsById = (req, res) => {

    const { id } = req.params;

    const sql = 'SELECT * FROM superadminfinal_settings WHERE id = ?';
 
    db.pool.query(sql, [id], (err, results) => {

        if (err) {

            return res.status(500).json({ error: err.message });

        }

        if (results.length === 0) {

            return res.status(404).json({ message: 'Admin setting not found' });

        }

        res.json({ data: results[0] }); // Return a single object

    });

};
exports.createAdminSettings = (req, res) => {

  const {
    Company_name,
    Currency_Selection,
    currency_symbol_position,
    country,
    state,
    city,
    address,
    time_zone,
    date_format
  } = req.body;
console.log(req.body)
  const logo = req.files?.['logo']?.[0]?.filename || null;
  const fevicon = req.files?.['fevicon']?.[0]?.filename || null;

  const sql = `
    INSERT INTO superadminfinal_settings 
    (
      Company_name,
      Currency_Selection,
      currency_symbol_position,
      logo,
      fevicon,
      country,
      state,
      city,
      address,
      time_zone,
      date_format
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    Company_name,
    Currency_Selection,
    currency_symbol_position,
    logo,
    fevicon,
    country,
    state,
    city,
    address,
    time_zone,
    date_format
  ];

  db.pool.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ message: 'Admin setting added successfully', id: result.insertId });
  });
};
exports.updateAdminSettings = (req, res) => {
    const id=req.params.id;
  const {
  
    Company_name,
    Currency_Selection,
    currency_symbol_position,
    country,
    state,
    city,
    address,
    time_zone,
    date_format
  } = req.body;

  const logo = req.files?.['logo']?.[0]?.filename || null;
  const fevicon = req.files?.['fevicon']?.[0]?.filename || null;

  const sql = `
    UPDATE superadminfinal_settings SET
      Company_name = ?,
      Currency_Selection = ?,
      currency_symbol_position = ?,
      logo = ?,
      fevicon = ?,
      country = ?,
      state = ?,
      city = ?,
      address = ?,
      time_zone = ?,
      date_format = ?
    WHERE id = ?
  `;

  const values = [
    Company_name,
    Currency_Selection,
    currency_symbol_position,
    logo,
    fevicon,
    country,
    state,
    city,
    address,
    time_zone,
    date_format,
    id
  ];

  db.pool.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No record found to update' });
    }

    res.status(200).json({ message: 'Admin setting updated successfully' });
  });
};



