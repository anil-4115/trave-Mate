import mongoose from "mongoose";
import Trip from "../models/Trip.js";
import Destination from "../models/Destination.js";
import Itinerary from "../models/Itinerary.js";
import Expense from "../models/Expense.js";
import PackingItem from "../models/PackingItem.js";
export async function createTrip(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const { destinationId, startDate, endDate, travelers, budget, } = req.body;
        if (!destinationId ||
            !startDate ||
            !endDate ||
            travelers == null ||
            budget == null) {
            res.status(400).json({
                success: false,
                message: "All trip fields are required.",
            });
            return;
        }
        if (!mongoose.isValidObjectId(destinationId)) {
            res.status(400).json({
                success: false,
                message: "Invalid destination ID.",
            });
            return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const numberOfTravelers = Number(travelers);
        const totalBudget = Number(budget);
        if (Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end < start) {
            res.status(400).json({
                success: false,
                message: "Please provide valid travel dates.",
            });
            return;
        }
        if (!Number.isInteger(numberOfTravelers) ||
            numberOfTravelers < 1 ||
            numberOfTravelers > 50 ||
            !Number.isFinite(totalBudget) ||
            totalBudget < 1) {
            res.status(400).json({
                success: false,
                message: "Travelers or budget is invalid.",
            });
            return;
        }
        const destinationExists = await Destination.findById(destinationId);
        if (!destinationExists) {
            res.status(404).json({
                success: false,
                message: "Destination not found.",
            });
            return;
        }
        const trip = await Trip.create({
            destination: destinationId,
            user: req.userId,
            startDate: start,
            endDate: end,
            travelers: numberOfTravelers,
            budget: totalBudget,
        });
        res.status(201).json({
            success: true,
            message: "Trip created successfully.",
            data: trip,
        });
    }
    catch (error) {
        console.error("Create trip error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create trip.",
        });
    }
}
export async function getTrips(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const query = { user: req.userId };
        const trips = await Trip.find(query)
            .populate("destination")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: trips.length,
            data: trips,
        });
    }
    catch (error) {
        console.error("Get trips error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch trips.",
        });
    }
}
export async function deleteTrip(req, res) {
    let session = null;
    try {
        if (!req.userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { tripId } = req.params;
        if (!mongoose.isValidObjectId(tripId)) {
            res.status(400).json({ success: false, message: "Invalid trip ID." });
            return;
        }
        session = await mongoose.startSession();
        const trip = await Trip.findOne({ _id: tripId, user: req.userId }).session(session);
        if (!trip) {
            res.status(404).json({ success: false, message: "Trip not found." });
            return;
        }
        await session.withTransaction(async () => {
            await Itinerary.deleteOne({ trip: trip._id }).session(session);
            await Expense.deleteMany({ trip: trip._id }).session(session);
            await PackingItem.deleteMany({ trip: trip._id }).session(session);
            await Trip.deleteOne({ _id: trip._id, user: req.userId }).session(session);
        });
        res.status(200).json({
            success: true,
            message: "Trip and related itinerary and expenses deleted successfully.",
        });
    }
    catch (error) {
        console.error("Delete trip error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete trip.",
        });
    }
    finally {
        if (session) {
            await session.endSession();
        }
    }
}
export async function updateTrip(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const { tripId } = req.params;
        if (!mongoose.isValidObjectId(tripId)) {
            res.status(400).json({
                success: false,
                message: "Invalid trip ID.",
            });
            return;
        }
        const trip = await Trip.findById(tripId);
        if (!trip) {
            res.status(404).json({
                success: false,
                message: "Trip not found.",
            });
            return;
        }
        if (!trip.user || trip.user.toString() !== req.userId) {
            res.status(403).json({
                success: false,
                message: "You are not authorized to update this trip.",
            });
            return;
        }
        const { startDate, endDate, travelers, budget } = req.body ?? {};
        if (startDate === undefined &&
            endDate === undefined &&
            travelers === undefined &&
            budget === undefined) {
            res.status(400).json({
                success: false,
                message: "At least one field to update must be provided.",
            });
            return;
        }
        if (startDate !== undefined) {
            if (typeof startDate !== "string" && !(startDate instanceof Date)) {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
            if (typeof startDate === "string" && startDate.trim() === "") {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
            const parsed = new Date(startDate);
            if (Number.isNaN(parsed.getTime())) {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
        }
        if (endDate !== undefined) {
            if (typeof endDate !== "string" && !(endDate instanceof Date)) {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
            if (typeof endDate === "string" && endDate.trim() === "") {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
            const parsed = new Date(endDate);
            if (Number.isNaN(parsed.getTime())) {
                res.status(400).json({
                    success: false,
                    message: "Please provide valid travel dates.",
                });
                return;
            }
        }
        const targetStart = startDate !== undefined ? new Date(startDate) : new Date(trip.startDate);
        const targetEnd = endDate !== undefined ? new Date(endDate) : new Date(trip.endDate);
        if (targetStart > targetEnd) {
            res.status(400).json({
                success: false,
                message: "Start date must be before or equal to end date.",
            });
            return;
        }
        const diffDays = Math.round((targetEnd.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
            res.status(400).json({
                success: false,
                message: "Trip duration cannot exceed 30 nights.",
            });
            return;
        }
        if (travelers !== undefined) {
            const numTravelers = Number(travelers);
            if (typeof travelers === "boolean" ||
                travelers === null ||
                travelers === "" ||
                !Number.isInteger(numTravelers) ||
                numTravelers < 1 ||
                numTravelers > 50) {
                res.status(400).json({
                    success: false,
                    message: "Travelers must be an integer between 1 and 50.",
                });
                return;
            }
            trip.travelers = numTravelers;
        }
        if (budget !== undefined) {
            const numBudget = Number(budget);
            if (typeof budget === "boolean" ||
                budget === null ||
                budget === "" ||
                !Number.isFinite(numBudget) ||
                numBudget < 1) {
                res.status(400).json({
                    success: false,
                    message: "Budget must be a positive number.",
                });
                return;
            }
            trip.budget = numBudget;
        }
        if (startDate !== undefined) {
            trip.startDate = targetStart;
        }
        if (endDate !== undefined) {
            trip.endDate = targetEnd;
        }
        // Destination and user ownership are intentionally immutable
        await trip.save();
        await trip.populate("destination");
        res.status(200).json({
            success: true,
            message: "Trip updated successfully.",
            data: trip,
        });
    }
    catch (error) {
        console.error("Update trip error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update trip.",
        });
    }
}
