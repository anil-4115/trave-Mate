import { Router } from "express";
import { getDestinationAttractions, optimizeAttractionRoute, } from "../controllers/attractionController.js";
const router = Router();
router.get("/destinations/:destinationId/attractions", getDestinationAttractions);
router.post("/destinations/:destinationId/optimize-route", optimizeAttractionRoute);
export default router;
