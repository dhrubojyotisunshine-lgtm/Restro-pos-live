const express = require("express");
const router = express.Router();
const auth = require("../middleware/authicantejwt");

const shippingControllers = require("../controllers/shippingType");

router.get("/shippingtype", auth, shippingControllers.getAllShippingMethods);
router.post("/shippingtype", auth, shippingControllers.createShippingMethod);
router.get("/shippingmethod/:id", auth, shippingControllers.getShippingMethodById);
router.delete("/shippingmethod/:id", auth, shippingControllers.deleteShippingMethod);
router.put("/shippingmethod/:id", auth, shippingControllers.updateShippingMethod);
module.exports = router;
