import mongoose, { Schema } from "mongoose";
export const EXPENSE_CATEGORIES = [
    "Food",
    "Transport",
    "Accommodation",
    "Activities",
    "Other",
];
const expenseSchema = new Schema({
    trip: {
        type: Schema.Types.ObjectId,
        ref: "Trip",
        required: true,
        index: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    category: {
        type: String,
        enum: EXPENSE_CATEGORIES,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    notes: {
        type: String,
        trim: true,
        default: "",
    },
}, { timestamps: true });
export default mongoose.model("Expense", expenseSchema);
