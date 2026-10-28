import type { Request, Response } from "express";
import Destination from "../models/Destination.js";
import { getAttractions } from "../services/attractionService.js";

export async function getDestinationAttractions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const destination = await Destination.findById(req.params.destinationId).select("name");
    if (!destination) {
      res.status(404).json({ success: false, message: "Destination not found." });
      return;
    }

    const result = await getAttractions(destination.name);
    res.status(200).json({
      success: true,
      data: result.attractions,
      source: result.source,
      warning: result.warning,
      attribution: "© OpenStreetMap contributors",
    });
  } catch (error) {
    console.error("Get destination attractions error:", error);
    res.status(503).json({
      success: false,
      message: "Attraction data is temporarily unavailable.",
    });
  }
}
