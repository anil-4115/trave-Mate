import { Router } from "express";
import {
  generateItineraryDraftForTrip,
  getItineraryByTrip,
  upsertItinerary,
} from "../controllers/itineraryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET itinerary for a trip
router.get("/:tripId/itinerary", requireAuth, getItineraryByTrip);

// PUT create or replace itinerary for a trip
router.put("/:tripId/itinerary", requireAuth, upsertItinerary);

router.post("/:tripId/itinerary/generate", requireAuth, generateItineraryDraftForTrip);

export default router;

