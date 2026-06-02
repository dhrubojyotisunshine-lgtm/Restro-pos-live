const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const addOnController = require("../controllers/addOns");

router.get("/addons", auth,addOnController.getAddOns);
router.get("/getActiveAddOns",auth,addOnController.getActiveAddOns);
router.get("/addonbyid/:id",addOnController.getAddOnsById)
// POST request to create a new add-on
router.post("/addons", auth,addOnController.createAddOn);
router.post("/createAddOnWithAssign", addOnController.createAddOnWithAssign);
router.put("/addons/:add_on_Id", addOnController.updateAddOn);
router.delete("/addons/:id", addOnController.deleteAddOn);

module.exports = router;
