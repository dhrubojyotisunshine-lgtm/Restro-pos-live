const multer = require("multer");
const path = require("path");
const auth = require("../middleware/authicantejwt");
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/icon");
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
  limits: { fileSize: 1024 * 1024 * 5 },
});

const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuType");

router.post(
  "/menutype",
  upload.single("menu_icon"), auth,
  menuController.createMenuType
);
router.get("/menutype/:id", auth, menuController.getMenuTypeById);
router.get("/menutype", auth, menuController.getAllMenuTypes);
router.put(
  "/menutype/:menutypeid",
  upload.single("menu_icon"), auth,
  menuController.updateMenuType
);
router.delete("/menutype/:id", auth, menuController.deleteMenuType);

module.exports = router;
