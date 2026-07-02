const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const ComissionController = require("../controllers/CommissionSettings");

router.get('/getcomissiondata', auth,ComissionController.getAllCommissionSettings);
router.post('/postcommission',auth,ComissionController.createCommissionSetting);
router.delete('/deletecomission/:id', auth, ComissionController.deleteCommissionSetting);
router.get('/comissionbyid/:id', auth, ComissionController.getCommissionSettingById);
router.put('/updatecomission/:id', auth, ComissionController.updateCommissionSetting);
router.post('/userposition',auth, ComissionController.createUserPosition);
router.get('/userposition', auth, ComissionController.getAllUserPositions);
router.get('/userposition/:id', auth, ComissionController.getUserPositionById);
router.put('/updatepositioncommision/:id', auth, ComissionController.updateUserPosition);
router.delete('/deleteuserposition/:id', auth, ComissionController.deleteUserPosition);
module.exports=router