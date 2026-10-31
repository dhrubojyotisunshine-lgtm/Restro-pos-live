const express = require("express");
const router = express.Router();
const auth=require("../middleware/authicantejwt")
const ingredientsController = require("../controllers/ingredientController");

router.post("/ingredients/import", auth, ingredientsController.importIngredients);
// Create a new ingredient
router.post("/ingredients", auth,ingredientsController.createIngredient);
// router.put("/ingredients/:id", ingredientsController.updateIngredient);

// Delete an existing ingredient
router.delete("/ingredients/:id", auth, ingredientsController.deleteIngredient);

// Get all ingredients
router.get("/ingredients",auth,ingredientsController.getAllIngredients);
router.get('/ingredients/:id', auth, ingredientsController.getIngredientById);
router.put('/ingredients/:id', auth, ingredientsController.updateIngredient);
// get ingredient list accourding t stock

router.get('/ingredientsdetail',auth,ingredientsController.getIngredientsDetails);
module.exports = router;
