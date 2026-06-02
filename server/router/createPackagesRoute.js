const express = require("express");
const router = express.Router();
const Packagescontroller = require("../controllers/createPackage");
const multer = require("multer");
const path = require("path");

router.post('/createpackages', Packagescontroller.createPlan);
router.get('/getallpackages', Packagescontroller.getAllPlans);
router.put("/addsupcription/:id", Packagescontroller.updatePlan);
router.get("/getpackages/:id", Packagescontroller.getPlanById);
router.delete("/deletepackages/:id", Packagescontroller.deletePlan);
// get all subscriprion with aproval or active
router.get("/getallpackageswithaproval", Packagescontroller.getAllSubscriptions);
router.get('/addcompanysubcription/:id', Packagescontroller.getSubscriptionsStatusById);
router.put('/addcompanysubcription/:id', Packagescontroller.updateSubscriptionStatus);
router.put('/updatesbuscriptiondate/:id', Packagescontroller.editSubscriptiondate);
 
module.exports=router;