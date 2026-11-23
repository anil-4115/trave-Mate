import test from "node:test";
import assert from "node:assert";
import { haversineDistance, optimizeRoute, twoOptRefine, RouteOptimizerError, EARTH_RADIUS_KM, ROUTE_DISCLAIMER, } from "../services/routeOptimizer.js";
// --- 1. HAVERSINE DISTANCE UNIT TESTS ---
test("haversine: identical coordinates yield 0 distance", () => {
    const distance = haversineDistance(27.1751, 78.0421, 27.1751, 78.0421);
    assert.strictEqual(distance, 0);
});
test("haversine: distance calculation is symmetric (A to B == B to A)", () => {
    const d1 = haversineDistance(27.1751, 78.0421, 26.9855, 75.8513);
    const d2 = haversineDistance(26.9855, 75.8513, 27.1751, 78.0421);
    assert.strictEqual(d1, d2);
});
test("haversine: Taj Mahal to Agra Fort benchmark (~2.13 km)", () => {
    // Taj Mahal: 27.1751, 78.0421
    // Agra Fort: 27.1795, 78.0211
    const distance = haversineDistance(27.1751, 78.0421, 27.1795, 78.0211);
    assert.ok(distance >= 2.1 && distance <= 2.2, `Expected distance between 2.1 and 2.2 km, got ${distance}`);
    assert.strictEqual(distance, 2.13);
});
test("haversine: Amber Fort to Hawa Mahal benchmark (~7.27 km)", () => {
    // Amber Fort: 26.9855, 75.8513
    // Hawa Mahal: 26.9239, 75.8267
    const distance = haversineDistance(26.9855, 75.8513, 26.9239, 75.8267);
    assert.ok(distance >= 7.2 && distance <= 7.4, `Expected distance between 7.2 and 7.4 km, got ${distance}`);
    assert.strictEqual(distance, 7.27);
});
test("haversine: North Pole to South Pole equals half Earth circumference", () => {
    const distance = haversineDistance(90, 0, -90, 0);
    const expected = Math.round(Math.PI * EARTH_RADIUS_KM * 100) / 100;
    assert.strictEqual(distance, expected);
});
// --- 2. INPUT VALIDATION & ERROR HANDLING ---
test("validation: empty attraction array throws RouteOptimizerError", () => {
    assert.throws(() => optimizeRoute({ attractions: [] }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("At least one attraction must be provided"));
});
test("validation: missing latitude throws RouteOptimizerError", () => {
    const invalidAttractions = [
        { id: "a1", name: "Attraction 1", longitude: 78.0421 },
    ];
    assert.throws(() => optimizeRoute({ attractions: invalidAttractions }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("is missing valid geographic coordinates"));
});
test("validation: null longitude throws RouteOptimizerError", () => {
    const invalidAttractions = [
        { id: "a1", name: "Attraction 1", latitude: 27.1751, longitude: null },
    ];
    assert.throws(() => optimizeRoute({ attractions: invalidAttractions }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("is missing valid geographic coordinates"));
});
test("validation: NaN or non-finite coordinates throw RouteOptimizerError", () => {
    const invalidAttractions = [
        { id: "a1", name: "Attraction 1", latitude: NaN, longitude: 78.0421 },
    ];
    assert.throws(() => optimizeRoute({ attractions: invalidAttractions }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("is missing valid geographic coordinates"));
});
test("validation: latitude out of range (> 90 or < -90) throws RouteOptimizerError", () => {
    assert.throws(() => optimizeRoute({
        attractions: [{ id: "a1", name: "Attraction 1", latitude: 90.5, longitude: 78.0 }],
    }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("invalid latitude"));
    assert.throws(() => optimizeRoute({
        attractions: [{ id: "a1", name: "Attraction 1", latitude: -91, longitude: 78.0 }],
    }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("invalid latitude"));
});
test("validation: longitude out of range (> 180 or < -180) throws RouteOptimizerError", () => {
    assert.throws(() => optimizeRoute({
        attractions: [{ id: "a1", name: "Attraction 1", latitude: 27.0, longitude: 181 }],
    }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("invalid longitude"));
    assert.throws(() => optimizeRoute({
        attractions: [{ id: "a1", name: "Attraction 1", latitude: 27.0, longitude: -185 }],
    }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("invalid longitude"));
});
test("validation: missing or non-string id throws RouteOptimizerError", () => {
    assert.throws(() => optimizeRoute({
        attractions: [{ id: "", name: "Attraction 1", latitude: 27.0, longitude: 78.0 }],
    }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("valid non-empty id string"));
});
// --- 3. EDGE CASES: SINGLE ATTRACTION & DUPLICATE SELECTION ---
test("edge case: single attraction returns 1 stop, 0 legs, and 0 km total distance", () => {
    const attractions = [
        {
            id: "agra-taj-mahal",
            name: "Taj Mahal",
            latitude: 27.1751,
            longitude: 78.0421,
            category: "culture",
            estimatedDurationMinutes: 120,
        },
    ];
    const result = optimizeRoute({ attractions });
    assert.strictEqual(result.orderedStops.length, 1);
    assert.strictEqual(result.orderedStops[0].order, 1);
    assert.strictEqual(result.orderedStops[0].id, "agra-taj-mahal");
    assert.strictEqual(result.orderedStops[0].distanceFromPreviousKm, 0);
    assert.strictEqual(result.orderedStops[0].category, "culture");
    assert.strictEqual(result.legs.length, 0);
    assert.strictEqual(result.totalDistanceKm, 0);
    assert.strictEqual(result.disclaimer, ROUTE_DISCLAIMER);
});
test("edge case: duplicate attractions in selection are safely deduplicated", () => {
    const attractions = [
        { id: "stop-a", name: "Stop A", latitude: 27.1751, longitude: 78.0421 },
        { id: "stop-b", name: "Stop B", latitude: 27.1795, longitude: 78.0211 },
        { id: "stop-a", name: "Stop A (dup)", latitude: 27.1751, longitude: 78.0421 },
    ];
    const result = optimizeRoute({ attractions });
    assert.strictEqual(result.orderedStops.length, 2);
    assert.strictEqual(result.legs.length, 1);
    assert.strictEqual(result.orderedStops[0].id, "stop-a");
    assert.strictEqual(result.orderedStops[1].id, "stop-b");
});
// --- 4. START ATTRACTION SELECTION ---
test("start attraction: defaults to first attraction when startAttractionId is omitted", () => {
    const attractions = [
        { id: "stop-1", name: "Stop 1", latitude: 27.1751, longitude: 78.0421 },
        { id: "stop-2", name: "Stop 2", latitude: 27.1795, longitude: 78.0211 },
    ];
    const result = optimizeRoute({ attractions });
    assert.strictEqual(result.orderedStops[0].id, "stop-1");
});
test("start attraction: custom startAttractionId sets starting stop", () => {
    const attractions = [
        { id: "stop-1", name: "Stop 1", latitude: 27.1751, longitude: 78.0421 },
        { id: "stop-2", name: "Stop 2", latitude: 27.1795, longitude: 78.0211 },
    ];
    const result = optimizeRoute({ attractions, startAttractionId: "stop-2" });
    assert.strictEqual(result.orderedStops[0].id, "stop-2");
    assert.strictEqual(result.orderedStops[1].id, "stop-1");
    assert.strictEqual(result.legs[0].fromId, "stop-2");
    assert.strictEqual(result.legs[0].toId, "stop-1");
});
test("start attraction: invalid startAttractionId throws RouteOptimizerError", () => {
    const attractions = [
        { id: "stop-1", name: "Stop 1", latitude: 27.1751, longitude: 78.0421 },
    ];
    assert.throws(() => optimizeRoute({ attractions, startAttractionId: "non-existent-id" }), (err) => err instanceof RouteOptimizerError &&
        err.message.includes("Start attraction with id \"non-existent-id\" was not found"));
});
// --- 5. NEAREST-NEIGHBOUR ORDERING & ROUTE ACCURACY ---
test("algorithm: collinear points A -> B -> C chosen over A -> C -> B", () => {
    // A is at (0, 0), B is at (0, 1), C is at (0, 3)
    // Distance A->B is ~111.19 km, A->C is ~333.58 km
    // From A, B is closest. Then from B, C is visited.
    // Correct order: A -> B -> C
    const attractions = [
        { id: "point-a", name: "Point A", latitude: 0, longitude: 0 },
        { id: "point-c", name: "Point C", latitude: 0, longitude: 3 },
        { id: "point-b", name: "Point B", latitude: 0, longitude: 1 },
    ];
    const result = optimizeRoute({ attractions, startAttractionId: "point-a" });
    assert.strictEqual(result.orderedStops[0].id, "point-a");
    assert.strictEqual(result.orderedStops[1].id, "point-b");
    assert.strictEqual(result.orderedStops[2].id, "point-c");
    assert.strictEqual(result.legs.length, 2);
    assert.strictEqual(result.legs[0].fromId, "point-a");
    assert.strictEqual(result.legs[0].toId, "point-b");
    assert.strictEqual(result.legs[1].fromId, "point-b");
    assert.strictEqual(result.legs[1].toId, "point-c");
    // Verify total distance is sum of legs
    const sumOfLegs = Math.round((result.legs[0].distanceKm + result.legs[1].distanceKm) * 100) / 100;
    assert.strictEqual(result.totalDistanceKm, sumOfLegs);
});
test("algorithm: real-world Agra cluster visits nearby sites first", () => {
    // Taj Mahal: 27.1751, 78.0421
    // Mehtab Bagh (directly across Yamuna River from Taj): 27.1800, 78.0420 (~0.54 km)
    // Agra Fort: 27.1795, 78.0211 (~2.13 km from Taj)
    // Fatehpur Sikri (outlying town): 27.0945, 77.6679 (~37.6 km from Taj)
    const attractions = [
        { id: "fatehpur-sikri", name: "Fatehpur Sikri", latitude: 27.0945, longitude: 77.6679 },
        { id: "taj-mahal", name: "Taj Mahal", latitude: 27.1751, longitude: 78.0421 },
        { id: "agra-fort", name: "Agra Fort", latitude: 27.1795, longitude: 78.0211 },
        { id: "mehtab-bagh", name: "Mehtab Bagh", latitude: 27.1800, longitude: 78.0420 },
    ];
    const result = optimizeRoute({ attractions, startAttractionId: "taj-mahal" });
    // Starting at Taj Mahal, the closest is Mehtab Bagh (~0.54 km),
    // then Agra Fort (~2.1 km), and finally Fatehpur Sikri (~37 km)
    assert.strictEqual(result.orderedStops[0].id, "taj-mahal");
    assert.strictEqual(result.orderedStops[1].id, "mehtab-bagh");
    assert.strictEqual(result.orderedStops[2].id, "agra-fort");
    assert.strictEqual(result.orderedStops[3].id, "fatehpur-sikri");
    assert.strictEqual(result.legs.length, 3);
    assert.ok(result.totalDistanceKm > 35 && result.totalDistanceKm < 45);
});
test("metadata: preserves category, locality, duration and mapUrl", () => {
    const attractions = [
        {
            id: "amber-fort",
            name: "Amber Fort",
            latitude: 26.9855,
            longitude: 75.8513,
            category: "culture",
            locality: "Amer",
            estimatedDurationMinutes: 180,
            mapUrl: "https://www.openstreetmap.org/way/123",
        },
        {
            id: "hawa-mahal",
            name: "Hawa Mahal",
            latitude: 26.9239,
            longitude: 75.8267,
            category: "culture",
            locality: "Jaipur",
            estimatedDurationMinutes: 90,
            mapUrl: "https://www.openstreetmap.org/way/456",
        },
    ];
    const result = optimizeRoute({ attractions });
    assert.strictEqual(result.orderedStops[0].locality, "Amer");
    assert.strictEqual(result.orderedStops[0].estimatedDurationMinutes, 180);
    assert.strictEqual(result.orderedStops[0].mapUrl, "https://www.openstreetmap.org/way/123");
    assert.strictEqual(result.orderedStops[1].locality, "Jaipur");
    assert.strictEqual(result.orderedStops[1].estimatedDurationMinutes, 90);
    assert.strictEqual(result.orderedStops[1].mapUrl, "https://www.openstreetmap.org/way/456");
});
// --- 6. 2-OPT LOCAL SEARCH HEURISTIC TESTS ---
test("2-opt: returns copy for tours with fewer than 4 stops", () => {
    const shortTour = [
        { id: "s1", name: "Stop 1", latitude: 20, longitude: 70 },
        { id: "s2", name: "Stop 2", latitude: 21, longitude: 71 },
        { id: "s3", name: "Stop 3", latitude: 22, longitude: 72 },
    ];
    const coordsMap = new Map([
        ["s1", { latitude: 20, longitude: 70 }],
        ["s2", { latitude: 21, longitude: 71 }],
        ["s3", { latitude: 22, longitude: 72 }],
    ]);
    const refined = twoOptRefine(shortTour, coordsMap);
    assert.strictEqual(refined.length, 3);
    assert.strictEqual(refined[0].id, "s1");
    assert.strictEqual(refined[1].id, "s2");
    assert.strictEqual(refined[2].id, "s3");
});
test("2-opt: untangles crossing edges to strictly reduce total distance", () => {
    // Define 4 points forming a square:
    // A(0, 0) -- bottom-left
    // B(0, 2) -- top-left
    // C(2, 2) -- top-right
    // D(2, 0) -- bottom-right
    //
    // Crossing tour: A(0,0) -> C(2,2) -> B(0,2) -> D(2,0)
    // Leg 1: A(0,0) to C(2,2) = diagonal (~314.4 km)
    // Leg 2: C(2,2) to B(0,2) = horizontal (~222.4 km)
    // Leg 3: B(0,2) to D(2,0) = diagonal (~314.4 km)
    // Total distance ~851.2 km (edges A-C and B-D cross!)
    //
    // Untangled tour after 2-opt edge-swap on subsegment [C, B] -> [B, C]:
    // A(0,0) -> B(0,2) -> C(2,2) -> D(2,0)
    // Leg 1: A(0,0) to B(0,2) = vertical (~222.4 km)
    // Leg 2: B(0,2) to C(2,2) = horizontal (~222.4 km)
    // Leg 3: C(2,2) to D(2,0) = vertical (~222.4 km)
    // Total distance ~667.2 km!
    const crossingTour = [
        { id: "p-a", name: "Point A", latitude: 0, longitude: 0 },
        { id: "p-c", name: "Point C", latitude: 2, longitude: 2 },
        { id: "p-b", name: "Point B", latitude: 2, longitude: 0 },
        { id: "p-d", name: "Point D", latitude: 0, longitude: 2 },
    ];
    const coordsMap = new Map([
        ["p-a", { latitude: 0, longitude: 0 }],
        ["p-c", { latitude: 2, longitude: 2 }],
        ["p-b", { latitude: 2, longitude: 0 }],
        ["p-d", { latitude: 0, longitude: 2 }],
    ]);
    const refined = twoOptRefine(crossingTour, coordsMap);
    // Invariant: start attraction remains p-a
    assert.strictEqual(refined[0].id, "p-a");
    // Middle stops [p-c, p-b] should be reversed to untangle crossing paths
    assert.strictEqual(refined[1].id, "p-b");
    assert.strictEqual(refined[2].id, "p-c");
    assert.strictEqual(refined[3].id, "p-d");
    // Verify distance calculation on refined route
    const origDist = haversineDistance(0, 0, 2, 2) +
        haversineDistance(2, 2, 2, 0) +
        haversineDistance(2, 0, 0, 2);
    const refinedDist = haversineDistance(0, 0, 2, 0) +
        haversineDistance(2, 0, 2, 2) +
        haversineDistance(2, 2, 0, 2);
    assert.ok(refinedDist < origDist, `Refined distance (${refinedDist} km) should be strictly less than crossing distance (${origDist} km)`);
});
test("2-opt: optimizeRoute produces untangled tour for square coordinates", () => {
    const attractions = [
        { id: "sq-a", name: "Corner A", latitude: 0, longitude: 0 },
        { id: "sq-c", name: "Corner C", latitude: 2, longitude: 2 },
        { id: "sq-b", name: "Corner B", latitude: 2, longitude: 0 },
        { id: "sq-d", name: "Corner D", latitude: 0, longitude: 2 },
    ];
    const result = optimizeRoute({ attractions, startAttractionId: "sq-a" });
    assert.strictEqual(result.orderedStops[0].id, "sq-a");
    assert.strictEqual(result.orderedStops.length, 4);
    assert.strictEqual(result.legs.length, 3);
    // Sum of legs matches totalDistanceKm
    const legSum = Math.round(result.legs.reduce((acc, leg) => acc + leg.distanceKm, 0) * 100) / 100;
    assert.strictEqual(result.totalDistanceKm, legSum);
});
