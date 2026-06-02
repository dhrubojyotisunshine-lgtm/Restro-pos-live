const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/roleandpremission");
const auth=require("../middleware/authicantejwt")


router.get("/getalluseraccesses",auth,rolesController.getAllUserAccesses)
router.get("/allroles",auth,rolesController.getAllRoles)
router.delete('/roles/:role_id', rolesController.deleteRolePermission );
router.get('/menuitems', rolesController.getAllMenuItems)
router.delete('/useraccess/:role_acc_id', rolesController.deleteUserAccess);
router.post('/useraccess',auth, rolesController.createUserAccess);

router.put('/useraccess/:id', rolesController.updateUserAccess);
router.get('/useraccesss/:id', rolesController.editAccessRole);
router.get('/rolepermission/:role_id',rolesController.getRolePermissionById);
router.post('/rolepermission',auth,rolesController.createRolePermission);

router.put('/rolepermission/:role_id', rolesController.updateRolePermission)
module.exports=router