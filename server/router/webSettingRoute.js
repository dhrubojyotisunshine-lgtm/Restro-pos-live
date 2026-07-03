const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/authicantejwt");

const webSettingController = require("../controllers/webSetting");

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

router.post(
  "/csetting",
  auth,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "logo_footer", maxCount: 1 },
    { name: "fevicon", maxCount: 1 },
  ]),
  webSettingController.createSetting
);

router.put("/csetting/:id", auth, upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "logo_footer", maxCount: 1 },
    { name: "fevicon", maxCount: 1 },
  ]), webSettingController.updateSetting);

router.get("/websetting", webSettingController.getAllSettings);
router.get("/csetting/:id", auth, webSettingController.getSettingById);

router.post("/createsound", auth, upload.single("notifysound"), webSettingController.createOrUpdateSoundSetting);
router.get("/soundsetting", auth, webSettingController.getAllSoundSettings);

router.get("/subscriptions/:id", auth, webSettingController.getSubscriptionsByAdmin);
router.post("/createsubscription", auth, webSettingController.createSubscriptionByAdmin);
router.put("/renew-plan/:user_plan_id", auth, webSettingController.renewPlanByAdmin);

module.exports = router;
