const express = require("express");

const router = express.Router();
const auth = require("../middleware/authicantejwt");
const leaveController = require("../controllers/leaveController");

router.get("/allholidays", auth, leaveController.getHolidays);
router.post("/addholiday", auth, leaveController.createHoliday);
router.delete("/deleteholiday/:id", auth, leaveController.deleteHoliday);
router.get("/holiday/:id", auth, leaveController.getHolidayById);
router.put("/updateholiday/:id", auth, leaveController.updateHoliday);

router.post("/leavetype", auth, leaveController.createLeaveType);
router.get("/leavetype", auth, leaveController.getLeaveTypes);
router.put("/leavetype/:id", auth, leaveController.updateLeaveType);
router.delete("/leavetype/:id", auth, leaveController.deleteLeaveType);
router.get("/leavetype/:id", auth, leaveController.getLeaveTypeById);

router.post("/leaveapply", auth, leaveController.createLeaveApply);
router.get("/leaveapply", auth, leaveController.getLeaveApplies);
router.put("/leaveapply/:id", auth, leaveController.updateLeaveApply);
router.delete("/leaveapply/:id", auth, leaveController.deleteLeaveApply);
router.get("/leaveapply/:id", auth, leaveController.getLeaveApplyById);

module.exports = router;
