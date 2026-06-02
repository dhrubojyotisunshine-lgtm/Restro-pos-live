const express = require("express");
const router = express.Router();
const auth=require("../middleware/authicantejwt")
const printController = require("../controllers/addPrinter");


router.post("/addprinter",auth,printController.createPrinter);
router.get("/getprinter",auth, printController.getPrinters);
router.get('/printer/:id', printController.getPrinterById);
router.put('/printer/:id', printController.updatePrinter);
router.delete('/printer/:id', printController.deletePrinter);
module.exports = router;
