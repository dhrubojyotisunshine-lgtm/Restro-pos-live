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
//as discussed with filter get api done according to total sales and table no because in frontend filter is not working
const getTableBySale = async (req, res) => {
  try {
    const { from, to } = req.query;
    const id = req.id; // Authenticated user ID
 
    // Step 1: Check user role
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      // Step 2: Base SQL
      let sql = `
        SELECT
          t.tableid,
          t.tablename,
          SUM(co.totalamount) AS total_amount
        FROM rest_table t
        JOIN customer_order co ON co.table_no = t.tableid
        JOIN bill b ON b.order_id = co.order_id
        WHERE co.order_status = 4
          AND b.bill_status = 1
      `;
 
      const params = [];
 
      // Step 3: Role-based condition
      if (isAdmin === 1) {
        sql += ` AND co.created_by = ?`;
        params.push(id);
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
        }
        sql += ` AND co.created_by = ?`;
        params.push(created_by);
      }
 
      // Step 4: Optional date filtering
      if (from && to) {
        sql += ` AND co.order_date BETWEEN ? AND ?`;
        params.push(from, to);
      }
 
      sql += ` GROUP BY t.tableid`;

     
 
      const results = await dbQuery(sql, params);
 
      res.status(200).json({ success: true, data: results });
    });
  } catch (err) {
    console.error('Error fetching table by sale report:', err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching the table by sale report' });
  }
};


const salesReport = async (req, res) => {
  const { from, to, saleinvoice, payment_method_id, searchItem } = req.query;
  const id = req.id;
 
  try {
   
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
   
      let params = [];
      let sql = `
        SELECT co.*, b.*, c.*, p.*,
              co.saleinvoice, c.customer_name, p.payment_method,
              b.total_amount, b.service_charge, b.VAT, b.discount, b.bill_amount, co.order_date
        FROM customer_order co
        JOIN bill b ON b.order_id = co.order_id
        LEFT JOIN customer_info c ON co.customer_id = c.customer_id AND c.is_active = 1
        LEFT JOIN payment_method p ON b.payment_method_id = p.payment_method_id
        WHERE b.bill_status = 1 AND co.order_status = 4
      `;
 
     
      if (isAdmin === 1) {
        sql += ` AND co.created_by = ?`;
        params.push(id);
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
        }
        sql += ` AND co.created_by = ?`;
        params.push(created_by);
      }
 
 
      if (from && to) {
        sql += ` AND co.order_date BETWEEN ? AND ?`;
        params.push(from, to);
      }
 
      if (saleinvoice) {
        sql += ` AND co.saleinvoice = ?`;
        params.push(saleinvoice);
      }
 
      if (payment_method_id) {
        sql += ` AND b.payment_method_id = ?`;
        params.push(payment_method_id);
      }
 
      if (searchItem) {
        const searchTerm = `%${searchItem}%`;
        sql += `
          AND (
            c.customer_name LIKE ? OR
            co.saleinvoice LIKE ? OR
            p.payment_method LIKE ? OR
            b.total_amount LIKE ? OR
            b.service_charge LIKE ? OR
            b.VAT LIKE ? OR
            b.discount LIKE ? OR
            b.bill_amount LIKE ?
          )
        `;
        params.push(
          searchTerm, searchTerm, searchTerm,
          searchTerm, searchTerm, searchTerm,
          searchTerm, searchTerm
        );
      }
 
      sql += ` ORDER BY co.order_id DESC`;
 
     
      const results = await dbQuery(sql, params);
 
      const specificFieldsArray = results.map(item => ({
        customer_name: item.customer_name,
        saleinvoice: item.saleinvoice,
        payment_method: item.payment_method,
        totalamount: item.total_amount,
        bill_amount: item.bill_amount,
        service_charge: item.service_charge,
        VAT: item.VAT,
        discount: item.discount,
        order_date: item.order_date
      }));
 
      res.status(200).json({
        success: true,
        data: specificFieldsArray
      });
    });
  } catch (err) {
    console.error('Error fetching sales report:', err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching the sales report' });
  }
};



const getWaiterTotalAmount = async (req, res) => {
  try {
    const id = req.id;
    const { from, to, searchItem } = req.query;
 
 
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
     
      let sql = `
        SELECT
          co.waiter_id,
          SUM(co.totalamount) AS total_amount,
          CONCAT(w.firstname, ' ', w.lastname) AS WaiterName
        FROM customer_order co
        JOIN bill b ON b.order_id = co.order_id
        LEFT JOIN user w ON co.waiter_id = w.id
        WHERE co.order_status = 4
          AND b.bill_status = 1
          AND co.waiter_id > 0
      `;
 
      const queryParams = [];
 
   
      if (isAdmin === 1) {
        sql += ` AND co.created_by = ?`;
        queryParams.push(id);
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
        }
        sql += ` AND co.created_by = ?`;
        queryParams.push(created_by);
      }
 
      if (from && to) {
        sql += ` AND co.order_date BETWEEN ? AND ?`;
        queryParams.push(from, to);
      }
 
      sql += ` GROUP BY co.waiter_id`;
 
      // Step 5: HAVING for search
      if (searchItem) {
        const searchQuery = `%${searchItem}%`;
        sql += `
          HAVING WaiterName LIKE ?
          OR total_amount LIKE ?
        `;
        queryParams.push(searchQuery, searchQuery);
      }
 
      sql += ` ORDER BY total_amount DESC`;
 
      const results = await dbQuery(sql, queryParams);
 
      res.status(200).json({
        success: true,
        data: results
      });
    });
  } catch (err) {
    console.error('Error fetching total amount for waiters:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the total amount for waiters'
    });
  }
};

const serviceChargeReport = async (req, res) => {
  const { from, to, saleinvoice, searchItem } = req.query;
  const userId = req.id;

  // Step 1: Check user role
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

  db.pool.query(checkUserQuery, [userId], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }

    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { is_admin, created_by } = userData[0];

    // Step 2: Build base SQL query
    let sql = `
      SELECT b.order_id, b.service_charge
      FROM customer_order co
      JOIN bill b ON b.order_id = co.order_id
      WHERE b.bill_status = 1
        AND co.order_status = 4
    `;

    const params = [];

    // Step 3: Role-based filter
    if (is_admin === 1) {
      sql += ` AND co.created_by = ?`;
      params.push(userId);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      sql += ` AND co.created_by = ?`;
      params.push(created_by);
    }

    // Step 4: Date range filter
    if (from && to) {
      sql += ` AND co.order_date BETWEEN ? AND ?`;
      params.push(from, to);
    }

    // Step 5: Filter by sale invoice
    if (saleinvoice) {
      sql += ` AND co.saleinvoice = ?`;
      params.push(saleinvoice);
    }

    // Step 6: Search filter
    if (searchItem) {
      const searchTerm = `%${searchItem}%`;
      sql += `
        AND (
          b.order_id LIKE ? OR
          b.service_charge LIKE ?
        )
      `;
      params.push(searchTerm, searchTerm);
    }

    // Step 7: Order results
    sql += ` ORDER BY co.order_id DESC`;

    // Step 8: Execute query
    try {
      const results = await dbQuery(sql, params);

      res.status(200).json({
        success: true,
        data: results || [],
      });
    } catch (error) {
      console.error("Error fetching service charge report:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the service charge report",
      });
    }
  });
};
const showDataCommsion = async (req, res) => {
  const id = req.id; // From auth middleware
  const { from, to, searchItem } = req.query;
 
  try {
    const userCheckQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    const userData = await dbQuery(userCheckQuery, [id]);
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    // Base SQL query with filtering
    let sql = `
      SELECT
        SUM(c.bill_amount) AS totalamount,
        up.pos_id,
        a.waiter_id,
        CONCAT(u.firstname, ' ', u.lastname) AS WaiterName
      FROM customer_order a
      JOIN bill c ON a.order_id = c.order_id
      LEFT JOIN user u ON a.waiter_id = u.id
      LEFT JOIN user_position up ON up.user_id = a.waiter_id
      WHERE a.order_status = 4
        AND c.bill_status = 1
    `;
 
    const params = [];
 
    // Role-based filter
    if (isAdmin === 1) {
      sql += ` AND a.created_by = ?`;
      params.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
      }
      sql += ` AND a.created_by = ?`;
      params.push(created_by);
    }
 
    // Date filter
    if (from && to) {
      sql += ` AND a.order_date BETWEEN ? AND ?`;
      params.push(from, to);
    }
 
    sql += ` GROUP BY a.waiter_id, up.pos_id, u.firstname, u.lastname`;
 
    // If searchItem is present, apply filter in outer query
    let finalQuery = sql;
    if (searchItem) {
      finalQuery = `
        SELECT * FROM (${sql}) AS sub
        WHERE WaiterName LIKE ? OR totalamount LIKE ?
      `;
      const search = `%${searchItem}%`;
      params.push(search, search);
    }
 
    // Execute main commission query
    const results = await dbQuery(finalQuery, params);
 
    // For each waiter, fetch commission rate
    const updatedResults = await Promise.all(
      results.map(async (row) => {
        const commissionQuery = "SELECT rate FROM payroll_commission_setting WHERE pos_id = ?";
        const commissionResults = await dbQuery(commissionQuery, [row.pos_id]);
        const commissionRate = commissionResults.length > 0 ? commissionResults[0].rate : 0;
 
        return {
          ...row,
          commissionRate,
        };
      })
    );
 
    res.status(200).json({ success: true, data: updatedResults });
  } catch (error) {
    console.error("Error fetching commission data:", error);
    res.status(500).json({ success: false, message: "An error occurred while fetching commission data." });
  }
};


const orderCasherReport = async (req, res) => {
  const id = req.id; // Populated from auth middleware
  const { from, to, searchItem } = req.query;
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    // Base SQL query
    let sql = `
      SELECT SUM(a.totalamount) AS totalamount, a.order_id,
             CONCAT(w.firstname, ' ', w.lastname) AS CashierName
      FROM customer_order a
      LEFT JOIN bill c ON a.order_id = c.order_id
      LEFT JOIN user w ON c.create_by = w.id
      WHERE a.order_status = 4
    `;
 
    const params = [];
 
    // Role-based access
    if (isAdmin === 1) {
      sql += ` AND c.create_by = ?`;
      params.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      sql += ` AND c.create_by = ?`;
      params.push(created_by);
    }
 
    // Date filtering
    if (from && to) {
      sql += ` AND a.order_date BETWEEN ? AND ?`;
      params.push(from, to);
    }
 
    // Grouping and search filter
    if (searchItem) {
      const searchQuery = `%${searchItem}%`;
      sql += ` GROUP BY c.create_by HAVING
               CONCAT(CashierName) LIKE ? OR totalamount LIKE ?`;
      params.push(searchQuery, searchQuery);
    } else {
      sql += ` GROUP BY c.create_by`;
    }
 
    sql += ` ORDER BY a.order_id DESC`;
 
    try {
      console.log('Final SQL:', sql);
      console.log('Params:', params);
 
      const results = await dbQuery(sql, params);
 
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error('Error fetching order cashier report:', err);
      res.status(500).json({ success: false, message: 'An error occurred while fetching the order cashier report' });
    }
  });
};

const salesReportFiltering = async (req, res) => {
  const id = req.id;
  const { from, to, customertype, searchItem } = req.query;
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    let creatorId;
    if (isAdmin === 1) {
      creatorId = id;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
      }
      creatorId = created_by;
    }
 
    // Base SQL query with joins
    let sql = `
      SELECT co.saleinvoice, co.customer_id, co.waiter_id, co.order_date, co.cutomertype, co.order_id,
             ci.customer_name, ci.customer_email, ci.customer_phone,
             ct.customer_type,
             u.firstname AS waiter_first_name, u.lastname AS waiter_last_name,
             b.discount, b.total_amount, b.bill_status
      FROM customer_order co
      LEFT JOIN customer_info ci ON co.customer_id = ci.customer_id
      LEFT JOIN customer_type ct ON co.cutomertype = ct.customer_type_id
      LEFT JOIN user u ON co.waiter_id = u.id
      LEFT JOIN bill b ON co.order_id = b.order_id
      WHERE co.order_status = 4 AND b.bill_status = 1 AND co.created_by = ?
    `;
 
    const params = [creatorId];
 
    // Date range filter
    if (from && to) {
      sql += ' AND co.order_date BETWEEN ? AND ?';
      params.push(from, to);
    }
 
    // Customer type filter
    if (customertype) {
      sql += ' AND co.cutomertype = ?';
      params.push(customertype);
    }
 
    // Search item filter
    if (searchItem) {
      const searchTerm = `%${searchItem}%`;
      sql += `
        AND (
          ci.customer_name LIKE ? OR
          u.firstname LIKE ? OR
          u.lastname LIKE ? OR
          b.discount LIKE ? OR
          ct.customer_type LIKE ? OR
          co.saleinvoice LIKE ?
        )
      `;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
 
    sql += ` ORDER BY co.order_id DESC`;
 
    try {
      const results = await dbQuery(sql, params);
 
      const detailedResults = results.map((order) => ({
        order_id: order.order_id,
        saleinvoice: order.saleinvoice,
        order_date: order.order_date,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customertype: order.customer_type,
        waiter_id: order.waiter_id,
        first_name: order.waiter_first_name,
        last_name: order.waiter_last_name,
        discount: order.discount,
        total_amount: order.total_amount,
        bill_status: order.bill_status,
      }));
 
      res.status(200).json({ success: true, data: detailedResults });
    } catch (err) {
      console.error('Error fetching sales report:', err);
      res.status(500).json({ success: false, message: 'An error occurred while fetching the sales report' });
    }
  });
};
const salesByDate = async (req, res) => {
  const { from, to, searchItem } = req.query;
  const id = req.id;

  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
  db.pool.query(checkUserQuery, [id], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }

    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { is_admin, created_by } = userData[0];
    const userCreatedBy = is_admin === 1 ? id : created_by;

    if (!userCreatedBy) {
      return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
    }

    try {
      let sql = `
        SELECT
          co.order_id,
          co.order_date,
          om.price,
          om.menuqty,
          om.varientid,
          om.menu_id,
          v.variantName AS varientName,
          i.ProductName AS foodName
        FROM customer_order co
        JOIN order_menu om ON co.order_id = om.order_id
        LEFT JOIN variant v ON om.varientid = v.variantid
        LEFT JOIN item_foods i ON om.menu_id = i.ProductsID
        LEFT JOIN bill b ON b.order_id = om.order_id
        WHERE co.order_status = 4
          AND b.bill_status = 1
          AND co.created_by = ?
      `;

      const params = [userCreatedBy];

      if (from && to) {
        sql += ` AND co.order_date BETWEEN ? AND ? `;
        params.push(from, to);
      }

      if (searchItem) {
        const searchQuery = `%${searchItem}%`;
        sql += `
          AND (
            CAST(om.menuqty AS CHAR) LIKE ?
            OR v.variantName LIKE ?
            OR i.ProductName LIKE ?
            OR CAST(om.price AS CHAR) LIKE ?
          )
        `;
        params.push(searchQuery, searchQuery, searchQuery, searchQuery);
      }

      sql += ` ORDER BY co.order_id DESC`;

      const results = await dbQuery(sql, params);

      res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error('Error fetching sales by date:', err);
      res.status(500).json({ success: false, message: 'An error occurred while fetching sales by date' });
    }
  });
};


const itemSalesReport = async (req, res) => {
  const id = req.id; // Populated from auth middleware
  const { from, to, categoryid, searchItem } = req.query;
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    let creatorId;
    if (isAdmin === 1) {
      creatorId = id;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      creatorId = created_by;
    }
 
    try {
      let sql = `
        SELECT
          co.order_id,
          co.order_date,
          om.price,
          om.menuqty,
          om.varientid,
          om.menu_id,
          v.variantName AS varientName,
          i.ProductName AS foodName,
          i.ProductsID
        FROM customer_order co
        JOIN order_menu om ON co.order_id = om.order_id
        LEFT JOIN variant v ON om.varientid = v.variantid
        LEFT JOIN item_foods i ON om.menu_id = i.ProductsID
        LEFT JOIN bill b ON b.order_id = om.order_id
        WHERE co.order_status = 4
          AND b.bill_status = 1
          AND co.created_by = ?
      `;
 
      const params = [creatorId];
 
      // Add category filter
      if (categoryid) {
        sql += ` AND i.CategoryID = ?`;
        params.push(categoryid);
      }
 
      // Add date filter
      if (from && to) {
        sql += ` AND co.order_date BETWEEN ? AND ?`;
        params.push(from, to);
      }
 
      // Add search filter
      if (searchItem) {
        const searchQuery = `%${searchItem}%`;
        sql += `
          AND (
            om.menuqty LIKE ?
            OR v.variantName LIKE ?
            OR i.ProductName LIKE ?
            OR om.price LIKE ?
          )
        `;
        params.push(searchQuery, searchQuery, searchQuery, searchQuery);
      }
 
      sql += ` ORDER BY co.order_id DESC`;
 
      const results = await dbQuery(sql, params);
 
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error('Error fetching item sales report:', err);
      res.status(500).json({ success: false, message: 'An error occurred while fetching item sales report' });
    }
  });
};
const getCashRegister = async (req, res) => {
  try {
    const id = req.id; // Authenticated user ID from middleware
    const { start_date, end_date, user_id, searchItem } = req.query;
 
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      let allowedUserId;
 
      if (isAdmin === 1) {
        allowedUserId = user_id || id; // Admin can filter by any user or self
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
        }
        allowedUserId = created_by; // Non-admin sees data only for their creator
      }
 
      // Base query
      let query = `
        SELECT cr.id, cr.userid, cr.opening_balance, cr.closing_balance, cr.opendate, cr.closedate,
               cr.status, cr.openingnote, cr.closing_note,
               CONCAT(u.firstname, ' ', u.lastname) AS username
        FROM tbl_cashregister AS cr
        LEFT JOIN user AS u ON cr.userid = u.id
        WHERE cr.status = 1 AND cr.userid = ?
      `;
 
      const queryParams = [allowedUserId];
 
      // Date range
      if (start_date && end_date) {
        query += ` AND cr.opendate BETWEEN ? AND ?`;
        queryParams.push(start_date, end_date);
      }
 
      // Search filter
      if (searchItem) {
        const searchPattern = `%${searchItem}%`;
        query += `
          AND (
            cr.opening_balance LIKE ? OR
            cr.closing_balance LIKE ? OR
            CONCAT(u.firstname, ' ', u.lastname) LIKE ?
          )
        `;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }
 
      query += ` ORDER BY cr.id DESC`;
 
      // Run query
      const rows = await dbQuery(query, queryParams);
 
      res.status(200).json({
        success: true,
        data: rows,
      });
    });
  } catch (error) {
    console.error('Error fetching cash register data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cash register data.',
      error: error.message,
    });
  }
};
 
// get cash register user 

const getCashUser = async (req, res) => {
  try {
    let query = `
      SELECT cr.id, cr.userid,
             CONCAT(u.firstname, ' ', u.lastname) AS username
      FROM tbl_cashregister AS cr
      LEFT JOIN user AS u ON cr.userid = u.id
      WHERE cr.status = 1
      GROUP BY cr.userid;
    `;
    const rows = await dbQuery(query);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching cash register data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cash register data.',
      error: error.message,
    });
  }
};

// register viwe data
const purchaseReport = (req, res) => {
  const { start_date, end_date, searchItem } = req.query;
  const id = req.id;

  // Step 1: Check user role
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";

  db.pool.query(checkUserQuery, [id], async (err, userData) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }

    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;

    // Step 2: Build query
    let query = `
      SELECT
        a.invoiceid,
        a.total_price,
        a.purchasedate,
        a.suplierID,
        b.supid,
        b.supName
      FROM purchaseitem a
      LEFT JOIN supplier b ON b.supid = a.suplierID
      WHERE 1 = 1
    `;

    const queryParams = [];

    // Step 3: Role-based filter
    if (isAdmin === 1) {
      query += ` AND b.created_by = ?`;
      queryParams.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      query += ` AND b.created_by = ?`;
      queryParams.push(created_by);
    }

    // Step 4: Date filter
    if (start_date && end_date) {
      query += ` AND a.purchasedate BETWEEN ? AND ?`;
      queryParams.push(start_date, end_date);
    }

    // Step 5: Search filter
    if (searchItem) {
      const searchTerm = `%${searchItem}%`;
      query += `
        AND (
          a.invoiceid LIKE ? OR
          a.total_price LIKE ? OR
          b.supName LIKE ?
        )
      `;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Step 6: Order by
    query += ` ORDER BY a.purchasedate DESC`;

    // Step 7: Execute query
    db.pool.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching purchase report:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching the purchase report",
        });
      }

      res.status(200).json({
        success: true,
        data: results,
      });
    });
  });
};

const getCashRegisterView = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id",id)

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID parameter is required.',
      });
    }

    // First query to get opendate, closedate, and userid
    const query1 = `SELECT opendate, closedate, userid FROM tbl_cashregister WHERE id = ?`;
    const [result] = await dbQuery(query1, [id]); // Await the result and destructure

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Cash register entry not found.',
      });
    }

    const { opendate, closedate, userid } = result;

    if (!opendate || !userid) {
      return res.status(404).json({
        success: false,
        message: 'Open date or user ID is missing.',
      });
    }

    const isValidDate = (date) => !isNaN(new Date(date).getTime());

    const formatDateTime = (dateTime) => {
      if (!isValidDate(dateTime)) {
        throw new Error(`Invalid date value: ${dateTime}`);
      }
      const dateObj = new Date(dateTime);
      const date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      const time = dateObj.toTimeString().split(' ')[0]; // Extract HH:MM:SS
      return { date, time };
    };

    // Validate and format dates
    const openDateTime = formatDateTime(opendate);

    // Handle closedate; if null or invalid, set a maximum time range
    const closeDateTime = closedate && isValidDate(closedate)
      ? formatDateTime(closedate)
      : { date: openDateTime.date, time: '23:59:59' };

    // Second query to get bill data
    const query2 = `
      SELECT order_id, bill_amount 
      FROM bill 
      WHERE create_by = ? 
      AND bill_date = ? 
      AND bill_time BETWEEN ? AND ?
    `;
    const bills = await dbQuery(query2, [
      userid,
      openDateTime.date,
      openDateTime.time,
      closeDateTime.time,
    ]);

    // Send the response with the fetched data
    res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error) {
    console.error('Error fetching cash register view:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cash register view data.',
      error: error.message,
    });
  }
};


const productwise = async (req, res) => {
  const { itemid, start_date, end_date } = req.query;
  const userId = req.id; // populated from auth middleware
 
  try {
    // Step 1: Check user role
    const [userData] = await dbQuery(`SELECT is_admin, created_by FROM user WHERE id = ?`, [userId]);
 
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const { is_admin, created_by } = userData;
 
    let creatorId;
 
    if (is_admin === 1) {
      // Admins see their own data
      creatorId = userId;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      // Non-admins see data created by their admin
      creatorId = created_by;
    }
 
    // Step 2: Build query
    let productReportQuery = `
      SELECT
        a.*,
        SUM(a.itemquantity) AS totalqty,
        b.ProductsID,
        b.ProductName
      FROM production a
      LEFT JOIN item_foods b ON b.ProductsID = a.itemid
    `;
 
    const queryParams = [];
    let whereClause = `a.savedby = ?`;
    queryParams.push(creatorId);
 
    if (itemid) {
      whereClause += ` AND a.itemid = ?`;
      queryParams.push(itemid);
    }
 
    if (start_date && end_date) {
      whereClause += ` AND a.saveddate BETWEEN ? AND ?`;
      queryParams.push(start_date, end_date);
    }
 
    productReportQuery += ` WHERE ${whereClause} GROUP BY a.itemid ORDER BY a.saveddate DESC`;
 
    // Step 3: Fetch data
    const productResults = await dbQuery(productReportQuery, queryParams);
 
    const data = productResults.map(product => ({
      ...product,
      ProductName: product.ProductName,
      In_Qnty: product.totalqty,
      Out_Qnty: 0,
      Stock: 0,
    }));
 
    // Step 4: Add sales info
    for (const product of data) {
      const salesQuery = `
        SELECT
          SUM(a.menuqty) AS totalsaleqty
        FROM order_menu a
        LEFT JOIN customer_order b ON b.order_id = a.order_id
        WHERE a.menu_id = ? AND b.order_status != 5
      `;
 
      const salesResults = await dbQuery(salesQuery, [product.ProductsID]);
 
      const totalSaleQty = salesResults[0]?.totalsaleqty || 0;
      product.Out_Qnty = totalSaleQty;
      product.Stock = product.In_Qnty - totalSaleQty;
    }
 
    res.status(200).json({
      success: true,
      title: "Purchase Report",
      data,
    });
  } catch (error) {
    console.error("Error generating product-wise report:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the product-wise report",
      error: error.message,
    });
  }
};
const ingredientReport = async (req, res) => {
  const { start_date, end_date, pid } = req.query;
  const userId = req.id; // populated from auth middleware
 
  try {
    // Step 1: Get user role and created_by
    const [userData] = await dbQuery(`SELECT is_admin, created_by FROM user WHERE id = ?`, [userId]);
 
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const { is_admin, created_by } = userData;
 
    let creatorId;
 
    if (is_admin === 1) {
      creatorId = userId;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this report." });
      }
      creatorId = created_by;
    }
 
    // Step 2: Build base query
    let mainQuery = `
      SELECT
        a.*,
        SUM(a.quantity) AS totalqty,
        b.id,
        b.ingredient_name,
        b.stock_qty,
        c.uom_short_code
      FROM purchase_details a
      LEFT JOIN ingredients b ON b.id = a.indredientid
      INNER JOIN unit_of_measurement c ON c.id = b.uom_id
    `;
 
    const queryParams = [];
    let whereClauses = [`a.purchaseby = ?`]; // Enforce created_by access
    queryParams.push(creatorId);
 
    if (pid) {
      whereClauses.push(`a.indredientid = ?`);
      queryParams.push(pid);
    }
 
    if (start_date && end_date) {
      whereClauses.push(`a.purchasedate BETWEEN ? AND ?`);
      queryParams.push(start_date, end_date);
    }
 
    if (whereClauses.length > 0) {
      mainQuery += `WHERE ${whereClauses.join(" AND ")} `;
    }
 
    mainQuery += `GROUP BY a.indredientid ORDER BY a.purchasedate DESC`;
 
    // Step 3: Execute query
    const mainResults = await dbQuery(mainQuery, queryParams);
    const ingredientData = mainResults;
 
    // Step 4: Fetch sales quantity if needed (your existing logic)
    const salesQty = await ingredientReportById(start_date, end_date, pid);
 
    // Step 5: Format final response
    const data = ingredientData.map((ingredientDatas) => ({
      ProductName: ingredientDatas.ingredient_name,
      In_Qnty: `${ingredientDatas.totalqty} ${ingredientDatas.uom_short_code}`,
      Out_Qnty: `${ingredientDatas.totalqty - ingredientDatas.stock_qty} ${ingredientDatas.uom_short_code}`,
      Stock: `${ingredientDatas.stock_qty} ${ingredientDatas.uom_short_code}`,
    }));
 
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error generating ingredient report:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the ingredient report.",
    });
  }
};

const ingredientReportById = async (start_date, end_date, id) => {
  try {
    // Query for production
    let productionQuery = `
      SELECT itemid, itemquantity
      FROM production
    `;
    const queryParams = [];
    let whereClauses = [];

    if (start_date && end_date) {
      whereClauses.push(`saveddate BETWEEN ? AND ?`);
      queryParams.push(start_date, end_date);
    }

    if (whereClauses.length > 0) {
      productionQuery += `WHERE ${whereClauses.join(" AND ")}`;
    }

    const productionResults = await dbQuery(productionQuery, queryParams);

    let totalSaleQty = 0;

    for (const production of productionResults) {
      const saleQuery = `
        SELECT 
          SUM(a.qty) AS totalsaleqty 
        FROM production_details a
        WHERE a.ingredientid = ? AND a.foodid = ?
        GROUP BY a.foodid
      `;
      const saleResults = await dbQuery(saleQuery, [id, production.itemid]);
      const saleQty = saleResults[0]?.totalsaleqty || 0;

      totalSaleQty += saleQty * production.itemquantity;
    }

    return totalSaleQty;
  } catch (error) {
    console.error("Error generating sales data:", error);
    throw new Error("Failed to calculate sales quantity.");
  }
};


const orderDelivery = async (req, res) => {
 const { start_date, end_date } = req.query;
  const userId = req.id; // from auth middleware
 
  try {
    // Step 1: Get user role and created_by
    const [userData] = await dbQuery(`SELECT is_admin, created_by FROM user WHERE id = ?`, [userId]);
 
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const { is_admin, created_by } = userData;
 
    let creatorId;
    if (is_admin === 1) {
      creatorId = userId;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view order delivery data." });
      }
      creatorId = created_by;
    }
 
    // Step 2: Build base query with ownership filter
    let query = `
      SELECT
        SUM(c.total_amount) AS totalamount,
        a.cutomertype,
        ct.customer_type
      FROM customer_order a
      LEFT JOIN bill c ON a.order_id = c.order_id
      LEFT JOIN customer_type ct ON ct. customer_type_id=a.cutomertype
      WHERE a.order_status = 4
        AND a.created_by = ?
    `;
 
    const queryParams = [creatorId];
 
    if (start_date && end_date) {
      query += ` AND a.order_date BETWEEN ? AND ?`;
      queryParams.push(start_date, end_date);
    }
 
    query += ` GROUP BY a.cutomertype`;
 
    // Step 3: Execute query
    const results = await dbQuery(query, queryParams);
 
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for the specified criteria.",
      });
    }
 
    // Step 4: Return results
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching order delivery data:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching order delivery data.",
    });
  }
};
module.exports={
    getTableBySale,
    salesReport,
    getWaiterTotalAmount,
    serviceChargeReport,
    showDataCommsion,
    orderCasherReport,
    salesReportFiltering,
    salesByDate,
    itemSalesReport,
    getCashRegister,
    getCashUser,
    getCashRegisterView,
    purchaseReport,
    productwise,
    ingredientReport,
    orderDelivery
}