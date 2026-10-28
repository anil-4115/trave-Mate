
import type { Response } from "express";
import mongoose from "mongoose";
import Trip from "../models/Trip.js";
import Destination from "../models/Destination.js";
import Itinerary from "../models/Itinerary.js";
import Expense from "../models/Expense.js";
import PackingItem from "../models/PackingItem.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export async function createTrip(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const {
      destinationId,
      startDate,
      endDate,
      travelers,
      budget,
    } = req.body;

    if (
      !destinationId ||
      !startDate ||
      !endDate ||
      travelers == null ||
      budget == null
    ) {
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

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide valid travel dates.",
      });
      return;
    }

    if (
      !Number.isInteger(numberOfTravelers) ||
      numberOfTravelers < 1 ||
      numberOfTravelers > 50 ||
      !Number.isFinite(totalBudget) ||
      totalBudget < 1
    ) {
      res.status(400).json({
        success: false,
        message: "Travelers or budget is invalid.",
      });
      return;
    }

    const destinationExists =
      await Destination.findById(destinationId);

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
  } catch (error) {
    console.error("Create trip error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create trip.",
    });
  }
}

export async function getTrips(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
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
  } catch (error) {
    console.error("Get trips error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trips.",
    });
  }
}

export async function deleteTrip(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  let session: mongoose.ClientSession | null = null;

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
    const trip = await Trip.findOne({ _id: tripId, user: req.userId }).session(
      session
    );
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
  } catch (error) {
    console.error("Delete trip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete trip.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
