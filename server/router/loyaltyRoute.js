const express = require("express");

const router = express.Router();

const pointcontroller= require("../controllers/loyalty");
const auth=require("../middleware/authicantejwt")

router.post("/loyaltypoint",auth,pointcontroller.createLoyaltyPoint);

// Get all loyalty point settings or search by amount/earn_point
router.get("/loyaltypoints",auth,pointcontroller.getLoyaltyPoints);
router.delete("/loyaltypoint/:id", auth, pointcontroller.deleteLoyaltyPoint);
router.put("/loyaltypoint/:id",auth, pointcontroller.updateLoyaltyPoint);
router.get("/loyaltypoint/:id", auth, pointcontroller.getLoyaltyPointById)
// for the show customer point list
router.get("/customerpoints",auth, pointcontroller.getCustomerBillDetails);
// for merger order
router.post("/duemerge", auth, pointcontroller.dueMergePayment);

router.get("/duemergeorder",auth,pointcontroller.getOngoingOrderDueMerge);


router.get("/invoice/:orderid", auth, pointcontroller.getOrderByIdsDUeMerge);

router.post("/cancelAllOrder/:order_id", auth, pointcontroller.cancelAllTypeOrder);
module.exports=router;
