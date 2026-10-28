import { Router } from "express";
import { getDestinationAttractions } from "../controllers/attractionController.js";

const router = Router();
router.get("/destinations/:destinationId/attractions", getDestinationAttractions);

export default router;
