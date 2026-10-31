const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authicantejwt");
const {
  getAdmins,
  getModulesForAdmin,
  saveModulesForAdmin,
  getEnabledModulesForAdmin,
  getMyEnabledModules,
  getSubFeaturePermissions,
  saveSubFeaturePermissions,
  getMySubFeaturePermissions,
} = require("../controllers/moduleAllocationController");

// Specific routes MUST come before wildcard /:adminId
router.get("/module-allocation/admins",                  verifyToken, getAdmins);
router.get("/module-allocation/my-modules",              verifyToken, getMyEnabledModules);
router.get("/module-allocation/my-sub-features",         verifyToken, getMySubFeaturePermissions);
router.get("/module-allocation/enabled/:adminId",        verifyToken, getEnabledModulesForAdmin);
router.get("/module-allocation/sub-features/:adminId",   verifyToken, getSubFeaturePermissions);
router.post("/module-allocation/sub-features/:adminId",  verifyToken, saveSubFeaturePermissions);

// Wildcard routes last
router.get("/module-allocation/:adminId",          verifyToken, getModulesForAdmin);
router.post("/module-allocation/:adminId",         verifyToken, saveModulesForAdmin);

module.exports = router;
