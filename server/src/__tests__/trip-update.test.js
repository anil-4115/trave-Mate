import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { updateTrip } from "../controllers/tripController.js";
import Trip from "../models/Trip.js";
import { notFoundHandler, errorHandler } from "../server.js";
function createRes() {
    const res = {
        statusCode: 200,
        body: null,
    };
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (payload) {
        this.body = payload;
        return this;
    };
    return res;
}
const tripId = "507f1f77bcf86cd799439011";
const userId = "507f191e810c19729de860ea";
const otherUserId = "507f191e810c19729de860eb";
function getMockTrip() {
    return {
        _id: tripId,
        user: {
            toString: () => userId,
        },
        destination: "507f1f77bcf86cd799439099",
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-05T00:00:00.000Z"),
        travelers: 2,
        budget: 15000,
        save: async function () {
            return this;
        },
        populate: async function (path) {
            if (path === "destination") {
                this.destination = {
                    _id: this.destination,
                    name: "Goa",
                    country: "India",
                };
            }
            return this;
        },
    };
}
test("updateTrip: unauthenticated update rejected with 401", async () => {
    const req = {
        params: { tripId },
        body: { travelers: 3 },
    };
    const res = createRes();
    await updateTrip(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Unauthorized");
});
test("updateTrip: invalid tripId format rejected with 400", async () => {
    const req = {
        params: { tripId: "invalid-not-an-objectid" },
        userId,
        body: { travelers: 3 },
    };
    const res = createRes();
    await updateTrip(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Invalid trip ID.");
});
test("updateTrip: non-existent trip returns 404", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => null;
    try {
        const req = {
            params: { tripId },
            userId,
            body: { travelers: 3 },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, "Trip not found.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: updating another user's trip returns 403 Forbidden", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => ({
        ...getMockTrip(),
        user: {
            toString: () => otherUserId,
        },
    });
    try {
        const req = {
            params: { tripId },
            userId, // User attempting update is not the owner
            body: { travelers: 3 },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, "You are not authorized to update this trip.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: empty update body rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    const mockTrip = getMockTrip();
    Trip.findById = async () => mockTrip;
    try {
        const req = {
            params: { tripId },
            userId,
            body: {},
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, "At least one field to update must be provided.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: invalid date strings rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => getMockTrip();
    try {
        // Malformed startDate
        const req1 = {
            params: { tripId },
            userId,
            body: { startDate: "not-a-real-date" },
        };
        const res1 = createRes();
        await updateTrip(req1, res1);
        assert.strictEqual(res1.statusCode, 400);
        assert.strictEqual(res1.body?.message, "Please provide valid travel dates.");
        // Empty string endDate
        const req2 = {
            params: { tripId },
            userId,
            body: { endDate: "   " },
        };
        const res2 = createRes();
        await updateTrip(req2, res2);
        assert.strictEqual(res2.statusCode, 400);
        assert.strictEqual(res2.body?.message, "Please provide valid travel dates.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: startDate after endDate rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => getMockTrip();
    try {
        const req = {
            params: { tripId },
            userId,
            body: {
                startDate: "2026-06-15",
                endDate: "2026-06-10",
            },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, "Start date must be before or equal to end date.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: trip duration exceeding 30 nights rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => getMockTrip();
    try {
        const req = {
            params: { tripId },
            userId,
            body: {
                startDate: "2026-06-01",
                endDate: "2026-07-15", // 44 nights > 30 nights limit
            },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, "Trip duration cannot exceed 30 nights.");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: invalid travelers rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => getMockTrip();
    try {
        const invalidTravelerValues = [0, -1, 1.5, 51, "abc", null, false];
        for (const val of invalidTravelerValues) {
            const req = {
                params: { tripId },
                userId,
                body: { travelers: val },
            };
            const res = createRes();
            await updateTrip(req, res);
            assert.strictEqual(res.statusCode, 400, `Expected 400 for travelers value: ${JSON.stringify(val)}`);
            assert.strictEqual(res.body?.message, "Travelers must be an integer between 1 and 50.");
        }
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: invalid budget rejected with 400", async () => {
    const originalTripFindById = Trip.findById;
    Trip.findById = async () => getMockTrip();
    try {
        const invalidBudgetValues = [0, -100, -0.5, "not-a-number", null, false];
        for (const val of invalidBudgetValues) {
            const req = {
                params: { tripId },
                userId,
                body: { budget: val },
            };
            const res = createRes();
            await updateTrip(req, res);
            assert.strictEqual(res.statusCode, 400, `Expected 400 for budget value: ${JSON.stringify(val)}`);
            assert.strictEqual(res.body?.message, "Budget must be a positive number.");
        }
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: destination and user ownership remain immutable", async () => {
    const originalTripFindById = Trip.findById;
    const mockTrip = getMockTrip();
    Trip.findById = async () => mockTrip;
    try {
        const maliciousDestinationId = new mongoose.Types.ObjectId().toString();
        const maliciousUserId = new mongoose.Types.ObjectId().toString();
        const req = {
            params: { tripId },
            userId,
            body: {
                destination: maliciousDestinationId,
                user: maliciousUserId,
                travelers: 4,
                budget: 20000,
            },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body?.success, true);
        // User ownership must not be altered
        assert.strictEqual(mockTrip.user.toString(), userId);
        // Travelers and budget updated
        assert.strictEqual(mockTrip.travelers, 4);
        assert.strictEqual(mockTrip.budget, 20000);
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("updateTrip: successful update of dates, travelers, and budget", async () => {
    const originalTripFindById = Trip.findById;
    const mockTrip = getMockTrip();
    Trip.findById = async () => mockTrip;
    try {
        const req = {
            params: { tripId },
            userId,
            body: {
                startDate: "2026-07-01T00:00:00.000Z",
                endDate: "2026-07-07T00:00:00.000Z",
                travelers: 3,
                budget: 45000,
            },
        };
        const res = createRes();
        await updateTrip(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body?.success, true);
        assert.strictEqual(res.body?.message, "Trip updated successfully.");
        assert.strictEqual(mockTrip.travelers, 3);
        assert.strictEqual(mockTrip.budget, 45000);
        assert.strictEqual(mockTrip.startDate.toISOString(), new Date("2026-07-01T00:00:00.000Z").toISOString());
        assert.strictEqual(mockTrip.endDate.toISOString(), new Date("2026-07-07T00:00:00.000Z").toISOString());
        assert.strictEqual(res.body?.data?.destination?.name, "Goa");
    }
    finally {
        Trip.findById = originalTripFindById;
    }
});
test("globalHandler: unmatched routes return JSON 404", () => {
    const req = {
        method: "GET",
        originalUrl: "/api/nonexistent-route-path",
    };
    const res = createRes();
    notFoundHandler(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Route GET /api/nonexistent-route-path not found");
});
test("globalHandler: centralized error middleware catches malformed JSON with 400", () => {
    const syntaxErr = new SyntaxError("Unexpected token in JSON");
    syntaxErr.status = 400;
    syntaxErr.body = '{"malformed": }';
    const res = createRes();
    errorHandler(syntaxErr, {}, res, (() => { }));
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Malformed JSON payload in request body.");
});
test("globalHandler: centralized error middleware handles 500 without leaking stack", () => {
    const genericErr = new Error("Database connection dropped unexpectedly");
    const res = createRes();
    errorHandler(genericErr, {}, res, (() => { }));
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Internal server error.");
    // Ensure stack is not leaked to client payload
    assert.strictEqual(res.body?.stack, undefined);
});
