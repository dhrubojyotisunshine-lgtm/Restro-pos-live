const express = require("express");
const router = express.Router();

const printController = require("../controllers/printKOT");

router.get("/printkitchen/:kitchenId", printController.getPendingKOT);
router.post("/printkitchen/markprinted", printController.markKOTPrinted);
router.get(
  "/printkitchen/printer/:kitchenId",
  printController.getPrinterByKitchen,
);
router.get("/list/kot-list", printController.getKitchenKotList);
router.get("/kitchenlist/kot", printController.getKitchenList);
router.get("/list/kot-history", printController.getKitchenKotHistory);
router.post("/printkitchen/order/accept", printController.acceptKitchenOrder);
router.post("/printkitchen/order/reject", printController.rejectKitchenOrder);
router.post(
  "/printkitchen/order/complete",
  printController.completeKitchenOrder,
);

module.exports = router;
