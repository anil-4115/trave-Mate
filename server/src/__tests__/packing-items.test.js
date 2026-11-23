import test from "node:test";
import assert from "node:assert";
import { createPackingItem, deletePackingItem, listPackingItems, updatePackingItem, } from "../controllers/packingController.js";
import PackingItem from "../models/PackingItem.js";
import Trip from "../models/Trip.js";
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
const tripId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const otherUserId = "507f1f77bcf86cd799439013";
const itemId = "507f1f77bcf86cd799439014";
test("packing: unauthenticated requests are rejected", async () => {
    const res = createRes();
    await listPackingItems({ params: { tripId } }, res);
    assert.strictEqual(res.statusCode, 401);
});
test("packing: owner can list, add, update, pack, and delete items", async () => {
    const originalTripFindOne = Trip.findOne;
    const originalPackingFind = PackingItem.find;
    const originalPackingCreate = PackingItem.create;
    const originalPackingFindOne = PackingItem.findOne;
    const originalPackingFindOneAndDelete = PackingItem.findOneAndDelete;
    const item = {
        _id: itemId,
        trip: tripId,
        name: "Charger",
        category: "Electronics",
        quantity: 1,
        isPacked: false,
        save: async () => item,
    };
    Trip.findOne = async () => ({ _id: tripId, user: userId });
    PackingItem.find = () => ({
        sort: async () => [item],
    });
    PackingItem.create = async (value) => ({ ...item, ...value });
    PackingItem.findOne = async () => item;
    PackingItem.findOneAndDelete = async () => item;
    try {
        const req = { params: { tripId }, userId, body: {
                name: "Charger",
                category: "Electronics",
                quantity: 1,
                notes: "",
            } };
        let res = createRes();
        await listPackingItems(req, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.data.length, 1);
        res = createRes();
        await createPackingItem(req, res);
        assert.strictEqual(res.statusCode, 201);
        res = createRes();
        await updatePackingItem({ ...req, params: { tripId, itemId }, body: { isPacked: true } }, res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(item.isPacked, true);
        res = createRes();
        await deletePackingItem({ ...req, params: { tripId, itemId } }, res);
        assert.strictEqual(res.statusCode, 200);
    }
    finally {
        Trip.findOne = originalTripFindOne;
        PackingItem.find = originalPackingFind;
        PackingItem.create = originalPackingCreate;
        PackingItem.findOne = originalPackingFindOne;
        PackingItem.findOneAndDelete = originalPackingFindOneAndDelete;
    }
});
test("packing: another user cannot access the trip checklist", async () => {
    const originalTripFindOne = Trip.findOne;
    Trip.findOne = async () => null;
    try {
        const res = createRes();
        await listPackingItems({ params: { tripId }, userId: otherUserId }, res);
        assert.strictEqual(res.statusCode, 404);
    }
    finally {
        Trip.findOne = originalTripFindOne;
    }
});
test("packing: invalid trip and item IDs are rejected", async () => {
    const invalidReq = { params: { tripId: "bad" }, userId };
    const res = createRes();
    await listPackingItems(invalidReq, res);
    assert.strictEqual(res.statusCode, 400);
    const originalTripFindOne = Trip.findOne;
    Trip.findOne = async () => ({ _id: tripId, user: userId });
    try {
        const invalidFieldRes = createRes();
        await createPackingItem({
            params: { tripId },
            userId,
            body: {
                name: "Tent",
                category: "Invalid",
                quantity: 0,
            },
        }, invalidFieldRes);
        assert.strictEqual(invalidFieldRes.statusCode, 400);
        const itemRes = createRes();
        await updatePackingItem({ params: { tripId, itemId: "bad" }, userId, body: {} }, itemRes);
        assert.strictEqual(itemRes.statusCode, 400);
    }
    finally {
        Trip.findOne = originalTripFindOne;
    }
});
test("packing: item from another trip is not modified through this trip", async () => {
    const originalTripFindOne = Trip.findOne;
    const originalPackingFindOne = PackingItem.findOne;
    Trip.findOne = async () => ({ _id: tripId, user: userId });
    PackingItem.findOne = async () => null;
    try {
        const res = createRes();
        await updatePackingItem({ params: { tripId, itemId }, userId, body: { isPacked: true } }, res);
        assert.strictEqual(res.statusCode, 404);
    }
    finally {
        Trip.findOne = originalTripFindOne;
        PackingItem.findOne = originalPackingFindOne;
    }
});
