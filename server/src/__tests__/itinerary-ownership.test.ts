import test from "node:test";
import assert from "node:assert";
import { getItineraryByTrip, upsertItinerary } from "../controllers/itineraryController.js";
import Trip from "../models/Trip.js";
import Itinerary from "../models/Itinerary.js";

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

test("getItineraryByTrip: owner can read owned itinerary", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  
  (Trip.findById as any) = async () => ({ _id: tripId, user: userId });
  (Itinerary.findOne as any) = async () => ({ _id: "i1", trip: tripId, user: userId, days: [{ dayIndex: 1, title: "Test" }] });
  
  const req: any = { params: { tripId }, userId };
  const res = createRes();
  await getItineraryByTrip(req, res);
  
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.success);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
});

test("getItineraryByTrip: different user cannot access trip owned by someone else -> 403", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const ownerId = "507f191e810c19729de860ea";
  const otherId = "507f191e810c19729de860eb";
  const originalTripFindById = Trip.findById;
  
  (Trip.findById as any) = async () => ({ _id: tripId, user: ownerId });
  
  const req: any = { params: { tripId }, userId: otherId };
  const res = createRes();
  await getItineraryByTrip(req, res);
  
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body?.success, false);
  
  Trip.findById = originalTripFindById;
});

test("getItineraryByTrip: unowned itinerary returns 404 (not exposed)", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  
  (Trip.findById as any) = async () => ({ _id: tripId, user: userId });
  (Itinerary.findOne as any) = async () => ({ _id: "i1", trip: tripId, user: undefined, days: [] });
  
  const req: any = { params: { tripId }, userId };
  const res = createRes();
  await getItineraryByTrip(req, res);
  
  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(res.body?.success, false);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
});

test("upsertItinerary: owner can save owned itinerary", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  const originalItineraryFindOneAndUpdate = Itinerary.findOneAndUpdate;
  
  (Trip.findById as any) = async () => ({ 
    _id: tripId, 
    user: userId, 
    startDate: new Date("2025-01-01"), 
    endDate: new Date("2025-01-03") 
  });
  (Itinerary.findOne as any) = async () => ({ _id: "i1", trip: tripId, user: userId });
  (Itinerary.findOneAndUpdate as any) = async () => ({ _id: "i1", trip: tripId, user: userId, days: [] });
  
  const req: any = { 
    params: { tripId }, 
    userId,
    body: { days: [{ dayIndex: 1, title: "Activity 1" }], generatedBy: "manual" }
  };
  const res = createRes();
  await upsertItinerary(req, res);
  
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.success);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
  Itinerary.findOneAndUpdate = originalItineraryFindOneAndUpdate;
});

test("upsertItinerary: different user cannot modify trip owned by someone else -> 403", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const ownerId = "507f191e810c19729de860ea";
  const otherId = "507f191e810c19729de860eb";
  const originalTripFindById = Trip.findById;
  
  (Trip.findById as any) = async () => ({ _id: tripId, user: ownerId, startDate: new Date("2025-01-01"), endDate: new Date("2025-01-03") });
  
  const req: any = { 
    params: { tripId }, 
    userId: otherId,
    body: { days: [{ dayIndex: 1, title: "Activity 1" }] }
  };
  const res = createRes();
  await upsertItinerary(req, res);
  
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body?.success, false);
  
  Trip.findById = originalTripFindById;
});

test("upsertItinerary: cannot silently claim unowned itinerary -> 409", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  
  (Trip.findById as any) = async () => ({ 
    _id: tripId, 
    user: userId, 
    startDate: new Date("2025-01-01"), 
    endDate: new Date("2025-01-03") 
  });
  (Itinerary.findOne as any) = async () => ({ _id: "i1", trip: tripId, user: undefined, days: [] });
  
  const req: any = { 
    params: { tripId }, 
    userId,
    body: { days: [{ dayIndex: 1, title: "Activity 1" }] }
  };
  const res = createRes();
  await upsertItinerary(req, res);
  
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body?.success, false);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
});

test("upsertItinerary: trip/itinerary ownership mismatch rejected -> 403", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const tripOwner = "507f191e810c19729de860ea";
  const itineraryOwner = "507f191e810c19729de860eb";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  
  (Trip.findById as any) = async () => ({ 
    _id: tripId, 
    user: tripOwner, 
    startDate: new Date("2025-01-01"), 
    endDate: new Date("2025-01-03") 
  });
  (Itinerary.findOne as any) = async () => ({ _id: "i1", trip: tripId, user: itineraryOwner, days: [] });
  
  const req: any = { 
    params: { tripId }, 
    userId: tripOwner,
    body: { days: [{ dayIndex: 1, title: "Activity 1" }] }
  };
  const res = createRes();
  await upsertItinerary(req, res);
  
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body?.success, false);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
});

test("upsertItinerary: preserves array ordering", async () => {
  const tripId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";
  const originalTripFindById = Trip.findById;
  const originalItineraryFindOne = Itinerary.findOne;
  const originalItineraryFindOneAndUpdate = Itinerary.findOneAndUpdate;
  
  (Trip.findById as any) = async () => ({ 
    _id: tripId, 
    user: userId, 
    startDate: new Date("2025-01-01"), 
    endDate: new Date("2025-01-03") 
  });
  (Itinerary.findOne as any) = async () => null;
  (Itinerary.findOneAndUpdate as any) = async (_q: any, payload: any) => {
    assert.deepStrictEqual(payload.days[0].title, "First");
    assert.deepStrictEqual(payload.days[1].title, "Second");
    return { _id: "i1", trip: tripId, user: userId, days: payload.days };
  };
  
  const req: any = { 
    params: { tripId }, 
    userId,
    body: { 
      days: [
        { dayIndex: 1, title: "First" },
        { dayIndex: 2, title: "Second" }
      ], 
      generatedBy: "manual" 
    }
  };
  const res = createRes();
  await upsertItinerary(req, res);
  
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body?.success);
  
  Trip.findById = originalTripFindById;
  Itinerary.findOne = originalItineraryFindOne;
  Itinerary.findOneAndUpdate = originalItineraryFindOneAndUpdate;
});
