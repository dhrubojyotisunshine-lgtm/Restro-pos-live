const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const KitchenController = require("../controllers/addKitchen");

router.post("/addkitchen",auth, KitchenController.addKitchen);
router.get("/getkitchen",auth, KitchenController.getKitchen);
router.delete("/deletekitchen/:id", KitchenController.deleteKitchenById);
router.put("/update/:id", KitchenController.updateKitchenByKitchenId);
router.get('/kitchen/:id',KitchenController.getKitchenById);
module.exports = router;
