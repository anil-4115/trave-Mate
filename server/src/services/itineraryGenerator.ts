import type { RealAttraction } from "./attractionService.js";

/**
 * Deterministic, catalogue-based itinerary generator.
 *
 * The catalogue contains estimates only. It does not use live availability,
 * opening hours, travel times, weather, external APIs, or database writes.
 */

export type ItineraryCategory =
  | "food"
  | "transport"
  | "activity"
  | "lodging"
  | "other";

export type Interest =
  | "nature"
  | "adventure"
  | "culture"
  | "food"
  | "sightseeing"
  | "relaxation"
  | "shopping";

export type TravelPace = "relaxed" | "balanced" | "packed";

export interface ItineraryPreferences {
  interests?: Interest[];
  pace?: TravelPace;
  dailyBudget?: number;
}

export interface ItineraryGeneratorInput {
  destinationName: string;
  startDate: Date | string;
  endDate: Date | string;
  travelers: number;
  budget: number;
  averageCostPerDay?: number | null;
  preferences?: ItineraryPreferences;
  attractions?: RealAttraction[];
}

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

export class ItineraryGeneratorInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItineraryGeneratorInputError";
  }
}

const MAX_TRIP_NIGHTS = 30;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const SAMPLE_NOTE =
  "Catalogue estimate only. Not a verified real-world recommendation.";
const ALLOWED_INTERESTS: Interest[] = [
  "nature",
  "adventure",
  "culture",
  "food",
  "sightseeing",
  "relaxation",
  "shopping",
];
const ALLOWED_PACES: TravelPace[] = ["relaxed", "balanced", "packed"];

interface CatalogueActivity {
  destinations: string[];
  interests: Interest[];
  category: ItineraryCategory;
  title: string;
  description: string;
  locationName: string;
  cost: number;
  durationMinutes: number;
  preferredSlot: "morning" | "afternoon" | "evening";
  attraction?: RealAttraction;
  source?: "curated";
}

const CATALOGUE: CatalogueActivity[] = [
  {
    destinations: ["goa"],
    interests: ["nature", "relaxation", "sightseeing"],
    category: "activity",
    title: "Sample: Coastal viewpoint walk",
    description: "A relaxed coastal walk with time for photographs.",
    locationName: "Goa coast",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "morning",
  },
  {
    destinations: ["goa"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Sample: Sunset beach visit",
    description: "Enjoy an unhurried sunset by the shoreline.",
    locationName: "Goa beach",
    cost: 0,
    durationMinutes: 90,
    preferredSlot: "evening",
  },
  {
    destinations: ["goa"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Sample: Heritage neighbourhood walk",
    description: "Explore a historic neighbourhood at a comfortable pace.",
    locationName: "Goa heritage area",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "afternoon",
  },
  {
    destinations: ["goa"],
    interests: ["food"],
    category: "food",
    title: "Sample: Local food tasting",
    description: "Try a regional meal using the trip's food allowance.",
    locationName: "Goa local market",
    cost: 400,
    durationMinutes: 90,
    preferredSlot: "evening",
  },
  {
    destinations: ["goa"],
    interests: ["adventure"],
    category: "activity",
    title: "Sample: Water-sport planning session",
    description: "Review a suitable water activity as a catalogue estimate.",
    locationName: "Goa activity area",
    cost: 700,
    durationMinutes: 150,
    preferredSlot: "morning",
  },
  {
    destinations: ["goa"],
    interests: ["shopping", "food"],
    category: "activity",
    title: "Sample: Market and craft browsing",
    description: "Browse local crafts and leave room for optional purchases.",
    locationName: "Goa market",
    cost: 250,
    durationMinutes: 120,
    preferredSlot: "afternoon",
  },
  {
    destinations: ["jaipur"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Sample: Fort and old-city orientation",
    description: "Explore Jaipur's historic character through a self-guided visit.",
    locationName: "Jaipur heritage area",
    cost: 300,
    durationMinutes: 150,
    preferredSlot: "morning",
  },
  {
    destinations: ["jaipur"],
    interests: ["shopping", "culture"],
    category: "activity",
    title: "Sample: Handicraft market browsing",
    description: "Browse regional textiles and handicrafts at your own pace.",
    locationName: "Jaipur market",
    cost: 200,
    durationMinutes: 120,
    preferredSlot: "afternoon",
  },
  {
    destinations: ["delhi", "new delhi"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Sample: Museum and heritage visit",
    description: "Spend a focused session with local history and culture.",
    locationName: "Delhi heritage area",
    cost: 250,
    durationMinutes: 150,
    preferredSlot: "morning",
  },
  {
    destinations: ["delhi", "new delhi"],
    interests: ["food"],
    category: "food",
    title: "Sample: Regional food walk",
    description: "Try a small selection of regional dishes.",
    locationName: "Delhi food district",
    cost: 400,
    durationMinutes: 120,
    preferredSlot: "evening",
  },
  {
    destinations: ["manali"],
    interests: ["nature", "adventure"],
    category: "activity",
    title: "Sample: Mountain nature walk",
    description: "Take a paced walk with time for scenery and rest.",
    locationName: "Manali nature area",
    cost: 0,
    durationMinutes: 150,
    preferredSlot: "morning",
  },
  {
    destinations: ["manali"],
    interests: ["relaxation", "nature"],
    category: "activity",
    title: "Sample: Quiet riverside afternoon",
    description: "Keep the afternoon light with a scenic riverside break.",
    locationName: "Manali riverside",
    cost: 0,
    durationMinutes: 90,
    preferredSlot: "afternoon",
  },
  {
    destinations: ["kerala", "kochi"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Sample: Backwater scenery session",
    description: "Enjoy a calm nature-focused session near the water.",
    locationName: "Kerala backwater area",
    cost: 500,
    durationMinutes: 150,
    preferredSlot: "morning",
  },
  {
    destinations: ["kerala", "kochi"],
    interests: ["food", "culture"],
    category: "food",
    title: "Sample: Kerala cuisine experience",
    description: "Set aside time for a regional cuisine experience.",
    locationName: "Kerala local food area",
    cost: 400,
    durationMinutes: 90,
    preferredSlot: "evening",
  },
  {
    destinations: ["*"],
    interests: ["sightseeing", "relaxation"],
    category: "activity",
    title: "Sample: Destination orientation walk",
    description: "Get familiar with the destination through a gentle walk.",
    locationName: "Destination centre",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "morning",
  },
  {
    destinations: ["*"],
    interests: ["food"],
    category: "food",
    title: "Sample: Local meal planning",
    description: "Reserve part of the day for an estimated local meal.",
    locationName: "Destination food area",
    cost: 300,
    durationMinutes: 90,
    preferredSlot: "evening",
  },
  {
    destinations: ["*"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Sample: Open-air relaxation break",
    description: "Keep time free for a low-cost outdoor break.",
    locationName: "Destination open space",
    cost: 0,
    durationMinutes: 90,
    preferredSlot: "afternoon",
  },
];

const LOCAL_EXPERIENCES: CatalogueActivity[] = [
  {
    destinations: ["jaipur"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Amber Fort",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Jaipur",
    cost: 300,
    durationMinutes: 150,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["jaipur"],
    interests: ["sightseeing", "culture"],
    category: "activity",
    title: "Hawa Mahal",
    description: "Curated city landmark visit; duration and cost are estimates.",
    locationName: "Jaipur",
    cost: 200,
    durationMinutes: 90,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["jaipur"],
    interests: ["shopping", "culture"],
    category: "activity",
    title: "Johari Bazaar browsing",
    description: "Curated local market experience; availability and prices vary.",
    locationName: "Jaipur",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["agra"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Taj Mahal",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Agra",
    cost: 500,
    durationMinutes: 180,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["agra"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Agra Fort",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Agra",
    cost: 300,
    durationMinutes: 150,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["agra"],
    interests: ["shopping", "culture"],
    category: "activity",
    title: "Agra handicraft market browsing",
    description: "Curated local market experience; products and prices vary.",
    locationName: "Agra",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["delhi", "new delhi"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Red Fort",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Delhi",
    cost: 300,
    durationMinutes: 150,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["delhi", "new delhi"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Qutub Minar",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Delhi",
    cost: 300,
    durationMinutes: 150,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["delhi", "new delhi"],
    interests: ["food", "culture"],
    category: "food",
    title: "Old Delhi food walk",
    description: "Curated food experience; availability and prices vary.",
    locationName: "Old Delhi",
    cost: 500,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["goa"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Goa beach day",
    description: "Curated coastal experience; conditions and availability vary.",
    locationName: "Goa coast",
    cost: 0,
    durationMinutes: 180,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["goa"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Fort Aguada",
    description: "Curated heritage visit; duration and cost are estimates.",
    locationName: "Goa",
    cost: 100,
    durationMinutes: 120,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["goa"],
    interests: ["food"],
    category: "food",
    title: "Goan cuisine experience",
    description: "Curated regional food experience; prices and availability vary.",
    locationName: "Goa",
    cost: 500,
    durationMinutes: 90,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["kochi", "kerala"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Fort Kochi heritage walk",
    description: "Curated neighbourhood walk; duration and cost are estimates.",
    locationName: "Fort Kochi",
    cost: 0,
    durationMinutes: 150,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["kochi", "kerala"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Backwater scenery session",
    description: "Curated nature experience; exact travel time is not verified.",
    locationName: "Kochi area",
    cost: 500,
    durationMinutes: 150,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["kochi", "kerala"],
    interests: ["food", "culture"],
    category: "food",
    title: "Kerala cuisine experience",
    description: "Curated regional food experience; prices and availability vary.",
    locationName: "Kochi",
    cost: 450,
    durationMinutes: 90,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["mumbai"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Gateway of India",
    description: "Curated landmark visit; duration and cost are estimates.",
    locationName: "Mumbai",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["mumbai"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Elephanta Caves planning session",
    description: "Curated heritage experience; ferry and entry details are not verified.",
    locationName: "Mumbai",
    cost: 700,
    durationMinutes: 180,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["mumbai"],
    interests: ["food", "shopping"],
    category: "food",
    title: "Mumbai street-food experience",
    description: "Curated food experience; prices and availability vary.",
    locationName: "Mumbai",
    cost: 450,
    durationMinutes: 90,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["varanasi"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Varanasi ghat walk",
    description: "Curated heritage experience; conditions and access may vary.",
    locationName: "Varanasi",
    cost: 0,
    durationMinutes: 150,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["varanasi"],
    interests: ["culture", "relaxation"],
    category: "activity",
    title: "Ganges riverside evening",
    description: "Curated riverside experience; timings are not verified.",
    locationName: "Varanasi",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["varanasi"],
    interests: ["food", "culture"],
    category: "food",
    title: "Varanasi local cuisine experience",
    description: "Curated food experience; prices and availability vary.",
    locationName: "Varanasi",
    cost: 350,
    durationMinutes: 90,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["manali"],
    interests: ["nature", "adventure"],
    category: "activity",
    title: "Solang Valley nature outing",
    description: "Curated nature experience; conditions and travel time are estimates.",
    locationName: "Manali area",
    cost: 500,
    durationMinutes: 180,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["manali"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Beas riverside walk",
    description: "Curated nature experience; conditions and access may vary.",
    locationName: "Manali",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["manali"],
    interests: ["culture", "shopping"],
    category: "activity",
    title: "Old Manali local experience",
    description: "Curated neighbourhood experience; availability varies.",
    locationName: "Manali",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["udaipur"],
    interests: ["culture", "sightseeing"],
    category: "activity",
    title: "Udaipur lakeside heritage walk",
    description: "Curated heritage experience; duration and cost are estimates.",
    locationName: "Udaipur",
    cost: 0,
    durationMinutes: 150,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["udaipur"],
    interests: ["relaxation", "sightseeing"],
    category: "activity",
    title: "Lake Pichola sunset experience",
    description: "Curated lakeside experience; timings and availability vary.",
    locationName: "Udaipur",
    cost: 500,
    durationMinutes: 120,
    preferredSlot: "evening",
    source: "curated",
  },
  {
    destinations: ["udaipur"],
    interests: ["culture", "food"],
    category: "food",
    title: "Rajasthani cuisine experience",
    description: "Curated regional food experience; prices and availability vary.",
    locationName: "Udaipur",
    cost: 450,
    durationMinutes: 90,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["rishikesh"],
    interests: ["nature", "relaxation"],
    category: "activity",
    title: "Ganges riverside walk",
    description: "Curated riverside experience; conditions and access may vary.",
    locationName: "Rishikesh",
    cost: 0,
    durationMinutes: 120,
    preferredSlot: "morning",
    source: "curated",
  },
  {
    destinations: ["rishikesh"],
    interests: ["adventure", "nature"],
    category: "activity",
    title: "Rishikesh outdoor activity planning",
    description: "Curated outdoor experience; operators, prices, and conditions are not verified.",
    locationName: "Rishikesh",
    cost: 700,
    durationMinutes: 150,
    preferredSlot: "afternoon",
    source: "curated",
  },
  {
    destinations: ["rishikesh"],
    interests: ["relaxation", "culture"],
    category: "activity",
    title: "Riverside wellness session",
    description: "Curated wellness experience; availability and timings vary.",
    locationName: "Rishikesh",
    cost: 300,
    durationMinutes: 90,
    preferredSlot: "evening",
    source: "curated",
  },
];

function isValidHHmm(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getTripNightCount(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ItineraryGeneratorInputError("Trip has invalid dates.");
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (normalizedEnd.getTime() === startDay.getTime()) {
    throw new ItineraryGeneratorInputError(
      "Trips must span at least one night. Same-day trips are not supported."
    );
  }
  if (normalizedEnd < startDay) {
    throw new ItineraryGeneratorInputError("Trip end date must be after start date.");
  }

  const nights = Math.round(
    (normalizedEnd.getTime() - startDay.getTime()) / MILLISECONDS_PER_DAY
  );
  if (!Number.isFinite(nights) || nights < 1) {
    throw new ItineraryGeneratorInputError("Trips must span at least one night.");
  }
  return nights;
}

function normalizePreferences(
  preferences: ItineraryPreferences | undefined,
  budget: number,
  durationDays: number
): Required<ItineraryPreferences> {
  const interests = preferences?.interests ?? ["sightseeing", "relaxation"];
  if (
    !Array.isArray(interests) ||
    interests.length === 0 ||
    interests.some(
      (interest) =>
        typeof interest !== "string" ||
        !ALLOWED_INTERESTS.includes(interest as Interest)
    )
  ) {
    throw new ItineraryGeneratorInputError(
      "Interests must contain supported travel preferences."
    );
  }

  const pace = preferences?.pace ?? "balanced";
  if (!ALLOWED_PACES.includes(pace)) {
    throw new ItineraryGeneratorInputError(
      "Travel pace must be relaxed, balanced, or packed."
    );
  }

  const dailyBudget =
    preferences?.dailyBudget === undefined
      ? Math.floor(budget / durationDays)
      : preferences.dailyBudget;
  if (!Number.isFinite(dailyBudget) || dailyBudget < 0) {
    throw new ItineraryGeneratorInputError(
      "Daily budget preference must be a finite non-negative number."
    );
  }
  if (dailyBudget * durationDays > budget) {
    throw new ItineraryGeneratorInputError(
      "Daily budget preference cannot exceed the total trip budget."
    );
  }

  return {
    interests: [...new Set(interests)] as Interest[],
    pace,
    dailyBudget,
  };
}

function validateInput(input: ItineraryGeneratorInput): {
  destinationName: string;
  averageCostPerDay?: number;
} {
  if (!input || typeof input !== "object") {
    throw new ItineraryGeneratorInputError("Invalid itinerary generator input.");
  }
  const destinationName =
    typeof input.destinationName === "string" ? input.destinationName.trim() : "";
  if (!destinationName) {
    throw new ItineraryGeneratorInputError("Destination name is required.");
  }
  if (!Number.isFinite(input.budget) || input.budget < 1) {
    throw new ItineraryGeneratorInputError(
      "Trip budget must be a finite number of at least 1."
    );
  }
  if (
    !Number.isInteger(input.travelers) ||
    input.travelers < 1 ||
    input.travelers > 50
  ) {
    throw new ItineraryGeneratorInputError(
      "Travelers must be a whole number between 1 and 50."
    );
  }
  const averageCostPerDay =
    typeof input.averageCostPerDay === "number" &&
    Number.isFinite(input.averageCostPerDay) &&
    input.averageCostPerDay >= 0
      ? input.averageCostPerDay
      : undefined;
  return { destinationName, averageCostPerDay };
}

function destinationMatches(activity: CatalogueActivity, destinationName: string): boolean {
  const normalized = destinationName.toLowerCase();
  return activity.destinations.includes("*") ||
    activity.destinations.some((destination) => normalized.includes(destination));
}

function scoreActivity(
  activity: CatalogueActivity,
  destinationName: string,
  interests: Interest[],
  pace: TravelPace,
  dailyBudget: number
): number {
  const exactDestination = activity.destinations.some(
    (destination) =>
      destination !== "*" && destinationName.toLowerCase().includes(destination)
  );
  const interestMatches = activity.interests.filter((interest) =>
    interests.includes(interest)
  ).length;
  const paceBonus =
    pace === "relaxed" && activity.durationMinutes <= 120
      ? 2
      : pace === "packed" && activity.durationMinutes <= 150
        ? 2
        : 0;
  const affordability = activity.cost <= dailyBudget ? 3 : -8;
  return (exactDestination ? 10 : 2) + interestMatches * 5 + paceBonus + affordability;
}

function slotsForPace(pace: TravelPace): Array<{
  startTime: string;
  endTime: string;
  slot: CatalogueActivity["preferredSlot"];
}> {
  if (pace === "relaxed") {
    return [{ startTime: "10:00", endTime: "12:00", slot: "morning" }];
  }
  if (pace === "packed") {
    return [
      { startTime: "09:00", endTime: "11:00", slot: "morning" },
      { startTime: "13:00", endTime: "15:00", slot: "afternoon" },
      { startTime: "18:30", endTime: "20:00", slot: "evening" },
    ];
  }
  return [
    { startTime: "09:30", endTime: "12:00", slot: "morning" },
    { startTime: "18:30", endTime: "20:00", slot: "evening" },
  ];
}

function assertValidDraft(draft: GeneratedItineraryDraft): void {
  const activitiesByDay = new Map<number, GeneratedActivity[]>();
  for (const activity of draft.days) {
    if (
      !Number.isInteger(activity.dayIndex) ||
      activity.dayIndex < 1 ||
      activity.dayIndex > draft.durationDays ||
      !activity.title.trim() ||
      (!activity.title.startsWith("Sample:") && !activity.source)
    ) {
      throw new Error("Generated activity has invalid identifying fields.");
    }
    if (!isValidHHmm(activity.startTime) || !isValidHHmm(activity.endTime)) {
      throw new Error("Generated activity has an invalid HH:mm time.");
    }
    if (timeToMinutes(activity.endTime) <= timeToMinutes(activity.startTime)) {
      throw new Error("Generated activity endTime must be later than startTime.");
    }
    if (!Number.isFinite(activity.estimatedCost) || activity.estimatedCost < 0) {
      throw new Error("Generated activity estimatedCost must be finite and non-negative.");
    }
    const activities = activitiesByDay.get(activity.dayIndex) ?? [];
    activities.push(activity);
    activitiesByDay.set(activity.dayIndex, activities);
  }
  for (const activities of activitiesByDay.values()) {
    const sorted = [...activities].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    for (let index = 1; index < sorted.length; index += 1) {
      if (
        timeToMinutes(sorted[index].startTime) <
        timeToMinutes(sorted[index - 1].endTime)
      ) {
        throw new Error("Generated activities overlap.");
      }
    }
  }
}

export function generateItineraryDraft(
  input: ItineraryGeneratorInput
): GeneratedItineraryDraft {
  const { destinationName, averageCostPerDay } = validateInput(input);
  const durationDays = getTripNightCount(input.startDate, input.endDate);
  if (durationDays > MAX_TRIP_NIGHTS) {
    throw new ItineraryGeneratorInputError(
      `Trip duration exceeds the maximum supported duration of ${MAX_TRIP_NIGHTS} nights.`
    );
  }
  const preferences = normalizePreferences(input.preferences, input.budget, durationDays);
  const mappedActivities = (input.attractions ?? []).map(
    (attraction): CatalogueActivity => ({
      destinations: ["*"],
      interests:
        attraction.category === "culture"
          ? ["culture", "sightseeing"]
          : attraction.category === "nature"
            ? ["nature", "relaxation", "sightseeing"]
            : attraction.category === "food"
              ? ["food"]
              : attraction.category === "shopping"
                ? ["shopping"]
                : ["sightseeing"],
      category:
        attraction.category === "nature"
          ? "activity"
          : attraction.category === "food"
            ? "food"
            : "activity",
      title: attraction.name,
      description: `${attraction.name} from mapped attraction data. Visit duration is an estimate.`,
      locationName: attraction.locality || destinationName,
      cost: 0,
      durationMinutes: attraction.estimatedDurationMinutes,
      preferredSlot: attraction.category === "food" ? "evening" : "morning",
      attraction,
    })
  );
  const destinationActivities = [
    ...mappedActivities,
    ...LOCAL_EXPERIENCES.filter((activity) =>
      destinationMatches(activity, destinationName)
    ),
    ...CATALOGUE.filter((activity) =>
      destinationMatches(activity, destinationName)
    ),
  ];
  const candidates = destinationActivities.filter((activity, index, all) => {
    const key = activity.title.trim().toLowerCase();
    return all.findIndex((candidate) => candidate.title.trim().toLowerCase() === key) === index;
  });
  const slots = slotsForPace(preferences.pace);
  const dayPlans: GeneratedDay[] = [];
  const days: GeneratedActivity[] = [];
  let estimatedTotalCost = 0;
  const usedKeys = new Set<string>();

  for (let dayIndex = 1; dayIndex <= durationDays; dayIndex += 1) {
    let daySpent = 0;
    const activities: GeneratedActivity[] = [];
    for (const slot of slots) {
      const ranked = candidates
        .map((activity, index) => ({
          activity,
          index,
          score:
            scoreActivity(
              activity,
              destinationName,
              preferences.interests,
              preferences.pace,
              preferences.dailyBudget
            ) +
            (activity.preferredSlot === slot.slot ? 3 : 0) -
            (usedKeys.has(activity.title.trim().toLowerCase()) ? 20 : 0),
        }))
        .filter(
          ({ activity }) =>
            activity.cost + daySpent <= preferences.dailyBudget
        )
        .sort((left, right) => right.score - left.score || left.index - right.index);
      const selected = ranked.find(
        ({ activity }) => !usedKeys.has(activity.title.trim().toLowerCase())
      ) ?? ranked[0];
      if (!selected) continue;

      const activity = selected.activity;
      const generated: GeneratedActivity = {
        dayIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        title: activity.attraction ? activity.title : activity.title,
        description: activity.description,
        category: activity.category,
        locationName: activity.locationName,
        estimatedCost: activity.cost,
        notes: activity.source
          ? "Curated estimate only. Verify local details before travelling."
          : SAMPLE_NOTE,
        latitude: activity.attraction?.latitude,
        longitude: activity.attraction?.longitude,
        mapUrl: activity.attraction?.mapUrl,
        source: activity.attraction?.source ?? activity.source,
      };
      activities.push(generated);
      days.push(generated);
      daySpent += activity.cost;
      estimatedTotalCost += activity.cost;
      usedKeys.add(activity.title.trim().toLowerCase());
    }
    dayPlans.push({ dayIndex, activities });
  }

  const draft: GeneratedItineraryDraft = {
    generatedBy: "rule-based",
    saved: false,
    durationDays,
    dailyBudget: preferences.dailyBudget,
    estimatedTotalCost,
    dayPlans,
    days,
  };

  if (averageCostPerDay !== undefined && averageCostPerDay > 0) {
    const referenceDailyCost = averageCostPerDay * input.travelers;
    if (
      Number.isFinite(referenceDailyCost) &&
      referenceDailyCost > preferences.dailyBudget
    ) {
      draft.budgetWarning =
        `Daily budget (${preferences.dailyBudget}) is below the destination average ` +
        `daily cost estimate (${Math.round(referenceDailyCost)}).`;
    }
  }
  if (days.length < durationDays * slots.length) {
    draft.budgetWarning = [
      draft.budgetWarning,
      "The catalogue did not contain enough affordable activities for every preferred time slot.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  assertValidDraft(draft);
  return draft;
}
