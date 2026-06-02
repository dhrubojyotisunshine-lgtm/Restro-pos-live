const db = require("../utils/db");

const testPrintAPI = (req, res) => {
  console.log("🔥 TEST PRINT CONTROLLER WORKING");

  res.json({
    success: true,
    message: "Test Print Controller Hit",
  });
};

const testPrintKitchenAPI = async (req, res) => {
  try {
    console.log("hello");

    // ✅ CHECK DATABASE NAME
    db.pool.query("SELECT DATABASE() AS dbname", (err, dbResult) => {
      if (err) {
        console.log("DB NAME ERROR:", err);
      } else {
        console.log("✅ Connected DB:", dbResult[0].dbname);
      }
    });

    // ✅ CHECK TOTAL ROWS
    db.pool.query(
      "SELECT COUNT(*) AS total FROM kot_items",
      (err, totalRows) => {
        if (!err) {
          console.log("✅ Total kot_items:", totalRows[0].total);
        }
      },
    );

    // ✅ CHECK PRINTED = 0 ROWS
    db.pool.query(
      "SELECT COUNT(*) AS pending FROM kot_items WHERE printed = 0",
      (err, pendingRows) => {
        if (!err) {
          console.log("✅ Pending printed=0:", pendingRows[0].pending);
        }
      },
    );

    // ✅ ORIGINAL QUERY
    const query = `
  SELECT DISTINCT kitchen_id
  FROM kot_items
  WHERE printed = 0 OR printed = '0'
`;

    db.pool.query(query, (err, result) => {
      if (err) {
        console.log("❌ SQL Error:", err);
        return res.status(500).json({ success: false });
      }

      console.log("✅ Pending Kitchens Result:", result);
      console.log("========== KOT DEBUG END ==========");

      res.json({
        success: true,
        data: result,
      });
    });
  } catch (e) {
    console.log("❌ API Error:", e);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  testPrintAPI,
  testPrintKitchenAPI,
};
