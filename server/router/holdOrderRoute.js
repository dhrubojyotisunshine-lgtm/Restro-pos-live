const express = require("express");
const router = express.Router();
const holdController = require("../controllers/holdOrders");
const auth=require("../middleware/authicantejwt")


router.get("/getdraft",auth,holdController.draftgetOrders)
router.post("/holdorder",auth,holdController.draftOrderPlace)
router.get("/draft/:id",holdController.draftgetOrderById)
router.put("/draft/:id",auth,holdController.updateOrder)

module.exports = router;
