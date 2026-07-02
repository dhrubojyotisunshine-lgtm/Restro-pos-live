const express = require("express");
const router = express.Router();
const auth = require("../middleware/authicantejwt");
const expensecontroller = require("../controllers/expenseController");

router.get("/expense", auth, expensecontroller.getExpenseIten);
router.post("/expense", auth, expensecontroller.postExpenseIten);
router.delete("/expense/:id", auth, expensecontroller.deleteExpenseItem);
router.get("/expense/:id", auth, expensecontroller.getExpenseItemById);
router.put("/expense/:id", auth, expensecontroller.updateExpenseItem);

router.get("/expensepage", auth, expensecontroller.getExpenses);
router.post("/expensepage", auth, expensecontroller.createExpense);
router.delete("/expensepage/:id", auth, expensecontroller.deleteExpense);

module.exports = router;
