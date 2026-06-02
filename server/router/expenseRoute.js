const express = require("express");
const router = express.Router();
const auth=require("../middleware/authicantejwt")
const expensecontroller = require("../controllers/expenseController");

router.get("/expense",auth,expensecontroller.getExpenseIten);
router.post("/expense",auth,expensecontroller.postExpenseIten);
router.delete("/expense/:id",expensecontroller.deleteExpenseItem);
router.get("/expense/:id",expensecontroller.getExpenseItemById);
router.put("/expense/:id",expensecontroller.updateExpenseItem);

// expense page
router.get("/expensepage",auth,expensecontroller.getExpenses)
router.post("/expensepage",auth,expensecontroller.createExpense)
router.delete("/expensepage/:id",expensecontroller.deleteExpense)

module.exports= router;