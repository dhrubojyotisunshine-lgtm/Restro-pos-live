const db = require("../utils/db");

const getPurchaseItemDetails = (req, res) => {
  try {
    const id = req.id;
    const { searchItem } = req.query;
 console.log(id)
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
 
      let getPurchaseItemDetailsQuery = `
        SELECT
          p.*,
          s.supName AS suppliername,
          p.purchasedate,
          p.total_price,
          p.invoiceid
        FROM
          purchaseitem p
        LEFT JOIN
          supplier s ON p.suplierID = s.supid
        WHERE p.savedby = ?`; // apply condition based on user
 
      const queryParams = [];
 
      if (isAdmin === 1) {
        queryParams.push(id);
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
        }
        queryParams.push(created_by);
      }
 
      if (searchItem && searchItem.trim() !== "") {
        const searchValue = `%${searchItem}%`;
        getPurchaseItemDetailsQuery += `
          AND (
            s.supName LIKE ?
            OR p.purchasedate LIKE ?
            OR p.total_price LIKE ?
            OR p.invoiceid LIKE ?
          )`;
        queryParams.push(searchValue, searchValue, searchValue, searchValue);
      }
 
      getPurchaseItemDetailsQuery += " ORDER BY p.purID DESC";
 
      db.pool.query(getPurchaseItemDetailsQuery, queryParams, (err, result) => {
        if (err) {
          console.error('Error fetching purchase item details:', err);
          return res.status(500).json({ success: false, message: "Server error", error: err });
        }
 
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "No purchase items found" });
        }
 
        res.status(200).json({
          success: true,
          data: result,
          message: "Purchase item details fetched successfully"
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
};
  // get by id
const getPurchaseItemById = (req, res) => {
  const { id } = req.params;
 
  // Fetch purchase item data
  const getPurchaseItemQuery = `SELECT * FROM purchaseitem WHERE purID = ?`;
  db.pool.query(getPurchaseItemQuery, [id], (err, purchaseItemResult) => {
    if (err) {
      console.error('Error fetching purchase item:', err);
      return res.status(500).send('Server error');
    }
 
    if (purchaseItemResult.length === 0) {
      return res.status(404).send('Purchase item not found');
    }
 
    const purchaseItem = purchaseItemResult[0];
    console.log("p",purchaseItem)
    let paymentType = '';
 
    // Determine payment type
    if (purchaseItem.bankid) {
      const getBankNameQuery = `SELECT bank_name FROM tbl_bank WHERE bankid = ?`;
      db.pool.query(getBankNameQuery, [purchaseItem.bankid], (err, bankResult) => {
        if (err) {
          console.error('Error fetching bank name:', err);
          return res.status(500).send('Server error');
        }
 
        paymentType = bankResult.length > 0 ? bankResult[0].bank_name : 'Unknown Bank Payment';
        fetchPurchaseDetails(purchaseItem, paymentType);
      });
    } else {
      paymentType = 'Cash Payment';
      fetchPurchaseDetails(purchaseItem, paymentType);
    }
 
    // Function to fetch purchase details
    function fetchPurchaseDetails(purchaseItem, paymentType) {
      const getPurchaseDetailsQuery = `SELECT * FROM purchase_details WHERE purchaseid = ?`;
      db.pool.query(getPurchaseDetailsQuery, [purchaseItem.purID], (err, purchaseDetailsResult) => {
        if (err) {
          console.error('Error fetching purchase details:', err);
          return res.status(500).send('Server error');
        }
 
        // Fetch ingredient names for each purchase detail
        const ingredientIds = purchaseDetailsResult.map(detail => detail.indredientid);
        if (ingredientIds.length > 0) {
          const getIngredientNamesQuery = `SELECT * FROM ingredients WHERE id IN (?)`;
          db.pool.query(getIngredientNamesQuery, [ingredientIds], (err, ingredientsResult) => {
            if (err) {
              console.error('Error fetching ingredient names:', err);
              return res.status(500).send('Server error');
            }
 
            // Map ingredient names to purchase details
            const ingredientsMap = {};
            ingredientsResult.forEach(ingredient => {
              ingredientsMap[ingredient.id] = ingredient;
            });
 
            const purchaseDetailsWithIngredients = purchaseDetailsResult.map(detail => ({
              ...detail,
              ingredient: ingredientsMap[detail.indredientid] || 'Unknown'
            }));
 
            fetchSupplierLedger(purchaseItem, purchaseDetailsWithIngredients, paymentType);
          });
        } else {
          fetchSupplierLedger(purchaseItem, [], paymentType);
        }
      });
    }
 
    // Function to fetch supplier ledger and complete the response
    function fetchSupplierLedger(purchaseItem, purchaseDetailsWithIngredients, paymentType) {
      // Fetch supplier name
      const getSupplierNameQuery = `SELECT supName FROM supplier WHERE supid = ?`;
      db.pool.query(getSupplierNameQuery, [purchaseItem.suplierID], (err, supplierNameResult) => {
        if (err) {
          console.error('Error fetching supplier name:', err);
          return res.status(500).send('Server error');
        }
 
        const supplierName = supplierNameResult.length > 0 ? supplierNameResult[0].supName : 'Unknown Supplier';
 
        // Map the response structure
        const response = {
          purchaseitem: [{
 
            paymentTypeid:purchaseItem.paymenttype,
            suplierID:purchaseItem.suplierID,
            invoiceid: purchaseItem.invoiceid,
            supplierName: supplierName,
            purchasedate: purchaseItem.purchasedate,
            purchaseexpiredate: purchaseItem.purchaseexpiredate,
            details: purchaseItem.detail,
            total_price:purchaseItem.total_price,
            details:purchaseItem.details,
            bank_name: paymentType,
            paid_amount:purchaseItem.paid_amount,
            bankid:purchaseItem.bankid,
            savedby:purchaseItem.savedby,
 
          }],
          itemdetails: purchaseDetailsWithIngredients.map(detail => ({
            indredientid: detail.ingredient.ingredient_name,
            ingredientids:detail.indredientid,
            quantity: detail.quantity,
            totalprice: detail.price,
            stocky_quantity: detail.ingredient.stock_qty
          }))
        };
 
        // Return the response
        return res.status(200).json({data:response});
      });
    }
  });
};
const getReturnpurchase = (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;
 
    const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
    db.pool.query(checkUserQuery, [id], (err, userResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userResult.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userResult[0].is_admin;
      const created_by = userResult[0].created_by;
 
      let query;
      let queryParams = [];
 
      if (isAdmin === 1) {
        // Admin: view their own return purchases
        query = `
          SELECT
            purchase_return.*,
            supplier.supName
          FROM
            purchase_return
          LEFT JOIN
            supplier ON purchase_return.supplier_id = supplier.supid
          WHERE purchase_return.createby = ?
        `;
        queryParams.push(id);
 
        if (searchItem && searchItem.trim() !== "") {
          const searchValue = `%${searchItem}%`;
          query += `
            AND (
              supplier.supName LIKE ? OR
              purchase_return.po_no LIKE ? OR
              purchase_return.return_date LIKE ? OR
              purchase_return.totalamount LIKE ?
            )`;
          queryParams.push(searchValue, searchValue, searchValue, searchValue);
        }
 
      } else {
        // Non-admin: must use creator's ID
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view return purchases." });
        }
 
        query = `
          SELECT
            purchase_return.*,
            supplier.supName
          FROM
            purchase_return
          LEFT JOIN
            supplier ON purchase_return.supplier_id = supplier.supid
          WHERE purchase_return.createby = ?
        `;
        queryParams.push(created_by);
 
        if (searchItem && searchItem.trim() !== "") {
          const searchValue = `%${searchItem}%`;
          query += `
            AND (
              supplier.supName LIKE ? OR
              purchase_return.po_no LIKE ? OR
              purchase_return.return_date LIKE ? OR
              purchase_return.totalamount LIKE ?
            )`;
          queryParams.push(searchValue, searchValue, searchValue, searchValue);
        }
      }
 
      query += ` ORDER BY purchase_return.preturn_id DESC`;
 
      db.pool.query(query, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching return purchases:", err);
          return res.status(500).json({ success: false, message: "Server error", error: err });
        }
 
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: "No return purchases found" });
        }
 
        res.status(200).json({
          success: true,
          data: results,
          message: "Return purchase data fetched successfully",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred", error });
  }
};
// get all suppliers
const getAllSuppliers = (req, res) => {
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
 
    let baseQuery = `
      SELECT
        supplier.supid,
        supplier.supName,
        supplier.supEmail,
        supplier.supMobile,
        supplier.supAddress,
        SUM(CASE WHEN d_c = 'c' THEN amount ELSE 0 END) AS total_credit_amount,
        SUM(CASE WHEN d_c = 'd' THEN amount ELSE 0 END) AS total_debit_amount,
        (SUM(CASE WHEN d_c = 'd' THEN amount ELSE 0 END) - SUM(CASE WHEN d_c = 'c' THEN amount ELSE 0 END)) AS total_balance
      FROM supplier
      LEFT JOIN supplier_ledger ON supplier_ledger.supplier_id = supplier.supid
    `;
 
    let conditions = [];
    let queryParams = [];
 
    // Authorization condition
    if (isAdmin === 1) {
      conditions.push("supplier.created_by = ?");
      queryParams.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view suppliers." });
      }
      conditions.push("supplier.created_by = ?");
      queryParams.push(created_by);
    }
 
    // Search condition
    if (searchItem && searchItem.trim() !== "") {
      const searchValue = `%${searchItem}%`;
      conditions.push(`
        (supplier.supid LIKE ?
        OR supplier.supName LIKE ?
        OR supplier.supEmail LIKE ?
        OR supplier.supMobile LIKE ?
        OR supplier.supAddress LIKE ?)
      `);
      queryParams.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }
 
    // Append WHERE clause if conditions exist
    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }
 
    // Group and order
    baseQuery += " GROUP BY supplier.supid ORDER BY supplier.supid DESC";
 
    // Execute query
    db.pool.query(baseQuery, queryParams, (err, results) => {
      if (err) {
        console.error('Error fetching suppliers:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while fetching suppliers' });
      }
 
      res.status(200).json({
        success: true,
        data: results,
        message: 'Suppliers fetched successfully'
      });
    });
  });
};

// create supplier
// const createSupplier = (req, res) => {
//   const { supName, supEmail, supMobile, supAddress, amount } = req.body;
//   const user_id = req.id;
 
//   const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
 
//   db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
//     if (err) return res.status(500).send(err);
 
//     if (results.length > 0) {
//       // User has a subscription
//       proceedToCreateSupplier(results[0].user_id);
//     } else {
//       // Check who created the user
//       const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
//       db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
//         if (err) return res.status(500).send(err);
 
//         if (data.length === 0 || !data[0].created_by) {
//           return res.status(403).json({ message: "You are not authorized to create a supplier." });
//         }
 
//         const created_by = data[0].created_by;
 
//         // Check if the creator has a subscription
//         db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
//           if (err) return res.status(500).send(err);
 
//           if (results.length > 0) {
//             proceedToCreateSupplier(created_by);
//           } else {
//             return res.status(403).json({ message: "Creator does not have an active subscription." });
//           }
//         });
//       });
//     }
//   });
 
//   function proceedToCreateSupplier(created_by) {
//     const getMaxSupplierCodeQuery = 'SELECT suplier_code FROM supplier ORDER BY suplier_code DESC LIMIT 1';
 
//     db.pool.query(getMaxSupplierCodeQuery, (err, results) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ success: false, message: 'An error occurred while fetching supplier code' });
//       }
 
//       let newSupplierCode;
//       if (results.length > 0) {
//         const highestSupplierCode = results[0].suplier_code;
//         const codeNumber = parseInt(highestSupplierCode.split('_')[1]) + 1;
//         newSupplierCode = `sup_${codeNumber.toString().padStart(3, '0')}`;
//       } else {
//         newSupplierCode = 'sup_001';
//       }
 
//       const insertSupplierQuery = 'INSERT INTO supplier (suplier_code, supName, supEmail, supMobile, supAddress, created_by) VALUES (?, ?, ?, ?, ?, ?)';
//       db.pool.query(insertSupplierQuery, [newSupplierCode, supName, supEmail, supMobile, supAddress, created_by], (err, results) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ success: false, message: 'An error occurred while creating the supplier' });
//         }
 
//         const supplierId = results.insertId;
//         const newdate = new Date().toISOString().split('T')[0];
//         const new_chalan_no = "Adjustment";
//         const new_description = "Previous adjustment with software";
 
//         const insertSupplierLedgerQuery = 'INSERT INTO supplier_ledger (supplier_id, amount, date, description, chalan_no, transaction_id, status, d_c) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
//         db.pool.query(insertSupplierLedgerQuery, [supplierId, amount, newdate, new_description, new_chalan_no, newSupplierCode, 1, "c"], (err, ledgerResults) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({ success: false, message: 'An error occurred while inserting into supplier ledger' });
//           }
 
//           return res.status(201).json({ success: true, message: 'Supplier and ledger entry created successfully' });
//         });
//       });
//     });
//   }
// };
// const createSupplier = (req, res) => {
//   const { supName, supEmail, supMobile, supAddress, amount } = req.body;
//   const user_id = req.id;

//   const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

//   db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
//     if (err) return res.status(500).send(err);

//     if (results.length > 0) {
//       // User has a subscription
//       proceedToCreateSupplier(results[0].user_id);
//     } else {
//       // Check who created the user
//       const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
//       db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
//         if (err) return res.status(500).send(err);

//         if (data.length === 0 || !data[0].created_by) {
//           return res.status(403).json({ message: "You are not authorized to create a supplier." });
//         }

//         const created_by = data[0].created_by;

//         // Check if the creator has a subscription
//         db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
//           if (err) return res.status(500).send(err);

//           if (results.length > 0) {
//             proceedToCreateSupplier(created_by);
//           } else {
//             return res.status(403).json({ message: "Creator does not have an active subscription." });
//           }
//         });
//       });
//     }
//   });

//   function proceedToCreateSupplier(created_by) {
//     // 🔹 Step 1: Check duplicate email or mobile
//     const checkDuplicateQuery = "SELECT * FROM supplier WHERE supEmail = ? OR supMobile = ?";
//     db.pool.query(checkDuplicateQuery, [supEmail, supMobile], (err, results) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ success: false, message: "An error occurred while checking duplicates" });
//       }

//       if (results.length > 0) {
//         return res.status(400).json({ success: false, message: "Supplier with this email or mobile already exists" });
//       }

//       // 🔹 Step 2: Get new supplier code
//       const getMaxSupplierCodeQuery = 'SELECT suplier_code FROM supplier ORDER BY suplier_code DESC LIMIT 1';

//       db.pool.query(getMaxSupplierCodeQuery, (err, results) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ success: false, message: 'An error occurred while fetching supplier code' });
//         }

//         let newSupplierCode;
//         if (results.length > 0) {
//           const highestSupplierCode = results[0].suplier_code;
//           const codeNumber = parseInt(highestSupplierCode.split('_')[1]) + 1;
//           newSupplierCode = `sup_${codeNumber.toString().padStart(3, '0')}`;
//         } else {
//           newSupplierCode = 'sup_001';
//         }

//         // 🔹 Step 3: Insert into supplier
//         const insertSupplierQuery = 'INSERT INTO supplier (suplier_code, supName, supEmail, supMobile, supAddress, created_by) VALUES (?, ?, ?, ?, ?, ?)';
//         db.pool.query(insertSupplierQuery, [newSupplierCode, supName, supEmail, supMobile, supAddress, created_by], (err, results) => {
//           if (err) {
//             console.error(err);
//             return res.status(500).json({ success: false, message: 'An error occurred while creating the supplier' });
//           }

//           const supplierId = results.insertId;
//           const newdate = new Date().toISOString().split('T')[0];
//           const new_chalan_no = "Adjustment";
//           const new_description = "Previous adjustment with software";

//           // 🔹 Step 4: Insert into supplier ledger
//           const insertSupplierLedgerQuery = 'INSERT INTO supplier_ledger (supplier_id, amount, date, description, chalan_no, transaction_id, status, d_c) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
//           db.pool.query(insertSupplierLedgerQuery, [supplierId, amount, newdate, new_description, new_chalan_no, newSupplierCode, 1, "c"], (err, ledgerResults) => {
//             if (err) {
//               console.error(err);
//               return res.status(500).json({ success: false, message: 'An error occurred while inserting into supplier ledger' });
//             }

//             return res.status(201).json({ success: true, message: 'Supplier and ledger entry created successfully' });
//           });
//         });
//       });
//     });
//   }
// };

const createSupplier = (req, res) => {
  const { supName, supEmail, supMobile, supAddress, amount } = req.body;
  const user_id = req.id;

  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";

  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      proceedToCreateSupplier(results[0].user_id);
    } else {
      // Check who created the user
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);

        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create a supplier." });
        }

        const created_by = data[0].created_by;

        // Check if the creator has a subscription
        db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);

          if (results.length > 0) {
            proceedToCreateSupplier(created_by);
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });

  function proceedToCreateSupplier(created_by) {
    // 🔹 Step 1: Check duplicate email or mobile separately
    const checkDuplicateQuery = "SELECT * FROM supplier WHERE supEmail = ? OR supMobile = ?";
    db.pool.query(checkDuplicateQuery, [supEmail, supMobile], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "An error occurred while checking duplicates" });
      }

      if (results.length > 0) {
        let emailExists = false;
        let mobileExists = false;

        results.forEach(sup => {
          if (sup.supEmail === supEmail) emailExists = true;
          if (sup.supMobile === supMobile) mobileExists = true;
        });

        if (emailExists && mobileExists) {
          return res.status(400).json({ success: false, message: "Email and mobile number already exist" });
        } else if (emailExists) {
          return res.status(400).json({ success: false, message: "Email already exists" });
        } else if (mobileExists) {
          return res.status(400).json({ success: false, message: "Mobile number already exists" });
        }
      }

      // 🔹 Step 2: Get new supplier code
      const getMaxSupplierCodeQuery = 'SELECT suplier_code FROM supplier ORDER BY suplier_code DESC LIMIT 1';

      db.pool.query(getMaxSupplierCodeQuery, (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'An error occurred while fetching supplier code' });
        }

        let newSupplierCode;
        if (results.length > 0) {
          const highestSupplierCode = results[0].suplier_code;
          const codeNumber = parseInt(highestSupplierCode.split('_')[1]) + 1;
          newSupplierCode = `sup_${codeNumber.toString().padStart(3, '0')}`;
        } else {
          newSupplierCode = 'sup_001';
        }

        // 🔹 Step 3: Insert into supplier
        const insertSupplierQuery = 'INSERT INTO supplier (suplier_code, supName, supEmail, supMobile, supAddress, created_by) VALUES (?, ?, ?, ?, ?, ?)';
        db.pool.query(insertSupplierQuery, [newSupplierCode, supName, supEmail, supMobile, supAddress, created_by], (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'An error occurred while creating the supplier' });
          }

          const supplierId = results.insertId;
          const newdate = new Date().toISOString().split('T')[0];
          const new_chalan_no = "Adjustment";
          const new_description = "Previous adjustment with software";

          // 🔹 Step 4: Insert into supplier ledger
          const insertSupplierLedgerQuery = 'INSERT INTO supplier_ledger (supplier_id, amount, date, description, chalan_no, transaction_id, status, d_c) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
          db.pool.query(insertSupplierLedgerQuery, [supplierId, amount, newdate, new_description, new_chalan_no, newSupplierCode, 1, "c"], (err, ledgerResults) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ success: false, message: 'An error occurred while inserting into supplier ledger' });
            }

            return res.status(201).json({ success: true, message: 'Supplier and ledger entry created successfully' });
          });
        });
      });
    });
  }
};

const stockOutIngredients = (req, res) => {
  const id = req.id; // Populated from auth middleware
  const { searchItem } = req.query;
 
  const checkUserQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
 
  db.pool.query(checkUserQuery, [id], (err, userData) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }
 
    if (userData.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData[0].is_admin;
    const created_by = userData[0].created_by;
 
    let query = `
      SELECT A.id, A.ingredient_name, A.stock_qty, A.min_stock 
      FROM ingredients A 
      WHERE EXISTS (
        SELECT B.id 
        FROM ingredients B 
        WHERE B.id = A.id 
        AND B.ingredient_name = A.ingredient_name 
        AND B.stock_qty < A.min_stock
      )
    `;
 
    const queryParams = [];
 
    // Apply access control filter
    if (isAdmin === 1) {
      query += ` AND A.created_by = ?`;
      queryParams.push(id);
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view stock-out ingredients." });
      }
      query += ` AND A.created_by = ?`;
      queryParams.push(created_by);
    }
 
    // Apply search filter if applicable
    if (searchItem && searchItem.trim() !== "") {
      const searchValue = `%${searchItem}%`;
      query += `
        AND (
          A.ingredient_name LIKE ? 
          OR A.stock_qty LIKE ? 
          OR A.min_stock LIKE ?
        )
      `;
      queryParams.push(searchValue, searchValue, searchValue);
    }
 
    // Add ORDER BY clause
    query += ` ORDER BY A.id DESC`;
 
    db.pool.query(query, queryParams, (err, outStockResults) => {
      if (err) {
        console.error('Error fetching stock-out ingredients:', err);
        return res.status(500).send({ message: 'Server error', error: err.message });
      }
 
      if (outStockResults.length === 0) {
        return res.status(404).send({ message: 'No stock-out ingredients found' });
      }
 
      return res.status(200).json({
        message: 'Stock-out ingredients fetched successfully',
        data: outStockResults,
      });
    });
  });
};
// delete supplier
const deleteSupplier = (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM supplier WHERE supid=?';
  db.pool.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'An error occurred' });
    } else {
      res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
    }
  });
};
//  const updateSupplier = (req, res) => {
//   const { id } = req.params;
//   const { supName, supEmail, supMobile, supAddress, created_by } = req.body;
 
//   const query = 'SELECT * FROM supplier WHERE supid = ?';
//   db.pool.query(query, [id], (err, results) => {
//     if (err) {
//       console.error('Error retrieving supplier:', err);
//       return res.status(500).json({ success: false, message: 'An error occurred while retrieving the supplier' });
//     }
 
//     if (results.length === 0) {
//       return res.status(404).json({ success: false, message: 'Supplier not found' });
//     }
 
//     const currentData = results[0];
//     const updateData = {
//       supName: supName !== undefined ? supName : currentData.supName,
//       supEmail: supEmail !== undefined ? supEmail : currentData.supEmail,
//       supMobile: supMobile !== undefined ? supMobile : currentData.supMobile,
//       supAddress: supAddress !== undefined ? supAddress : currentData.supAddress,
//       created_by: created_by !== undefined ? created_by : currentData.created_by,
//     };
 
//     const updateSupplierQuery = `
//       UPDATE supplier
//       SET supName = ?, supEmail = ?, supMobile = ?, supAddress = ?, created_by = ?
//       WHERE supid = ?
//     `;
 
//     const values = [
//       updateData.supName,
//       updateData.supEmail,
//       updateData.supMobile,
//       updateData.supAddress,
//       updateData.created_by,
//       id,
//     ];
 
//     db.pool.query(updateSupplierQuery, values, (err, result) => {
//       if (err) {
//         console.error('Error updating supplier:', err);
//         return res.status(500).json({ success: false, message: 'An error occurred while updating the supplier' });
//       }
 
//       if (result.affectedRows === 0) {
//         return res.status(404).json({ success: false, message: 'Supplier not found' });
//       } else {
//         return res.status(200).json({ success: true, message: 'Supplier updated successfully' });
//       }
//     });
//   });
// };
const updateSupplier = (req, res) => {
  const { id } = req.params;
  const { supName, supEmail, supMobile, supAddress, created_by } = req.body;

  const query = 'SELECT * FROM supplier WHERE supid = ?';
  db.pool.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error retrieving supplier:', err);
      return res.status(500).json({ success: false, message: 'An error occurred while retrieving the supplier' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const currentData = results[0];
    const updateData = {
      supName: supName !== undefined ? supName : currentData.supName,
      supEmail: supEmail !== undefined ? supEmail : currentData.supEmail,
      supMobile: supMobile !== undefined ? supMobile : currentData.supMobile,
      supAddress: supAddress !== undefined ? supAddress : currentData.supAddress,
      created_by: created_by !== undefined ? created_by : currentData.created_by,
    };

    // ✅ Check for duplicate email or mobile
    const checkDuplicateQuery = `
      SELECT * FROM supplier
      WHERE (supEmail = ? OR supMobile = ?)
      AND supid != ?
    `;

    db.pool.query(checkDuplicateQuery, [updateData.supEmail, updateData.supMobile, id], (dupErr, dupResults) => {
      if (dupErr) {
        console.error('Error checking duplicates:', dupErr);
        return res.status(500).json({ success: false, message: 'An error occurred while checking duplicates' });
      }

      if (dupResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email or Mobile number already exists for another supplier',
        });
      }

      // ✅ Proceed with update since no duplicates
      const updateSupplierQuery = `
        UPDATE supplier
        SET supName = ?, supEmail = ?, supMobile = ?, supAddress = ?, created_by = ?
        WHERE supid = ?
      `;

      const values = [
        updateData.supName,
        updateData.supEmail,
        updateData.supMobile,
        updateData.supAddress,
        updateData.created_by,
        id,
      ];

      db.pool.query(updateSupplierQuery, values, (err, result) => {
        if (err) {
          console.error('Error updating supplier:', err);
          return res.status(500).json({ success: false, message: 'An error occurred while updating the supplier' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Supplier not found' });
        } else {
          return res.status(200).json({ success: true, message: 'Supplier updated successfully' });
        }
      });
    });
  });
};

const getSupplierById = (req, res) => {
  const { id } = req.params; // Get supplier ID from request parameters

  // Query to get supplier details by ID
  const query = `
    SELECT 
     *
    FROM supplier 
    WHERE supplier.supid = ?
  `;

  // Execute the query
  db.pool.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching supplier by ID:', err);
      return res.status(500).json({ success: false, message: 'An error occurred while fetching supplier' });
    } else if (results.length === 0) {
      // No supplier found with the given ID
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    } else {
      return res.status(200).json({ success: true, data: results[0], message: 'Supplier fetched successfully' });
    }
  });
};

// add purchase
const createPurchaseItem = (req, res) => {
  const {
    purchasedetail,  // Frontend sends this array for purchase item details
    itemdetails,     // Frontend sends this array for item details (ingredients)
  } = req.body;
 
  const {
    invoiceid,
    paymenttype,
    total_price,
    paid_amount,
    details,
    purchasedate,
    purchaseexpiredate,
    finalBankId,
    suplierID,
  } = purchasedetail[0];
 
  const user_id = req.id;
 
  // Check subscription of current user
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription, proceed with creation
      return proceedToInsertPurchase(user_id);
    } else {
      // Check if user has a creator
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to create a purchase item." });
        }
 
        const created_by = data[0].created_by;
 
        // Check if creator has a subscription
        db.pool.query(checkSubscriptionQuery, [created_by], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            // Creator has subscription, allow creation using creator id
            return proceedToInsertPurchase(created_by);
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
 
  // 🔁 Reusable function to proceed with insert logic
  function proceedToInsertPurchase(savedby) {
    let finalBankIdToUse = paymenttype === 1 ? finalBankId : null;
 
    const insertPurchaseItemQuery = `
      INSERT INTO purchaseitem 
        (invoiceid, paymenttype, total_price, paid_amount, details, purchasedate, purchaseexpiredate, savedby, bankid, suplierID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
 
    const purchaseItemValues = [
      invoiceid,
      paymenttype,
      total_price,
      paid_amount,
      details,
      purchasedate,
      purchaseexpiredate,
      savedby,
      finalBankIdToUse,
      suplierID
    ];
 
    db.pool.query(insertPurchaseItemQuery, purchaseItemValues, (err, result) => {
      if (err) {
        console.error('Error inserting purchase item:', err);
        return res.status(500).send('Server error');
      }
 
      const purchaseid = result.insertId;
 
      const insertPurchaseDetails = (index) => {
        if (index >= itemdetails.length) {
          // After inserting all purchase details, update supplier ledger
          const updateSupplierLedgerCreditQuery = `
            INSERT INTO supplier_ledger 
              (amount, transaction_id, description, chalan_no, payment_type, status, d_c, date, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
 
          const creditLedgerValues = [
            total_price,
            invoiceid,
            details,
            invoiceid,
            paymenttype,
            1,
            'c',
            purchasedate,
            suplierID
          ];
 
          db.pool.query(updateSupplierLedgerCreditQuery, creditLedgerValues, (err) => {
            if (err) {
              console.error('Error updating supplier ledger (credit):', err);
              return res.status(500).send('Server error');
            }
 
            const debitDescription = `Purchase From Supplier ${details}`;
            const updateSupplierLedgerDebitQuery = `
              INSERT INTO supplier_ledger 
                (amount, transaction_id, description, chalan_no, payment_type, status, d_c, date, supplier_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
 
            const debitLedgerValues = [
              paid_amount,
              invoiceid,
              debitDescription,
              invoiceid,
              paymenttype,
              1,
              'd',
              purchasedate,
              suplierID
            ];
 
            db.pool.query(updateSupplierLedgerDebitQuery, debitLedgerValues, (err) => {
              if (err) {
                console.error('Error updating supplier ledger (debit):', err);
                return res.status(500).send('Server error');
              }
 
              return res.status(201).send({
                data: { purchaseItemId: purchaseid },
                message: 'Purchase item, details, and supplier ledger entries created successfully'
              });
            });
          });
 
          return;
        }
 
        const { indredientid, quantity, price } = itemdetails[index];
        const currentTotalPrice = quantity * price;
 
        const insertPurchaseDetailQuery = `
          INSERT INTO purchase_details 
            (purchaseid, indredientid, quantity, price, totalprice, purchasedate, purchaseexpiredate, purchaseby)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
 
        const purchaseDetailValues = [
          purchaseid,
          indredientid,
          quantity,
          price,
          currentTotalPrice,
          purchasedate,
          purchaseexpiredate,
          savedby
        ];
 
        db.pool.query(insertPurchaseDetailQuery, purchaseDetailValues, (err) => {
          if (err) {
            console.error('Error inserting purchase details:', err);
            return res.status(500).send('Server error');
          }
 
          const updateStockQuery = `
            UPDATE ingredients 
            SET stock_qty = stock_qty + ? 
            WHERE id = ?
          `;
 
          const updateStockValues = [quantity, indredientid];
 
          db.pool.query(updateStockQuery, updateStockValues, (err) => {
            if (err) {
              console.error('Error updating stock:', err);
              return res.status(500).send('Server error');
            }
 
            insertPurchaseDetails(index + 1);
          });
        });
      };
 
      insertPurchaseDetails(0);
    });
  }
};


const updatePurchaseItem = (req, res) => {
  const { purchaseid } = req.params;
  console.log("p", purchaseid);
  const {
    purchasedetail, // Frontend sends this array for purchase item details
    itemdetails,    // Frontend sends this array for item details (ingredients)
  } = req.body;
 
  const {
    invoiceid,
    paymenttype,
    total_price,
    paid_amount,
    details,
    purchasedate,
    purchaseexpiredate,
    savedby,  // Default to "useradmin" if not provided
    finalBankId,
    suplierID,
  } = purchasedetail[0]; // Assuming purchase details are in the first object
 
  // Determine finalBankId based on paymenttype
  let finalBankIdToUse = null;
  if (paymenttype === 1) { // Assuming 1 corresponds to bank payment
    finalBankIdToUse = finalBankId;
  }
 
  const getPurchaseItemQuery = 'SELECT * FROM purchaseitem WHERE purID = ?';
  db.pool.query(getPurchaseItemQuery, [purchaseid], (err, currentPurchaseItem) => {
    if (err) {
      console.error('Error fetching purchase item:', err);
      return res.status(500).send('Server error');
    }
 
    if (currentPurchaseItem.length === 0) {
      return res.status(404).send('Purchase item not found');
    }
 
    const currentData = currentPurchaseItem[0];
 
    // Merge new data with existing data
    const updatedData = {
      invoiceid: invoiceid !== undefined ? invoiceid : currentData.invoiceid,
      paymenttype: paymenttype !== undefined ? paymenttype : currentData.paymenttype,
      total_price: total_price !== undefined ? total_price : currentData.total_price,
      paid_amount: paid_amount !== undefined ? paid_amount : currentData.paid_amount,
      details: details !== undefined ? details : currentData.details,
      purchasedate: purchasedate !== undefined ? purchasedate : currentData.purchasedate,
      purchaseexpiredate: purchaseexpiredate !== undefined ? purchaseexpiredate : currentData.purchaseexpiredate,
      savedby: savedby !== undefined ? savedby : currentData.savedby,
      bankid: finalBankIdToUse !== undefined ? finalBankIdToUse : currentData.bankid,
      suplierID: suplierID !== undefined ? suplierID : currentData.suplierID,
    };
 
    // Update purchase item
    const updatePurchaseItemQuery = `
      UPDATE purchaseitem
      SET
        invoiceid = ?,
        paymenttype = ?,
        total_price = ?,
        paid_amount = ?,
        details = ?,
        purchasedate = ?,
        purchaseexpiredate = ?,
        savedby = ?,
        bankid = ?,
        suplierID = ?
      WHERE
        purID = ?
    `;
    const purchaseItemValues = [
      updatedData.invoiceid,
      updatedData.paymenttype,
      updatedData.total_price,
      updatedData.paid_amount,
      updatedData.details,
      updatedData.purchasedate,
      updatedData.purchaseexpiredate,
      updatedData.savedby,
      updatedData.bankid,
      updatedData.suplierID,
      purchaseid,
    ];
 
    db.pool.query(updatePurchaseItemQuery, purchaseItemValues, (err, result) => {
      if (err) {
        console.error('Error updating purchase item:', err);
        return res.status(500).send('Server error');
      }
 
      // First, delete existing purchase details before inserting new ones
      const deletePurchaseDetailsQuery = `DELETE FROM purchase_details WHERE purchaseid = ?`;
 
      db.pool.query(deletePurchaseDetailsQuery, [purchaseid], (err, deleteResult) => {
        if (err) {
          console.error('Error deleting existing purchase details:', err);
          return res.status(500).send('Server error');
        }
 
        // Function to insert new purchase details and update stock sequentially
        const insertPurchaseDetails = (index) => {
          if (index >= itemdetails.length) {
            // After inserting all purchase details, update supplier ledger
 
            const updateSupplierLedgerCreditQuery = `
              UPDATE supplier_ledger
              SET amount = ?, description = ?, chalan_no = ?, payment_type = ?, date = ?, transaction_id = ?, supplier_id = ?
              WHERE transaction_id = ? AND d_c = 'c'
            `;
 
            const creditLedgerValues = [
              updatedData.total_price,
              updatedData.details,
              updatedData.invoiceid,
              updatedData.paymenttype,
              updatedData.purchasedate,
              updatedData.invoiceid,
              updatedData.suplierID,
              currentData.invoiceid,  // transaction_id (updated)
            ];
 
            db.pool.query(updateSupplierLedgerCreditQuery, creditLedgerValues, (err, ledgerResult) => {
              if (err) {
                console.error('Error updating supplier ledger (credit):', err);
                return res.status(500).send('Server error');
              }
 
              // Update supplier ledger for debit (paid amount)
              const debitDescription = `Purchase From Supplier ${updatedData.details}`;
              const updateSupplierLedgerDebitQuery = `
                UPDATE supplier_ledger
                SET amount = ?, description = ?, chalan_no = ?, payment_type = ?, date = ?, transaction_id = ?, supplier_id = ?
                WHERE transaction_id = ? AND d_c = 'd'
              `;
 
              const debitLedgerValues = [
                updatedData.paid_amount,
                debitDescription,
                updatedData.invoiceid,
                updatedData.paymenttype,
                updatedData.purchasedate,
                updatedData.invoiceid,
                updatedData.suplierID,
                currentData.invoiceid,
              ];
 
              db.pool.query(updateSupplierLedgerDebitQuery, debitLedgerValues, (err, ledgerResult) => {
                if (err) {
                  console.error('Error updating supplier ledger (debit):', err);
                  return res.status(500).send('Server error');
                }
 
                // Final success response after updating both credit and debit in supplier ledger
                return res.status(200).send({
                  data: { purchaseItemId: purchaseid },
                  message: 'Purchase item, details, and supplier ledger entries updated successfully'
                });
              });
            });
 
            return; // End after supplier ledger update
          }
 
          const { indredientid, quantity, price } = itemdetails[index];
          const currentTotalPrice = quantity * price; // Calculate total price per product
 
          // Insert into purchase_details table
          const insertPurchaseDetailQuery = `
            INSERT INTO purchase_details
              (purchaseid, indredientid, quantity, price, totalprice, purchasedate, purchaseexpiredate, purchaseby)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
 
          const purchaseDetailValues = [
            purchaseid,
            indredientid,
            quantity,
            price,
            currentTotalPrice,
            updatedData.purchasedate,
            updatedData.purchaseexpiredate,
            savedby,
          ];
 
          db.pool.query(insertPurchaseDetailQuery, purchaseDetailValues, (err, detailResult) => {
            if (err) {
              console.error('Error inserting purchase details:', err);
              return res.status(500).send('Server error');
            }
 
            // Update stock quantity in ingredients table
            const updateStockQuery = `
              UPDATE ingredients
              SET stock_qty = stock_qty + ?
              WHERE id = ?
            `;
 
            const updateStockValues = [quantity, indredientid];
 
            db.pool.query(updateStockQuery, updateStockValues, (err, stockResult) => {
              if (err) {
                console.error('Error updating stock:', err);
                return res.status(500).send('Server error');
              }
 
              // Proceed to the next item in the itemdetails array
              insertPurchaseDetails(index + 1);
            });
          });
        };
 
        // Start inserting purchase details from the first item
        insertPurchaseDetails(0);
      });
    });
  });
};

const getAllStockIngredients = async (req, res) => {
  const userId = req.id;
 
  try {
    const userQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(userQuery, [userId], (err, userResult) => {
      if (err) {
        console.error('Error fetching user info:', err);
        return res.status(500).json({ error: 'Failed to fetch user info' });
      }
 
      if (userResult.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
 
      const { is_admin, created_by } = userResult[0];
      const creatorId = is_admin === 1 ? userId : created_by;
 
      if (!creatorId) {
        return res.status(403).json({ error: 'You are not authorized to view ingredients' });
      }
 
      const query = `
        SELECT *
        FROM ingredients
        WHERE is_active = 1
          AND created_by = ?
      `;
 
      db.pool.query(query, [creatorId], (err, results) => {
        if (err) {
          console.error('Error fetching data from ingredients table: ', err);
          return res.status(500).json({ message: 'Database error' });
        }
 
        res.json({ data: results });
      });
    });
  } catch (error) {
    console.error('Error in getAllStockIngredients:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// accourding to serach get invoice 

const fetchInvoiceIdThroughSupplier = (req, res) => {
  const {suplierID} = req.query;

  const sql = 'SELECT invoiceid FROM purchaseitem WHERE suplierID = ?';
  db.pool.query(sql, [suplierID], (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ message: 'Database error', error: err });
    }
    res.status(200).send({ data: data });
  });
}; 

// search purchase return accourding to data

const invoiceBySupplier = (req, res) => {
  console.log("Request received for invoiceBySupplier");
  const { supplierID, invoiceID } = req.query;

  console.log('Supplier ID       :', supplierID, 'Invoice ID:', invoiceID);

  const query = `SELECT * FROM purchaseitem WHERE suplierID = ? AND invoiceid = ?`;
  db.pool.query(query, [supplierID, invoiceID], (err, results) => {
    if (err) {
      console.error('Error fetching invoice by supplier:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      const purID = results[0].purID;

      // Modify query2 to join the ingredients table and fetch ingredient_name
      const query2 = `
        SELECT pd.*, i.*,i.ingredient_name
        FROM purchase_details pd
        JOIN ingredients i ON pd.indredientid = i.id
        WHERE pd.purchaseid = ? AND i.is_active = 1
      `;

      db.pool.query(query2, [purID], (err, result2) => {
        if (err) {
          console.error('Error fetching purchase details with ingredient names:', err);
          return res.status(500).send('Server error');
        }

        // Array to store the combined purchase details
        const purchaseDetailsArray = [];

        result2.forEach(item => {
          // Push each item's details as an object including ingredient_name
          purchaseDetailsArray.push({
            ingredient: item.indredientid,
            ingredient_name: item.ingredient_name,
           
            price: item.price,
            purchase_quantity: item.quantity,
            return_quantity:0,
            stockqty:item.stock_qty,
            discount:0,
            total:0,
            return_date:new Date().toISOString().split('T')[0],
        
          });
        });

        console.log(purchaseDetailsArray)

        // Send the data back with the combined array of objects
        return res.status(200).json({ 
         data:{
          invoice: results, 
          purchaseDetails: purchaseDetailsArray
         } 
        });
      });
    } else {
      return res.status(404).send('No invoices found for this supplier');
    }
  });
};


const purReturnInsert = (req, res) => {
  const { returnpurchasedetail, itemdetails } = req.body;
  const { poNO, supplier_id, return_date, totalamount, return_reason } = returnpurchasedetail[0];
  const createDate = new Date();
  const user_id = req.id;
 
  // Step 1: Check if user has a subscription
  const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
  db.pool.query(checkSubscriptionQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
 
    if (results.length > 0) {
      // User has a subscription
      proceedWithInsert(user_id);
    } else {
      // Step 2: Check if user was created by someone
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      db.pool.query(checkUserCreatedByQuery, [user_id], (err, data) => {
        if (err) return res.status(500).send(err);
 
        if (data.length === 0 || !data[0].created_by) {
          return res.status(403).json({ message: "You are not authorized to insert purchase return." });
        }
 
        const creator_id = data[0].created_by;
 
        // Step 3: Check if creator has a subscription
        db.pool.query(checkSubscriptionQuery, [creator_id], (err, results) => {
          if (err) return res.status(500).send(err);
 
          if (results.length > 0) {
            // Creator has a subscription
            proceedWithInsert(creator_id);
          } else {
            return res.status(403).json({ message: "Creator does not have an active subscription." });
          }
        });
      });
    }
  });
 
  // Function to proceed with actual insert logic
  function proceedWithInsert(created_by) {
    const postData = {
      po_no: poNO,
      supplier_id: supplier_id,
      return_date: return_date,
      totalamount: totalamount,
      return_reason: return_reason,
      createdate: createDate,
      createby: created_by,
    };
 
    db.pool.query('INSERT INTO purchase_return SET ?', postData, (err, result) => {
      if (err) return res.status(500).send('Error inserting purchase return');
      const returnID = result.insertId;
 
      const getPurchaseQuery = 'SELECT * FROM purchaseitem WHERE invoiceid = ?';
      db.pool.query(getPurchaseQuery, [poNO], (err, purchaseResult) => {
        if (err) return res.status(500).send('Error fetching purchase item');
        if (!purchaseResult.length) return res.status(404).send('Purchase item not found');
 
        const purchaseID = purchaseResult[0].purID;
        const updatedGrandTotal = purchaseResult[0].total_price - totalamount;
 
        const updatePurchaseQuery = 'UPDATE purchaseitem SET total_price = ? WHERE invoiceid = ?';
        db.pool.query(updatePurchaseQuery, [updatedGrandTotal, poNO], (err) => {
          if (err) return res.status(500).send('Error updating purchase item');
 
          const processReturnItems = (index) => {
            if (index >= itemdetails.length) {
              return res.status(200).send('Purchase return and stock updated successfully');
            }
 
            const { product_id, total_qntt, product_rate, total_price, discount } = itemdetails[index];
            const returnDetailsData = {
              preturn_id: returnID,
              product_id,
              qty: total_qntt,
              product_rate,
              discount: discount || 0,
            };
 
            db.pool.query('INSERT INTO purchase_return_details SET ?', returnDetailsData, (err) => {
              const getPurchaseDetailQuery = 'SELECT * FROM purchase_details WHERE purchaseid = ? AND indredientid = ?';
              db.pool.query(getPurchaseDetailQuery, [purchaseID, product_id], (err, purchaseDetailResult) => {
                if (purchaseDetailResult.length === 0) return processReturnItems(index + 1);
 
                const purchaseDetail = purchaseDetailResult[0];
                const adjustedQty = purchaseDetail.quantity - total_qntt;
                const adjustedTotalPrice = purchaseDetail.totalprice - total_price;
 
                const updatePurchaseDetailQuery = `
                  UPDATE purchase_details 
                  SET quantity = ?, totalprice = ? 
                  WHERE purchaseid = ? AND indredientid = ?
                `;
                db.pool.query(updatePurchaseDetailQuery, [adjustedQty, adjustedTotalPrice, purchaseID, product_id], (err) => {
                  const updateStockQuery = `
                    UPDATE ingredients 
                    SET stock_qty = stock_qty - ? 
                    WHERE id = ?
                  `;
                  db.pool.query(updateStockQuery, [total_qntt, product_id], (err) => {
                    processReturnItems(index + 1);
                  });
                });
              });
            });
          };
 
          processReturnItems(0); // Start processing items
        });
      });
    });
  }
};


const getPurchaseTransactions = (req, res) => {
  const { startDate, endDate, supplier_id } = req.query;
  
  // Check if at least one filter is applied
  if (!supplier_id && (!startDate || !endDate)) {
    return res.status(400).json({ 
      success: false, 
      message: 'At least one filter (supplier_id, startDate, endDate) is required' 
    });
  }

  // Base query
  let query = `
    SELECT 
      si.*,
      s.supplier_id,
      s.chalan_no AS invoice_no,
      s.deposit_no,
      s.description,
      s.d_c,
      s.date,
      CASE 
        WHEN s.d_c = 'c' THEN s.amount 
        ELSE 0 
      END AS credit_amount,
      CASE 
        WHEN s.d_c = 'd' THEN s.amount 
        ELSE 0 
      END AS debit_amount
    FROM supplier_ledger s
    LEFT JOIN supplier si
      ON s.supplier_id = si.supid
    WHERE 1 = 1
  `;

  // Array to hold the query parameters
  const queryParams = [];

  // Conditionally add supplier_id filter if provided
  if (supplier_id) {
    query += " AND s.supplier_id = ?";
    queryParams.push(supplier_id);
  }

  // Conditionally add date range filter if startDate and endDate are provided
  if (startDate && endDate) {
    query += " AND s.date BETWEEN ? AND ?";
    queryParams.push(startDate, endDate);
  }

  // Execute the query with the parameters
  db.pool.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching purchase transactions:', err);
      res.status(500).json({ success: false, message: 'An error occurred while fetching purchase transactions' });
    } else {
      res.status(200).json({ success: true, data: results, message: 'Purchase transactions fetched successfully' });
    }
  });
};

const  getReturnItemInfoByID = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      pr.preturn_id, 
      pr.supplier_id, 
      pr.po_no AS invoiceno, 
      pr.return_date, 
      pr.totalamount, 
      pr.totaldiscount, 
      pr.return_reason, 
      pr.createby, 
      pr.createdate, 
      pr.updateby, 
      pr.updatedate, 
      s.supName,
      prd.product_id, 
      prd.qty, 
      prd.product_rate, 
      prd.store_id, 
      prd.discount, 
      i.ingredient_name, 
      uom.uom_short_code
    FROM purchase_return_details prd
    LEFT JOIN ingredients i ON prd.product_id = i.id
    INNER JOIN unit_of_measurement uom ON uom.id = i.uom_id
    LEFT JOIN purchase_return pr ON prd.preturn_id = pr.preturn_id
    LEFT JOIN supplier s ON pr.supplier_id = s.supid
    WHERE prd.preturn_id = ?
    ORDER BY pr.preturn_id DESC
  `;

  db.pool.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching return item info:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      // Extract common fields for the return
      const returnInfo = {
        preturn_id: results[0].preturn_id,
        supplier_id: results[0].supplier_id,
        po_no: results[0].po_no,
        return_date: results[0].return_date,
        totalamount: results[0].totalamount,
        totaldiscount: results[0].totaldiscount,
        return_reason: results[0].return_reason,
        createby: results[0].createby,
        createdate: results[0].createdate,
        updateby: results[0].updateby,
        updatedate: results[0].updatedate,
        supName: results[0].supName,
        items: results.map(row => ({
          product_id: row.product_id,
          qty: row.qty,
          product_rate: row.product_rate,
          store_id: row.store_id,
          discount: row.discount,
          ingredient_name: row.ingredient_name,
          uom_short_code: row.uom_short_code
        }))
      };

      return res.status(200).json({data:returnInfo});
    } else {
      return res.status(404).send('No return items found');
    }
  });
};

  module.exports={
    getPurchaseItemDetails
    ,getReturnpurchase,
    getAllSuppliers,
    createSupplier,
    stockOutIngredients,
    deleteSupplier,
    updateSupplier,
    getSupplierById,
    getAllStockIngredients,
    createPurchaseItem,
    getPurchaseItemById,
    updatePurchaseItem,
    fetchInvoiceIdThroughSupplier,
    invoiceBySupplier,
    purReturnInsert,
    getPurchaseTransactions,
    getReturnItemInfoByID
  
  }