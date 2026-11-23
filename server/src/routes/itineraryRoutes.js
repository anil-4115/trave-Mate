import { Router } from "express";
import { generateItineraryDraftForTrip, getItineraryByTrip, optimizeAllItineraryDaysRoute, optimizeItineraryDay, upsertItinerary, } from "../controllers/itineraryController.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
// GET itinerary for a trip
router.get("/:tripId/itinerary", requireAuth, getItineraryByTrip);
// PUT create or replace itinerary for a trip
router.put("/:tripId/itinerary", requireAuth, upsertItinerary);
router.post("/:tripId/itinerary/generate", requireAuth, generateItineraryDraftForTrip);
// POST optimize attraction visiting order for a single itinerary day
router.post("/:tripId/itinerary/optimize-day", requireAuth, optimizeItineraryDay);
// POST optimize attraction visiting order across all itinerary days independently
router.post("/:tripId/itinerary/optimize-all-days", requireAuth, optimizeAllItineraryDaysRoute);
export default router;
