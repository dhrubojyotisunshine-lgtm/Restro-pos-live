const db = require("../utils/db");

const getAllRoles = async (req, res) => {
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
 
      let getRolesQuery;
      let queryParams;
 
      if (isAdmin === 1) {
        // Admin: fetch roles created by this user
        if (!searchItem || searchItem.trim() === "") {
          getRolesQuery = `SELECT * FROM sec_role_tbl WHERE create_by = ? ORDER BY role_id DESC`;
          queryParams = [id];
        } else {
          const searchQuery = `%${searchItem}%`;
          getRolesQuery = `SELECT * FROM sec_role_tbl WHERE create_by = ? AND role_name LIKE ? ORDER BY role_id DESC`;
          queryParams = [id, searchQuery];
        }
      } else {
        // Non-admin: fetch roles created by creator
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view roles." });
        }
 
        if (!searchItem || searchItem.trim() === "") {
          getRolesQuery = `SELECT * FROM sec_role_tbl WHERE create_by = ? ORDER BY role_id DESC`;
          queryParams = [created_by];
        } else {
          const searchQuery = `%${searchItem}%`;
          getRolesQuery = `SELECT * FROM sec_role_tbl WHERE create_by = ? AND role_name LIKE ? ORDER BY role_id DESC`;
          queryParams = [created_by, searchQuery];
        }
      }
 
      db.pool.query(getRolesQuery, queryParams, (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching roles",
            error: err,
          });
        }
 
        res.status(200).json({
          success: true,
          data: results,
          message: "Roles fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};

const deleteRolePermission = async (req, res) => {
  try {
    const { role_id } = req.params;
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const results = await dbQuery("SELECT * FROM sec_role_tbl WHERE role_id = ? AND create_by = ?", [role_id, creatorId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    await dbQuery("DELETE FROM sec_role_permission WHERE role_id = ?", [role_id]);
    await dbQuery("DELETE FROM sec_role_tbl WHERE role_id = ? AND create_by = ?", [role_id, creatorId]);
    await dbQuery("DELETE FROM sec_user_access_tbl WHERE fk_role_id = ?", [role_id]);

    res.status(200).json({
      success: true,
      message: "Role and permissions deleted successfully"
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the role and permissions"
    });
  }
};
// get all menu type items

const getAllMenuItems = async (req, res) => {
  try {
    const { searchItem } = req.query; // Assuming "seachItem" is meant to be "searchItem"

    let getMenuItemsQuery;
    let queryParams = [];

    if (!searchItem || searchItem.trim() === "") {
      // Fetch all menu items if searchItem is not provided or is an empty string
      getMenuItemsQuery = "SELECT * FROM sec_menu_item";
    } else {
      // Fetch menu items based on search criteria
      getMenuItemsQuery = "SELECT * FROM sec_menu_item WHERE menu_title LIKE ?";
      const searchQuery = `%${searchItem}%`;
      queryParams = [searchQuery];
    }

    // Execute the first query to get the menu items
    db.pool.query(getMenuItemsQuery, queryParams, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching menu items",
        });
      }

      if (results.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: "No menu items found",
        });
      }

      const parentMenuIds = results
        .map((item) => item.parent_menu)
        .filter(Boolean); // Collect non-null parent_menu IDs

      if (parentMenuIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: results,
          message: "Menu items fetched successfully without parent menus",
        });
      }

      // Query to fetch parent menu titles based on parent_menu IDs
      const sql2 =
        "SELECT menu_id, menu_title FROM sec_menu_item WHERE menu_id IN (?)";

      db.pool.query(sql2, [parentMenuIds], (err, menuTitles) => {
        if (err) {
          console.error("Second database query error:", err);
          return res.status(500).json({
            success: false,
            message: "An error occurred while fetching parent menu titles",
          });
        }

        // Create a map of menu_id to menu_title for quick lookup
        const menuTitleMap = {};
        menuTitles.forEach((item) => {
          menuTitleMap[item.menu_id] = item.menu_title;
        });

        // Map parent menu titles to the original results
        const itemsWithTitles = results.map((item) => ({
          ...item,
          parent_menu_title: menuTitleMap[item.parent_menu] || 0,
        }));

        // Send the response with the mapped results
        res.status(200).json({
          success: true,
          data: itemsWithTitles,
          message: "Menu items fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};


const getAllUserAccesses = (req, res) => {
  const id = req.id; // Authenticated user ID
  const { searchItem } = req.query;
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 
    const isAdmin = data[0].is_admin;
    const created_by = data[0].created_by;
 
    let sql = `
      SELECT
        sec_user_access_tbl.role_acc_id,
        sec_user_access_tbl.fk_role_id,
        sec_user_access_tbl.fk_user_id,
        user.firstname,
        user.lastname,
        sec_role_tbl.role_name
      FROM
        sec_user_access_tbl
      LEFT JOIN
        user ON sec_user_access_tbl.fk_user_id = user.id
      LEFT JOIN
        sec_role_tbl ON sec_user_access_tbl.fk_role_id = sec_role_tbl.role_id
      WHERE
        user.is_admin != 1
    `;
 
    const queryParams = [];
 
    if (isAdmin === 1) {
      sql += ` AND sec_user_access_tbl.created_by = ? `;
      queryParams.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
      }
      sql += ` AND sec_user_access_tbl.created_by = ? `;
      queryParams.push(created_by);
    }
 
    if (searchItem) {
      sql += ` AND (CONCAT(user.firstname, ' ', user.lastname) LIKE ? OR sec_role_tbl.role_name LIKE ?) `;
      queryParams.push(`%${searchItem}%`, `%${searchItem}%`);
    }
 
    sql += ` ORDER BY sec_user_access_tbl.role_acc_id DESC`;
 
    db.pool.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ success: false, message: "An error occurred" });
      }
 
      res.status(200).json({ success: true, data: results });
    });
  });
};

const createUserAccess = (req, res) => {
  const { fk_role_ids, fk_user_id } = req.body;
  const user_id = req.id;
 
  if (!Array.isArray(fk_role_ids) || fk_role_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Role IDs should be a non-empty array",
    });
  }
 
  // Step 1: Check if the user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, use user_id as created_by
      insertAccess(fk_role_ids, fk_user_id, user_id, res);
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create user access." });
        }
 
        const created_by = data[0].created_by;
 
        // Step 3: Check if the creator has a subscription
        const checkCreatorSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
        db.pool.query(checkCreatorSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            insertAccess(fk_role_ids, fk_user_id, created_by, res);
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
};
 
// ✅ Helper function to insert user access including created_by
const insertAccess = (fk_role_ids, fk_user_id, created_by, res) => {
  const values = fk_role_ids.map((role_id) => [role_id, fk_user_id, created_by]);
  const sql = "INSERT INTO sec_user_access_tbl (fk_role_id, fk_user_id, created_by) VALUES ?";
 
  db.pool.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "An error occurred" });
    } else {
      res.status(201).json({
        success: true,
        message: "User access created successfully",
        affectedRows: result.affectedRows,
      });
    }
  });
};
const deleteUserAccess = (req, res) => {
  const { role_acc_id } = req.params;
  const userId = req.id;

  const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
  db.pool.query(userQuery, [userId], (err, userResult) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    if (!userResult.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userResult[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const sql = "DELETE FROM sec_user_access_tbl WHERE role_acc_id = ? AND created_by = ?";
    db.pool.query(sql, [role_acc_id, creatorId], (err, result) => {
      if (err) {
        console.error("Database query error:", err);
        res.status(500).json({ success: false, message: "An error occurred" });
      } else if (result.affectedRows === 0) {
        res
          .status(404)
          .json({ success: false, message: "User access record not found" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "User access deleted successfully" });
      }
    });
  });
};

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
const editAccessRole = async (req, res) => {
  try {
    const fk_user_id = req.params.id;
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const accessInfoQuery = `
    SELECT srt.role_name, srt.role_id, suat.created_by
    FROM sec_user_access_tbl suat
    LEFT JOIN sec_role_tbl srt ON srt.role_id = suat.fk_role_id
    WHERE suat.fk_user_id = ? AND suat.created_by = ?
  `;

    const accessInfo = await dbQuery(accessInfoQuery, [fk_user_id, creatorId]);
    const username =
      "SELECT id, firstname, lastname FROM user WHERE id=? AND is_admin != 1";
    const userinfo = await dbQuery(username, fk_user_id);

    console.log(accessInfo);
    if (!accessInfo || accessInfo.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No role access info found for the given ID",
        });
    }

    const data = {
      accessInfo,
      userinfo,
    };

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Database query error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while fetching role access information.",
      });
  }
};

const updateUserAccess = async (req, res) => {
  const id = req.params.id;
  const { fk_role_ids, fk_user_id } = req.body;
  const userId = req.id;
  console.log("user id",fk_user_id);
  try {
    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const deleteQuery = 'DELETE FROM sec_user_access_tbl WHERE fk_user_id = ? AND created_by = ?';
    await db.pool.promise().query(deleteQuery, [id, creatorId]);

    let values = fk_role_ids.map(role_id => [role_id, fk_user_id, creatorId]);
    const insertQuery = 'INSERT INTO sec_user_access_tbl (fk_role_id, fk_user_id, created_by) VALUES ?';
    await db.pool.promise().query(insertQuery, [values]);

    res.status(200).json({ success: true, message: 'User access updated successfully' });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ success: false, message: 'An error occurred while updating user access' });
  }
};

const createRolePermission = async (req, res) => {
  try {
    const { role_name, role_description, permissions } = req.body;
    const user_id = req.id; // Logged-in user's ID
    const date_time = new Date().toISOString().slice(0, 19).replace("T", " ");
 
    // Step 1: Check if user has a subscription
    const [userSubRows] = await db.pool.promise().query(
      "SELECT * FROM superadmin_user_plans WHERE user_id = ?",
      [user_id]
    );
 
    let creator_id = user_id;
 
    if (userSubRows.length === 0) {
      // Step 2: Check if the user was created by someone
      const [createdByRows] = await db.pool.promise().query(
        "SELECT created_by FROM user WHERE id = ?",
        [user_id]
      );
 
      if (createdByRows.length === 0 || !createdByRows[0].created_by) {
        return res.status(403).json({ message: "You are not authorized to create roles." });
      }
 
      creator_id = createdByRows[0].created_by;
 
      // Step 3: Check if the creator has a subscription
      const [creatorSubRows] = await db.pool.promise().query(
        "SELECT * FROM superadmin_user_plans WHERE user_id = ?",
        [creator_id]
      );
 
      if (creatorSubRows.length === 0) {
        return res.status(403).json({ message: "Creator does not have an active subscription." });
      }
    }
 
    // Step 4: Insert role
    const roleInsertResult = await db.pool.promise().query(
      "INSERT INTO sec_role_tbl (role_name, role_description, create_by, date_time) VALUES (?, ?, ?, ?)",
      [role_name, role_description, creator_id, date_time]
    );
    const role_id = roleInsertResult[0].insertId;
 
    // Step 5: Insert permissions
    let valuesArray = permissions.map((item) => [
      role_id,
      item.menu_id,
      item.module_name,
      item.can_access || 0,
      item.can_create || 0,
      item.can_edit || 0,
      item.can_delete || 0,
      date_time,
      creator_id,
    ]);
 
    await db.pool.promise().query(
      `INSERT INTO sec_role_permission
      (role_id, menu_id, module_name, can_access, can_create, can_edit, can_delete, createdate, createby)
      VALUES ?`,
      [valuesArray]
    );
 
    res.status(200).json({
      success: true,
      message: "Role and permissions added successfully",
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the role and permissions",
    });
  }
};



// edit role
const getRolePermissionById = async (req, res) => {
  try {
    const role_id = req.params.role_id;
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    // Get role information
    const roleQueryResult = await dbQuery(
      "SELECT * FROM sec_role_tbl WHERE role_id = ? AND create_by = ?",
      [role_id, creatorId]
    );

    if (roleQueryResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const role = roleQueryResult[0];

    // Get associated permissions
    const permissionsQueryResult = await dbQuery(
      "SELECT * FROM sec_role_permission WHERE role_id = ?",
      [role_id]
    );

    if (permissionsQueryResult.length === 0) {
      const allMenuItems = await dbQuery("SELECT * FROM sec_menu_item", []);
      const defaultPermissions = allMenuItems.map(item => ({
        id: null,
        menu_id: item.menu_id,
        module_name: item.menu_title,
        can_access: 0,
        can_create: 0,
        can_edit: 0,
        can_delete: 0,
      }));
      // return defaultPermissions instead of empty array
    }

    // Send success response
    res.status(200).json({
      success: true,
      data: { role, permissionsQueryResult },
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred",
    });
  }
};
//update

const updateRolePermission = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { role_name, role_description, permissions } = req.body;
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?", [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: "User not found" });
    const { is_admin, created_by } = userRows[0];
    const creatorId = is_admin === 1 ? userId : created_by;
    if (!creatorId) return res.status(403).json({ success: false, message: "Unauthorized" });

    const date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Fetch current role data and verify ownership
    const results = await dbQuery("SELECT * FROM sec_role_tbl WHERE role_id = ? AND create_by = ?", [role_id, creatorId]);
    if (!results.length) return res.status(404).json({ success: false, message: "Role not found" });
    const currentData = results[0];

    // Fallback to current values if fields are not provided; lock create_by to server-resolved value
    const updateData = {
      role_name: role_name !== undefined ? role_name : currentData.role_name,
      role_description: role_description !== undefined ? role_description : currentData.role_description,
      create_by: creatorId,
      date_time,
    };

    // Update role in the sec_role_tbl table
    await dbQuery(
      "UPDATE sec_role_tbl SET role_name = ?, role_description = ?, create_by = ?, date_time = ? WHERE role_id = ? AND create_by = ?",
      [updateData.role_name, updateData.role_description, updateData.create_by, updateData.date_time, role_id, creatorId]
    );

    // Delete existing permissions for the role from sec_role_permission
    await dbQuery("DELETE FROM sec_role_permission WHERE role_id = ?", [role_id]);

    // Prepare valuesArray for batch insert
    let valuesArray = [];

    // Loop through the permissions array received from the frontend
    permissions.forEach(item => {
      const module_name = item.module_name;

      valuesArray.push([
        role_id,
        item.menu_id,
        module_name,
        item.can_access || 0,
        item.can_create || 0,
        item.can_edit || 0,
        item.can_delete || 0,
        date_time,
        creatorId
      ]);
    });

    const insertPermissionsQuery = `
      INSERT INTO sec_role_permission
      (role_id, menu_id, module_name, can_access, can_create, can_edit, can_delete, createdate, createby)
      VALUES ?`;

    await dbQuery(insertPermissionsQuery, [valuesArray]);

    res.status(200).json({
      success: true,
      message: "Role and permissions updated successfully"
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the role and permissions"
    });
  }
};
module.exports = {
  getAllRoles,
  deleteRolePermission,
  getAllMenuItems,
  getAllUserAccesses,
  deleteUserAccess,
  createUserAccess,
  editAccessRole,
  updateUserAccess,
  createRolePermission,
  getRolePermissionById,
  updateRolePermission
};
