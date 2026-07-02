const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/authicantejwt");
const CompanyController = require("../controllers/addCompanyController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/category");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post("/createcompany", auth, upload.single("invoice_logo"), CompanyController.createCompany);
router.get("/getcompany", auth, CompanyController.getCompany);
router.delete("/deletecompany/:id", auth, CompanyController.deleteCompany);
router.get("/getcompanyby/:id", auth, CompanyController.getCompanyById);
router.put("/updatecompany/:id", auth, upload.single("invoice_logo"), CompanyController.updatecompany);
router.put("/deactive/:id", auth, CompanyController.deactivateCompany);
router.put("/active/:id", auth, CompanyController.activateCompany);
// Geographic reference data — intentionally public
router.get("/countries1", CompanyController.getCountries);
router.get("/states1/:countryId", CompanyController.getStatesByCountry);
router.get("/cities1/:stateId", CompanyController.getCitiesByState);
router.post("/addsubscription", auth, CompanyController.addUserSubscriptionAdmin);
router.get("/runningpackage/:email", auth, CompanyController.getUserSubscriptions);
router.get("/getpackage/:id", auth, CompanyController.getManagedetail);
router.get("/view/:id", auth, CompanyController.adminViewapi);
router.get("/admin-subscription-key", auth, CompanyController.getAdminSubscriptionKey);
// Package list — public so users can select packages during registration
router.get("/packagelist", CompanyController.getAdminPackages1);
// Reference data — intentionally public
router.get("/symbol", CompanyController.getCurrencySymbols);
router.get("/timezone", CompanyController.getTimezonesall);
module.exports = router;
