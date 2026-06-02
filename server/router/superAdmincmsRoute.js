const express = require("express");
const router = express.Router();
const cmscontroller = require("../controllers/superAdminCms");
const multer = require("multer");
const path = require("path");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/home"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});




const upload = multer({ storage: multerStorage });
// home banner routs
router.post(
  "/homesetting",
  upload.fields([{ name: "banner_image", maxCount: 1 }]),
  cmscontroller.createItem
);

router.get("/homesetting", cmscontroller.getAllItems);
router.get("/homesetting/:id", cmscontroller.getItemById);
router.put(
  "/homesetting/:id",  
  upload.fields([{ name: "banner_image", maxCount: 1 }]),
  cmscontroller.updateItem
);
router.delete("/homesetting/:id", cmscontroller.deleteItem);
// Home Features Settings routs


router.post('/createfeatures', upload.fields([{ name: 'image', maxCount: 1 }]), cmscontroller.createFeatures);
router.get("/createfeatures", cmscontroller.getAllhomeFeatures);
router.delete("/createfeatures/:id", cmscontroller.deletehomeFeatures);
router.get('/createfeatures/:id', cmscontroller.gethomeFeaturesById);
router.put('/createfeatures/:id', upload.fields([{ name: 'image', maxCount: 1 }]), cmscontroller.updatehomeFeatures);

// genereal setting

router.post('/generalsettings', upload.single('company_logo'), cmscontroller.createGeneralSetting);
router.get('/generalsettings', cmscontroller.getGeneralSettings);
router.put('/generalsettings/:id', upload.single('company_logo'), cmscontroller.updateGeneralSetting);
router.get('/generalsettings/:id', cmscontroller.getGeneralSettingById);
router.delete('/generalsettings/:id', cmscontroller.deleteGeneralSetting);
// Create category for fetures
router.post('/Featurecategory', cmscontroller.createFeatureCategory);
router.get('/Featurecategory', cmscontroller.getAllFeatureCategories);
router.get('/Featurecategory/:category_id', cmscontroller.getFeatureCategoryById);
router.put('/Featurecategory/:category_id', cmscontroller.updateFeatureCategory);
router.delete('/Featurecategory/:category_id', cmscontroller.deleteFeatureCategory);
 
 // features
router.post('/feature', upload.single('image'), cmscontroller.createFeature);
router.get('/feature', cmscontroller.getAllFeatures);
router.get('/feature/:id', cmscontroller.getFeatureById);
router.put('/feature/:id',upload.single('image'),  cmscontroller.updateFeature);
router.delete('/feature/:id', cmscontroller.deleteFeature);

// privey policy
router.post('/privacypolicy', cmscontroller.createPrivacyPolicy);
router.get('/privacypolicy', cmscontroller.getPrivacyPolicies);
router.get('/privacypolicy/:id', cmscontroller.getPrivacyPolicyById);
router.put('/privacypolicy/:id', cmscontroller.updatePrivacyPolicy);
router.delete('/privacypolicy/:id', cmscontroller.deletePrivacyPolicy);

module.exports = router;
