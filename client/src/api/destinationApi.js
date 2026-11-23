const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export async function getDestinations() {
    const response = await fetch(`${API_BASE_URL}/destinations`);
    if (!response.ok) {
        throw new Error("Failed to fetch destinations");
    }
    const result = await response.json();
    return result.data;
}
export async function getDestinationAttractions(destinationId) {
    const response = await fetch(`${API_BASE_URL}/destinations/${destinationId}/attractions`);
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.warning || "Failed to fetch attractions");
    }
    return result;
}
export async function optimizeRoute(destinationId, payload) {
    const response = await fetch(`${API_BASE_URL}/destinations/${destinationId}/optimize-route`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const result = (await response.json());
    if (!response.ok) {
        throw new Error(result.message || "Failed to optimize route");
    }
    return result;
}
