const express = require("express");
const router = express.Router();

const printController = require("../controllers/printKOT");
const auth = require("../middleware/authicantejwt");

router.post("/printkitchenkot/:kitchenId", auth, printController.printOrderToKitchens);
router.get("/printkitchen/:kitchenId", auth, printController.getPendingKOT);
router.post("/printkitchen/markprinted", auth, printController.markKOTPrinted);
router.get("/printkitchen/printer/:kitchenId", auth, printController.getPrinterByKitchen);
router.get("/list/kot-list", auth, printController.getKitchenKotList);
router.get("/kitchenlist/kot", auth, printController.getKitchenList);
router.get("/list/kot-history", auth, printController.getKitchenKotHistory);
router.post("/printkitchen/order/accept", auth, printController.acceptKitchenOrder);
router.post("/printkitchen/order/reject", auth, printController.rejectKitchenOrder);
router.post("/printkitchen/order/complete", auth, printController.completeKitchenOrder);

module.exports = router;
