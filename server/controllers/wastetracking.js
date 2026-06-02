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

  const getPackagingWasteDetails = async (req, res) => {
  const { from, to, searchItem } = req.query;
  const user_id = req.id;
 
  try {
    // Step 1: Check if user has a subscription
    const checkSubscriptionQuery = "SELECT * FROM superadmin_user_plans WHERE user_id = ?";
    const subscriptionResult = await dbQuery(checkSubscriptionQuery, [user_id]);
 
    let created_by = user_id;
 
    if (subscriptionResult.length === 0) {
      // Step 2: Check if user was created by someone else
      const checkUserCreatedByQuery = "SELECT created_by FROM user WHERE id = ?";
      const userResult = await dbQuery(checkUserCreatedByQuery, [user_id]);
 
      if (userResult.length === 0 || !userResult[0].created_by) {
        return res.status(403).json({ message: "You are not authorized to access packaging waste details." });
      }
 
      created_by = userResult[0].created_by;
 
      // Step 3: Check if the creator has a subscription
      const creatorSubResult = await dbQuery(checkSubscriptionQuery, [created_by]);
      if (creatorSubResult.length === 0) {
        return res.status(403).json({ message: "Creator does not have an active subscription." });
      }
    }
 
    // Step 4: Proceed to fetch packaging waste details
    let getWasteDetailsQuery = `
      SELECT
        pfw.order_id,
        pfw.id,
        pfw.ingradient_id,
        pfw.qnty,
        pfw.l_price,
        pfw.note,
        pfw.created_at,
        ing.ingredient_name
      FROM packaging_food_waste pfw
      INNER JOIN ingredients ing ON pfw.ingradient_id = ing.id
      WHERE pfw.createdby = ?
    `;
 
    let queryParams = [created_by];
    let whereConditions = [];
 
    // Date filtering condition
    if (from && to) {
      whereConditions.push(`pfw.created_at BETWEEN ? AND ?`);
      queryParams.push(from, to);
    }
 
    // Search filtering condition
    if (searchItem) {
      const searchValue = `%${searchItem}%`;
      whereConditions.push(`
        (pfw.order_id LIKE ?
        OR pfw.ingradient_id LIKE ?
        OR pfw.qnty LIKE ?
        OR pfw.l_price LIKE ?
        OR pfw.note LIKE ?
        OR pfw.created_at LIKE ?
        OR ing.ingredient_name LIKE ?)
      `);
      queryParams.push(
        searchValue, searchValue, searchValue,
        searchValue, searchValue, searchValue,
        searchValue
      );
    }
 
    if (whereConditions.length > 0) {
      getWasteDetailsQuery += ` AND ` + whereConditions.join(' AND ');
    }
 
    getWasteDetailsQuery += ` ORDER BY pfw.id DESC`;
 
    const wasteDetails = await dbQuery(getWasteDetailsQuery, queryParams);
 
    if (wasteDetails.length === 0) {
      return res.status(404).send({ message: 'No packaging food waste records found' });
    }
 
    res.status(200).send({ data: wasteDetails });
  } catch (error) {
    console.error("Error fetching packaging waste details:", error);
    res.status(500).send({ message: 'Server error', error });
  }
};


  const insertPackageInformation = async (req, res) => {
  const { orderdetails, itemdetails } = req.body;
  const { orderid } = orderdetails[0];
  const saveid = req.id;
  const newDate = new Date().toISOString().slice(0, 10);
 
  try {
    // Step 1: Check if the user has a subscription
    const [userSubscription] = await dbQuery(
      `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
      [saveid]
    );
 
    let created_by = saveid;
 
    if (!userSubscription) {
      // Step 2: Check who created this user
      const [userInfo] = await dbQuery(
        `SELECT created_by FROM user WHERE id = ?`,
        [saveid]
      );
 
      if (!userInfo || !userInfo.created_by) {
        return res.status(403).json({ message: "You are not authorized to insert package information." });
      }
 
      created_by = userInfo.created_by;
 
      // Step 3: Check if the creator has a subscription
      const [creatorSubscription] = await dbQuery(
        `SELECT * FROM superadmin_user_plans WHERE user_id = ?`,
        [created_by]
      );
 
      if (!creatorSubscription) {
        return res.status(403).json({ message: "Creator does not have an active subscription." });
      }
    }
 
    // Step 4: Continue with your existing logic
    const checkWasteQuery = `SELECT * FROM packaging_food_waste WHERE order_id = ?`;
    const wasteResult = await dbQuery(checkWasteQuery, [orderid]);
 
    if (wasteResult.length > 0) {
      return res.status(400).send('The order already exists');
    }
 
    const checkOrderQuery = `SELECT order_id FROM customer_order WHERE order_id = ? AND order_date = ?`;
    const orderResult = await dbQuery(checkOrderQuery, [orderid, newDate]);
 
    if (orderResult.length !== 1) {
      return res.status(400).send('Order not found for the current date');
    }
 
    for (let index = 0; index < itemdetails.length; index++) {
      const { ingradient_id, qnty, l_price, note } = itemdetails[index];
      const finallostprice = qnty * l_price;
 
      const data1 = {
        order_id: orderid,
        ingradient_id,
        qnty,
        l_price: finallostprice,
        note,
        createdby: saveid,
        created_at: newDate,
      };
 
      const updateStockQuery = `UPDATE ingredients SET stock_qty = stock_qty - ? WHERE id = ?`;
      await dbQuery(updateStockQuery, [qnty, ingradient_id]);
 
      const insertWasteQuery = `INSERT INTO packaging_food_waste SET ?`;
      await dbQuery(insertWasteQuery, data1);
    }
 
    return res.status(200).send('Packaging information inserted successfully');
 
  } catch (err) {
    console.error('Error processing request:', err);
    return res.status(500).send('Server error');
  }
};

   const getPackageFoodWasteDetails = async (req, res) => {
  try {
    const userId = req.id; // From auth middleware
    const { start_date, end_date, searchItem } = req.query;
 
    // Step 1: Get user role and creator
    const checkUserQuery = "SELECT is_admin, created_by FROM user WHERE id = ?";
    db.pool.query(checkUserQuery, [userId], async (err, userData) => {
      if (err) {
        console.error("User fetch error:", err);
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }
 
      if (userData.length === 0) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
 
      const isAdmin = userData[0].is_admin;
      const createdBy = userData[0].created_by;
 
      // Determine who to filter by
      const allowedCreatorId = isAdmin === 1 ? userId : createdBy;
 
      if (!allowedCreatorId) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
      }
 
      // Step 2: Build base query
      let query = `
        SELECT ingradient_food_waste.*, ingredients.ingredient_name,
               CONCAT_WS(' ', user.firstname, user.lastname) AS Checkedby
        FROM ingradient_food_waste
        JOIN ingredients ON ingradient_food_waste.ingradient_id = ingredients.id
        JOIN user ON ingradient_food_waste.check_by = user.id
        WHERE user.created_by = ?
      `;
      let queryParams = [allowedCreatorId];
 
      // Step 3: Apply date filter if available
      if (start_date && end_date) {
        query += ` AND ingradient_food_waste.created_at BETWEEN ? AND ?`;
        queryParams.push(start_date, end_date);
      }
 
      // Step 4: Apply search filter if available
      if (searchItem && searchItem.trim() !== "") {
        const searchValue = `%${searchItem}%`;
        query += ` AND (
          ingradient_food_waste.id LIKE ?
          OR ingredients.ingredient_name LIKE ?
          OR user.firstname LIKE ?
          OR user.lastname LIKE ?
          OR ingradient_food_waste.l_price LIKE ?
          OR ingradient_food_waste.note LIKE ?
          OR ingradient_food_waste.qnty LIKE ?
          OR ingradient_food_waste.created_at LIKE ?
        )`;
        queryParams.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
      }
 
      query += ` ORDER BY ingradient_food_waste.id DESC`;
 
      // Step 5: Execute query
      try {
        const results = await dbQuery(query, queryParams);
        if (results.length === 0) {
          return res.status(404).json({ message: 'No ingredient food waste records found' });
        }
       res.status(200).json(results);
 
      } catch (queryErr) {
        console.error("Query error:", queryErr);
        res.status(500).json({ success: false, message: "Server error", error: queryErr });
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: "Unexpected server error", error });
  }
};  

  const getTotalPrice = async (req, res) => {
    const { id } = req.params;
    console.log(id)
  
  
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
      const query2='SELECT stock_qty FROM ingredients WHERE ingredients.id=?'
      const result1 = await dbQuery(query2, [id]);
      const total_stock=result1[0].stock_qty;
      // const l_price=total_stock*pricePerIngredient-qnty*pricePerIngredient;
      
  
      
  
      // Return the result in a response
      return res.status(200).json({
        data: [{ Price: pricePerIngredient ,Stock:total_stock}]
      });
  
    } catch (err) {
      // Handle errors in the database query
      console.error('Error fetching total quantity and price:', err);
      return res.status(500).send('Server error');
    }
  };


  const insertingRdInformation = async (req, res) => {
  const { userdetails, itemdetails } = req.body;
  const { user } = userdetails[0];
  const saveId = req.id;
  const newDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
 
  try {
    // Step 1: Check if the user has a subscription
    const subscriptionCheck = await dbQuery('SELECT * FROM superadmin_user_plans WHERE user_id = ?', [saveId]);
 
    let created_by = null;
 
    if (subscriptionCheck.length > 0) {
      // User has a subscription
      created_by = saveId;
    } else {
      // Step 2: Check who created the user
      const userInfo = await dbQuery('SELECT created_by FROM user WHERE id = ?', [saveId]);
 
      if (userInfo.length === 0 || !userInfo[0].created_by) {
        return res.status(403).json({ message: "You are not authorized to perform this operation." });
      }
 
      const creatorId = userInfo[0].created_by;
 
      // Step 3: Check if the creator has a subscription
      const creatorSub = await dbQuery('SELECT * FROM superadmin_user_plans WHERE user_id = ?', [creatorId]);
 
      if (creatorSub.length === 0) {
        return res.status(403).json({ message: "Creator does not have an active subscription." });
      }
 
      created_by = creatorId;
    }
 
    // Proceed to insert after successful authorization
    await dbQuery('START TRANSACTION');
 
    for (let index = 0; index < itemdetails.length; index++) {
      const { ingradientvalue: ingredientId, qnty, l_price, note, quantitystock } = itemdetails[index];
      const product_quantity = quantitystock - qnty;
 
      const data1 = {
        check_by: user,
        ingradient_id: ingredientId,
        qnty: product_quantity,
        l_price: l_price,
        note: note,
        createdby: created_by,
        created_at: newDate,
      };
 
      await dbQuery('UPDATE ingredients SET stock_qty = stock_qty - ? WHERE id = ?', [product_quantity, ingredientId]);
      await dbQuery('INSERT INTO ingradient_food_waste SET ?', data1);
    }
 
    await dbQuery('COMMIT');
    return res.status(200).send('Ingredient information inserted successfully');
  } catch (err) {
    await dbQuery('ROLLBACK');
    console.error('Error inserting ingredient information:', err);
    return res.status(500).send('Server error');
  }
};


  const showItemsFoodWaste = async (req, res) => {
  const id = req.id; // Populated from auth middleware
  const { start_date, end_date, searchItem } = req.query;
 
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
 
    // Build base query
    let query = `
      SELECT items_food_waste.*,
             items_food_waste.qnty,
             items_food_waste.l_price,
             items_food_waste.note,
             items_food_waste.created_at,
             item_foods.ProductName,
             variant.variantName,
             CONCAT_WS(' ', user.firstname, user.lastname) AS fullname
      FROM items_food_waste
      LEFT JOIN item_foods ON items_food_waste.itms_id = item_foods.ProductsID
      LEFT JOIN variant ON items_food_waste.wvarientid = variant.variantid
      LEFT JOIN user ON items_food_waste.check_by = user.id
    `;
 
    let queryParams = [];
    let whereConditions = [];
 
    // Apply user role filtering
    if (isAdmin === 1) {
      // Admin sees their own entries
      whereConditions.push(`items_food_waste.createdby = ?`);
      queryParams.push(id);
    } else {
      // Non-admin sees entries by their creator
      if (!created_by) {
        return res.status(403).json({ success: false, message: "You are not authorized to view this data." });
      }
      whereConditions.push(`items_food_waste.createdby = ?`);
      queryParams.push(created_by);
    }
 
    // Date range filtering
    if (start_date && end_date) {
      whereConditions.push(`items_food_waste.created_at BETWEEN ? AND ?`);
      queryParams.push(start_date, end_date);
    }
 
    // Search filtering
    if (searchItem) {
      const searchValue = `%${searchItem}%`;
      whereConditions.push(`
        (item_foods.ProductName LIKE ?
        OR variant.variantName LIKE ?
        OR CONCAT_WS(' ', user.firstname, user.lastname) LIKE ?
        OR items_food_waste.qnty LIKE ?
        OR items_food_waste.l_price LIKE ?
        OR items_food_waste.note LIKE ?
        OR items_food_waste.created_at LIKE ?)
      `);
      queryParams.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
    }
 
    // Finalize the query with conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }
 
    query += ` ORDER BY items_food_waste.id DESC`;
 
    try {
      const results = await dbQuery(query, queryParams);
      if (results.length === 0) {
        return res.status(404).json({ message: 'No food waste records found' });
      }
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error('Error fetching food waste records:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
};

  // price accours=din food name and variant 
   const getalldetailsProductiondetails = async (req, res) => {
    const { foodid, pvarientid } = req.query;
  
    try {
      // Step 1: Fetch foodid and pvarientid from production_details
      let foodVariantQuery = `
        SELECT foodid, pvarientid, ingredientid, qty AS productionqty
        FROM production_details 
        WHERE foodid = ? AND pvarientid = ?
      `;
  
      const productionDetails = await dbQuery(foodVariantQuery, [foodid, pvarientid]);
  
      if (!productionDetails || productionDetails.length === 0) {
        return res.status(404).send({ message: 'No production details found' });
      }
  
      // Step 2: Extract ingredient IDs and fetch purchase details for each ingredient
      const ingredientIds = productionDetails.map(item => item.ingredientid);
  
      const purchaseQuery = `
        SELECT pd.indredientid, SUM(pd.quantity) AS total_quantity, SUM(pd.totalprice) AS total_price
        FROM purchase_details pd
        WHERE pd.indredientid IN (?)
        GROUP BY pd.indredientid
      `;
      const purchaseDetails = await dbQuery(purchaseQuery, [ingredientIds]);
      console.log(purchaseDetails,"indredientid")
  
      if (!purchaseDetails || purchaseDetails.length === 0) {
        return res.status(404).send({ message: 'No purchase details found for the ingredient(s)' });
      }
  
      // Step 3: Fetch food names, variant names, and ingredient names
      const foodIds = [...new Set(productionDetails.map(item => item.foodid))];
      const variantIds = [...new Set(productionDetails.map(item => item.pvarientid))];
  
      const foodNameQuery = `
        SELECT items.ProductName AS foodName, items.ProductsID 
        FROM item_foods items 
        WHERE items.ProductsID IN (?)
      `;
      const foodNameResults = await dbQuery(foodNameQuery, [foodIds]);
  
      const variantNameQuery = `
        SELECT v.variantName, v.variantid 
        FROM variant v 
        WHERE v.variantid IN (?)
      `;
      const variantNameResults = await dbQuery(variantNameQuery, [variantIds]);
  
      const ingredientNameQuery = `
        SELECT id, ingredient_name 
        FROM ingredients 
        WHERE id IN (?)
      `;
      const ingredientNames = await dbQuery(ingredientNameQuery, [ingredientIds]);
  
      // Step 4: Create lookups for food, variant, and ingredient names
      const foodNameLookup = {};
      foodNameResults.forEach(item => {
        foodNameLookup[item.ProductsID] = item.foodName;
      });
  
      const variantNameLookup = {};
      variantNameResults.forEach(item => {
        variantNameLookup[item.variantid] = item.variantName;
      });
  
      const ingredientNameLookup = {};
      ingredientNames.forEach(item => {
        ingredientNameLookup[item.id] = item.ingredient_name;
      });
  
      // Step 5: Merge production details with purchase details and group by foodid and pvarientid
      const result = {};
  
      productionDetails.forEach(detail => {
       
        const ingredientPurchaseDetail = purchaseDetails.find(purchase => purchase.indredientid === detail.ingredientid);
       
        console.log(ingredientPurchaseDetail,"ingredientpurchasedetaiol")
        const pricePerUnit = ingredientPurchaseDetail ? (ingredientPurchaseDetail.total_price / ingredientPurchaseDetail.total_quantity) : 0;
        const productionPrice = pricePerUnit * detail.productionqty;

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
  
        result[key].totalAmount += productionPrice;
      });
  
      // Step 6: Send filtered results
      const filteredResults = Object.values(result);
  
      res.status(200).send({ data: filteredResults });
    } catch (error) {
      console.error("Error fetching production details:", error);
      res.status(500).send({ message: 'Server Error', error });
    }
  };
  // post maing food waste 
  const insertFoodInformation = async (req, res) => {
    const { userdetails, itemdetails } = req.body;
    const { user } = userdetails[0]; // Assuming userdetails[0] has the user property
 
    const saveid = req.id; // Assuming session is managed in req.session
    const newDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date as 'YYYY-MM-DD HH:mm:ss'
 
    try {
      for (let index = 0; index < itemdetails.length; index++) {
        const { itms_id, wvarientid, qnty, l_price, note } = itemdetails[index];
       
        // Construct the data to be inserted
        const data1 = {
          check_by: user,             // From userdetails
          itms_id: itms_id,           // Product ID from itemdetails
          wvarientid: wvarientid,     // Variant ID from itemdetails
          qnty: qnty,                 // Quantity from itemdetails
          l_price: l_price,           // Lost price from itemdetails
          note: note,                 // Note from itemdetails
          createdby: saveid,          // Assuming session ID or creator ID
          created_at: newDate         // Timestamp
        };
 
        // Insert data into the 'items_food_waste' table
        const insertWasteQuery = `INSERT INTO items_food_waste SET ?`;
        await dbQuery(insertWasteQuery, data1);
 
 
      }
 
      return res.status(200).send('Food information inserted successfully');
    } catch (err) {
      console.error('Error processing request:', err);
      return res.status(500).send('Server error');
    }
  };

  
  
   module.exports={
    getPackagingWasteDetails,
    insertPackageInformation,
    getPackageFoodWasteDetails,
    getTotalPrice,
    insertingRdInformation,
    showItemsFoodWaste,
    getalldetailsProductiondetails,
    insertFoodInformation
   }