
import mongoose, { Schema, Document } from "mongoose";

// 1. Define the structure of a destination.
export interface IDestination extends Document {
  name: string;
  country: string;
  state: string;
  description: string;
  imageUrl: string;
  averageCostPerDay: number;
}

// 2. Create the Mongoose schema.
const destinationSchema = new Schema<IDestination>(
  {
    name: {
      type: String,
      required: [true, "Destination name is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State or region is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    averageCostPerDay: {
      type: Number,
      required: [true, "Average daily cost is required"],
      min: [0, "Daily cost cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// 3. Create and export the model.
const Destination = mongoose.model<IDestination>(
  "Destination",
  destinationSchema
);

export default Destination;
