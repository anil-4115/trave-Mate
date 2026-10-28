import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import Destination from "../models/Destination.js";

const STARTER_DESTINATIONS = [
  {
    name: "Jaipur",
    country: "India",
    state: "Rajasthan",
    description: "Explore forts, palaces, markets, and Rajasthani culture.",
    averageCostPerDay: 2000,
  },
  {
    name: "Agra",
    country: "India",
    state: "Uttar Pradesh",
    description: "Discover iconic Mughal heritage and riverside history.",
    averageCostPerDay: 2200,
  },
  {
    name: "Delhi",
    country: "India",
    state: "Delhi",
    description: "Experience historic monuments, neighbourhoods, and local food.",
    averageCostPerDay: 2500,
  },
  {
    name: "Goa",
    country: "India",
    state: "Goa",
    description: "Relax along the coast and explore heritage communities.",
    averageCostPerDay: 2500,
  },
  {
    name: "Kerala",
    country: "India",
    state: "Kerala",
    description: "Enjoy backwaters, regional cuisine, and relaxed nature experiences.",
    averageCostPerDay: 2200,
  },
  {
    name: "Mumbai",
    country: "India",
    state: "Maharashtra",
    description: "Explore waterfront landmarks, culture, and local food.",
    averageCostPerDay: 3000,
  },
  {
    name: "Varanasi",
    country: "India",
    state: "Uttar Pradesh",
    description: "Experience riverside heritage, ghats, and local traditions.",
    averageCostPerDay: 1800,
  },
  {
    name: "Manali",
    country: "India",
    state: "Himachal Pradesh",
    description: "Plan mountain walks, riverside breaks, and nature outings.",
    averageCostPerDay: 1800,
  },
  {
    name: "Udaipur",
    country: "India",
    state: "Rajasthan",
    description: "Discover lakeside scenery, heritage areas, and local crafts.",
    averageCostPerDay: 2100,
  },
  {
    name: "Rishikesh",
    country: "India",
    state: "Uttarakhand",
    description: "Combine riverside scenery, wellness, and outdoor experiences.",
    averageCostPerDay: 1700,
  },
] as const;

async function seedDestinations(): Promise<void> {
  try {
    await connectToDatabase();

    for (const destination of STARTER_DESTINATIONS) {
      const existing = await Destination.findOne({
        name: new RegExp(`^${destination.name}$`, "i"),
      });

      if (existing) {
        console.log(`  - ${destination.name}: already exists, unchanged`);
        continue;
      }

      await Destination.create({
        ...destination,
        imageUrl: "",
      });
      console.log(`  - ${destination.name}: created`);
    }

    const count = await Destination.countDocuments();
    console.log(`Destination seed complete. Catalogue contains ${count} records.`);
  } catch (error) {
    console.error("Destination seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

void seedDestinations();
