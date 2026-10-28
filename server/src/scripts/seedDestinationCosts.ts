import "dotenv/config";
import { connectToDatabase } from "../config/db.js";
import Destination from "../models/Destination.js";

const costMap: Record<string, number> = {
  // Illustrative planning estimates only - not verified current prices
  Goa: 2500,
  Jaipur: 2000,
  Kerala: 2200,
  Manali: 1800,
  Mumbai: 3000,
};

async function seedDestinationCosts() {
  try {
    await connectToDatabase();

    const names = Object.keys(costMap);
    const results: Array<{ name: string; status: string; updated?: boolean; cost?: number; matched?: boolean }> = [];

    for (const name of names) {
      const cost = costMap[name];
      const destination = await Destination.findOne({ name }, { _id: 1, averageCostPerDay: 1 });

      if (!destination) {
        results.push({ name, status: "NOT_FOUND" });
        continue;
      }

      const previousCost = (destination as any).averageCostPerDay;
      if (typeof previousCost === "number" && Number.isFinite(previousCost) && previousCost === cost) {
        results.push({ name, status: "ALREADY_MATCHES", cost, matched: true });
        continue;
      }

      // Update only averageCostPerDay using a targeted update to avoid full-document validation
      const updateResult = await Destination.updateOne(
        { _id: destination._id },
        { $set: { averageCostPerDay: cost } },
        { runValidators: false }
      );

      if (updateResult.modifiedCount === 1 || updateResult.matchedCount === 1) {
        results.push({ name, status: "UPDATED", updated: true, cost, matched: true });
      } else {
        results.push({ name, status: "NO_CHANGE", cost, matched: true });
      }
    }

    console.log("Destination cost seed (illustrative estimates) completed:");
    for (const r of results) {
      if (r.status === "UPDATED") {
        console.log(`  - ${r.name}: UPDATED -> averageCostPerDay = ${r.cost}`);
      } else if (r.status === "ALREADY_MATCHES") {
        console.log(`  - ${r.name}: ALREADY_MATCHES (averageCostPerDay = ${r.cost})`);
      } else if (r.status === "NOT_FOUND") {
        console.log(`  - ${r.name}: NOT_FOUND (no existing document matched by name)`);
      }
    }

    const missing = results.filter((r) => r.status === "NOT_FOUND");
    if (missing.length > 0) {
      console.error(`Failed to match ${missing.length} destination(s). No new destinations were created.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Error seeding destination costs:", error);
    process.exitCode = 1;
  } finally {
    // Close MongoDB connection reliably
    try {
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
    } catch {
      // Ignore close errors
    }
  }
}

seedDestinationCosts();
