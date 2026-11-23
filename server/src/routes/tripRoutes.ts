
import { Router } from "express";
import {
  createTrip,
  deleteTrip,
  getTrips,
  updateTrip,
} from "../controllers/tripController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Create a new trip
router.post("/", requireAuth, createTrip);

// Retrieve all saved trips
router.get("/", requireAuth, getTrips);

// Update an existing owned trip
router.put("/:tripId", requireAuth, updateTrip);

// Delete one owned trip and its related records
router.delete("/:tripId", requireAuth, deleteTrip);

export default router;
