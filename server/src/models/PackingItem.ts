import mongoose, { Schema, type Document } from "mongoose";

export const PACKING_CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Documents",
  "Electronics",
  "Medicines",
  "Essentials",
] as const;

export type PackingCategory = (typeof PACKING_CATEGORIES)[number];

export interface IPackingItem extends Document {
  trip: mongoose.Types.ObjectId;
  name: string;
  category: PackingCategory;
  quantity: number;
  isPacked: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const packingItemSchema = new Schema<IPackingItem>(
  {
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
  },
  { timestamps: true }
);

export default mongoose.model<IPackingItem>("PackingItem", packingItemSchema);
