import mongoose, { Schema } from "mongoose";
export const PACKING_CATEGORIES = [
    "Clothing",
    "Toiletries",
    "Documents",
    "Electronics",
    "Medicines",
    "Essentials",
];
const packingItemSchema = new Schema({
    trip: {
        type: Schema.Types.ObjectId,
        ref: "Trip",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    category: {
        type: String,
        enum: PACKING_CATEGORIES,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
        validate: {
            validator: Number.isInteger,
            message: "Quantity must be a whole number.",
        },
    },
    isPacked: {
        type: Boolean,
        default: false,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
    },
}, { timestamps: true });
export default mongoose.model("PackingItem", packingItemSchema);
