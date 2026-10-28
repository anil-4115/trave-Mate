
import mongoose, { Schema, type Document } from "mongoose";

export interface ITrip extends Document {
  destination: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  travelers: number;
  budget: number;
}

const tripSchema = new Schema<ITrip>(
  {
    destination: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    travelers: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    budget: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITrip>("Trip", tripSchema);
