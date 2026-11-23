import mongoose, { Schema } from "mongoose";
// 2. Create the Mongoose schema.
const destinationSchema = new Schema({
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
}, {
    timestamps: true,
});
// 3. Create and export the model.
const Destination = mongoose.model("Destination", destinationSchema);
export default Destination;
