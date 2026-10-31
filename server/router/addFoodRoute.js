const express = require("express");

const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth=require("../middleware/authicantejwt")
const addfoodController = require("../controllers/addFood");

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

router.post("/fooditems/import", auth, addfoodController.importFoodItems);

// Route for creating an item food
router.post(
  "/itemfood",
  upload.single("ProductImage"),auth,
  addfoodController.createItemFood
);
router.post("/bulk-upload-food", upload.single("file"), auth, addfoodController.bulkUploadFoodItems);
router.delete("/itemfood/:ProductsID", auth, addfoodController.deleteItemFood);

router.get("/itemfood",auth,addfoodController.getAllItemFoodDetails);
router.get("/itemfooddetail/:ProductID", auth, addfoodController.getItemFoodDetails);
router.put(
  "/itemfood/:ProductID",
  upload.single("ProductImage"),auth,
  addfoodController.updateItemFood
);
module.exports = router;
