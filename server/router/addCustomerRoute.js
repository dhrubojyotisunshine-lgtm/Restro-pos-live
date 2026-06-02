const express = require("express");
const router = express.Router();
const customerController = require("../controllers/addCustomer");
const auth=require("../middleware/authicantejwt")
router.post("/customer", auth,customerController.createCustomer);
router.get("/customer", auth,customerController.getCustomers);
router.get('/customer/:customer_id', customerController.getCustomerById);
router.put('/customer/:customer_id', customerController.updateCustomer);
router.delete('/customer/:customer_id', customerController.deleteCustomer)

module.exports = router;
