
import { Router } from "express";
import {
  getDestinations,
  createDestination,
} from "../controllers/destinationController.js";

const router = Router();

// GET /api/destinations - Retrieve all destinations
router.get("/", getDestinations);

// POST /api/destinations - Create a destination
router.post("/", createDestination);

export default router;
