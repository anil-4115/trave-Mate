import type { Request, Response } from "express";
import Destination from "../models/Destination.js";
import {
  getAttractions as defaultGetAttractions,
  type RealAttraction,
} from "../services/attractionService.js";
import {
  optimizeRoute,
  RouteOptimizerError,
  type RouteAttractionInput,
} from "../services/routeOptimizer.js";
import { isValidObjectId } from "../utils/id.js";

// Dependency injection hook for testing without live Overpass network requests
let attractionFetcher = defaultGetAttractions;

export function setAttractionFetcherForTest(
  fn: typeof defaultGetAttractions
): void {
  attractionFetcher = fn;
}

export function resetAttractionFetcherForTest(): void {
  attractionFetcher = defaultGetAttractions;
}

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

    const result = await attractionFetcher(destination.name);
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

/**
 * Optimizes the visiting sequence for a user-selected set of attractions.
 *
 * Security: Coordinates and names are ALWAYS resolved from trusted server-side
 * attraction data (OpenStreetMap/curated records). Client-supplied coordinates
 * are never accepted.
 */
export async function optimizeAttractionRoute(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const rawDestinationId = req.params.destinationId;
    const destinationId = Array.isArray(rawDestinationId)
      ? rawDestinationId[0]
      : rawDestinationId;

    if (!destinationId || typeof destinationId !== "string" || !isValidObjectId(destinationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid destination ID.",
      });
      return;
    }

    const { attractionIds, startAttractionId } = req.body ?? {};

    if (!Array.isArray(attractionIds) || attractionIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one attraction ID must be provided.",
      });
      return;
    }

    // Verify all attraction IDs are non-empty strings
    for (const id of attractionIds) {
      if (typeof id !== "string" || !id.trim()) {
        res.status(400).json({
          success: false,
          message: "Each attraction ID must be a non-empty string.",
        });
        return;
      }
    }

    const destination = await Destination.findById(destinationId).select("name");
    if (!destination) {
      res.status(404).json({
        success: false,
        message: "Destination not found.",
      });
      return;
    }

    let attractionResult;
    try {
      attractionResult = await attractionFetcher(destination.name);
    } catch (err) {
      console.error("Failed to fetch attractions for route optimization:", err);
      res.status(503).json({
        success: false,
        message: "Attraction data is temporarily unavailable.",
      });
      return;
    }

    const trustedAttractions = attractionResult.attractions ?? [];
    if (trustedAttractions.length === 0) {
      res.status(400).json({
        success: false,
        message: "No attractions are available for this destination.",
      });
      return;
    }

    // Build trusted map by ID
    const trustedMap = new Map<string, RealAttraction>();
    for (const attraction of trustedAttractions) {
      trustedMap.set(attraction.id, attraction);
    }

    // Match client-requested attractionIds against trusted server records
    const selectedAttractions: RouteAttractionInput[] = [];
    const seenIds = new Set<string>();

    for (const rawId of attractionIds) {
      const cleanId = rawId.trim();
      const trusted = trustedMap.get(cleanId);
      if (!trusted) {
        res.status(400).json({
          success: false,
          message: `Attraction with ID "${cleanId}" was not found for this destination.`,
        });
        return;
      }

      // Deduplicate so duplicate selections are safely handled
      if (!seenIds.has(cleanId)) {
        seenIds.add(cleanId);
        selectedAttractions.push({
          id: trusted.id,
          name: trusted.name,
          latitude: trusted.latitude,
          longitude: trusted.longitude,
          category: trusted.category,
          locality: trusted.locality,
          estimatedDurationMinutes: trusted.estimatedDurationMinutes,
          mapUrl: trusted.mapUrl,
          source: trusted.source,
        });
      }
    }

    // Validate optional startAttractionId
    let validatedStartId: string | undefined = undefined;
    if (startAttractionId !== undefined && startAttractionId !== null) {
      if (typeof startAttractionId !== "string" || !startAttractionId.trim()) {
        res.status(400).json({
          success: false,
          message: "Start attraction ID must be a non-empty string.",
        });
        return;
      }
      const cleanStartId = startAttractionId.trim();
      if (!seenIds.has(cleanStartId)) {
        res.status(400).json({
          success: false,
          message: `Start attraction ID "${cleanStartId}" must be one of the selected attractions.`,
        });
        return;
      }
      validatedStartId = cleanStartId;
    }

    // Run the existing route optimizer service
    const optimized = optimizeRoute({
      attractions: selectedAttractions,
      startAttractionId: validatedStartId,
    });

    res.status(200).json({
      success: true,
      destinationId: destination._id,
      destinationName: destination.name,
      totalDistanceKm: optimized.totalDistanceKm,
      disclaimer: optimized.disclaimer,
      orderedStops: optimized.orderedStops,
      legs: optimized.legs,
    });
  } catch (error) {
    if (error instanceof RouteOptimizerError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("Optimize attraction route error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred during route optimization.",
    });
  }
}
