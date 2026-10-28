import { Router } from "express";
import {
  createPackingItem,
  deletePackingItem,
  listPackingItems,
  updatePackingItem,
} from "../controllers/packingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:tripId/packing-items", requireAuth, listPackingItems);
router.post("/:tripId/packing-items", requireAuth, createPackingItem);
router.patch("/:tripId/packing-items/:itemId", requireAuth, updatePackingItem);
router.delete("/:tripId/packing-items/:itemId", requireAuth, deletePackingItem);

export default router;
