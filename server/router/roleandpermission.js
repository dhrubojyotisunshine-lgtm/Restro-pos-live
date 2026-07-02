const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/roleandpremission");
const auth=require("../middleware/authicantejwt")


router.get("/getalluseraccesses",auth,rolesController.getAllUserAccesses)
router.get("/allroles",auth,rolesController.getAllRoles)
router.delete('/roles/:role_id', auth, rolesController.deleteRolePermission );
router.get('/menuitems', auth, rolesController.getAllMenuItems)
router.delete('/useraccess/:role_acc_id', auth, rolesController.deleteUserAccess);
router.post('/useraccess',auth, rolesController.createUserAccess);

router.put('/useraccess/:id', auth, rolesController.updateUserAccess);
router.get('/useraccesss/:id', auth, rolesController.editAccessRole);
router.get('/rolepermission/:role_id', auth, rolesController.getRolePermissionById);
router.post('/rolepermission',auth,rolesController.createRolePermission);

router.put('/rolepermission/:role_id', auth, rolesController.updateRolePermission)
module.exports=router
