const express = require("express");
const router = express.Router();
const customerController = require("../controllers/addCustomer");
const auth = require("../middleware/authicantejwt");

router.post("/customer", auth, customerController.createCustomer);
router.get("/customer", auth, customerController.getCustomers);
router.get("/customer/:customer_id", auth, customerController.getCustomerById);
router.put("/customer/:customer_id", auth, customerController.updateCustomer);
router.delete("/customer/:customer_id", auth, customerController.deleteCustomer);

module.exports = router;
