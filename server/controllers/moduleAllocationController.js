const db = require("../utils/db");

const ALL_MODULES = [
  { module_key: "manage_order",        module_name: "Manage Order" },
  { module_key: "reservation",         module_name: "Reservation" },
  { module_key: "purchase_manage",     module_name: "Purchase Manage" },
  { module_key: "food_management",     module_name: "Food Management" },
  { module_key: "recipe_management",   module_name: "Recipe Management" },
  { module_key: "inventory_management",module_name: "Inventory Management" },
  { module_key: "loyalty",             module_name: "Loyalty" },
  { module_key: "roles_permission",    module_name: "Roles & Permission" },
  { module_key: "user_staff",          module_name: "User & Staff" },
  { module_key: "report",              module_name: "Report" },
  { module_key: "master_setup",        module_name: "Master Set UP" },
  { module_key: "human_resource",      module_name: "Human Resource" },
  { module_key: "waste_tracking",      module_name: "Waste Tracking" },
  { module_key: "setting",             module_name: "Setting" },
  { module_key: "pos",                 module_name: "POS" },
];

const ALL_SUB_FEATURES = {
  manage_order: [
    { sub_feature_key: "pos_invoice",       sub_feature_name: "POS Invoice",       applicable_perms: ["can_view","can_create","can_print","can_manage"] },
    { sub_feature_key: "order_list",        sub_feature_name: "Order List",        applicable_perms: ["can_view","can_edit","can_delete","can_print","can_export","can_manage"] },
    { sub_feature_key: "pending_order",     sub_feature_name: "Pending Order",     applicable_perms: ["can_view","can_delete","can_print","can_export"] },
    { sub_feature_key: "complete_order",    sub_feature_name: "Complete Order",    applicable_perms: ["can_view","can_print","can_export","can_manage"] },
    { sub_feature_key: "cancel_order",      sub_feature_name: "Cancel Order",      applicable_perms: ["can_view","can_print","can_export","can_manage"] },
    { sub_feature_key: "kitchen_dashboard", sub_feature_name: "Kitchen Dashboard", applicable_perms: ["can_view","can_print","can_manage"] },
  ],
  reservation: [
    { sub_feature_key: "all_reservations",  sub_feature_name: "All Reservations",  applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_booking",       sub_feature_name: "Add Booking",       applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "unavailable_today", sub_feature_name: "Unavailable Today", applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
  ],
  purchase_manage: [
    { sub_feature_key: "purchase_item",   sub_feature_name: "Purchase Item",   applicable_perms: ["can_view","can_create","can_edit","can_export"] },
    { sub_feature_key: "add_purchase",    sub_feature_name: "Add Purchase",    applicable_perms: ["can_view","can_create","can_export"] },
    { sub_feature_key: "purchase_return", sub_feature_name: "Purchase Return", applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "return_invoice",  sub_feature_name: "Return Invoice",  applicable_perms: ["can_view","can_create","can_print","can_export"] },
    { sub_feature_key: "supplier_manage", sub_feature_name: "Supplier Manage", applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "supplier_ledger", sub_feature_name: "Supplier Ledger", applicable_perms: ["can_view","can_export"] },
  ],
  food_management: [
    { sub_feature_key: "add_category",  sub_feature_name: "Add Category",  applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "category_list", sub_feature_name: "Category List", applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_food",      sub_feature_name: "Add Food",      applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "food_list",     sub_feature_name: "Food List",     applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "menu_type",     sub_feature_name: "Menu Type",     applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_ons",       sub_feature_name: "Add Ons",       applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
  ],
  recipe_management: [
    { sub_feature_key: "ingredient_list",     sub_feature_name: "Ingredient List",     applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "unit_measurement",    sub_feature_name: "Unit Measurement",    applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_customer",        sub_feature_name: "Add Customer",        applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "customer_type",       sub_feature_name: "Customer Type",       applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "set_production_unit", sub_feature_name: "Set Production Unit", applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "production_set_list", sub_feature_name: "Production Set List", applicable_perms: ["can_view","can_create","can_edit","can_manage","can_export"] },
    { sub_feature_key: "add_production",      sub_feature_name: "Add Production",      applicable_perms: ["can_view","can_create","can_export"] },
  ],
  inventory_management: [
    { sub_feature_key: "ingredient_stock_list", sub_feature_name: "Ingredient Stock List", applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "stock_out_ingredients", sub_feature_name: "Stock Out Ingredients", applicable_perms: ["can_view","can_create","can_export"] },
  ],
  loyalty: [
    { sub_feature_key: "point_setting",       sub_feature_name: "Point Setting",       applicable_perms: ["can_view","can_create","can_edit","can_export"] },
    { sub_feature_key: "customer_point_list", sub_feature_name: "Customer Point List", applicable_perms: ["can_view","can_export"] },
  ],
  roles_permission: [
    { sub_feature_key: "add_role",         sub_feature_name: "Add Role",         applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "role_list",        sub_feature_name: "Role List",        applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "user_access_role", sub_feature_name: "User Access Role", applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
  ],
  user_staff: [
    { sub_feature_key: "add_user",  sub_feature_name: "Add User",  applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "user_list", sub_feature_name: "User List", applicable_perms: ["can_view","can_edit","can_delete","can_export"] },
  ],
  report: [
    { sub_feature_key: "purchase_report",        sub_feature_name: "Purchase Report",           applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "foodstock_report",       sub_feature_name: "Stock Report (Food Items)", applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "kitchenstock_report",    sub_feature_name: "Stock Report (Kitchen)",    applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "deliverytype_report",    sub_feature_name: "Delivery Type Sales Report",applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "sale_report",            sub_feature_name: "Sale Report",               applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "waitersale_report",      sub_feature_name: "Waiter Sale Report",        applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "servicecharge_report",   sub_feature_name: "Service Charge Report",     applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "cashier_report",         sub_feature_name: "Sale Report Cashier",       applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "itemsale_report",        sub_feature_name: "Item Sales Report",         applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "cash_register_report",   sub_feature_name: "Cash Register Report",      applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "sale_report_filter",     sub_feature_name: "Sale Report Filtering",     applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "saleby_day",             sub_feature_name: "Sale By Date",              applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "saleby_table",           sub_feature_name: "Sale By Table",             applicable_perms: ["can_view","can_export"] },
    { sub_feature_key: "commission_report",      sub_feature_name: "Commission Report",         applicable_perms: ["can_view","can_export"] },
  ],
  master_setup: [
    { sub_feature_key: "unit_measurement",       sub_feature_name: "Unit Measurement",        applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "ingredients",            sub_feature_name: "Ingredients",             applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "kitchen_list",           sub_feature_name: "Kitchen List",            applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "printers",               sub_feature_name: "Printers",               applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "table_floor_manage",     sub_feature_name: "Table & Floor Manage",   applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "all_table_qr",           sub_feature_name: "All Table-QR",           applicable_perms: ["can_view"] },
    { sub_feature_key: "add_customers",          sub_feature_name: "Add Customers",          applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "order_type",             sub_feature_name: "Order Type",             applicable_perms: ["can_view","can_create","can_edit","can_delete"] },
    { sub_feature_key: "shipping_type",          sub_feature_name: "Shipping Type",          applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "commission_position",    sub_feature_name: "Add Commission Position",applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "commission_setting",     sub_feature_name: "Commission Setting",     applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
  ],
  human_resource: [
    { sub_feature_key: "designation",       sub_feature_name: "Designation",       applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_employee",      sub_feature_name: "Add Employee",      applicable_perms: ["can_view","can_create"] },
    { sub_feature_key: "manage_employee",   sub_feature_name: "Manage Employee",   applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_expense_item",  sub_feature_name: "Add Expense Item",  applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "add_expense",       sub_feature_name: "Add Expense",       applicable_perms: ["can_view","can_create","can_delete","can_export"] },
    { sub_feature_key: "department",        sub_feature_name: "Department",        applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "division",          sub_feature_name: "Division",          applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "holiday",           sub_feature_name: "Holiday",           applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "leave_type",        sub_feature_name: "Leave Type",        applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
    { sub_feature_key: "leave_application", sub_feature_name: "Leave Application", applicable_perms: ["can_view","can_create","can_edit","can_delete","can_export"] },
  ],
  waste_tracking: [
    { sub_feature_key: "packaging_food",     sub_feature_name: "Packaging Food",      applicable_perms: ["can_view","can_create","can_export"] },
    { sub_feature_key: "purchasefood_waste", sub_feature_name: "Purchase Food Waste", applicable_perms: ["can_view","can_create","can_export"] },
    { sub_feature_key: "makingfood_waste",   sub_feature_name: "Making Food Waste",   applicable_perms: ["can_view","can_create","can_export"] },
  ],
  setting: [
    { sub_feature_key: "general_setting", sub_feature_name: "General Setting", applicable_perms: ["can_view","can_manage"] },
    { sub_feature_key: "my_subscription", sub_feature_name: "My Subscription", applicable_perms: ["can_view","can_manage"] },
  ],
  pos: [],
};

// GET /api/module-allocation/admins
const getAdmins = async (req, res) => {
  try {
    const [rows] = await db.pool.promise().query(
      "SELECT id, firstname, lastname, email FROM user WHERE is_admin = 1 ORDER BY firstname ASC"
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getAdmins error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/module-allocation/:adminId
const getModulesForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const [rows] = await db.pool.promise().query(
      "SELECT module_key, is_enabled FROM superadmin_module_allocation WHERE admin_user_id = ?",
      [adminId]
    );

    const savedMap = {};
    rows.forEach((r) => { savedMap[r.module_key] = r.is_enabled; });

    const modules = ALL_MODULES.map((m) => ({
      ...m,
      is_enabled: savedMap[m.module_key] !== undefined ? savedMap[m.module_key] : 1,
    }));

    res.status(200).json({ success: true, data: modules });
  } catch (err) {
    console.error("getModulesForAdmin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/module-allocation/:adminId
const saveModulesForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { modules } = req.body;

    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ success: false, message: "modules array is required" });
    }

    const values = modules.map((m) => [adminId, m.module_key, m.module_name, m.is_enabled ? 1 : 0]);

    await db.pool.promise().query(
      `INSERT INTO superadmin_module_allocation (admin_user_id, module_key, module_name, is_enabled)
       VALUES ?
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), module_name = VALUES(module_name)`,
      [values]
    );

    res.status(200).json({ success: true, message: "Module allocation saved successfully" });
  } catch (err) {
    console.error("saveModulesForAdmin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/module-allocation/enabled/:adminId  — used by admin frontend to know what to show
const getEnabledModulesForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const [rows] = await db.pool.promise().query(
      "SELECT module_key FROM superadmin_module_allocation WHERE admin_user_id = ? AND is_enabled = 0",
      [adminId]
    );

    const disabledKeys = rows.map((r) => r.module_key);
    const enabledModules = ALL_MODULES.filter((m) => !disabledKeys.includes(m.module_key));

    res.status(200).json({ success: true, data: enabledModules });
  } catch (err) {
    console.error("getEnabledModulesForAdmin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/module-allocation/my-modules  — self-resolving: works for both admin and staff
const getMyEnabledModules = async (req, res) => {
  try {
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(200).json({ success: true, data: ALL_MODULES.map((m) => m.module_key) });
    }

    const { is_admin, created_by } = userRows[0];
    const adminId = is_admin === 1 ? userId : created_by;

    if (!adminId) {
      return res.status(200).json({ success: true, data: ALL_MODULES.map((m) => m.module_key) });
    }

    const [rows] = await db.pool.promise().query(
      "SELECT module_key FROM superadmin_module_allocation WHERE admin_user_id = ? AND is_enabled = 0",
      [adminId]
    );

    const disabledKeys = new Set(rows.map((r) => r.module_key));
    const enabledKeys = ALL_MODULES.map((m) => m.module_key).filter((k) => !disabledKeys.has(k));

    res.status(200).json({ success: true, data: enabledKeys });
  } catch (err) {
    console.error("getMyEnabledModules error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/module-allocation/sub-features/:adminId
const getSubFeaturePermissions = async (req, res) => {
  try {
    const { adminId } = req.params;

    const [rows] = await db.pool.promise().query(
      "SELECT module_key, sub_feature_key, can_view, can_create, can_edit, can_delete, can_print, can_export, can_manage FROM superadmin_sub_feature_permissions WHERE admin_user_id = ?",
      [adminId]
    );

    const savedMap = {};
    rows.forEach((r) => {
      if (!savedMap[r.module_key]) savedMap[r.module_key] = {};
      savedMap[r.module_key][r.sub_feature_key] = r;
    });

    const result = ALL_MODULES.map((mod) => {
      const subFeatures = (ALL_SUB_FEATURES[mod.module_key] || []).map((sf) => {
        const saved = savedMap[mod.module_key]?.[sf.sub_feature_key];
        return {
          ...sf,
          can_view:   saved ? saved.can_view   : 1,
          can_create: saved ? saved.can_create : 1,
          can_edit:   saved ? saved.can_edit   : 1,
          can_delete: saved ? saved.can_delete : 0,
          can_print:  saved ? saved.can_print  : 0,
          can_export: saved ? saved.can_export : 0,
          can_manage: saved ? saved.can_manage : 0,
        };
      });
      return { module_key: mod.module_key, module_name: mod.module_name, sub_features: subFeatures };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("getSubFeaturePermissions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/module-allocation/sub-features/:adminId
const saveSubFeaturePermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ success: false, message: "permissions array is required" });
    }

    const values = permissions.map((p) => [
      adminId,
      p.module_key,
      p.sub_feature_key,
      p.can_view   ? 1 : 0,
      p.can_create ? 1 : 0,
      p.can_edit   ? 1 : 0,
      p.can_delete ? 1 : 0,
      p.can_print  ? 1 : 0,
      p.can_export ? 1 : 0,
      p.can_manage ? 1 : 0,
    ]);

    await db.pool.promise().query(
      `INSERT INTO superadmin_sub_feature_permissions
        (admin_user_id, module_key, sub_feature_key, can_view, can_create, can_edit, can_delete, can_print, can_export, can_manage)
       VALUES ?
       ON DUPLICATE KEY UPDATE
        can_view   = VALUES(can_view),
        can_create = VALUES(can_create),
        can_edit   = VALUES(can_edit),
        can_delete = VALUES(can_delete),
        can_print  = VALUES(can_print),
        can_export = VALUES(can_export),
        can_manage = VALUES(can_manage)`,
      [values]
    );

    res.status(200).json({ success: true, message: "Sub-feature permissions saved successfully" });
  } catch (err) {
    console.error("saveSubFeaturePermissions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/module-allocation/my-sub-features — self-resolving for admin & staff
const getMySubFeaturePermissions = async (req, res) => {
  try {
    const userId = req.id;

    const [userRows] = await db.pool.promise().query(
      "SELECT is_admin, created_by FROM user WHERE id = ?",
      [userId]
    );

    if (!userRows.length) {
      return res.status(200).json({ success: true, data: {} });
    }

    const { is_admin, created_by } = userRows[0];
    const adminId = is_admin === 1 ? userId : created_by;

    if (!adminId) {
      return res.status(200).json({ success: true, data: {} });
    }

    const [rows] = await db.pool.promise().query(
      "SELECT module_key, sub_feature_key, can_view, can_create, can_edit, can_delete, can_print, can_export, can_manage FROM superadmin_sub_feature_permissions WHERE admin_user_id = ?",
      [adminId]
    );

    // Build flat map: { sub_feature_key: { can_view, can_create, ... } }
    const permMap = {};
    rows.forEach((r) => {
      permMap[r.sub_feature_key] = {
        module_key: r.module_key,
        can_view:   r.can_view,
        can_create: r.can_create,
        can_edit:   r.can_edit,
        can_delete: r.can_delete,
        can_print:  r.can_print,
        can_export: r.can_export,
        can_manage: r.can_manage,
      };
    });

    res.status(200).json({ success: true, data: permMap });
  } catch (err) {
    console.error("getMySubFeaturePermissions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAdmins,
  getModulesForAdmin,
  saveModulesForAdmin,
  getEnabledModulesForAdmin,
  getMyEnabledModules,
  getSubFeaturePermissions,
  saveSubFeaturePermissions,
  getMySubFeaturePermissions,
};
