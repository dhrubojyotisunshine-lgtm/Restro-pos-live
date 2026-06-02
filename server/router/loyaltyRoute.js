const express = require("express");

const router = express.Router();

const pointcontroller= require("../controllers/loyalty");
const auth=require("../middleware/authicantejwt")

router.post("/loyaltypoint",auth,pointcontroller.createLoyaltyPoint);

// Get all loyalty point settings or search by amount/earn_point
router.get("/loyaltypoints",auth,pointcontroller.getLoyaltyPoints);
router.delete("/loyaltypoint/:id", pointcontroller.deleteLoyaltyPoint);
router.put("/loyaltypoint/:id",auth, pointcontroller.updateLoyaltyPoint);
router.get("/loyaltypoint/:id", pointcontroller.getLoyaltyPointById)
// for the show customer point list
router.get("/customerpoints",auth, pointcontroller.getCustomerBillDetails);
// for merger order
router.post("/duemerge", pointcontroller.dueMergePayment);

router.get("/duemergeorder",auth,pointcontroller.getOngoingOrderDueMerge);


router.get("/invoice/:orderid", pointcontroller.getOrderByIdsDUeMerge);

router.post("/cancelAllOrder/:order_id", pointcontroller.cancelAllTypeOrder);
// for split bill
// router.post('/postsplit',pointcontroller.postsplitorder)
module.exports=router;