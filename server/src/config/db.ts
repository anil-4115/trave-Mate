
import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the server/.env file");
  }

  await mongoose.connect(mongoUri);

  console.log("Connected to MongoDB Atlas successfully");
}
