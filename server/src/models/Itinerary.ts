import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IItineraryActivity {
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  category?: "food" | "transport" | "activity" | "lodging" | "other";
  locationName?: string;
  estimatedCost?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  source?: "openstreetmap" | "curated";
}

export interface IItinerary extends Document {
  trip: Types.ObjectId;
  user?: Types.ObjectId;
  days: IItineraryActivity[];
  estimatedTotalCost?: number;
  generatedBy?: "manual" | "rule-based";
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IItineraryActivity>(
  {
    dayIndex: { type: Number, required: true, min: 1 },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: {
      type: String,
      enum: ["food", "transport", "activity", "lodging", "other"],
      default: "activity",
    },
    locationName: { type: String, trim: true, default: "" },
    estimatedCost: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "" },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    mapUrl: { type: String, trim: true, default: "" },
    source: { type: String, enum: ["openstreetmap", "curated"] },
  },
  { _id: false }
);

const itinerarySchema = new Schema<IItinerary>(
  {
    trip: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    days: {
      type: [activitySchema],
      default: [],
    },
    estimatedTotalCost: { type: Number, min: 0 },
    generatedBy: {
      type: String,
      enum: ["manual", "rule-based"],
      default: "manual",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IItinerary>("Itinerary", itinerarySchema);
