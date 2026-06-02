const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
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

router.post(
  "/createcompany",
  upload.single("invoice_logo"),
  CompanyController.createCompany
);
router.get("/getcompany", CompanyController.getCompany);
router.delete("/deletecompany/:id", CompanyController.deleteCompany);
router.get("/getcompanyby/:id", CompanyController.getCompanyById);
router.put("/updatecompany/:id",  upload.single("invoice_logo"), CompanyController.updatecompany);
//deactivate company route
router.put("/deactive/:id",  CompanyController.deactivateCompany);
router.put("/active/:id",  CompanyController.activateCompany);
router.get("/countries1",  CompanyController.getCountries);
router.get('/states1/:countryId', CompanyController.getStatesByCountry);
router.get('/cities1/:stateId', CompanyController.getCitiesByState);
 router.post('/addsubscription', CompanyController.addUserSubscriptionAdmin);
 //done admin side
  router.get('/runningpackage/:email', CompanyController.getUserSubscriptions)
  router.get('/getpackage/:id', CompanyController.getManagedetail)
  router.get('/view/:id', CompanyController.adminViewapi)
  
  //currencyapi and timezone api
  router.get('/packagelist', CompanyController.getAdminPackages1)
  router.get('/symbol', CompanyController.getCurrencySymbols);
router.get('/timezone', CompanyController.getTimezonesall);
module.exports = router;
