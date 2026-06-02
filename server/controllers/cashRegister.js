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


  // const addCashRegisterDetail = async (req, res) => {
  //   const { opening_balance, openingnote } = req.body;
  //   const user_id = req.id; // Assuming `req.id` holds the authenticated user ID.
  
  //   // Validate required inputs
  //   if (!user_id || !opening_balance ) {
  //     return res.status(400).json({ success: false, message: 'User ID and opening balance are required' });
  //   }
  
  //   try {
  //     // Insert the new record into the tbl_cashregister table
  //     const query = `
  //       INSERT INTO tbl_cashregister 
  //       (userid,  opening_balance, closing_balance, opendate, status, openingnote, closing_note)
  //       VALUES (?,  ?, 0,  NOW(), 1, ?, '')
  //     `;
  //     await dbQuery(query, [user_id,  opening_balance, openingnote]);
  
  //     res.status(201).json({ success: true, message: 'Cash register detail added successfully' });
  //   } catch (error) {
  //     res.status(500).json({ success: false, message: 'Failed to add cash register detail', error });
  //   }
  // };
 
  const addCashRegisterDetail = async (req, res) => {
    const { opening_balance, openingnote } = req.body;
    const user_id = req.id; // Assuming `req.id` holds the authenticated user ID.
  
    // Validate required inputs
    if (!user_id || !opening_balance) {
        return res.status(400).json({ success: false, message: 'User ID and opening balance are required' });
    }
  
    try {
        // Set the opening note to an empty string if it's not provided
        const note = openingnote || '';
  
        // Insert the new record into the tbl_cashregister table
        const query = `
            INSERT INTO tbl_cashregister 
            (userid, opening_balance, closing_balance, opendate, status, openingnote)
            VALUES (?, ?, 0, NOW(), 1, ?)
        `;
  
        // Run the query with parameterized values
        const result = await dbQuery(query, [user_id, opening_balance, note]);
  
        // Get the inserted ID (assuming MySQL, for example, the insertId is available)
        const id = result.insertId;
  
        res.status(201).json({ success: true, message: 'Cash register detail added successfully', data: { id } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add cash register detail', error: error.message });
    }
  };
 
  // const getCashRegisterDetail = async (req, res) => {
  //   try {
  //     const id=req.params.id;
  //     // const userId = req.id; // Assuming `req.id` contains the authenticated user's ID.
  //     const now = new Date(); // Get the current timestamp.
     
  
  //     // Step 1: Fetch cash register details for the user.
  //     const cashRegisterQuery = `SELECT * FROM tbl_cashregister WHERE id = ?`;
  //     const cashRegisterResult = await dbQuery(cashRegisterQuery, [id]);
  
  //     if (cashRegisterResult.length === 0) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'No cash register found for the given ID.',
  //       });
  //     }
  //     const opendate=cashRegisterResult[0].opendate;
  //     const opening_balance=cashRegisterResult[0].opening_balance;
  //     const user_id=cashRegisterResult[0].userid;

  
      
  
  //     // Step 2: Fetch user details (username).
  //     const userQuery = `SELECT CONCAT(firstname, ' ', lastname) AS username,email FROM user WHERE id = ?`;
  //     const userResult = await dbQuery(userQuery, [user_id]);
  
  //     if (userResult.length === 0) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'No user found for the given ID.',
  //       });
  //     }
  
  //     const username = userResult[0].username;
  //     const email= userResult[0].email;
  //      const formatDateTime = (dateTime) => {
  //       const dateObj = new Date(dateTime);
  //       const date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
  //       const time = dateObj.toTimeString().split(' ')[0]; // Extract HH:MM:SS
  //       return { date, time };
  //     };
  
  //     const openDateTime = formatDateTime(opendate);
  //     const closeDateTime = formatDateTime(now);
  
  
  //     // Step 3: Calculate the total bill amount within the cash register open period.
  //     const billQuery = `
  //       SELECT 
  //         SUM(bill.bill_amount) AS billAmount
  //       FROM bill
  //       WHERE bill.create_by = ? 
  //         AND bill.bill_status = 1
  //         AND bill_date=?
  //         AND bill.bill_time BETWEEN ? AND ?
  //     `;
  //     const billResult = await dbQuery(billQuery, [user_id,openDateTime.date, openDateTime.time, closeDateTime.time]);
  //     console.log("hh",user_id, openDateTime.date,closeDateTime.date)
  
  //     const billAmount = billResult[0]?.billAmount || 0; // Default to 0 if no bills are found.
      
  //     // Step 4: Update the cash register with the closing balance and close date.
  //     const updateQuery = `
  //       UPDATE tbl_cashregister 
  //       SET closing_balance = ?, closedate = NOW()
  //       WHERE id = ?
  //     `;
  //     await dbQuery(updateQuery, [billAmount, id]);
    
  
  //     // Format `openDate` and `now` (closeDate) into separate `date` and `time`.
     
  //     // Step 5: Respond with the updated details.
  //     res.status(200).json({
  //       success: true,
  //       message: 'Cash register details updated successfully.',
  //       data: {
  //         id:cashRegisterResult[0].id,
  //         username,
  //         openBalance:opening_balance,
  //         closingBalance: billAmount,
  //         openDate: openDateTime.date,
  //         openTime: openDateTime.time,
  //         closeDate: closeDateTime.date,
  //         closeTime: closeDateTime.time,
  //         Email:email,

       
  //       },
  //     });
  //   } catch (error) {
  //     // Step 6: Handle and log errors.
  //     console.error('Error in getCashRegisterDetail:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'An error occurred while processing the cash register details.',
  //       error: error.message,
  //     });
  //   }
  // };

  const getCashRegisterDetail = async (req, res) => {
    try {
      const id=req.params.id;
      // const userId = req.id; // Assuming `req.id` contains the authenticated user's ID.
      const now = new Date(); // Get the current timestamp.
     
  
      // Step 1: Fetch cash register details for the user.
      const cashRegisterQuery = `SELECT * FROM tbl_cashregister WHERE id = ?`;
      const cashRegisterResult = await dbQuery(cashRegisterQuery, [id]);
  
      if (cashRegisterResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No cash register found for the given ID.',
        });
      }
      const opendate=cashRegisterResult[0].opendate;
      const opening_balance=cashRegisterResult[0].opening_balance;
      const user_id=cashRegisterResult[0].userid;

  
      
  
      // Step 2: Fetch user details (username).
      const userQuery = `SELECT CONCAT(firstname, ' ', lastname) AS username,email FROM user WHERE id = ?`;
      const userResult = await dbQuery(userQuery, [user_id]);
  
      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No user found for the given ID.',
        });
      }
  
      const username = userResult[0].username;
      const email= userResult[0].email;
       const formatDateTime = (dateTime) => {
        const dateObj = new Date(dateTime);
        const date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
        const time = dateObj.toTimeString().split(' ')[0]; // Extract HH:MM:SS
        return { date, time };
      };
  
      const openDateTime = formatDateTime(opendate);
      const closeDateTime = formatDateTime(now);
  
  console.log("opendata",openDateTime.date,openDateTime.time,closeDateTime.time,user_id)
      // Step 3: Calculate the total bill amount within the cash register open period.
      const billQuery = `
        SELECT 
          SUM(bill.bill_amount) AS billAmount
        FROM bill
        WHERE bill.create_by = ? 
          AND bill.bill_status = 1
          AND bill_date=?
          AND bill.bill_time BETWEEN ? AND ?
      `;
      const billResult = await dbQuery(billQuery, [user_id,openDateTime.date, openDateTime.time, closeDateTime.time]);
      console.log("hh",user_id, openDateTime.date,closeDateTime.date)
  
      const billAmount = billResult[0]?.billAmount || 0; // Default to 0 if no bills are found.
      console.log("object",billAmount)
      // Step 4: Update the cash register with the closing balance and close date.
      const updateQuery = `
        UPDATE tbl_cashregister 
        SET closing_balance = ?, closedate = NOW()
        WHERE id = ?
      `;
      await dbQuery(updateQuery, [billAmount, id]);
    
  
      // Format `openDate` and `now` (closeDate) into separate `date` and `time`.
     
      // Step 5: Respond with the updated details.
      res.status(200).json({
        success: true,
        message: 'Cash register details updated successfully.',
        data: {
          id:cashRegisterResult[0].id,
          username,
          openBalance:opening_balance,
          closingBalance: billAmount,
          openDate: openDateTime.date,
          openTime: openDateTime.time,
          closeDate: closeDateTime.date,
          closeTime: closeDateTime.time,
          Email:email,

       
        },
      });
    } catch (error) {
      // Step 6: Handle and log errors.
      console.error('Error in getCashRegisterDetail:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing the cash register details.',
        error: error.message,
      });
    }
  };
  const putCashRegisterDetail = async (req, res) => {
    try {
      const { id } = req.params;  // Extracting the 'id' from URL parameters
      const { closedate, closing_note, closing_balance } = req.body;  // Extracting fields from request body
  console.log(closedate,closing_note,closing_balance)
      // Validate required fields
      if (!closedate || !closing_note || !closing_balance) {
        return res.status(400).json({
          success: false,
          message: "closedate, closing_note, and closing_balance are required.",
        });
      }
  
      // Update query with a WHERE condition to specify which record to update
      const query = `
        UPDATE tbl_cashregister 
        SET closing_note = ?, closedate = ?, closing_balance = ?
        WHERE id = ?
      `;
  
      // Execute the query with parameters
      const result = await dbQuery(query, [closing_note, closedate, closing_balance, id]);
  
      // Check if the update affected any rows
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "No cash register record found with this ID.",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Cash register details updated successfully.",
      });
    } catch (error) {
      console.error('Error updating cash register details:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating cash register details.',
        error: error.message,
      });
    }
  };

  const recenttransaction = async (req, res) => {
    try {
      // Define the SQL query to fetch the latest 20 orders
      const getCompleteOrders = `
        SELECT
          co.*,
          c.customer_name,
          w.firstname AS waiter_first_name,
          w.lastname AS waiter_last_name,
          rt.tablename,
          b.discount,
          b.service_charge,
          b.shipping_type,
          b.VAT,
          b.bill_amount,
          b.bill_date,
          b.bill_status,
          b.payment_method_id,
          sm.shipping_method AS shipping_method_name,
          ct.customer_type AS customer_type_name
        FROM
          customer_order co
        LEFT JOIN
          customer_info c ON co.customer_id = c.customer_id
        LEFT JOIN
          user w ON co.waiter_id = w.id
        LEFT JOIN
          rest_table rt ON co.table_no = rt.tableid
        LEFT JOIN
          bill b ON co.order_id = b.order_id
        LEFT JOIN
          shipping_method sm ON b.shipping_type = sm.ship_id
        LEFT JOIN 
          customer_type ct ON co.cutomertype = ct.customer_type_id
        WHERE
          co.order_status = 4 AND b.bill_status = 1
        ORDER BY
          b.bill_date DESC, b.bill_time DESC  
        LIMIT 15;
      `;
  
      // Execute the query and wait for the result
      const result = await dbQuery(getCompleteOrders);
  
      // Send a successful response with the data
      res.status(200).json({
        success: true,
        data: result,
        message: "Complete orders fetched successfully",
      });
  
    } catch (error) {
      // Log and handle any errors that occur
      console.error("Error fetching complete orders:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while fetching complete orders.",
        error: error.message 
      });
    }
  };
  module.exports={
    addCashRegisterDetail,
    getCashRegisterDetail ,
    putCashRegisterDetail,
    recenttransaction
  }