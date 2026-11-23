import dns from "node:dns";
import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the server/.env file");
  }

  // Node.js uses c-ares for SRV resolution (_mongodb._tcp). On Windows or environments
  // where the system DNS defaults to a loopback address (127.0.0.1) without an active
  // local DNS server on port 53, c-ares throws "querySrv ECONNREFUSED".
  // Configure reliable public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1)
  // as fallback whenever loopback DNS is detected or SRV queries fail.
  const currentServers = dns.getServers();
  const isLoopbackOnly =
    currentServers.length === 0 ||
    currentServers.every((s) => s === "127.0.0.1" || s === "::1");

  if (isLoopbackOnly) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error: unknown) {
    const err = error as { code?: string; syscall?: string };
    if (err?.code === "ECONNREFUSED" && err?.syscall === "querySrv") {
      console.warn(
        "MongoDB SRV lookup failed on default DNS resolver. Retrying with Google and Cloudflare DNS..."
      );
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB Atlas successfully after DNS fallback");
      return;
    }
    throw error;
  }
}
