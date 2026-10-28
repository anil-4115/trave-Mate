import type { Response } from "express";
import mongoose from "mongoose";
import PackingItem, {
  PACKING_CATEGORIES,
  type PackingCategory,
} from "../models/PackingItem.js";
import Trip from "../models/Trip.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

function getTripId(req: AuthenticatedRequest): string {
  return String(req.params.tripId || "");
}

async function findOwnedTrip(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  const tripId = getTripId(req);
  if (!mongoose.isValidObjectId(tripId)) {
    res.status(400).json({ success: false, message: "Invalid trip ID." });
    return null;
  }

  const trip = await Trip.findOne({ _id: tripId, user: req.userId });
  if (!trip) {
    res.status(404).json({ success: false, message: "Trip not found." });
    return null;
  }

  return trip;
}

function parsePackingInput(body: Record<string, unknown>, partial = false) {
  const value: {
    name?: string;
    category?: PackingCategory;
    quantity?: number;
    isPacked?: boolean;
    notes?: string;
  } = {};

  if (!partial || "name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return { error: "Packing item name is required." };
    if (name.length > 120) {
      return { error: "Packing item name must be 120 characters or fewer." };
    }
    value.name = name;
  }

  if (!partial || "category" in body) {
    if (
      typeof body.category !== "string" ||
      !PACKING_CATEGORIES.includes(body.category as PackingCategory)
    ) {
      return { error: "Packing item category is invalid." };
    }
    value.category = body.category as PackingCategory;
  }

  if (!partial || "quantity" in body) {
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { error: "Quantity must be a whole number from 1 to 100." };
    }
    value.quantity = quantity;
  }

  if ("isPacked" in body) {
    if (typeof body.isPacked !== "boolean") {
      return { error: "isPacked must be a boolean." };
    }
    value.isPacked = body.isPacked;
  }

  if ("notes" in body) {
    if (typeof body.notes !== "string" || body.notes.trim().length > 500) {
      return { error: "Notes must be 500 characters or fewer." };
    }
    value.notes = body.notes.trim();
  }

  return { value };
}

export async function listPackingItems(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const trip = await findOwnedTrip(req, res);
    if (!trip) return;

    const items = await PackingItem.find({ trip: trip._id }).sort({
      category: 1,
      createdAt: 1,
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("List packing items error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch packing items." });
  }
}

export async function createPackingItem(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const trip = await findOwnedTrip(req, res);
    if (!trip) return;

    const parsed = parsePackingInput(req.body ?? {});
    if ("error" in parsed) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }

    const item = await PackingItem.create({ ...parsed.value, trip: trip._id });
    res.status(201).json({
      success: true,
      message: "Packing item added successfully.",
      data: item,
    });
  } catch (error) {
    console.error("Create packing item error:", error);
    res.status(500).json({ success: false, message: "Failed to add packing item." });
  }
}

export async function updatePackingItem(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const trip = await findOwnedTrip(req, res);
    if (!trip) return;

    const itemId = String(req.params.itemId || "");
    if (!mongoose.isValidObjectId(itemId)) {
      res.status(400).json({ success: false, message: "Invalid packing item ID." });
      return;
    }

    const item = await PackingItem.findOne({ _id: itemId, trip: trip._id });
    if (!item) {
      res.status(404).json({ success: false, message: "Packing item not found." });
      return;
    }

    const parsed = parsePackingInput(req.body ?? {}, true);
    if ("error" in parsed) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    if (Object.keys(parsed.value).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields to update." });
      return;
    }

    Object.assign(item, parsed.value);
    await item.save();
    res.status(200).json({
      success: true,
      message: "Packing item updated successfully.",
      data: item,
    });
  } catch (error) {
    console.error("Update packing item error:", error);
    res.status(500).json({ success: false, message: "Failed to update packing item." });
  }
}

export async function deletePackingItem(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const trip = await findOwnedTrip(req, res);
    if (!trip) return;

    const itemId = String(req.params.itemId || "");
    if (!mongoose.isValidObjectId(itemId)) {
      res.status(400).json({ success: false, message: "Invalid packing item ID." });
      return;
    }

    const deleted = await PackingItem.findOneAndDelete({
      _id: itemId,
      trip: trip._id,
    });
    if (!deleted) {
      res.status(404).json({ success: false, message: "Packing item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Packing item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete packing item error:", error);
    res.status(500).json({ success: false, message: "Failed to delete packing item." });
  }
}
