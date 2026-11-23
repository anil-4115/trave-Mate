
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface Destination {
  _id: string;
  name: string;
  country: string;
  state?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  averageCostPerDay?: number;
}

export type AttractionCategory =
  | "sightseeing"
  | "nature"
  | "culture"
  | "food"
  | "relaxation"
  | "shopping";

export interface Attraction {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  category: AttractionCategory;
  locality?: string;
  mapUrl?: string;
  source: "openstreetmap" | "curated";
  sourceLabel: string;
  estimatedDurationMinutes: number;
}

interface AttractionsResponse {
  success: boolean;
  data: Attraction[];
  source: "openstreetmap" | "cached" | "curated";
  warning?: string;
  attribution?: string;
}

interface DestinationResponse {
  success: boolean;
  count: number;
  data: Destination[];
}

export interface OptimizeRouteRequest {
  attractionIds: string[];
  startAttractionId?: string;
}

export interface RouteStop {
  order: number;
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromPreviousKm: number;
  category?: AttractionCategory;
  locality?: string;
  estimatedDurationMinutes?: number;
  mapUrl?: string;
}

export interface RouteLeg {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  distanceKm: number;
}

export interface OptimizedRouteResponse {
  success: boolean;
  destinationId: string;
  destinationName: string;
  totalDistanceKm: number;
  disclaimer: string;
  orderedStops: RouteStop[];
  legs: RouteLeg[];
  message?: string;
}

export async function getDestinations(): Promise<Destination[]> {
  const response = await fetch(`${API_BASE_URL}/destinations`);

  if (!response.ok) {
    throw new Error("Failed to fetch destinations");
  }

  const result: DestinationResponse = await response.json();

  return result.data;
}

export async function getDestinationAttractions(
  destinationId: string
): Promise<AttractionsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/destinations/${destinationId}/attractions`
  );
  const result: AttractionsResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.warning || "Failed to fetch attractions");
  }
  return result;
}

export async function optimizeRoute(
  destinationId: string,
  payload: OptimizeRouteRequest
): Promise<OptimizedRouteResponse> {
  const response = await fetch(
    `${API_BASE_URL}/destinations/${destinationId}/optimize-route`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = (await response.json()) as OptimizedRouteResponse;
  if (!response.ok) {
    throw new Error(result.message || "Failed to optimize route");
  }
  return result;
}
