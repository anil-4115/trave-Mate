
import { Request, Response } from "express";
import Destination from "../models/Destination.js";

// GET /api/destinations
// Retrieve all destinations from MongoDB.
export const getDestinations = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const destinations = await Destination.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations,
    });
  } catch (error) {
    console.error("Error fetching destinations:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch destinations",
    });
  }
};

// POST /api/destinations
// Add a new destination to MongoDB.
export const createDestination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      country,
      state,
      description,
      imageUrl,
      averageCostPerDay,
    } = req.body;

    const destination = await Destination.create({
      name,
      country,
      state,
      description,
      imageUrl,
      averageCostPerDay,
    });

    res.status(201).json({
      success: true,
      message: "Destination created successfully",
      data: destination,
    });
  } catch (error) {
    console.error("Error creating destination:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid destination data. Check the required fields and values.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create destination",
    });
  }
};
