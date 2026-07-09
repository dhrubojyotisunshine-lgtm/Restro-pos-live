// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// const db = require("../utils/db");


// dotenv.config();
// const JWT_SECRET = process.env.JWT_SECRET;


// const dbQuery = (query, values) => {
//   return new Promise((resolve, reject) => {
//     db.pool.query(query, values, (err, result) => {
//       if (err) {
//         return reject(err);
//       }
//       resolve(result);
//     });
//   });
// };

// const verifyToken = async (req, res, next) => {
//   try {
//     const token = req.headers['authorization'];

//     if (!token) {
//       return res.status(401).send({ message: 'No token provided' });
//     }

//     const verified = jwt.verify(token, JWT_SECRET);
//     console.log("v",verified.id,"s",req.id)

//     if (req.id = verified.id) {
//       next();
//     } else {
//       return res.status(401).send({ message: 'Unauthorized' });
//     }
//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).send({ message: 'Token expired' });
//     }
//     return res.status(401).send({ message: 'Invalid token' });
//   }
// };



// Middleware to verify if the user is an admin
// const verifyAdmin = async (req, res, next) => {
//   try {
//     const id = req.id;  
    
   
//     const result = await dbQuery("SELECT * FROM user WHERE id = ?", [id]);


//     if (result.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if the user is an admin
//     const userIsAdmin = result[0].is_admin;
//     console.log("si",userIsAdmin)
//     if (userIsAdmin === 1) {
//       next();  // If user is admin, proceed to the next middleware or route handler
//     } else {
//       return res.status(403).json({ message: "Access denied. Admins only have access." });
//     }
//   } catch (err) {
//     console.error("Error verifying admin:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


//module.exports = verifyToken



// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// const db = require("../utils/db");

// dotenv.config();
// const JWT_SECRET = process.env.JWT_SECRET;

// const dbQuery = (query, values) => {
//   return new Promise((resolve, reject) => {
//     db.pool.query(query, values, (err, result) => {
//       if (err) {
//         return reject(err);
//       }
//       resolve(result);
//     });
//   });
// };

// const verifyToken = async (req, res, next) => {
//   try {
//     const token = req.headers['authorization'];

//     if (!token) {
//       return res.status(401).send({ message: 'No token provided' });
//     }

//     const verified = jwt.verify(token, JWT_SECRET);
//     req.id = verified.id; // ✅ userId ko req me set kar diya

//     // 🔍 User ka latest plan fetch karo
//     const planQuery = `
//       SELECT start_date, end_date, package_status
//       FROM superadmin_user_plans
//       WHERE user_id = ?
//       ORDER BY user_plan_id DESC
//       LIMIT 1
//     `;
//     const plans = await dbQuery(planQuery, [req.id]);
//     const plan = plans[0];

//     if (plan) {
//       const currentDate = new Date();
//       if (plan.package_status.toLowerCase() !== "approved") {
//         return res.status(403).json({ message: "Your subscription is not approved." });
//       }

//       if (plan.end_date && currentDate > new Date(plan.end_date)) {
//         // ✅ Login allowed hoga but API block ho jayegi
//         return res.status(403).json({ message: "Your subscription has expired. Please renew your plan." });
//       }
//     }

//     // ✅ Superadmin ke liye bypass
//     const result = await dbQuery("SELECT super_admin FROM user WHERE id = ?", [req.id]);
//     if (result.length > 0 && result[0].super_admin === 2) {
//       return next();
//     }

//     next();
//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).send({ message: 'Token expired' });
//     }
//     return res.status(401).send({ message: 'Invalid token' });
//   }
// };

// module.exports = verifyToken;


const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const db = require("../utils/db");

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const dbQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    db.pool.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(401).send({ message: 'No token provided' });
    }

    const verified = jwt.verify(token, JWT_SECRET);
    req.id = verified.id;

    // ✅ Get user data
    const userResult = await dbQuery("SELECT super_admin FROM user WHERE id = ?", [req.id]);
    const user = userResult[0];

    // ✅ Superadmin bypass
    if (user?.super_admin === 2) {
      return next();
    }

    // ✅ Fetch latest approved plan only (pending/superseded rows must not interfere)
    const planQuery = `
      SELECT start_date, end_date, package_status
      FROM superadmin_user_plans
      WHERE user_id = ? AND package_status = 'approved'
      ORDER BY user_plan_id DESC
      LIMIT 1
    `;
    const plans = await dbQuery(planQuery, [req.id]);
    const plan = plans[0];

    // ✅ Buying/renewing a plan must always be allowed regardless of subscription state
    const isExempt = req.path.includes('/renew-plan/') || req.path.includes('/createsubscription');

    if (!plan) {
      if (isExempt) return next();
      return res.status(403).json({ message: "No subscription found. Please purchase a plan." });
    }

    const now = new Date();
    const endDate = new Date(plan.end_date);

    if (!isExempt && endDate < now) {
      return res.status(403).json({
        message: "Your subscription has expired. Please renew your plan to continue.",
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send({ message: 'Token expired' });
    }
    return res.status(401).send({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;
