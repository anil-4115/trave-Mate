import { Router } from "express";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "../controllers/expenseController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/trips/:tripId/expenses", requireAuth, listExpenses);
router.post("/trips/:tripId/expenses", requireAuth, createExpense);
router.put("/trips/:tripId/expenses/:expenseId", requireAuth, updateExpense);
router.delete("/trips/:tripId/expenses/:expenseId", requireAuth, deleteExpense);

export default router;
