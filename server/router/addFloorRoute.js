const express = require("express");

const router = express.Router();
const auth = require("../middleware/authicantejwt");
const addfloorController = require("../controllers/addFloor");

router.post("/sync/floors", addfloorController.syncFloors);
router.post("/addfloor", auth, addfloorController.createFloor);
router.get("/getfloor", auth, addfloorController.getFloors);
router.delete("/deletefloors/:floorID", addfloorController.deleteFloor);
router.get("/floors/:id", addfloorController.getFloorById);
router.put("/floors/:id", addfloorController.updateFloor);
module.exports = router;
