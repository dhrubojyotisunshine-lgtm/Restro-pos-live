const express = require("express");
const router = express.Router();
const posController = require("../controllers/posController");
const auth = require("../middleware/authicantejwt");

router.get("/getCategoryList", auth, posController.getCategoryList);
// router.get("/products/:categoryId?", posController.getProductsByCategory);
router.get("/products/:parentid?", auth, posController.getProductsByCategory);
//place oreder
router.post("/orderplace", auth, posController.orderPlace);
router.get("/getTodayOrders", auth, posController.getTodayOrders);
router.get("/getWaiter", auth, posController.getWaiter);
router.get("/qrorders", auth, posController.getQROrders);
router.get("/getAllOrderList", auth, posController.allOrderList);
router.get("/getOrderById/:order_id", auth, posController.getOrderById);
router.get("/getOngoingOrder", auth, posController.getOngoingOrder);
router.get("/cancelorderdata", auth, posController.cancelOrdersList);
router.post("/cancelOrder/:order_id", auth, posController.cancelorder);
router.get("/getCompleteOrders", auth, posController.completeOrders);
router.get("/filterdata", auth, posController.OrderListBySearchFilter);
router.get("/pendingorder", auth, posController.pendingOrders);
router.get("/qrorderdata", auth, posController.getQrorderdata);
router.get("/qr-orders", auth, posController.getAllQrOrders);
// router.get('/qrfilterdata/:categoryId?', posController.getQRByCategory);
router.get("/onlineOrders", auth, posController.getOnlineOrders);
router.post("/qrorderplace", posController.Placeqrorder);
router.get("/getQrOrderById/:id", auth, posController.getQrOrderById);
router.get("/getQrOrderDetailsById/:id", auth, posController.getQrOrderDetailsById);
router.put("/updateqrorder/:id", auth, posController.Updateqrorder);

module.exports = router;
