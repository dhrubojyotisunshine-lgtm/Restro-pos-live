const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth =require("../middleware/authicantejwt")
const cashregisterController = require("../controllers/cashRegister");

router.post("/cashregister",auth,cashregisterController.addCashRegisterDetail);
router.get("/closeregister/:id", auth, cashregisterController.getCashRegisterDetail);
router.put('/cashregisters/:id', auth, cashregisterController.putCashRegisterDetail);
// recent transaction
router.get("/transaction",auth,cashregisterController.recenttransaction);



module.exports=router