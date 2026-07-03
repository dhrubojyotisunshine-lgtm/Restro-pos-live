const express = require("express");
const auth=require("../middleware/authicantejwt")
const router = express.Router();
const recipecontroller= require("../controllers/recipemanagement")
router.get("/productionsetlist",auth,recipecontroller.getalldetailsProductiondetails)
router.get("/variantdata", auth, recipecontroller.foodWithVariant);
router.get('/foodname', auth,recipecontroller.foodNameFetchApi);
router.post('/productiondata',auth, recipecontroller.createProduction);
//Supplier Ledger get route

router.get("/supplierledger", auth, recipecontroller.getPurchaseTransactions)

// Set production Unit
router.get("/productionunitingredients", auth,recipecontroller.getAllStockIngredients);
router.get("/productionunitingredientss",auth,recipecontroller.getAllStockIngredientswithone);
router.get('/priceperitem/:id', auth, recipecontroller.getPerItemPrice)
router.delete('/productiondetail/:foodid/:pvarientid', auth, recipecontroller.deleteProductionData)
router.post('/productiondetail',auth,recipecontroller.createproduction);
// get details by id for edit
router.get('/productiondetail/:foodid/:pvarientid', auth, recipecontroller.findbyIdProductiondetails);
router.get('/viewproductiondetail/:foodid/:pvarientid', auth, recipecontroller.viewProductiondetails);
router.put('/productiondetail/:foodnameid/:pvarientnameid',auth,recipecontroller.updateProductionDetail)

// to show data in below
router.get('/productiondetails',auth,recipecontroller.getProductionDetails)

// Electron app sync
router.post('/sync/production', recipecontroller.syncProduction);

module.exports = router;
