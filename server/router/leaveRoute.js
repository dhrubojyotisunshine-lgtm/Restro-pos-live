const express = require("express");

const router = express.Router();
const auth=require("../middleware/authicantejwt")
const leaveController = require("../controllers/leaveController");
 router.get("/allholidays",auth,leaveController.getHolidays)
 router.post("/addholiday",auth,leaveController.createHoliday)
 router.delete("/deleteholiday/:id",leaveController.deleteHoliday);
  router.get("/holiday/:id",leaveController.getHolidayById);
  router.put("/updateholiday/:id", auth,leaveController.updateHoliday);
  // leave type


  router.post('/leavetype',auth, leaveController.createLeaveType);

router.get('/leavetype', auth,leaveController.getLeaveTypes);

router.put('/leavetype/:id', leaveController.updateLeaveType);

router.delete('/leavetype/:id', leaveController.deleteLeaveType);

router.get('/leavetype/:id', leaveController.getLeaveTypeById);
// leave aapplication


router.post('/leaveapply',auth, leaveController.createLeaveApply);
router.get('/leaveapply', auth,leaveController.getLeaveApplies);
router.put('/leaveapply/:id', leaveController.updateLeaveApply);
router.delete('/leaveapply/:id', leaveController.deleteLeaveApply);
router.get('/leaveapply/:id', leaveController.getLeaveApplyById);
module.exports = router;