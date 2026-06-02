const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportsController");
const auth=require("../middleware/authicantejwt")
router.get("/tablebysale", auth,reportController.getTableBySale);

router.get('/salesbyreport', auth,reportController.salesReport);
router.get("/watersalereport",auth,reportController.getWaiterTotalAmount)
router.get("/servicechargereport",auth,reportController.serviceChargeReport)
router.get("/commission",auth,reportController.showDataCommsion)
router.get("/casherreport",auth,reportController.orderCasherReport)

router.get("/salereportfilter",auth,reportController.salesReportFiltering)
router.get("/salebydate",auth,reportController.salesByDate)
router.get("/itemsalereport",auth,reportController.itemSalesReport)
router.get("/registerreport",auth,reportController.getCashRegister)
router.get("/registeruser",reportController.getCashUser)
router.get("/registerview",reportController.getCashRegisterView)
router.get("/purchasereport",auth,reportController.purchaseReport )
router.get("/cashregisters/:id",reportController.getCashRegisterView);
router.get('/foodstockreport', auth,reportController.productwise);
router.get('/foodstockkitchen', auth,reportController.ingredientReport);
router.get('/deliveryreport',auth, reportController.orderDelivery);
module.exports = router;