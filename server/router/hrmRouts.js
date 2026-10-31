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
router.post("/employees/import", auth, hrmcontroller.importEmployees);
router.get("/designation", auth,hrmcontroller.getAllPositions);
router.get("/designation/:id", auth, hrmcontroller.getPositionById );
router.put("/designation/:id", auth, hrmcontroller.updatePosition );
router.delete("/designation/:id", auth, hrmcontroller.deletePosition)
router.post("/createdesignation", auth,hrmcontroller.createDesignation);
// get all devision

router.get("/dutytype", auth, hrmcontroller.getALlDutyTypes);
router.get("/frequencytype", auth, hrmcontroller.getAllFrequencyType);
router.get("/ratetype", auth, hrmcontroller.getAllRateTypes);
router.get("/mstatus", auth, hrmcontroller.maritalSaatus);
router.get("/gender", auth, hrmcontroller.getGender);
// delete employee
router.delete("/deleteemployee/:id", auth, hrmcontroller.deleteEmployee);
router.post(
  "/createemployee",
  upload.single("picture"),auth,
  hrmcontroller.createEmployeeHistory
);
//get by id
router.get("/getemployeebyid/:id", auth, hrmcontroller.getemployeeBYID)

router.put('/updateemployee/:id',upload.single('picture'), auth, hrmcontroller.updateEmployeeHistory);
// Department
router.put("/department/:id", auth, hrmcontroller.updateDepartment);
router.get("/department/:id", auth, hrmcontroller.getDepartmentById);
router.get("/department",auth,hrmcontroller.getDepartments)
router.post("/adddepartment",auth,hrmcontroller.addDepartment)
router.delete("/deletedepartment/:id", auth, hrmcontroller.deleteDepartment);

// division
router.get("/division", auth,hrmcontroller.getAllDivision);
router.get("/dipartmentlist",auth,hrmcontroller.departmentDropdown)
router.get("/getdivisionbyid/:id", auth, hrmcontroller.getALldivisionbyId)
router.post("/createdivision",auth,hrmcontroller.createDivison)
router.delete("/deletedivision/:id", auth, hrmcontroller.deleteDivison);
router.put("/updatedivision/:id", auth, hrmcontroller.updateDivison);
module.exports = router;
