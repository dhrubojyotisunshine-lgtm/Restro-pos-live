const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const addOnController = require("../controllers/addOns");

router.get("/addons", auth,addOnController.getAddOns);
router.get("/getActiveAddOns",auth,addOnController.getActiveAddOns);
router.get("/addonbyid/:id", auth, addOnController.getAddOnsById);
router.post("/addons/import", auth, addOnController.importAddOns);
// POST request to create a new add-on
router.post("/addons", auth,addOnController.createAddOn);
router.post("/createAddOnWithAssign", auth, addOnController.createAddOnWithAssign);
router.put("/addons/:add_on_Id", auth, addOnController.updateAddOn);
router.delete("/addons/:id", auth, addOnController.deleteAddOn);

// Electron app sync (no auth)
router.post("/sync/addons", addOnController.syncAddons);

module.exports = router;
