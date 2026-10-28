import type { Response } from "express";
import mongoose from "mongoose";
import Destination from "../models/Destination.js";
import Itinerary from "../models/Itinerary.js";
import Trip from "../models/Trip.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  generateItineraryDraft,
  ItineraryGeneratorInputError,
  type ItineraryPreferences,
} from "../services/itineraryGenerator.js";
import { getAttractions } from "../services/attractionService.js";

function isValidHHmm(time: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((v) => Number(v));
  return h * 60 + m;
}

export async function getItineraryByTrip(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { tripId } = req.params;

    if (!mongoose.isValidObjectId(tripId)) {
      res.status(400).json({
        success: false,
        message: "Invalid trip ID.",
      });
      return;
    }

    const tripExists = await Trip.findById(tripId);
    if (!tripExists) {
      res.status(404).json({
        success: false,
        message: "Trip not found.",
      });
      return;
    }

    if (req.userId && (tripExists as any).user && (tripExists as any).user.toString() !== req.userId) {
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
      return;
    }

    const existingItinerary = await Itinerary.findOne({ trip: tripId });
    if (existingItinerary) {
      const existingUser = (existingItinerary as any).user;
      if (req.userId) {
        if (existingUser && existingUser.toString() !== req.userId) {
          res.status(403).json({
            success: false,
            message: "Forbidden",
          });
          return;
        }
        if (!existingUser) {
          // Unowned itinerary - do not expose to authenticated user
          res.status(404).json({
            success: false,
            message: "Itinerary not found for this trip.",
          });
          return;
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }
    }

    const itineraryQuery: any = { trip: tripId };
    if (req.userId) {
      itineraryQuery.user = req.userId;
    }

    const itinerary = await Itinerary.findOne(itineraryQuery);

    if (!itinerary) {
      res.status(404).json({
        success: false,
        message: "Itinerary not found for this trip.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    console.error("Get itinerary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch itinerary.",
    });
  }
}

export async function upsertItinerary(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
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

    // Ownership enforcement for trip
    if (req.userId && (trip as any).user && (trip as any).user.toString() !== req.userId) {
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
      return;
    }

    // Check for existing itinerary to prevent overwriting unowned or differently owned itineraries
    const existingItinerary = await Itinerary.findOne({ trip: tripId });
    if (existingItinerary) {
      const existingUser = (existingItinerary as any).user;
      if (req.userId) {
        if (existingUser && existingUser.toString() !== req.userId) {
          res.status(403).json({
            success: false,
            message: "Forbidden",
          });
          return;
        }
        if (!existingUser && (trip as any).user && (trip as any).user.toString() === req.userId) {
          // Trip owned by user but itinerary unowned - do not auto-claim/overwrite
          res.status(409).json({
            success: false,
            message: "Itinerary ownership cannot be established safely. Contact administrator.",
          });
          return;
        }
        if (!existingUser && !(trip as any).user) {
          // Both unowned - do not allow claiming/overwriting in this increment
          res.status(409).json({
            success: false,
            message: "Itinerary ownership cannot be established safely. Contact administrator.",
          });
          return;
        }
      } else {
        // Unauthenticated - should not happen due to requireAuth, but be defensive
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }
    }

    const body = req.body;

    if (!body || typeof body !== "object") {
      res.status(400).json({
        success: false,
        message: "Invalid itinerary payload.",
      });
      return;
    }

    if (!Array.isArray(body.days)) {
      res.status(400).json({
        success: false,
        message: "Itinerary days must be an array.",
      });
      return;
    }

    if (body.days.length === 0) {
      res.status(400).json({
        success: false,
        message: "Itinerary days array cannot be empty.",
      });
      return;
    }

    // Compute trip duration in calendar days
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: "Trip has invalid dates.",
      });
      return;
    }

    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (endDay <= startDay) {
      res.status(400).json({
        success: false,
        message: "Trip end date must be after start date.",
      });
      return;
    }

    const diffMs = endDay.getTime() - startDay.getTime();
    const tripDurationDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(tripDurationDays) || tripDurationDays < 1) {
      res.status(400).json({
        success: false,
        message: "Trip duration is invalid.",
      });
      return;
    }

    // Validate activities
    for (let i = 0; i < body.days.length; i++) {
      const activity = body.days[i];
      if (!activity || typeof activity !== "object") {
        res.status(400).json({
          success: false,
          message: "Invalid activity in itinerary.",
        });
        return;
      }

      if (typeof activity.title !== "string" || activity.title.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Each activity must have a non-empty title.",
        });
        return;
      }

      if (typeof activity.dayIndex !== "number" || !Number.isInteger(activity.dayIndex) || activity.dayIndex < 1) {
        res.status(400).json({
          success: false,
          message: "Each activity must have a valid 1-based dayIndex.",
        });
        return;
      }

      if (activity.dayIndex > tripDurationDays) {
        res.status(400).json({
          success: false,
          message: "Activity dayIndex exceeds trip duration.",
        });
        return;
      }

      if (activity.startTime !== undefined && activity.startTime !== null) {
        if (typeof activity.startTime !== "string" || !isValidHHmm(activity.startTime)) {
          res.status(400).json({
            success: false,
            message: "Invalid startTime format. Use HH:mm (24h).",
          });
          return;
        }
      }

      if (activity.endTime !== undefined && activity.endTime !== null) {
        if (typeof activity.endTime !== "string" || !isValidHHmm(activity.endTime)) {
          res.status(400).json({
            success: false,
            message: "Invalid endTime format. Use HH:mm (24h).",
          });
          return;
        }
      }

      if (
        activity.startTime !== undefined &&
        activity.startTime !== null &&
        activity.endTime !== undefined &&
        activity.endTime !== null
      ) {
        const startMins = timeToMinutes(activity.startTime);
        const endMins = timeToMinutes(activity.endTime);
        if (endMins <= startMins) {
          res.status(400).json({
            success: false,
            message: "End time must be later than start time.",
          });
          return;
        }
      }

      if (activity.estimatedCost !== undefined && activity.estimatedCost !== null) {
        const cost = Number(activity.estimatedCost);
        if (!Number.isFinite(cost) || cost < 0) {
          res.status(400).json({
            success: false,
            message: "Estimated cost must be a finite non-negative number.",
          });
          return;
        }
      }
    }

    // Build sanitized payload
    const sanitizedDays = body.days.map((activity: any) => ({
      dayIndex: activity.dayIndex,
      startTime: activity.startTime || undefined,
      endTime: activity.endTime || undefined,
      title: String(activity.title).trim(),
      description: activity.description ? String(activity.description).trim() : "",
      category: activity.category || "activity",
      locationName: activity.locationName ? String(activity.locationName).trim() : "",
      estimatedCost:
        activity.estimatedCost !== undefined && activity.estimatedCost !== null
          ? Number(activity.estimatedCost)
          : 0,
      notes: activity.notes ? String(activity.notes).trim() : "",
      latitude:
        typeof activity.latitude === "number" ? activity.latitude : undefined,
      longitude:
        typeof activity.longitude === "number" ? activity.longitude : undefined,
      mapUrl: activity.mapUrl ? String(activity.mapUrl).trim() : "",
      source:
        activity.source === "openstreetmap" || activity.source === "curated"
          ? activity.source
          : undefined,
    }));

    const updatePayload: any = {
      trip: tripId,
      days: sanitizedDays,
      generatedBy: body.generatedBy === "rule-based" ? "rule-based" : "manual",
    };
    if (req.userId) {
      updatePayload.user = req.userId;
    }

    const itineraryQuery: any = { trip: tripId };
    if (req.userId) {
      itineraryQuery.user = req.userId;
    }

    let itinerary;
    try {
      itinerary = await Itinerary.findOneAndUpdate(
        itineraryQuery,
        updatePayload,
        { upsert: !existingItinerary, new: true, runValidators: true }
      );
    } catch (error: any) {
      if (error && error.code === 11000) {
        // If duplicate key due to race, re-check ownership before proceeding
        const raceCheck = await Itinerary.findOne({ trip: tripId });
        if (raceCheck) {
          const raceUser = (raceCheck as any).user;
          if (req.userId && raceUser && raceUser.toString() !== req.userId) {
            res.status(403).json({
              success: false,
              message: "Forbidden",
            });
            return;
          }
          if (req.userId && (!raceUser || ((trip as any).user && (trip as any).user.toString() === req.userId && !raceUser))) {
            res.status(409).json({
              success: false,
              message: "Itinerary ownership cannot be established safely. Contact administrator.",
            });
            return;
          }
          // If we get here and it's owned by same user, try to update
          itinerary = await Itinerary.findOneAndUpdate(
            { trip: tripId, user: req.userId },
            updatePayload,
            { new: true, runValidators: true }
          );
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    res.status(200).json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    console.error("Upsert itinerary error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as any).name === "ValidationError"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid itinerary data.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to save itinerary.",
    });
  }
}

export async function generateItineraryDraftForTrip(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
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

    if (req.userId && (trip as any).user && (trip as any).user.toString() !== req.userId) {
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
      return;
    }

    if (!trip.destination || !mongoose.isValidObjectId(trip.destination)) {
      res.status(404).json({
        success: false,
        message: "Destination not found for this trip.",
      });
      return;
    }

    const destination = await Destination.findById(trip.destination).select(
      "name averageCostPerDay"
    );
    if (!destination) {
      res.status(404).json({
        success: false,
        message: "Destination not found for this trip.",
      });
      return;
    }

    const rawPreferences = req.body?.preferences;
    const preferences: ItineraryPreferences | undefined =
      rawPreferences && typeof rawPreferences === "object"
        ? {
            interests: Array.isArray(rawPreferences.interests)
              ? rawPreferences.interests
              : undefined,
            pace: rawPreferences.pace,
            dailyBudget: rawPreferences.dailyBudget,
          }
        : undefined;

    const attractionResult = await getAttractions(destination.name);
    const draft = generateItineraryDraft({
      destinationName: destination.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budget: trip.budget,
      averageCostPerDay: destination.averageCostPerDay,
      preferences,
      attractions: attractionResult.attractions,
    });
    if (attractionResult.warning) {
      draft.budgetWarning = [draft.budgetWarning, attractionResult.warning]
        .filter(Boolean)
        .join(" ");
    }

    res.status(200).json({
      success: true,
      data: draft,
    });
  } catch (error) {
    if (error instanceof ItineraryGeneratorInputError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("Generate itinerary draft error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate itinerary draft.",
    });
  }
}
