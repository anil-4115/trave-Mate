import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectToDatabase } from "./config/db.js";
import destinationRoutes from "./routes/destinationRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import attractionRoutes from "./routes/attractionRoutes.js";
import packingRoutes from "./routes/packingRoutes.js";
const app = express();
const PORT = Number(process.env.PORT) || 5000;
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
}));
app.use(express.json());
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "TravelMate API is running",
    });
});
app.use("/api/auth", authRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trips", itineraryRoutes);
app.use("/api/trips", packingRoutes);
app.use("/api", expenseRoutes);
app.use("/api", attractionRoutes);
// Catch-all 404 handler for unregistered routes
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
}
// Centralized error-handling middleware (Express 5 signature)
export function errorHandler(err, _req, res, _next) {
    // Check for malformed JSON payload thrown by express.json()
    if (err instanceof SyntaxError &&
        "status" in err &&
        err.status === 400 &&
        "body" in err) {
        res.status(400).json({
            success: false,
            message: "Malformed JSON payload in request body.",
        });
        return;
    }
    console.error("Unhandled server error:", err);
    const hasStatus = err !== null &&
        typeof err === "object" &&
        "status" in err &&
        typeof err.status === "number";
    const statusCode = hasStatus &&
        err.status >= 400 &&
        err.status < 600
        ? err.status
        : 500;
    const message = statusCode === 500
        ? "Internal server error."
        : err instanceof Error
            ? err.message
            : "An unexpected error occurred.";
    res.status(statusCode).json({
        success: false,
        message,
    });
}
app.use(notFoundHandler);
app.use(errorHandler);
export { app };
export async function startServer() {
    try {
        await connectToDatabase();
        app.listen(PORT, () => {
            console.log(`TravelMate API listening on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}
const isDirectExecution = process.argv[1] &&
    (process.argv[1].endsWith("server.ts") ||
        process.argv[1].endsWith("server.js"));
if (isDirectExecution) {
    startServer();
}
