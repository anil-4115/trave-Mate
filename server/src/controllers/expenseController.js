import mongoose from "mongoose";
import Expense, { EXPENSE_CATEGORIES, } from "../models/Expense.js";
import Trip from "../models/Trip.js";
function getTripId(req) {
    return String(req.params.tripId || "");
}
async function findOwnedTrip(req, res) {
    if (!req.userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return null;
    }
    const tripId = getTripId(req);
    if (!mongoose.isValidObjectId(tripId)) {
        res.status(400).json({ success: false, message: "Invalid trip ID." });
        return null;
    }
    const trip = await Trip.findOne({ _id: tripId, user: req.userId });
    if (!trip) {
        res.status(404).json({ success: false, message: "Trip not found." });
        return null;
    }
    return trip;
}
function parseExpenseInput(body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const amount = Number(body.amount);
    const category = body.category;
    const date = typeof body.date === "string" ? new Date(body.date) : new Date("");
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!title) {
        return { error: "Expense title is required." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Expense amount must be a positive finite number." };
    }
    if (typeof category !== "string" ||
        !EXPENSE_CATEGORIES.includes(category)) {
        return { error: "Expense category is invalid." };
    }
    if (Number.isNaN(date.getTime())) {
        return { error: "Expense date is invalid." };
    }
    return {
        value: {
            title,
            amount,
            category: category,
            date,
            notes,
        },
    };
}
export async function listExpenses(req, res) {
    try {
        const trip = await findOwnedTrip(req, res);
        if (!trip || !req.userId)
            return;
        const expenses = await Expense.find({
            trip: trip._id,
            user: req.userId,
        }).sort({ date: -1, createdAt: -1 });
        res.status(200).json({ success: true, count: expenses.length, data: expenses });
    }
    catch (error) {
        console.error("List expenses error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch expenses." });
    }
}
export async function createExpense(req, res) {
    try {
        const trip = await findOwnedTrip(req, res);
        if (!trip || !req.userId)
            return;
        const parsed = parseExpenseInput(req.body ?? {});
        if ("error" in parsed) {
            res.status(400).json({ success: false, message: parsed.error });
            return;
        }
        const expense = await Expense.create({
            ...parsed.value,
            trip: trip._id,
            user: req.userId,
        });
        res.status(201).json({
            success: true,
            message: "Expense created successfully.",
            data: expense,
        });
    }
    catch (error) {
        console.error("Create expense error:", error);
        res.status(500).json({ success: false, message: "Failed to create expense." });
    }
}
export async function updateExpense(req, res) {
    try {
        const trip = await findOwnedTrip(req, res);
        if (!trip || !req.userId)
            return;
        const expenseId = String(req.params.expenseId || "");
        if (!mongoose.isValidObjectId(expenseId)) {
            res.status(400).json({ success: false, message: "Invalid expense ID." });
            return;
        }
        const expense = await Expense.findOne({
            _id: expenseId,
            trip: trip._id,
            user: req.userId,
        });
        if (!expense) {
            res.status(404).json({ success: false, message: "Expense not found." });
            return;
        }
        const parsed = parseExpenseInput(req.body ?? {});
        if ("error" in parsed) {
            res.status(400).json({ success: false, message: parsed.error });
            return;
        }
        Object.assign(expense, parsed.value);
        await expense.save();
        res.status(200).json({ success: true, message: "Expense updated successfully.", data: expense });
    }
    catch (error) {
        console.error("Update expense error:", error);
        res.status(500).json({ success: false, message: "Failed to update expense." });
    }
}
export async function deleteExpense(req, res) {
    try {
        const trip = await findOwnedTrip(req, res);
        if (!trip || !req.userId)
            return;
        const expenseId = String(req.params.expenseId || "");
        if (!mongoose.isValidObjectId(expenseId)) {
            res.status(400).json({ success: false, message: "Invalid expense ID." });
            return;
        }
        const deleted = await Expense.findOneAndDelete({
            _id: expenseId,
            trip: trip._id,
            user: req.userId,
        });
        if (!deleted) {
            res.status(404).json({ success: false, message: "Expense not found." });
            return;
        }
        res.status(200).json({ success: true, message: "Expense deleted successfully." });
    }
    catch (error) {
        console.error("Delete expense error:", error);
        res.status(500).json({ success: false, message: "Failed to delete expense." });
    }
}
