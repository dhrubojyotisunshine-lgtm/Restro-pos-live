const express = require("express");
const router = express.Router();

const testController = require("../controllers/testPrintController");

router.get("/test-print", testController.testPrintAPI);

router.get("/printkitchen/kot-list", testController.testPrintKitchenAPI);

module.exports = router;
