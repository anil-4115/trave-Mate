import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { deleteTrip } from "../controllers/tripController.js";
import Trip from "../models/Trip.js";
import Itinerary from "../models/Itinerary.js";
import Expense from "../models/Expense.js";
import PackingItem from "../models/PackingItem.js";
function createRes() {
    const res = { statusCode: 200, body: null };
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
test("deleteTrip: unauthenticated requests are rejected", async () => {
    const req = { params: { tripId: "507f1f77bcf86cd799439011" } };
    const res = createRes();
    await deleteTrip(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
});
test("deleteTrip: owner deletes the trip and related records", async () => {
    const tripId = "507f1f77bcf86cd799439011";
    const userId = "507f191e810c19729de860ea";
    const calls = [];
    const originalStartSession = mongoose.startSession;
    const originalTripFindOne = Trip.findOne;
    const originalTripDeleteOne = Trip.deleteOne;
    const originalItineraryDeleteOne = Itinerary.deleteOne;
    const originalExpenseDeleteMany = Expense.deleteMany;
    const originalPackingDeleteMany = PackingItem.deleteMany;
    const session = {
        withTransaction: async (callback) => callback(),
        endSession: async () => undefined,
    };
    mongoose.startSession = async () => session;
    Trip.findOne = () => ({
        session: async () => ({ _id: tripId }),
    });
    Itinerary.deleteOne = () => ({
        session: async () => {
            calls.push("itinerary");
        },
    });
    Expense.deleteMany = () => ({
        session: async () => {
            calls.push("expenses");
        },
    });
    PackingItem.deleteMany = () => ({
        session: async () => {
            calls.push("packing");
        },
    });
    Trip.deleteOne = () => ({
        session: async () => {
            calls.push("trip");
        },
    });
    try {
        const req = { params: { tripId }, userId };
        const res = createRes();
        await deleteTrip(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(calls, ["itinerary", "expenses", "packing", "trip"]);
    }
    finally {
        mongoose.startSession = originalStartSession;
        Trip.findOne = originalTripFindOne;
        Trip.deleteOne = originalTripDeleteOne;
        Itinerary.deleteOne = originalItineraryDeleteOne;
        Expense.deleteMany = originalExpenseDeleteMany;
        PackingItem.deleteMany = originalPackingDeleteMany;
    }
});
