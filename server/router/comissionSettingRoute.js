const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const ComissionController = require("../controllers/CommissionSettings");

router.get('/getcomissiondata', auth,ComissionController.getAllCommissionSettings);
router.post('/postcommission',auth,ComissionController.createCommissionSetting);
router.delete('/deletecomission/:id', ComissionController.deleteCommissionSetting);
router.get('/comissionbyid/:id', ComissionController.getCommissionSettingById);
router.put('/updatecomission/:id', ComissionController.updateCommissionSetting);
router.post('/userposition',auth, ComissionController.createUserPosition);
router.get('/userposition', auth, ComissionController.getAllUserPositions);
router.get('/userposition/:id',  ComissionController.getUserPositionById);
router.put('/updatepositioncommision/:id',ComissionController.updateUserPosition);
router.delete('/deleteuserposition/:id', ComissionController.deleteUserPosition);
module.exports=router