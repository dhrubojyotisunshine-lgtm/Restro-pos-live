const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const dataController = require("../controllers/addCategory");
const auth = require("../middleware/authicantejwt");
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/category");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: multerStorage,
});

router.get("/data", auth, dataController.getCategory);
router.post("/data", upload.single("image"), auth, dataController.addCategory);
router.post(
  "/bulkupload",
  upload.single("image"),
  auth,
  dataController.addCategoriesBulk
);
router.delete("/data/:id", auth, dataController.deletCategory);
router.put(
  "/data/:id",
  upload.single("image"),
  auth,
  dataController.updateCategory
);
router.get("/data/:id", auth, dataController.getCategoryById);

// Electron app sync (no auth — uses x-sync-key header)
router.post("/categories/sync", dataController.syncCategory);

module.exports = router;
