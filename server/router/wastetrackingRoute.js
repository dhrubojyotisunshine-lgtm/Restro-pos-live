const express = require("express");
const auth=require("../middleware/authicantejwt")
const router = express.Router();
const wastetrackingcontroller=require("../controllers/wastetracking")

router.get('/packagingwaste',auth, wastetrackingcontroller.getPackagingWasteDetails);
router.post('/packagepost',auth, wastetrackingcontroller.insertPackageInformation);

// Purchase food Waste
router.get('/foodwaste',auth, wastetrackingcontroller.getPackageFoodWasteDetails);
// price accourding to incrident
router.get('/lprice/:id', auth, wastetrackingcontroller.getTotalPrice);
router.post('/foodwaste', auth,wastetrackingcontroller.insertingRdInformation);

// making food waste
router.get('/makefoods',auth,wastetrackingcontroller.showItemsFoodWaste)
// get price accourding food name and variant
router.get('/getlostprice', auth, wastetrackingcontroller.getalldetailsProductiondetails);
// post 
router.post('/makeingfoodwaste',auth,wastetrackingcontroller.insertFoodInformation);

module.exports= router