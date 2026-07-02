const express= require ("express")
const router = express.Router();

const splitcontroller= require("../controllers/splitOrder");
const auth = require("../middleware/authicantejwt");

router.get ("/splitorderdata/:id", auth, splitcontroller.showsplitorder)
// merger order route api paynment
router.post("/mergepayment", auth, splitcontroller.mergeMakePayment);


router.post('/paysplit', auth, splitcontroller.paymentSplitOrder)



module.exports=router