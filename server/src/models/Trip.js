import mongoose, { Schema } from "mongoose";
const tripSchema = new Schema({
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
}, {
    timestamps: true,
});
export default mongoose.model("Trip", tripSchema);
