const db = require("../utils/db");

// Helper function to execute queries with a promise
function queryDb(query, params) {
  return new Promise((resolve, reject) => {
    db.pool.query(query, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

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

const getalldetailsProductiondetails = async (req, res) => {
  try {
    const id = req.id; // Authenticated user ID
    const { searchItem } = req.query;
 
    // Step 0: Get is_admin and created_by info
    const [userData] = await queryDb("SELECT created_by, is_admin FROM user WHERE id = ?", [id]);
 
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userData.is_admin;
    const created_by = userData.created_by;
 
    let targetUserId;
    if (isAdmin === 1) {
      targetUserId = id;
    } else {
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view production details." });
      }
      targetUserId = created_by;
    }
 
    // Step 1: Fetch foodid and pvarientid from production_details
    let foodVariantQuery = `
      SELECT foodid, pvarientid, ingredientid, qty AS productionqty, pro_detailsid
      FROM production_details
      WHERE createdby = ?
    `;
    let queryParams = [targetUserId];
 
    if (searchItem && searchItem.trim() !== "") {
      const searchValue = `%${searchItem}%`;
      foodVariantQuery += `
        AND (
          foodid IN (
            SELECT ProductsID FROM item_foods WHERE ProductName LIKE ?
          )
          OR pvarientid IN (
            SELECT variantid FROM variant WHERE variantName LIKE ?
          )
        )
      `;
      queryParams.push(searchValue, searchValue);
    }
 
    foodVariantQuery += " ORDER BY pro_detailsid DESC";
    const productionDetails = await queryDb(foodVariantQuery, queryParams);
 
    if (!productionDetails || productionDetails.length === 0) {
      return res.status(404).send({ message: 'No production details found' });
    }
 
    // Step 2: Fetch purchase details
    const ingredientIds = productionDetails.map(item => item.ingredientid);
    const purchaseQuery = `
      SELECT pd.indredientid, SUM(pd.quantity) AS total_quantity, SUM(pd.totalprice) AS total_price
      FROM purchase_details pd
      WHERE pd.indredientid IN (?)
      GROUP BY pd.indredientid
    `;
    const purchaseDetails = await queryDb(purchaseQuery, [ingredientIds]);
 
    if (!purchaseDetails || purchaseDetails.length === 0) {
      return res.status(404).send({ message: 'No purchase details found for the ingredient(s)' });
    }
 
    // Step 3: Fetch names
    const foodIds = [...new Set(productionDetails.map(item => item.foodid))];
    const variantIds = [...new Set(productionDetails.map(item => item.pvarientid))];
 
    const foodNameResults = await queryDb(`
      SELECT items.ProductName AS foodName, items.ProductsID
      FROM item_foods items
      WHERE items.ProductsID IN (?)
    `, [foodIds]);
 
    const variantNameResults = await queryDb(`
      SELECT v.variantName, v.variantid
      FROM variant v
      WHERE v.variantid IN (?)
    `, [variantIds]);
 
    const ingredientNames = await queryDb(`
      SELECT id, ingredient_name
      FROM ingredients
      WHERE id IN (?)
    `, [ingredientIds]);
 
    // Step 4: Lookup objects
    const foodNameLookup = Object.fromEntries(foodNameResults.map(item => [item.ProductsID, item.foodName]));
    const variantNameLookup = Object.fromEntries(variantNameResults.map(item => [item.variantid, item.variantName]));
    const ingredientNameLookup = Object.fromEntries(ingredientNames.map(item => [item.id, item.ingredient_name]));
 
    // Step 5: Merge and calculate
    const result = {};
    productionDetails.forEach(detail => {
      const purchase = purchaseDetails.find(p => p.indredientid === detail.ingredientid);
      const unitPrice = purchase ? purchase.total_price / purchase.total_quantity : 0;
      const cost = unitPrice * detail.productionqty;
 
      const key = `${detail.foodid}-${detail.pvarientid}`;
      if (!result[key]) {
        result[key] = {
          foodid: detail.foodid,
          pvarientid: detail.pvarientid,
          totalAmount: 0,
          foodName: foodNameLookup[detail.foodid] || 'Unknown',
          variantName: variantNameLookup[detail.pvarientid] || 'Unknown'
        };
      }
 
      result[key].totalAmount += cost;
    });
 
    // Step 6: Filter based on searchItem (if needed)
    let filteredResults = Object.values(result);
    if (searchItem && searchItem.trim() !== "") {
      filteredResults = filteredResults.filter(item =>
        item.foodName.toLowerCase().includes(searchItem.toLowerCase()) ||
        item.variantName.toLowerCase().includes(searchItem.toLowerCase()) ||
        item.totalAmount.toString().includes(searchItem)
      );
    }
 
    res.status(200).send({ success: true, data: filteredResults });
 
  } catch (error) {
    console.error("Error fetching production details:", error);
    res.status(500).send({ success: false, message: 'Server Error', error });
  }
};
// food name
const foodNameFetchApi = async (req, res) => {
  const id = req.id; // From auth middleware
 
  try {
    // Step 1: Check user's admin status and creator
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [id], async (err, userData) => {
      if (err) {
        console.error("Error checking user:", err);
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
 
      const isAdmin = userData[0].is_admin;
      const created_by = userData[0].created_by;
 
      // Step 2: Construct the food query based on role
      let sql = `
        SELECT ProductName, ProductsID
        FROM item_foods
        WHERE ProductsIsActive = 1
      `;
      let queryParams = [];
 
      if (isAdmin === 1) {
        // Admin: filter their own created items
        sql += ` AND UserIDInserted = ?`;
        queryParams.push(id);
      } else {
        if (!created_by) {
          return res.status(403).json({ success: false, message: "You are not authorized to view food data." });
        }
 
        sql += ` AND UserIDInserted = ?`;
        queryParams.push(created_by);
      }
 
      // Step 3: Execute the query
      const result = await dbQuery(sql, queryParams);
 
      return res.status(200).json({ success: true, data: result });
    });
  } catch (err) {
    console.error("Error in foodNameFetchApi:", err);
    return res.status(500).json({ success: false, message: "An internal error occurred" });
  }
};
// variant name accourding to food
const foodWithVariant = async (req, res) => {
  const { foodid } = req.query;
  console.log(foodid);
 
  // Corrected SQL query
  const sql = `
    SELECT v.variantname, i.ProductName,variantid
    FROM variant v
    LEFT JOIN item_foods i ON i.ProductsID = v.menuid
    WHERE  i.ProductsID = ?
  `;
 
  try {
    // Await the dbQuery function result
    const result = await dbQuery(sql, [foodid]);
 
    // Return the result as JSON response
    return res.status(200).json({ success: true, data: result });
   
  } catch (err) {
    console.error('Error in foodWithVariant:', err);
    return res.status(500).json({ success: false, message: 'An internal error occurred' });
  }
};
 


const createProduction = async (req, res) => {
  const { itemid, itemvid, itemquantity, saveddate, productionexpiredate } = req.body;
  console.log(req.body,"production")
  const user_id = req.id;
 
  try {
    // Step 1: Check if user has a subscription
    const [userPlan] = await dbQuery("SELECT * FROM superadmin_user_plans WHERE user_id = ?", [user_id]);
 
    let created_by = user_id;
 
    if (!userPlan) {
      // Step 2: Check if user was created by someone else
      const [userRecord] = await dbQuery("SELECT created_by FROM user WHERE id = ?", [user_id]);
 
      if (!userRecord || !userRecord.created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to create production (no subscription)." });
      }
 
      created_by = userRecord.created_by;
 
      // Step 3: Check if creator has a subscription
      const [creatorPlan] = await dbQuery("SELECT * FROM superadmin_user_plans WHERE user_id = ?", [created_by]);
 
      if (!creatorPlan) {
        return res.status(403).json({ success: false, message: "Creator does not have an active subscription." });
      }
    }
 
    // Step 4: Check ingredients and stock
    const ingredientQuery = `
      SELECT ingredientid, qty AS ingredient_quantity_per_unit
      FROM production_details
      WHERE foodid = ? AND pvarientid = ?`;
    const ingredientResults = await dbQuery(ingredientQuery, [itemid, itemvid]);
 
    if (!ingredientResults || ingredientResults.length === 0) {
      return res.status(404).json({ message: 'Please set Ingredients first!' });
    }
 
    for (const ingredient of ingredientResults) {
      const ingredientId = ingredient.ingredientid;
      const qtyPerUnit = ingredient.ingredient_quantity_per_unit;
 
      const [stockResult] = await dbQuery('SELECT stock_qty FROM ingredients WHERE id = ?', [ingredientId]);
      if (!stockResult) {
        return res.status(404).json({ message: `Ingredient with ID ${ingredientId} not found!` });
      }
 
      const stockQty = stockResult.stock_qty;
      const totalQtyToDeduct = itemquantity * qtyPerUnit;
 
      if (totalQtyToDeduct > stockQty) {
        return res.status(400).json({
          message: `Insufficient stock for ingredient ID ${ingredientId}. Available: ${stockQty}kg, Required: ${totalQtyToDeduct}kg`,
        });
      }
 
      await dbQuery('UPDATE ingredients SET stock_qty = ? WHERE id = ?', [stockQty - totalQtyToDeduct, ingredientId]);
    }
 
    // Step 5: Insert or update production record
    const [productionResult] = await dbQuery('SELECT itemquantity FROM production WHERE itemid = ? AND itemvid = ?', [itemid, itemvid]);
 
    if (productionResult) {
      const existingQuantity = productionResult.itemquantity;
      const newQuantity = existingQuantity + itemquantity;
 
      await dbQuery(`
        UPDATE production
        SET itemquantity = ?, savedby = ?, saveddate = ?, productionexpiredate = ?
        WHERE itemid = ? AND itemvid = ?`,
        [newQuantity, user_id, saveddate, productionexpiredate, itemid, itemvid]
      );
 
      return res.status(200).json({ success: true, message: 'Production entry updated successfully' });
    } else {
      const insertProductionQuery = `
        INSERT INTO production (itemid, itemvid, itemquantity, savedby, saveddate, productionexpiredate)
        VALUES (?, ?, ?, ?, ?, ?)`;
      const result = await dbQuery(insertProductionQuery, [itemid, itemvid, itemquantity, user_id, saveddate, productionexpiredate]);
 
      return res.status(201).json({ success: true, message: 'Production entry created successfully', productionid: result.insertId });
    }
 
  } catch (err) {
    console.error('Error in createProduction:', err);
    return res.status(500).json({ success: false, message: 'An error occurred during production creation' });
  }
};
// get supplier leddger
const getPurchaseTransactions = (req, res) => {
  const { startDate, endDate, supplier_id } = req.query;

  // Base query
  let query = `
    SELECT 
      p.suplierID, 
      p.total_price AS credit, 
      p.paid_amount AS debit, 
      p.purchasedate AS purchase_date, 
      p.details AS description,
      s.amount AS ledger_amount,
      s.d_c,
      p.invoiceid
    
    FROM purchaseitem p
    LEFT JOIN supplier_ledger s 
      ON p.suplierID = s.supplier_id
    WHERE 1 = 1
  `;

  // Array to hold the query parameters
  const queryParams = [];

  // Conditionally add supplier_id filter if provided
  if (supplier_id) {
    query += " AND p.suplierID = ?";
    queryParams.push(supplier_id);
  }

  // Conditionally add date range filter if startDate and endDate are provided
  if (startDate && endDate) {
    query += " AND p.purchasedate BETWEEN ? AND ?";
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

// set production unit //

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
        SELECT ingredient_name, id
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


const getAllStockIngredientswithone = async (req, res) => {
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
        SELECT ingredient_name, id
        FROM ingredients
        WHERE is_active = 1
          AND stock_qty > 0
          AND created_by = ?
      `;
 
      db.pool.query(query, [creatorId], (err, results) => {
        if (err) {
          console.error('Error fetching data from ingredients table:', err);
          return res.status(500).json({ error: 'Failed to retrieve ingredients due to a database error' });
        }
 
        res.status(200).json({ data: results });
      });
    });
  } catch (error) {
    console.error('Error in getAllStockIngredientswithone:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProductionData = async (req, res) => {
  try {
    const { foodid, pvarientid } = req.params;
 
    if (!foodid || !pvarientid) {
      return res.status(400).json({ message: 'Missing foodid or pvarientid' });
    }
 
    // Check if production records exist
    const checkQuery = `
      SELECT * FROM production_details
      WHERE foodid = ? AND pvarientid = ?
    `;
    const existingRecords = await queryDb(checkQuery, [foodid, pvarientid]);
 
    if (existingRecords.length === 0) {
      return res.status(404).json({ message: `No production records found for foodid ${foodid} and pvarientid ${pvarientid}` });
    }
 
    // Delete matching records
    const deleteQuery = `
      DELETE FROM production_details
      WHERE foodid = ? AND pvarientid = ?
    `;
    await queryDb(deleteQuery, [foodid, pvarientid]);
 
    return res.status(200).json({ message: 'Production details deleted successfully' });
  } catch (err) {
    console.error('Error in deleteProductionData:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};



const getPerItemPrice = async (req, res) => {
  const { id } = req.params;

  // SQL query to get the total quantity and total price for a specific ingredient
  const query = `
    SELECT SUM(quantity) AS totalquantity, 
           SUM(totalprice) AS totalprice 
    FROM purchase_details 
    WHERE indredientid = ? 
    GROUP BY indredientid
  `;

  try {
    // Use the dbQuery helper function to execute the query
    const result = await dbQuery(query, [id]);

    // Check if the ingredient exists
    if (result.length === 0) {
      return res.status(404).send('Ingredient not found');
    }

    // Extract total quantity and price from the result
    const { totalquantity, totalprice } = result[0];
    const pricePerIngredient = totalprice / totalquantity; // Calculate price per ingredient

    // Return the result in a response
    return res.status(200).json({
      data: [{ Price: pricePerIngredient }]
    });

  } catch (err) {
    // Handle errors in the database query
    console.error('Error fetching total quantity and price:', err);
    return res.status(500).send('Server error');
  }
};

const createproduction = async (req, res) => {
  try {
    const fooddetails = req.body.fooddetails; // Array of food details
    const itemdetails = req.body.itemdetails; // Array of item details
    const newDate = new Date();
    const createdby=req.id;
//  console.log(fooddetails,itemdetails)
    // Validate if fooddetails and itemdetails are present
    if (!fooddetails || fooddetails.length === 0 || !itemdetails || itemdetails.length === 0) {
      return res.status(400).json({ message: 'No food details or item details provided' });
    }

    // Loop through food details array (in case there are multiple food entries)
    for (let food of fooddetails) {
      const { foodid, pvarientid } = food;

      // Check if production details already exist for each food entry
      const checkQuery = `
        SELECT * FROM production_details 
        WHERE foodid = ? AND pvarientid = ?
      `;
      const existingRecords = await queryDb(checkQuery, [foodid, pvarientid]);

      if (existingRecords.length > 0) {
        return res.status(400).json({ message: `Production details already exist for foodid ${foodid} and pvarientid ${pvarientid}` });
      }

      // Insert item details related to this food entry
      for (let item of itemdetails) {
        const { p_id, quantity } = item;

        if (!quantity || !p_id) {
          return res.status(400).json({ message: 'Invalid item details provided' });
        }

        const data = {
          foodid: foodid,
          pvarientid: pvarientid,
          ingredientid: p_id,
          qty: quantity,
          created_date: newDate,
          createdby:createdby,
        };

        // Insert data into production_details table
        await queryDb('INSERT INTO production_details SET ?', data);
      }
    }

    // Return success message after all inserts are done
    return res.status(200).json({ message: 'Successfully added production details' });
  } catch (err) {
    console.error('Error in createproduction:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


const findbyIdProductiondetails = async (req, res) => {
  const { foodid, pvarientid } = req.params;

  try {
      // Query to fetch production details
      const sql = `
        SELECT p.foodid, p.pvarientid, p.ingredientid, p.qty AS productionqty
        FROM production_details p
        WHERE p.foodid = ? AND p.pvarientid = ?
      `;

      // Execute the query to get production details
      const productionDetails = await queryDb(sql, [foodid, pvarientid]);

      // Check if any production details are found
      if (!productionDetails || productionDetails.length === 0) {
          return res.status(404).send({ message: 'No production details found' });
      }

      // Extract the ingredient IDs
      const ingredientIds = productionDetails.map(item => item.ingredientid);

      // Prepare query to fetch total quantity and total price for each ingredient
      const sql2 = `
        SELECT pd.indredientid, SUM(pd.quantity) AS total_quantity, SUM(pd.totalprice) AS total_price
        FROM purchase_details pd
        WHERE pd.indredientid IN (?)
        GROUP BY pd.indredientid
      `;

      // Execute the second query for purchase details
      const purchaseDetails = await queryDb(sql2, [ingredientIds]);

      // Fetch the food name
      const foodNameQuery = await queryDb('SELECT items.ProductName AS foodName FROM item_foods items WHERE items.ProductsID = ?', [foodid]);

      // Fetch the variant name
      const variantNameQuery = await queryDb('SELECT v.variantName FROM variant v WHERE v.variantid = ?', [pvarientid]);

      // Fetch the ingredient names
      const ingredientNameFetchQuery = await queryDb('SELECT id, ingredient_name FROM ingredients WHERE id IN (?)', [ingredientIds]);

      // Check if purchase details are found
      if (!purchaseDetails || purchaseDetails.length === 0) {
          return res.status(404).send({ message: 'No purchase details found for the ingredient(s)' });
      }

      // Extract the first `foodName` and `variantName` because they are the same for all ingredients
      const foodDetails = {
          foodName: foodNameQuery[0].foodName || "not found",
          variantName: variantNameQuery[0].variantName || "not found",
          foodid: foodid,
          pvarientid: pvarientid
      };

      // Calculate the price for each ingredient and create the `itemdetails` array
      const itemDetails = purchaseDetails.map(detail => {
          // Find the matching production quantity for this ingredient
          const productionDetail = productionDetails.find(item => item.ingredientid === detail.indredientid);
          
          // Find the matching ingredient name
          const ingredientName = ingredientNameFetchQuery.find(item => item.id === detail.indredientid);
          const ingredientNameValue = ingredientName ? ingredientName.ingredient_name : 'Unknown Ingredient';

          // Calculate the price per unit for the ingredient
          const productionQty = productionDetail ? productionDetail.productionqty : 0;
          const pricePerUnit = detail.total_price / detail.total_quantity;
          const totalPriceForProduction = pricePerUnit * productionQty;

          return {
              ingredientid: detail.indredientid,
              productionDetailqty: productionQty,
              total_quantity: detail.total_quantity,
              total_price: detail.total_price,
              price: pricePerUnit,
              totalPriceofproductioningredient: totalPriceForProduction.toFixed(2),
              ingredient_name: ingredientNameValue
          };
      });

      // Structure the final response
      const response = {
          data: {
              fooddetails: [foodDetails],
              itemdetails: itemDetails
          }
      };

      // Send the response with the structured data
      res.status(200).send(response);

  } catch (error) {
      // Catch and log any errors, then send a server error response
      console.error(error);
      res.status(500).send({ message: 'Server error', error });
  }
};


const viewProductiondetails = async (req, res) => {
  const { foodid, pvarientid } = req.params;

  try {
      // Query to fetch production details
      const sql = `
        SELECT p.foodid, p.pvarientid, p.ingredientid, p.qty AS productionqty
        FROM production_details p
        WHERE p.foodid = ? AND p.pvarientid = ?
      `;

      // Execute the query to get production details
      const productionDetails = await queryDb(sql, [foodid, pvarientid]);

      // Check if any production details are found
      if (!productionDetails || productionDetails.length === 0) {
          return res.status(404).send({ message: 'No production details found' });
      }

      // Extract the ingredient IDs
      const ingredientIds = productionDetails.map(item => item.ingredientid);

      // Prepare query to fetch total quantity and total price for each ingredient
      const sql2 = `
        SELECT pd.indredientid, SUM(pd.quantity) AS total_quantity, SUM(pd.totalprice) AS total_price
        FROM purchase_details pd
        WHERE pd.indredientid IN (?)
        GROUP BY pd.indredientid
      `;

      // Execute the second query for purchase details
      const purchaseDetails = await queryDb(sql2, [ingredientIds]);

      // Fetch the food name
      const foodNameQuery = await queryDb('SELECT items.ProductName AS foodName FROM item_foods items WHERE items.ProductsID = ?', [foodid]);

      // Fetch the variant name
      const variantNameQuery = await queryDb('SELECT v.variantName FROM variant v WHERE v.variantid = ?', [pvarientid]);

      // Fetch the ingredient names
      const ingredientNameFetchQuery = await queryDb('SELECT id, ingredient_name FROM ingredients WHERE id IN (?)', [ingredientIds]);

      // Check if purchase details are found
      if (!purchaseDetails || purchaseDetails.length === 0) {
          return res.status(404).send({ message: 'No purchase details found for the ingredient(s)' });
      }

      // Extract the first `foodName` and `variantName` because they are the same for all ingredients
      const foodDetails = {
          foodName: foodNameQuery[0].foodName || "not found",
          variantName: variantNameQuery[0].variantName || "not found",
          foodid: foodid,
          pvarientid: pvarientid
      };

      // Calculate the price for each ingredient and create the `itemdetails` array
      const itemDetails = purchaseDetails.map(detail => {
          // Find the matching production quantity for this ingredient
          const productionDetail = productionDetails.find(item => item.ingredientid === detail.indredientid);
          
          // Find the matching ingredient name
          const ingredientName = ingredientNameFetchQuery.find(item => item.id === detail.indredientid);
          const ingredientNameValue = ingredientName ? ingredientName.ingredient_name : 'Unknown Ingredient';

          // Calculate the price per unit for the ingredient
          const productionQty = productionDetail ? productionDetail.productionqty : 0;
          const pricePerUnit = detail.total_price / detail.total_quantity;
          const totalPriceForProduction = pricePerUnit * productionQty;

          return {
              ingredientid: detail.indredientid,
              productionDetailqty: productionQty,
              total_quantity: detail.total_quantity,
              total_price: detail.total_price,
              price: pricePerUnit,
              totalPriceofproductioningredient: totalPriceForProduction.toFixed(2),
              ingredient_name: ingredientNameValue
          };
      });
      const totalPriceSum = itemDetails.reduce((sum, item) => {
        return sum + parseFloat(item.totalPriceofproductioningredient);
    }, 0);


      // Structure the final response
      const response = {
          data: {
              fooddetails: [foodDetails],
              itemdetails: itemDetails,
              totalPriceSum
          }
      };

      // Send the response with the structured data
      res.status(200).send({data:response});

  } catch (error) {
      // Catch and log any errors, then send a server error response
      console.error(error);
      res.status(500).send({ message: 'Server error', error });
  }
};




const updateProductionDetail = async (req, res) => {
  try {
    const { foodnameid, pvarientnameid } = req.params; // Get foodid and pvarientid from request parameters
    console.log("Received foodid:", foodnameid, "pvarientid:",pvarientnameid); // Debug log

    const fooddetails = req.body.fooddetails;
    const itemdetails = req.body.itemdetails;
    
    const createdby = req.id;  // Assuming createdby is a static value
    const created_date = new Date().toISOString().slice(0, 19).replace('T', ' ');  // Format date to 'YYYY-MM-DD HH:mm:ss'
console.log("req.body.fooddetails",req.body.fooddetails,"req.body.itemdetails",req.body.itemdetails)
    // Check if fooddetails and itemdetails are provided
    if (!fooddetails || fooddetails.length === 0 || !itemdetails || itemdetails.length === 0) {
      return res.status(400).json({ message: 'No food details or item details provided' });
    }

    // Start a transaction
    await queryDb('START TRANSACTION');

    // Loop through food details
    for (let food of fooddetails) {
      const { foodid, pvarientid } = food;

      // Fetch existing records to check if they exist
      const fetchCurrentDataSql = 'SELECT * FROM production_details WHERE foodid = ? AND pvarientid = ?';
      const fetchData = await queryDb(fetchCurrentDataSql, [foodnameid, pvarientnameid]);

      console.log("Fetched data for foodid:", foodnameid, "pvarientid:", pvarientnameid, fetchData); // Debug log

      if (fetchData.length === 0) {
        return res.status(404).json({ success: false, message: 'Production detail record not found' });
      }

      // Delete existing records with matching `foodid` and `pvarientid`
      const deleteQuery = 'DELETE FROM production_details WHERE foodid = ? AND pvarientid = ?';
      await queryDb(deleteQuery, [foodid, pvarientid]);

      // Insert new item details into the database
      for (let item of itemdetails) {
        const { p_id, quantity } = item;

        if (!quantity || !p_id) {
          return res.status(400).json({ message: 'Invalid item details provided' });
        }

        const insertSql = `
          INSERT INTO production_details (foodid, pvarientid, ingredientid, qty, createdby, created_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        console.log("Inserting for p_id:", p_id, "with quantity:", quantity); // Debug log

        // Insert new data into the database
        await queryDb(insertSql, [
          foodid,
          pvarientid,
          p_id,
          quantity,
          createdby,
          created_date
        ]);
      }
    }

    // Commit the transaction if all operations are successful
    await queryDb('COMMIT');

    return res.status(200).json({ success: true, message: 'Production details updated successfully' });
  } catch (err) {
    console.error('Error in updateProductionDetail:', err);
    
    // Rollback the transaction in case of an error
    await queryDb('ROLLBACK');
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// const updateProductionDetail = async (req, res) => {
//   try {
//     const { foodnameid, pvarientnameid } = req.params; // Get foodid and pvarientid from request parameters
//     console.log("Received foodid:", foodnameid, "pvarientid:",pvarientnameid); // Debug log

//     const fooddetails = req.body.fooddetails;
//     const itemdetails = req.body.itemdetails;
    
  
//     const created_date = new Date().toISOString().slice(0, 19).replace('T', ' ');  // Format date to 'YYYY-MM-DD HH:mm:ss'
// console.log("req.body.fooddetails",req.body.fooddetails,"req.body.itemdetails",req.body.itemdetails)
//     // Check if fooddetails and itemdetails are provided
//     if (!fooddetails || fooddetails.length === 0 || !itemdetails || itemdetails.length === 0) {
//       return res.status(400).json({ message: 'No food details or item details provided' });
//     }

//     // Start a transaction
//     await queryDb('START TRANSACTION');

//     // Loop through food details
//     for (let food of fooddetails) {
//       const { foodid, pvarientid } = food;

//       // Fetch existing records to check if they exist
//       const fetchCurrentDataSql = 'SELECT * FROM production_details WHERE foodid = ? AND pvarientid = ?';
//       const fetchData = await queryDb(fetchCurrentDataSql, [foodnameid, pvarientnameid]);

//       console.log("Fetched data for foodid:", foodnameid, "pvarientid:", pvarientnameid, fetchData); // Debug log

//       if (fetchData.length === 0) {
//         return res.status(404).json({ success: false, message: 'Production detail record not found' });
//       }

//       // Delete existing records with matching `foodid` and `pvarientid`
//       const deleteQuery = 'DELETE FROM production_details WHERE foodid = ? AND pvarientid = ?';
//       await queryDb(deleteQuery, [foodid, pvarientid]);

//       // Insert new item details into the database
//       for (let item of itemdetails) {
//         const { p_id, quantity } = item;

//         if (!quantity || !p_id) {
//           return res.status(400).json({ message: 'Invalid item details provided' });
//         }

//         const insertSql = `
//           INSERT INTO production_details (foodid, pvarientid, ingredientid, qty,  created_date)
//           VALUES (?,  ?, ?, ?, ?)
//         `;

//         console.log("Inserting for p_id:", p_id, "with quantity:", quantity); // Debug log

//         // Insert new data into the database
//         await queryDb(insertSql, [
//           foodid,
//           pvarientid,
//           p_id,
//           quantity,
    
//           created_date
//         ]);
//       }
//     }

//     // Commit the transaction if all operations are successful
//     await queryDb('COMMIT');

//     return res.status(200).json({ success: true, message: 'Production details updated successfully' });
//   } catch (err) {
//     console.error('Error in updateProductionDetail:', err);
    
//     // Rollback the transaction in case of an error
//     await queryDb('ROLLBACK');
    
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

const getProductionDetails = async (req, res) => {
  try {
    const id = req.id; // Populated from auth middleware
    const { searchItem } = req.query;
 
    // Check user role
    const userCheckQuery = "SELECT created_by, is_admin FROM user WHERE id = ?";
    const [userInfo] = await dbQuery(userCheckQuery, [id]);
 
    if (!userInfo) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
 
    const isAdmin = userInfo.is_admin;
    const createdBy = userInfo.created_by;
 
    let baseQuery = `
      SELECT
        f.ProductName AS food_name, f.ProductsID, p.itemquantity,
        v.variantName AS variant_name, p.saveddate, p.productionexpiredate, p.savedby
      FROM
        production p
      LEFT JOIN
        item_foods f ON p.itemid = f.ProductsID
      LEFT JOIN
        variant v ON p.itemvid = v.variantid
    `;
 
    let conditions = [];
    let params = [];
 
    if (isAdmin === 1) {
      conditions.push(`p.savedby = ?`);
      params.push(id);
    } else {
      if (!createdBy) {
        return res.status(403).json({ success: false, message: "Unauthorized access to production details." });
      }
      conditions.push(`p.created_by = ?`);
      params.push(createdBy);
    }
 
    if (searchItem && searchItem.trim() !== "") {
      const search = `%${searchItem}%`;
      conditions.push(`(f.ProductName LIKE ? OR v.variantName LIKE ? OR p.saveddate LIKE ? OR p.productionexpiredate LIKE ?)`);
      params.push(search, search, search, search);
    }
 
    if (conditions.length > 0) {
      baseQuery += ` WHERE ` + conditions.join(" AND ");
    }
 
    baseQuery += ` ORDER BY p.productionid DESC`;
 
    const productionDetails = await dbQuery(baseQuery, params);
 
    if (!productionDetails || productionDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'Production details not found!' });
    }
 
    return res.status(200).json({ success: true, data: productionDetails });
  } catch (err) {
    console.error('Error fetching production details:', err);
    return res.status(500).json({ success: false, message: 'An error occurred while fetching production details' });
  }
};



module.exports = {
  getalldetailsProductiondetails,
  foodWithVariant,
  foodNameFetchApi,
  createProduction,
  getPurchaseTransactions,
  getAllStockIngredients,
  getPerItemPrice,
  createproduction,
  findbyIdProductiondetails,  
  updateProductionDetail,
  getProductionDetails,
  getAllStockIngredientswithone,
  viewProductiondetails,
  deleteProductionData
};
