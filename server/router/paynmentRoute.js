const express = require("express");

const router = express.Router();
const paynmentController = require("../controllers/paynmentController");
const auth = require("../middleware/authicantejwt");

router.get("/paynmenttype", auth, paynmentController.getPaymentMethods);
router.post("/makePayment/:order_id", auth, paynmentController.makePayment);
module.exports = router;
