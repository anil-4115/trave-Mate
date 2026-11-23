import test from "node:test";
import assert from "node:assert";
import {
  optimizeAttractionRoute,
  setAttractionFetcherForTest,
  resetAttractionFetcherForTest,
} from "../controllers/attractionController.js";
import Destination from "../models/Destination.js";
import type { RealAttraction } from "../services/attractionService.js";

function createRes() {
  const res: any = {
    statusCode: 200,
    body: null,
  };
  res.status = function (code: number) {
    this.statusCode = code;
    return this;
  };
  res.json = function (payload: any) {
    this.body = payload;
    return this;
  };
  return res;
}

const mockAgraDestination = {
  _id: "507f1f77bcf86cd799439011",
  name: "Agra",
};

const mockTrustedAgraAttractions: RealAttraction[] = [
  {
    id: "agra-taj-mahal",
    name: "Taj Mahal",
    latitude: 27.1751,
    longitude: 78.0421,
    category: "culture",
    locality: "Agra",
    mapUrl: "https://www.openstreetmap.org/taj-mahal",
    source: "curated",
    sourceLabel: "TravelMate curated starter record",
    estimatedDurationMinutes: 120,
  },
  {
    id: "agra-fort",
    name: "Agra Fort",
    latitude: 27.1795,
    longitude: 78.0211,
    category: "culture",
    locality: "Agra",
    mapUrl: "https://www.openstreetmap.org/agra-fort",
    source: "curated",
    sourceLabel: "TravelMate curated starter record",
    estimatedDurationMinutes: 120,
  },
  {
    id: "mehtab-bagh",
    name: "Mehtab Bagh",
    latitude: 27.1800,
    longitude: 78.0420,
    category: "nature",
    locality: "Agra",
    mapUrl: "https://www.openstreetmap.org/mehtab-bagh",
    source: "curated",
    sourceLabel: "TravelMate curated starter record",
    estimatedDurationMinutes: 90,
  },
];

// --- TEST 1: SUCCESSFUL ROUTE OPTIMIZATION ---

test("route-api: successful route optimization returns 200 and ordered stops", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => ({
    attractions: mockTrustedAgraAttractions,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: {
      attractionIds: ["agra-taj-mahal", "agra-fort", "mehtab-bagh"],
      startAttractionId: "agra-taj-mahal",
    },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body?.success, true);
  assert.strictEqual(res.body?.destinationName, "Agra");
  assert.strictEqual(res.body?.orderedStops.length, 3);
  assert.strictEqual(res.body?.orderedStops[0].id, "agra-taj-mahal");
  assert.strictEqual(res.body?.orderedStops[1].id, "mehtab-bagh");
  assert.strictEqual(res.body?.orderedStops[2].id, "agra-fort");
  assert.strictEqual(res.body?.legs.length, 2);
  assert.ok(res.body?.totalDistanceKm > 0);
  assert.ok(res.body?.disclaimer.includes("straight-line geographical estimates"));

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 2: UNKNOWN DESTINATION ---

test("route-api: unknown destination returns 404", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => null,
  });

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: { attractionIds: ["agra-taj-mahal"] },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(res.body?.success, false);
  assert.ok(res.body?.message.includes("Destination not found"));

  Destination.findById = originalFindById;
});

// --- TEST 3: UNKNOWN ATTRACTION ID ---

test("route-api: unknown attraction ID returns 400", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => ({
    attractions: mockTrustedAgraAttractions,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: { attractionIds: ["agra-taj-mahal", "fake-attraction-id"] },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body?.success, false);
  assert.ok(res.body?.message.includes('Attraction with ID "fake-attraction-id" was not found'));

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 4: EMPTY ATTRACTION SELECTION ---

test("route-api: empty or missing attractionIds array returns 400", async () => {
  const req1: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: { attractionIds: [] },
  };
  const res1 = createRes();
  await optimizeAttractionRoute(req1, res1);

  assert.strictEqual(res1.statusCode, 400);
  assert.strictEqual(res1.body?.success, false);
  assert.ok(res1.body?.message.includes("At least one attraction ID must be provided"));

  const req2: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: {},
  };
  const res2 = createRes();
  await optimizeAttractionRoute(req2, res2);

  assert.strictEqual(res2.statusCode, 400);
  assert.strictEqual(res2.body?.success, false);
});

// --- TEST 5: DUPLICATE ATTRACTION IDS ---

test("route-api: duplicate attraction IDs in selection are safely deduplicated", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => ({
    attractions: mockTrustedAgraAttractions,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: {
      attractionIds: ["agra-taj-mahal", "agra-fort", "agra-taj-mahal"],
    },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body?.orderedStops.length, 2);
  assert.strictEqual(res.body?.legs.length, 1);

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 6: INVALID STARTING ATTRACTION ID ---

test("route-api: starting attraction not in selected attractionIds returns 400", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => ({
    attractions: mockTrustedAgraAttractions,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: {
      attractionIds: ["agra-taj-mahal", "agra-fort"],
      startAttractionId: "mehtab-bagh", // valid in Agra, but not in user's selection
    },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body?.success, false);
  assert.ok(res.body?.message.includes('Start attraction ID "mehtab-bagh" must be one of the selected attractions'));

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 7: MISSING COORDINATES ON TRUSTED RECORD ---

test("route-api: attraction missing coordinates returns 400 with descriptive error", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  const attractionsWithMissingCoords: RealAttraction[] = [
    {
      id: "no-coords",
      name: "Unmapped Site",
      category: "culture",
      source: "curated",
      sourceLabel: "Test",
      estimatedDurationMinutes: 60,
    },
  ];

  setAttractionFetcherForTest(async () => ({
    attractions: attractionsWithMissingCoords,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: { attractionIds: ["no-coords"] },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body?.success, false);
  assert.ok(res.body?.message.includes("missing valid geographic coordinates"));

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 8: ATTRACTION SERVICE FAILURE ---

test("route-api: attraction service failure returns 503", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => {
    throw new Error("Overpass API network timeout");
  });

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: { attractionIds: ["agra-taj-mahal"] },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 503);
  assert.strictEqual(res.body?.success, false);
  assert.ok(res.body?.message.includes("temporarily unavailable"));

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

// --- TEST 9: INVALID DESTINATION OBJECTID FORMAT ---

test("route-api: invalid destination ID format returns 400 Bad Request", async () => {
  const req: any = {
    params: { destinationId: "invalid-not-an-objectid" },
    body: { attractionIds: ["agra-taj-mahal"] },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body?.success, false);
  assert.strictEqual(res.body?.message, "Invalid destination ID.");
});

// --- TEST 10: CORRECT RESPONSE STRUCTURE & DISTANCE TOTALS ---

test("route-api: response structure has valid legs and matching totalDistanceKm", async () => {
  const originalFindById = Destination.findById;
  (Destination.findById as any) = () => ({
    select: async () => mockAgraDestination,
  });

  setAttractionFetcherForTest(async () => ({
    attractions: mockTrustedAgraAttractions,
    source: "curated",
  }));

  const req: any = {
    params: { destinationId: "507f1f77bcf86cd799439011" },
    body: {
      attractionIds: ["agra-taj-mahal", "agra-fort"],
    },
  };
  const res = createRes();

  await optimizeAttractionRoute(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body?.destinationId, "507f1f77bcf86cd799439011");
  assert.strictEqual(res.body?.destinationName, "Agra");
  assert.strictEqual(typeof res.body?.totalDistanceKm, "number");
  assert.strictEqual(res.body?.totalDistanceKm, 2.13);

  // Verify legs match stops
  assert.strictEqual(res.body?.legs.length, 1);
  assert.strictEqual(res.body?.legs[0].fromId, "agra-taj-mahal");
  assert.strictEqual(res.body?.legs[0].toId, "agra-fort");
  assert.strictEqual(res.body?.legs[0].distanceKm, 2.13);

  // Verify ordered stops
  assert.strictEqual(res.body?.orderedStops[0].order, 1);
  assert.strictEqual(res.body?.orderedStops[0].distanceFromPreviousKm, 0);
  assert.strictEqual(res.body?.orderedStops[1].order, 2);
  assert.strictEqual(res.body?.orderedStops[1].distanceFromPreviousKm, 2.13);

  Destination.findById = originalFindById;
  resetAttractionFetcherForTest();
});

