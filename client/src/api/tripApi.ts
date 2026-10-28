import { getAuthHeaders } from "./authApi";

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
}

interface DestinationResponse {
  success: boolean;
  count: number;
  data: Destination[];
}

export async function getDestinations(): Promise<Destination[]> {
  const response = await fetch(`${API_BASE_URL}/destinations`);

  if (!response.ok) {
    throw new Error("Failed to fetch destinations");
  }

  const result: DestinationResponse = await response.json();

  return result.data;
}

export interface CreateTripData {
  destinationId: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
}

export async function createTrip(tripData: CreateTripData) {
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

export interface PopulatedDestination extends Destination {
  state?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  averageCostPerDay?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Trip {
  _id: string;
  destination: PopulatedDestination | string | null;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Accommodation",
  "Activities",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  _id: string;
  trip: string;
  user: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TripsResponse {
  success: boolean;
  count: number;
  data: Trip[];
}

export async function getTrips(): Promise<Trip[]> {
  const response = await fetch(`${API_BASE_URL}/trips`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch trips");
  }

  const result: TripsResponse = await response.json();

  return result.data;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  const result: { message?: string } = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to delete trip");
  }
}

interface ExpensesResponse {
  success: boolean;
  count: number;
  data: Expense[];
}

interface ExpenseResponse {
  success: boolean;
  message?: string;
  data: Expense;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string;
}

export const PACKING_CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Documents",
  "Electronics",
  "Medicines",
  "Essentials",
] as const;

export type PackingCategory = (typeof PACKING_CATEGORIES)[number];

export interface PackingItem {
  _id: string;
  trip: string;
  name: string;
  category: PackingCategory;
  quantity: number;
  isPacked: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackingItemInput {
  name: string;
  category: PackingCategory;
  quantity: number;
  notes: string;
}

interface PackingItemsResponse {
  success: boolean;
  count: number;
  data: PackingItem[];
  message?: string;
}

interface PackingItemResponse {
  success: boolean;
  message?: string;
  data: PackingItem;
}

export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items`, {
    headers: { ...getAuthHeaders() },
  });
  const result: PackingItemsResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch packing items");
  }
  return result.data;
}

export async function createPackingItem(
  tripId: string,
  input: PackingItemInput
): Promise<PackingItem> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/packing-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(input),
  });
  const result: PackingItemResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to add packing item");
  }
  return result.data;
}

export async function updatePackingItem(
  tripId: string,
  itemId: string,
  input: Partial<PackingItemInput> & { isPacked?: boolean }
): Promise<PackingItem> {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/packing-items/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(input),
    }
  );
  const result: PackingItemResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to update packing item");
  }
  return result.data;
}

export async function deletePackingItem(
  tripId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/packing-items/${itemId}`,
    { method: "DELETE", headers: { ...getAuthHeaders() } }
  );
  const result: { message?: string } = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to delete packing item");
  }
}

export async function getExpenses(tripId: string): Promise<Expense[]> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
    headers: { ...getAuthHeaders() },
  });
  const result: ExpensesResponse = await response.json();
  if (!response.ok) {
    throw new Error(
      (result as { message?: string }).message || "Failed to fetch expenses"
    );
  }
  return result.data;
}

export async function createExpense(
  tripId: string,
  input: ExpenseInput
): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(input),
  });
  const result: ExpenseResponse = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to create expense");
  return result.data;
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: ExpenseInput
): Promise<Expense> {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/expenses/${expenseId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(input),
    }
  );
  const result: ExpenseResponse = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to update expense");
  return result.data;
}

export async function deleteExpense(
  tripId: string,
  expenseId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/expenses/${expenseId}`,
    {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    }
  );
  const result: { message?: string } = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to delete expense");
}


export type ItineraryCategory =
  | "food"
  | "transport"
  | "activity"
  | "lodging"
  | "other";

export interface GeneratedActivity {
  dayIndex: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  category: ItineraryCategory;
  locationName: string;
  estimatedCost: number;
  notes: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  source?: "openstreetmap" | "curated";
}

export interface GeneratedDay {
  dayIndex: number;
  activities: GeneratedActivity[];
}

export interface GeneratedItineraryDraft {
  generatedBy: "rule-based";
  saved: false;
  durationDays: number;
  dailyBudget: number;
  estimatedTotalCost: number;
  budgetWarning?: string;
  dayPlans: GeneratedDay[];
  days: GeneratedActivity[];
}

export type ItineraryInterest =
  | "nature"
  | "adventure"
  | "culture"
  | "food"
  | "sightseeing"
  | "relaxation"
  | "shopping";

export type TravelPace = "relaxed" | "balanced" | "packed";

export interface ItineraryPreferences {
  interests: ItineraryInterest[];
  pace: TravelPace;
  dailyBudget?: number;
}

export interface SavedItineraryActivity {
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  category?: ItineraryCategory;
  locationName?: string;
  estimatedCost?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  source?: "openstreetmap" | "curated";
}

export interface SavedItinerary {
  _id: string;
  trip: string;
  days: SavedItineraryActivity[];
  estimatedTotalCost?: number;
  generatedBy?: "manual" | "rule-based";
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

interface GenerateItineraryResponse {
  success: boolean;
  message?: string;
  data: GeneratedItineraryDraft;
}

interface SavedItineraryResponse {
  success: boolean;
  message?: string;
  data: SavedItinerary;
}

export async function generateItineraryDraft(
  tripId: string,
  preferences?: ItineraryPreferences
): Promise<GeneratedItineraryDraft> {
  const response = await fetch(
    `${API_BASE_URL}/trips/${tripId}/itinerary/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(preferences ? { preferences } : {}),
    }
  );

  const result: GenerateItineraryResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to generate itinerary draft"
    );
  }

  return result.data;
}

export async function saveItinerary(
  tripId: string,
  days: GeneratedActivity[],
  generatedBy: "rule-based" | "manual" = "rule-based"
): Promise<SavedItinerary> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ days, generatedBy }),
  });

  const result: SavedItineraryResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to save itinerary");
  }

  return result.data;
}

export async function getItinerary(
  tripId: string
): Promise<SavedItinerary | null> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
  } catch {
    throw new Error(
      "Failed to fetch itinerary. Please check your connection and try again."
    );
  }

  let result: SavedItineraryResponse;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "Failed to read itinerary response"
        : "Failed to fetch itinerary"
    );
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
