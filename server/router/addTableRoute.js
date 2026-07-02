const express = require("express");
const router = express.Router();
const tableController = require("../controllers/addTable");
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/authicantejwt");
// Multer storage configuration
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/icon");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
});

router.post("/sync/tables", tableController.syncTables);
router.post(
  "/table",
  upload.single("table_icon"),
  auth,
  tableController.createTable,
);
router.get("/table", auth, tableController.getTables);
router.get("/table/:id", auth, tableController.getTableById);
router.delete("/deletetable/:id", auth, tableController.deleteTable);
router.get("/bookedtable", auth, tableController.getBookedTable);
router.get("/unbookedtable", auth, tableController.getunBookedTable);
router.put("/table/:tableId", auth, tableController.cleartable);

router.put("/updatetable/:tableid", auth, tableController.updateTable);
// delete and update left
module.exports = router;
