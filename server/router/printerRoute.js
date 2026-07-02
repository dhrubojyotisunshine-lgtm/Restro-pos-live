const express = require("express");
const router = express.Router();
const auth = require("../middleware/authicantejwt");
const printController = require("../controllers/addPrinter");

router.post("/addprinter", auth, printController.createPrinter);
router.get("/getprinter", auth, printController.getPrinters);
router.get("/printer/:id", auth, printController.getPrinterById);
router.put("/printer/:id", auth, printController.updatePrinter);
router.delete("/printer/:id", auth, printController.deletePrinter);
module.exports = router;
