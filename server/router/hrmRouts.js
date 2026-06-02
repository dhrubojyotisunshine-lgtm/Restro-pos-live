const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
 const auth=require("../middleware/authicantejwt")
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "asset/user");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1024 * 1024 * 5 },
});

const hrmcontroller = require("../controllers/hrmController");
router.get("/employedata", auth,hrmcontroller.getAllEmployeeHistories);
router.get("/designation", auth,hrmcontroller.getAllPositions);
router.get("/designation/:id", hrmcontroller.getPositionById );
router.put("/designation/:id", hrmcontroller.updatePosition );
router.delete("/designation/:id",hrmcontroller.deletePosition)
router.post("/createdesignation", auth,hrmcontroller.createDesignation);
// get all devision

router.get("/dutytype", hrmcontroller.getALlDutyTypes);
router.get("/frequencytype", hrmcontroller.getAllFrequencyType);
router.get("/ratetype", hrmcontroller.getAllRateTypes);
router.get("/mstatus", hrmcontroller.maritalSaatus);
router.get("/gender", hrmcontroller.getGender);
// delete employee
router.delete("/deleteemployee/:id", hrmcontroller.deleteEmployee);
router.post(
  "/createemployee",
  upload.single("picture"),auth,
  hrmcontroller.createEmployeeHistory
);
//get by id 
router.get("/getemployeebyid/:id",hrmcontroller.getemployeeBYID)

router.put('/updateemployee/:id',upload.single('picture'), hrmcontroller.updateEmployeeHistory);
// Department
router.put("/department/:id", hrmcontroller.updateDepartment);
router.get("/department/:id",hrmcontroller.getDepartmentById);
router.get("/department",auth,hrmcontroller.getDepartments)
router.post("/adddepartment",auth,hrmcontroller.addDepartment)
router.delete("/deletedepartment/:id",hrmcontroller.deleteDepartment);

// division
router.get("/division", auth,hrmcontroller.getAllDivision);
router.get("/dipartmentlist",auth,hrmcontroller.departmentDropdown)
router.get("/getdivisionbyid/:id",hrmcontroller.getALldivisionbyId)
router.post("/createdivision",auth,hrmcontroller.createDivison)
router.delete("/deletedivision/:id",hrmcontroller.deleteDivison);
router.put("/updatedivision/:id", hrmcontroller.updateDivison);
module.exports = router;
