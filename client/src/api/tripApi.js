import { getAuthHeaders } from "./authApi";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export async function getDestinations() {
    const response = await fetch(`${API_BASE_URL}/destinations`);
    if (!response.ok) {
        throw new Error("Failed to fetch destinations");
    }
    const result = await response.json();
    return result.data;
}
export async function createTrip(tripData) {
    const response = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(tripData),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to create trip");
    }
    return result;
}
export const EXPENSE_CATEGORIES = [
    "Food",
    "Transport",
    "Accommodation",
    "Activities",
    "Other",
];
export async function getTrips() {
    const response = await fetch(`${API_BASE_URL}/trips`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    if (!response.ok) {
        throw new Error("Failed to fetch trips");
    }
    const result = await response.json();
    return result.data;
}
export async function deleteTrip(tripId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to delete trip");
    }
}
export async function updateTrip(tripId, tripData) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(tripData),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to update trip");
    }
    return result;
}
export const PACKING_CATEGORIES = [
    "Clothing",
    "Toiletries",
    "Documents",
    "Electronics",
    "Medicines",
    "Essentials",
];
export async function getPackingItems(tripId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items`, {
        headers: { ...getAuthHeaders() },
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to fetch packing items");
    }
    return result.data;
}
export async function createPackingItem(tripId, input) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to add packing item");
    }
    return result.data;
}
export async function updatePackingItem(tripId, itemId, input) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to update packing item");
    }
    return result.data;
}
export async function deletePackingItem(tripId, itemId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items/${itemId}`, { method: "DELETE", headers: { ...getAuthHeaders() } });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to delete packing item");
    }
}
export async function getExpenses(tripId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
        headers: { ...getAuthHeaders() },
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to fetch expenses");
    }
    return result.data;
}
export async function createExpense(tripId, input) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.message || "Failed to create expense");
    return result.data;
}
export async function updateExpense(tripId, expenseId, input) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.message || "Failed to update expense");
    return result.data;
}
export async function deleteExpense(tripId, expenseId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
    });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.message || "Failed to delete expense");
}
export async function generateItineraryDraft(tripId, preferences) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(preferences ? { preferences } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to generate itinerary draft");
    }
    return result.data;
}
export async function saveItinerary(tripId, days, generatedBy = "rule-based") {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ days, generatedBy }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to save itinerary");
    }
    return result.data;
}
export async function getItinerary(tripId) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`, {
            headers: {
                ...getAuthHeaders(),
            },
        });
    }
    catch {
        throw new Error("Failed to fetch itinerary. Please check your connection and try again.");
    }
    let result;
    try {
        result = await response.json();
    }
    catch {
        throw new Error(response.ok
            ? "Failed to read itinerary response"
            : "Failed to fetch itinerary");
    }
    if (response.status === 404) {
        if (result.message === "Itinerary not found for this trip.") {
            return null;
        }
        throw new Error(result.message || "Failed to fetch itinerary");
    }
    if (!response.ok) {
        throw new Error(result.message || "Failed to fetch itinerary");
    }
    if (!result.data) {
        throw new Error("Itinerary response was empty");
    }
    return result.data;
}
export async function optimizeItineraryDay(tripId, payload) {
    const url = `${API_BASE_URL}/trips/${tripId}/itinerary/optimize-day`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to optimize day itinerary route");
    }
    return result.data;
}
export async function optimizeAllItineraryDays(tripId, payload) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary/optimize-all-days`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload || {}),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to optimize all itinerary days route");
    }
    return result.data;
}
