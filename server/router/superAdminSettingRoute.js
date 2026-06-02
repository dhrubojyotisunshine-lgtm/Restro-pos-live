const express = require("express");
const router = express.Router();
const cmscontroller = require("../controllers/superAdminCms");
const multer = require("multer");
const path = require("path");


const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/home"); // Make sure this path exists
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

// ✅ Create multer instance here
const upload = multer({ storage: multerStorage });
//superadmin setting
router.get('/adminsettings', cmscontroller.getAdminSettings);
router.post(
  "/adminsettings",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 }, // ✅ match name exactly from frontend
  ]),
  cmscontroller.createAdminSettings
);


router.get('/adminsettings/:id', cmscontroller.getAdminSettingsById);


router.put('/adminsettings/:id', upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 }, // ✅ match name exactly from frontend
  ]), cmscontroller.updateAdminSettings);
module.exports = router;