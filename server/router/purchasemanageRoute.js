const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseManage");
const path = require("path");
const auth=require("../middleware/authicantejwt")
//add purchase
router.post("/addPurchaseItem", auth,purchaseController.createPurchaseItem);
router.get('/purchaseitem',auth,purchaseController.getPurchaseItemDetails);
router.get('/getupdate/:id', auth, purchaseController.getPurchaseItemById);
router.put('/updatedata/:purchaseid', auth, purchaseController.updatePurchaseItem);
// router.put('/update/:purchaseid',purchaseController.updatePurchaseItem)
router.post('/purchase/:purchaseid/payment', auth, purchaseController.addPurchasePayment);
router.get('/purchase/:purchaseid/history', auth, purchaseController.getPurchaseHistory);
//PURCHASE RETURN
router.get('/purchasereturns', auth,purchaseController.getReturnpurchase);
router.get('/purchasereturns/:id', auth, purchaseController.getReturnItemInfoByID);
//PURCHASE RETURN ACCOURDING TO THAT SUPPLIER AND INVOICE
router.get('/purchasereturnsearch', auth, purchaseController.fetchInvoiceIdThroughSupplier);
// post return
router.post('/returnitem',auth,purchaseController.purReturnInsert)
router.get('/purchasereturn', auth, purchaseController.invoiceBySupplier);

// get all suppliers
router.get('/suppliers',auth,purchaseController.getAllSuppliers);
router.post('/suppliers',auth,purchaseController.createSupplier);
router.delete('/suppliers/:id', auth, purchaseController.deleteSupplier)
router.get('/suppliers/:id', auth, purchaseController.getSupplierById)
router.put('/suppliers/:id', auth, purchaseController.updateSupplier);

// Electron app sync
router.post('/sync/purchaseitem', purchaseController.syncPurchaseItems);

// get out of stock
router.get('/stock', auth,purchaseController.stockOutIngredients);
// get getIngredientby stock quantity

router.get("/getIngredient",auth,purchaseController.getAllStockIngredients)
// get supplier ledger data
router.get('/supplierledger', auth, purchaseController.getPurchaseTransactions);
module.exports = router;
