const express = require("express");
const router = express.Router();
const UnitMasurmentController = require("../controllers/addUnitMasurment");
const auth = require("../middleware/authicantejwt");

router.post("/addmasurmentunit", auth, UnitMasurmentController.createUnitMeasurement);
router.get("/getmasurmentunit", auth, UnitMasurmentController.getUnitMeasurements);
router.delete("/deletemasurmentunit/:id", auth, UnitMasurmentController.deleteUnitMeasurement);
router.get("/units/:id", auth, UnitMasurmentController.getUnitMeasurementById);
router.put("/updatemasurmentunit/:id", auth, UnitMasurmentController.updateUnitMeasurement);

module.exports = router;
