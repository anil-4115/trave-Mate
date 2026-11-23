import test from "node:test";
import assert from "node:assert";
import { optimizeDayItinerary, optimizeItineraryDays, } from "../services/routeOptimizer.js";
import { optimizeItineraryDay, optimizeAllItineraryDaysRoute, } from "../controllers/itineraryController.js";
import Trip from "../models/Trip.js";
import Itinerary from "../models/Itinerary.js";
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
// ---------------------------------------------------------------------------
// Mock Attractions & Activities
// ---------------------------------------------------------------------------
// Real-world Agra attractions
const tajMahal = {
    dayIndex: 1,
    startTime: "09:00",
    endTime: "11:00",
    title: "Taj Mahal",
    description: "Iconic white marble mausoleum.",
    category: "activity",
    locationName: "Agra",
    estimatedCost: 1100,
    notes: "Curated estimate only.",
    latitude: 27.1751,
    longitude: 78.0421,
    mapUrl: "https://www.openstreetmap.org/taj-mahal",
    source: "curated",
};
const agraFort = {
    dayIndex: 1,
    startTime: "11:30",
    endTime: "13:30",
    title: "Agra Fort",
    description: "Historical fort complex in Agra.",
    category: "activity",
    locationName: "Agra",
    estimatedCost: 650,
    notes: "Curated estimate only.",
    latitude: 27.1795,
    longitude: 78.0211,
    mapUrl: "https://www.openstreetmap.org/agra-fort",
    source: "curated",
};
const mehtabBagh = {
    dayIndex: 1,
    startTime: "16:00",
    endTime: "17:30",
    title: "Mehtab Bagh",
    description: "Charbagh complex across Yamuna River.",
    category: "activity",
    locationName: "Agra",
    estimatedCost: 300,
    notes: "Curated estimate only.",
    latitude: 27.1800,
    longitude: 78.0425,
    mapUrl: "https://www.openstreetmap.org/mehtab-bagh",
    source: "curated",
};
// Collinear points along longitude line
const pointA = {
    dayIndex: 1,
    startTime: "09:00",
    endTime: "10:30",
    title: "Point A",
    latitude: 20.0,
    longitude: 77.0,
};
const pointB = {
    dayIndex: 1,
    startTime: "11:00",
    endTime: "12:30",
    title: "Point B",
    latitude: 20.05,
    longitude: 77.0,
};
const pointC = {
    dayIndex: 1,
    startTime: "14:00",
    endTime: "15:30",
    title: "Point C",
    latitude: 20.10,
    longitude: 77.0,
};
// Activity without coordinates (e.g. lunch, relaxation)
const lunchActivity = {
    dayIndex: 1,
    startTime: "13:30",
    endTime: "14:30",
    title: "Lunch at Local Restaurant",
    description: "Casual dining experience",
    category: "food",
    locationName: "City Center",
    estimatedCost: 500,
    latitude: null,
    longitude: null,
};
// ===========================================================================
// SECTION 1: optimizeDayItinerary Unit Tests
// ===========================================================================
test("optimizeDayItinerary: handles 0 activities (empty day) gracefully", () => {
    const result = optimizeDayItinerary([]);
    assert.strictEqual(result.dayIndex, 1);
    assert.deepStrictEqual(result.activities, []);
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.deepStrictEqual(result.legs, []);
    assert.strictEqual(result.optimized, false);
    assert.ok(typeof result.disclaimer === "string");
});
test("optimizeDayItinerary: handles 1 activity (single attraction day) gracefully without error", () => {
    const result = optimizeDayItinerary([tajMahal]);
    assert.strictEqual(result.dayIndex, 1);
    assert.strictEqual(result.activities.length, 1);
    assert.strictEqual(result.activities[0].title, "Taj Mahal");
    assert.strictEqual(result.activities[0].estimatedCost, 1100);
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.deepStrictEqual(result.legs, []);
    assert.strictEqual(result.optimized, false);
});
test("optimizeDayItinerary: handles multiple activities without coordinates gracefully", () => {
    const act1 = { dayIndex: 2, title: "Breakfast", latitude: null, longitude: null };
    const act2 = { dayIndex: 2, title: "Hotel Rest", latitude: null, longitude: null };
    const result = optimizeDayItinerary([act1, act2]);
    assert.strictEqual(result.dayIndex, 2);
    assert.strictEqual(result.activities.length, 2);
    assert.strictEqual(result.activities[0].title, "Breakfast");
    assert.strictEqual(result.activities[1].title, "Hotel Rest");
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.strictEqual(result.optimized, false);
});
test("optimizeDayItinerary: preserves original order when fewer than 2 activities have coordinates", () => {
    const act1 = { dayIndex: 1, title: "Breakfast", latitude: null, longitude: null };
    const act2 = { ...tajMahal };
    const result = optimizeDayItinerary([act1, act2]);
    assert.strictEqual(result.activities.length, 2);
    assert.strictEqual(result.activities[0].title, "Breakfast");
    assert.strictEqual(result.activities[1].title, "Taj Mahal");
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.strictEqual(result.optimized, false);
});
test("optimizeDayItinerary: collinear points A -> B -> C are re-sequenced to minimize distance", () => {
    // Input given in non-optimal order: Point A, then Point C (far), then Point B (middle)
    const input = [pointA, pointC, pointB];
    const result = optimizeDayItinerary(input);
    assert.strictEqual(result.optimized, true);
    assert.strictEqual(result.activities.length, 3);
    // When starting from Point A, Point B is closer than Point C, so order must be A -> B -> C
    const titles = result.activities.map((a) => a.title);
    assert.deepStrictEqual(titles, ["Point A", "Point B", "Point C"]);
    // Total distance should be distance(A->B) + distance(B->C) ~ 11.12 km
    assert.ok(result.totalDistanceKm > 0);
    assert.strictEqual(result.legs.length, 2);
    assert.strictEqual(result.legs[0].fromTitle, "Point A");
    assert.strictEqual(result.legs[0].toTitle, "Point B");
    assert.strictEqual(result.legs[1].fromTitle, "Point B");
    assert.strictEqual(result.legs[1].toTitle, "Point C");
});
test("optimizeDayItinerary: real-world Agra cluster optimizes visiting sequence", () => {
    // Input: Agra Fort, Mehtab Bagh, Taj Mahal
    const input = [agraFort, mehtabBagh, tajMahal];
    const result = optimizeDayItinerary(input);
    assert.strictEqual(result.optimized, true);
    assert.strictEqual(result.activities.length, 3);
    assert.strictEqual(result.legs.length, 2);
    assert.ok(result.totalDistanceKm > 0);
    assert.ok(result.totalDistanceKm < 15); // Distance between all Agra sites is small (<15km)
});
test("optimizeDayItinerary: preserves ALL original activity fields and metadata", () => {
    const input = [
        { ...agraFort, customField: "customVal123" },
        { ...tajMahal, customField: "customVal456" },
    ];
    const result = optimizeDayItinerary(input);
    assert.strictEqual(result.activities.length, 2);
    const foundTaj = result.activities.find((a) => a.title === "Taj Mahal");
    assert.ok(foundTaj);
    assert.strictEqual(foundTaj.description, tajMahal.description);
    assert.strictEqual(foundTaj.category, tajMahal.category);
    assert.strictEqual(foundTaj.locationName, tajMahal.locationName);
    assert.strictEqual(foundTaj.estimatedCost, tajMahal.estimatedCost);
    assert.strictEqual(foundTaj.notes, tajMahal.notes);
    assert.strictEqual(foundTaj.mapUrl, tajMahal.mapUrl);
    assert.strictEqual(foundTaj.source, tajMahal.source);
    assert.strictEqual(foundTaj.customField, "customVal456");
});
test("optimizeDayItinerary: preserves sequential chronological time slots", () => {
    // Input given in reverse: Point C (14:00), Point B (11:00), Point A (09:00)
    const input = [
        { ...pointC, startTime: "09:00", endTime: "10:30" },
        { ...pointB, startTime: "11:00", endTime: "12:30" },
        { ...pointA, startTime: "14:00", endTime: "15:30" },
    ];
    // With startAttractionTitle = "Point A"
    const result = optimizeDayItinerary(input, { startAttractionTitle: "Point A" });
    assert.strictEqual(result.activities[0].title, "Point A");
    assert.strictEqual(result.activities[0].startTime, "09:00");
    assert.strictEqual(result.activities[0].endTime, "10:30");
    assert.strictEqual(result.activities[1].title, "Point B");
    assert.strictEqual(result.activities[1].startTime, "11:00");
    assert.strictEqual(result.activities[1].endTime, "12:30");
    assert.strictEqual(result.activities[2].title, "Point C");
    assert.strictEqual(result.activities[2].startTime, "14:00");
    assert.strictEqual(result.activities[2].endTime, "15:30");
});
test("optimizeDayItinerary: uncoordinated activities remain in their relative slots", () => {
    // Structure: Point A, Lunch (no coords), Point C, Point B
    const input = [pointA, lunchActivity, pointC, pointB];
    const result = optimizeDayItinerary(input);
    assert.strictEqual(result.activities.length, 4);
    // Lunch should remain at index 1 (between the first coordinated attraction and the rest)
    assert.strictEqual(result.activities[1].title, "Lunch at Local Restaurant");
    assert.strictEqual(result.activities[1].category, "food");
    // The 3 coordinated activities (A, B, C) should be ordered A -> B -> C around Lunch
    const coordinatedTitles = [result.activities[0].title, result.activities[2].title, result.activities[3].title];
    assert.deepStrictEqual(coordinatedTitles, ["Point A", "Point B", "Point C"]);
});
test("optimizeDayItinerary: startAttractionTitle respects custom starting stop", () => {
    const input = [pointA, pointB, pointC];
    // Explicitly ask to start with Point C
    const result = optimizeDayItinerary(input, { startAttractionTitle: "Point C" });
    assert.strictEqual(result.activities[0].title, "Point C");
    assert.strictEqual(result.activities[1].title, "Point B");
    assert.strictEqual(result.activities[2].title, "Point A");
});
// ===========================================================================
// SECTION 2: optimizeItineraryDays Multi-Day Unit Tests
// ===========================================================================
test("optimizeItineraryDays: handles empty array without error", () => {
    const result = optimizeItineraryDays([]);
    assert.deepStrictEqual(result.dayResults, []);
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.deepStrictEqual(result.activities, []);
});
test("optimizeItineraryDays: strictly preserves dayIndex across all days (NO DAY MIXING)", () => {
    const day1Activities = [
        { ...pointA, dayIndex: 1, title: "Day1 - Point A" },
        { ...pointC, dayIndex: 1, title: "Day1 - Point C" },
        { ...pointB, dayIndex: 1, title: "Day1 - Point B" },
    ];
    const day2Activities = [
        { ...tajMahal, dayIndex: 2, title: "Day2 - Taj Mahal" },
        { ...agraFort, dayIndex: 2, title: "Day2 - Agra Fort" },
    ];
    const day3Activities = [
        { ...mehtabBagh, dayIndex: 3, title: "Day3 - Mehtab Bagh" },
    ];
    const allActivities = [...day1Activities, ...day2Activities, ...day3Activities];
    const result = optimizeItineraryDays(allActivities);
    assert.strictEqual(result.dayResults.length, 3);
    assert.strictEqual(result.activities.length, 6);
    // Verify Day 1
    const day1Out = result.activities.filter((a) => a.dayIndex === 1);
    assert.strictEqual(day1Out.length, 3);
    assert.deepStrictEqual(day1Out.map((a) => a.title), ["Day1 - Point A", "Day1 - Point B", "Day1 - Point C"]);
    // Verify Day 2
    const day2Out = result.activities.filter((a) => a.dayIndex === 2);
    assert.strictEqual(day2Out.length, 2);
    assert.ok(day2Out.every((a) => a.dayIndex === 2));
    // Verify Day 3
    const day3Out = result.activities.filter((a) => a.dayIndex === 3);
    assert.strictEqual(day3Out.length, 1);
    assert.strictEqual(day3Out[0].title, "Day3 - Mehtab Bagh");
    assert.strictEqual(day3Out[0].dayIndex, 3);
    // INVARIANT CHECK: Zero attractions have crossed day boundaries
    assert.strictEqual(day1Out.every((a) => a.title.startsWith("Day1")), true);
    assert.strictEqual(day2Out.every((a) => a.title.startsWith("Day2")), true);
    assert.strictEqual(day3Out.every((a) => a.title.startsWith("Day3")), true);
});
test("optimizeItineraryDays: preserves ALL selected attractions with zero drops or duplicates", () => {
    const activities = [
        { ...pointA, dayIndex: 1, title: "Stop A" },
        { ...pointB, dayIndex: 1, title: "Stop B" },
        { ...pointC, dayIndex: 1, title: "Stop C" },
        { ...tajMahal, dayIndex: 2, title: "Stop D" },
        { ...agraFort, dayIndex: 2, title: "Stop E" },
    ];
    const result = optimizeItineraryDays(activities);
    const inputTitles = activities.map((a) => a.title).sort();
    const outputTitles = result.activities.map((a) => a.title).sort();
    assert.strictEqual(result.activities.length, activities.length);
    assert.deepStrictEqual(outputTitles, inputTitles);
});
test("optimizeItineraryDays: handles heterogeneous days (3 stops, 1 stop, 0 stops)", () => {
    const day1 = [
        { ...pointA, dayIndex: 1, title: "A" },
        { ...pointB, dayIndex: 1, title: "B" },
        { ...pointC, dayIndex: 1, title: "C" },
    ];
    const day2 = [
        { ...tajMahal, dayIndex: 2, title: "D" },
    ];
    const result = optimizeItineraryDays([...day1, ...day2]);
    assert.strictEqual(result.dayResults.length, 2);
    assert.strictEqual(result.dayResults[0].dayIndex, 1);
    assert.strictEqual(result.dayResults[0].optimized, true);
    assert.strictEqual(result.dayResults[1].dayIndex, 2);
    assert.strictEqual(result.dayResults[1].optimized, false); // Single stop
    assert.strictEqual(result.dayResults[1].totalDistanceKm, 0);
    // Total distance is Day 1's distance
    assert.strictEqual(result.totalDistanceKm, result.dayResults[0].totalDistanceKm);
});
test("optimizeItineraryDays: totalDistanceKm is strictly the sum of all day distances", () => {
    const day1 = [
        { ...pointA, dayIndex: 1, title: "A" },
        { ...pointB, dayIndex: 1, title: "B" },
    ];
    const day2 = [
        { ...tajMahal, dayIndex: 2, title: "Taj" },
        { ...agraFort, dayIndex: 2, title: "Fort" },
    ];
    const result = optimizeItineraryDays([...day1, ...day2]);
    const expectedSum = Math.round((result.dayResults[0].totalDistanceKm + result.dayResults[1].totalDistanceKm) * 100) / 100;
    assert.strictEqual(result.totalDistanceKm, expectedSum);
});
// ===========================================================================
// SECTION 3: Controller & Route Integration Tests
// ===========================================================================
test("optimizeItineraryDay: invalid tripId format rejected with 400", async () => {
    const req = {
        params: { tripId: "invalid-id-format" },
        body: { dayIndex: 1 },
        userId: "507f191e810c19729de860ea",
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Invalid trip ID.");
});
test("optimizeItineraryDay: non-existent trip returns 404", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const origFindById = Trip.findById;
    Trip.findById = async () => null;
    const req = {
        params: { tripId },
        body: { dayIndex: 1 },
        userId: "507f191e810c19729de860ea",
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Trip not found.");
    Trip.findById = origFindById;
});
test("optimizeItineraryDay: accessing another user's trip returns 403 Forbidden", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const ownerId = "507f191e810c19729de860ea";
    const otherId = "507f191e810c19729de860eb";
    const origFindById = Trip.findById;
    Trip.findById = async () => ({ _id: tripId, user: ownerId });
    const req = {
        params: { tripId },
        body: { dayIndex: 1 },
        userId: otherId,
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Forbidden");
    Trip.findById = origFindById;
});
test("optimizeItineraryDay: invalid dayIndex rejected with 400", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const origFindById = Trip.findById;
    Trip.findById = async () => ({ _id: tripId, user: userId });
    const req = {
        params: { tripId },
        body: { dayIndex: 0 }, // invalid (< 1)
        userId,
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.ok(res.body?.message.includes("valid dayIndex"));
    Trip.findById = origFindById;
});
test("optimizeItineraryDay: in-memory activities optimization returns 200 with optimized stops", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const origFindById = Trip.findById;
    Trip.findById = async () => ({ _id: tripId, user: userId });
    const activities = [
        { ...pointA, dayIndex: 1 },
        { ...pointC, dayIndex: 1 },
        { ...pointB, dayIndex: 1 },
    ];
    const req = {
        params: { tripId },
        body: { dayIndex: 1, activities },
        userId,
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.optimized, true);
    assert.strictEqual(res.body?.data?.activities.length, 3);
    assert.strictEqual(res.body?.data?.activities[0].title, "Point A");
    assert.strictEqual(res.body?.data?.activities[1].title, "Point B");
    assert.strictEqual(res.body?.data?.activities[2].title, "Point C");
    Trip.findById = origFindById;
});
test("optimizeItineraryDay: saved database itinerary optimization updates DB and returns 200", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const origFindById = Trip.findById;
    const origFindOne = Itinerary.findOne;
    let savedDays = [];
    const mockItinerary = {
        _id: "itin123",
        trip: tripId,
        user: userId,
        days: [
            { ...pointA, dayIndex: 1 },
            { ...pointC, dayIndex: 1 },
            { ...pointB, dayIndex: 1 },
            { ...tajMahal, dayIndex: 2 },
        ],
        save: async function () {
            savedDays = this.days;
            return this;
        },
    };
    Trip.findById = async () => ({ _id: tripId, user: userId });
    Itinerary.findOne = async () => mockItinerary;
    const req = {
        params: { tripId },
        body: { dayIndex: 1 },
        userId,
    };
    const res = createRes();
    await optimizeItineraryDay(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.optimized, true);
    // Check that savedDays preserved Day 2 unchanged and reordered Day 1
    assert.strictEqual(savedDays.length, 4);
    const day1Saved = savedDays.filter((a) => a.dayIndex === 1);
    const day2Saved = savedDays.filter((a) => a.dayIndex === 2);
    assert.strictEqual(day1Saved.length, 3);
    assert.strictEqual(day2Saved.length, 1);
    assert.deepStrictEqual(day1Saved.map((a) => a.title), ["Point A", "Point B", "Point C"]);
    assert.strictEqual(day2Saved[0].title, "Taj Mahal");
    Trip.findById = origFindById;
    Itinerary.findOne = origFindOne;
});
test("optimizeAllItineraryDaysRoute: invalid tripId format rejected with 400", async () => {
    const req = {
        params: { tripId: "invalid-id-format" },
        userId: "507f191e810c19729de860ea",
    };
    const res = createRes();
    await optimizeAllItineraryDaysRoute(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
});
test("optimizeAllItineraryDaysRoute: accessing another user's trip returns 403 Forbidden", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const ownerId = "507f191e810c19729de860ea";
    const otherId = "507f191e810c19729de860eb";
    const origFindById = Trip.findById;
    Trip.findById = async () => ({ _id: tripId, user: ownerId });
    const req = {
        params: { tripId },
        userId: otherId,
    };
    const res = createRes();
    await optimizeAllItineraryDaysRoute(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.success, false);
    Trip.findById = origFindById;
});
test("optimizeAllItineraryDaysRoute: in-memory multi-day optimization returns 200 and preserves day isolation", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const origFindById = Trip.findById;
    Trip.findById = async () => ({ _id: tripId, user: userId });
    const activities = [
        { ...pointA, dayIndex: 1 },
        { ...pointC, dayIndex: 1 },
        { ...pointB, dayIndex: 1 },
        { ...tajMahal, dayIndex: 2 },
        { ...agraFort, dayIndex: 2 },
    ];
    const req = {
        params: { tripId },
        body: { activities },
        userId,
    };
    const res = createRes();
    await optimizeAllItineraryDaysRoute(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.dayResults.length, 2);
    assert.strictEqual(res.body?.data?.activities.length, 5);
    // Verify Day 1 order is A -> B -> C
    const day1 = res.body?.data?.activities.filter((a) => a.dayIndex === 1);
    assert.deepStrictEqual(day1.map((a) => a.title), ["Point A", "Point B", "Point C"]);
    // Verify Day 2 items stayed in Day 2
    const day2 = res.body?.data?.activities.filter((a) => a.dayIndex === 2);
    assert.strictEqual(day2.length, 2);
    assert.ok(day2.every((a) => a.dayIndex === 2));
    Trip.findById = origFindById;
});
test("optimizeAllItineraryDaysRoute: saved itinerary updates DB and returns 200", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const origFindById = Trip.findById;
    const origFindOne = Itinerary.findOne;
    let savedDays = [];
    const mockItinerary = {
        _id: "itin123",
        trip: tripId,
        user: userId,
        days: [
            { ...pointA, dayIndex: 1 },
            { ...pointC, dayIndex: 1 },
            { ...pointB, dayIndex: 1 },
            { ...tajMahal, dayIndex: 2 },
        ],
        save: async function () {
            savedDays = this.days;
            return this;
        },
    };
    Trip.findById = async () => ({ _id: tripId, user: userId });
    Itinerary.findOne = async () => mockItinerary;
    const req = {
        params: { tripId },
        userId,
    };
    const res = createRes();
    await optimizeAllItineraryDaysRoute(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(savedDays.length, 4);
    Trip.findById = origFindById;
    Itinerary.findOne = origFindOne;
});
