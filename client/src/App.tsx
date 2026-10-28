import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  createTrip,
  createExpense,
  deleteTrip,
  deleteExpense,
  generateItineraryDraft,
  getExpenses,
  getItinerary,
  getPackingItems,
  getTrips,
  createPackingItem,
  deletePackingItem,
  saveItinerary,
  updatePackingItem,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  EXPENSE_CATEGORIES,
  type GeneratedActivity,
  type GeneratedItineraryDraft,
  type ItineraryInterest,
  type ItineraryPreferences,
  type SavedItinerary,
  type SavedItineraryActivity,
  type TravelPace,
  type Trip,
  PACKING_CATEGORIES,
  type PackingCategory,
  type PackingItem,
} from "./api/tripApi";
import {
  getDestinationAttractions,
  getDestinations,
  type Attraction,
  type Destination,
} from "./api/destinationApi";
import {
  clearAuthToken,
  getAuthToken,
  loginUser,
  registerUser,
  setAuthToken,
  type AuthUser,
} from "./api/authApi";
import {
  authBackgroundImage,
  findTravelImage,
  getDestinationImage,
  type TravelImage,
} from "./data/imageCatalog";
import "./App.css";
import "./styles/layout.css";

type ViewMode =
  | "dashboard"
  | "destinations"
  | "trips"
  | "packing"
  | "calendar"
  | "tripDetail";
type ItineraryPreview = Omit<
  GeneratedItineraryDraft,
  "saved" | "generatedBy"
>;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getActivitiesForDate(
  itinerary: SavedItinerary,
  trip: Trip,
  date: Date
): SavedItineraryActivity[] {
  const tripStart = new Date(trip.startDate);
  const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDate = new Date(
    tripStart.getFullYear(),
    tripStart.getMonth(),
    tripStart.getDate()
  );
  const dayIndex =
    Math.floor(
      (selectedDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;

  return itinerary.days
    .filter((activity) => activity.dayIndex === dayIndex)
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
}

const PACKING_SUGGESTIONS: Array<{
  name: string;
  category: PackingCategory;
  quantity: number;
  notes: string;
}> = [
  { name: "Comfortable clothes", category: "Clothing", quantity: 1, notes: "" },
  { name: "Extra outfits", category: "Clothing", quantity: 1, notes: "" },
  { name: "Sleepwear", category: "Clothing", quantity: 1, notes: "" },
  { name: "Undergarments", category: "Clothing", quantity: 1, notes: "" },
  { name: "Socks", category: "Clothing", quantity: 1, notes: "" },
  { name: "Comfortable walking shoes", category: "Clothing", quantity: 1, notes: "" },
  { name: "Slippers", category: "Clothing", quantity: 1, notes: "" },
  { name: "Light jacket or raincoat", category: "Clothing", quantity: 1, notes: "" },
  { name: "Swimwear (optional)", category: "Clothing", quantity: 1, notes: "" },
  { name: "Toothbrush and toothpaste", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Shampoo and conditioner", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Soap or body wash", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Deodorant", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Sunscreen", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Moisturizer", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Comb or hairbrush", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Hand sanitizer", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Tissues or wet wipes", category: "Toiletries", quantity: 1, notes: "" },
  { name: "Government ID", category: "Documents", quantity: 1, notes: "" },
  { name: "Travel tickets", category: "Documents", quantity: 1, notes: "" },
  { name: "Hotel booking confirmation", category: "Documents", quantity: 1, notes: "" },
  { name: "Travel documents", category: "Documents", quantity: 1, notes: "" },
  { name: "Driving licence (if needed)", category: "Documents", quantity: 1, notes: "" },
  { name: "Emergency contact details", category: "Documents", quantity: 1, notes: "" },
  { name: "Copies of important documents", category: "Documents", quantity: 1, notes: "" },
  { name: "Phone charger", category: "Electronics", quantity: 1, notes: "" },
  { name: "Power bank", category: "Electronics", quantity: 1, notes: "" },
  { name: "Earphones", category: "Electronics", quantity: 1, notes: "" },
  { name: "Travel adapter (if needed)", category: "Electronics", quantity: 1, notes: "" },
  { name: "Camera (optional)", category: "Electronics", quantity: 1, notes: "" },
  { name: "Charging cables", category: "Electronics", quantity: 1, notes: "" },
  { name: "Personal medicines", category: "Medicines", quantity: 1, notes: "" },
  { name: "Basic first-aid kit", category: "Medicines", quantity: 1, notes: "" },
  { name: "Bandages", category: "Medicines", quantity: 1, notes: "" },
  { name: "Prescribed medication (if applicable)", category: "Medicines", quantity: 1, notes: "" },
  { name: "Motion sickness medicine (if appropriate)", category: "Medicines", quantity: 1, notes: "" },
  { name: "Water bottle", category: "Essentials", quantity: 1, notes: "" },
  { name: "Wallet and cash", category: "Essentials", quantity: 1, notes: "" },
  { name: "Debit or credit cards", category: "Essentials", quantity: 1, notes: "" },
  { name: "Sunglasses", category: "Essentials", quantity: 1, notes: "" },
  { name: "Small backpack", category: "Essentials", quantity: 1, notes: "" },
  { name: "Umbrella", category: "Essentials", quantity: 1, notes: "" },
  { name: "Reusable shopping bag", category: "Essentials", quantity: 1, notes: "" },
  { name: "Snacks", category: "Essentials", quantity: 1, notes: "" },
  { name: "Travel pillow", category: "Essentials", quantity: 1, notes: "" },
  { name: "Laundry bag", category: "Essentials", quantity: 1, notes: "" },
];

function TravelImageFrame({
  image,
  alt,
  className = "",
}: {
  image?: TravelImage;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return <div className={`destination-placeholder ${className}`}>{alt}</div>;
  }

  return (
    <img
      className={className}
      src={image.imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function getTripStatus(startDate: string, endDate: string): "Upcoming" | "Ongoing" | "Completed" {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Upcoming";
    }
    if (now < start) return "Upcoming";
    if (now > end) return "Completed";
    return "Ongoing";
  } catch {
    return "Upcoming";
  }
}

function getActivityDurationMinutes(
  startTime: string,
  endTime: string
): number | null {
  if (!HH_MM_PATTERN.test(startTime) || !HH_MM_PATTERN.test(endTime)) {
    return null;
  }

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;

  if (end <= start) {
    return null;
  }

  return end - start;
}

function formatActivityDuration(
  startTime: string,
  endTime: string
): string | null {
  const totalMinutes = getActivityDurationMinutes(startTime, endTime);
  if (totalMinutes === null) {
    return null;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function validateItineraryPreview(draft: ItineraryPreview): string | null {
  if (draft.days.length === 0) {
    return "An itinerary must contain at least one activity.";
  }

  for (const day of draft.dayPlans) {
    for (let index = 0; index < day.activities.length; index++) {
      const activity = day.activities[index];
      const activityLabel = `Day ${day.dayIndex}, activity ${index + 1}`;

      if (activity.title.trim().length === 0) {
        return `${activityLabel}: title is required.`;
      }

      if (activity.startTime && !HH_MM_PATTERN.test(activity.startTime)) {
        return `${activityLabel}: start time must use HH:mm (24h).`;
      }

      if (activity.endTime && !HH_MM_PATTERN.test(activity.endTime)) {
        return `${activityLabel}: end time must use HH:mm (24h).`;
      }

      if (
        activity.startTime &&
        activity.endTime &&
        getActivityDurationMinutes(activity.startTime, activity.endTime) === null
      ) {
        return `${activityLabel}: end time must be later than start time.`;
      }

      if (
        !Number.isFinite(activity.estimatedCost) ||
        activity.estimatedCost < 0
      ) {
        return `${activityLabel}: estimated cost must be a finite non-negative number.`;
      }
    }
  }

  return null;
}

function rebuildItineraryPreview(
  draft: ItineraryPreview,
  dayPlans: ItineraryPreview["dayPlans"]
): ItineraryPreview {
  const days = dayPlans.flatMap((day) => day.activities);
  const estimatedTotalCost = days.reduce(
    (total, activity) => total + activity.estimatedCost,
    0
  );

  return {
    ...draft,
    dayPlans,
    days,
    estimatedTotalCost,
  };
}

function updateActivityInPreview(
  draft: ItineraryPreview,
  dayIndex: number,
  activityIndex: number,
  patch: Partial<GeneratedActivity>
): ItineraryPreview {
  const dayPlans = draft.dayPlans.map((day) => {
    if (day.dayIndex !== dayIndex) {
      return day;
    }

    return {
      ...day,
      activities: day.activities.map((activity, index) =>
        index === activityIndex ? { ...activity, ...patch } : activity
      ),
    };
  });

  return rebuildItineraryPreview(draft, dayPlans);
}

function addActivityToPreview(
  draft: ItineraryPreview,
  dayIndex: number
): ItineraryPreview {
  const newActivity: GeneratedActivity = {
    dayIndex,
    startTime: "",
    endTime: "",
    title: "New activity",
    description: "",
    category: "activity",
    locationName: "",
    estimatedCost: 0,
    notes: "",
  };
  const dayPlans = draft.dayPlans.map((day) =>
    day.dayIndex === dayIndex
      ? { ...day, activities: [...day.activities, newActivity] }
      : day
  );

  return rebuildItineraryPreview(draft, dayPlans);
}

function removeActivityFromPreview(
  draft: ItineraryPreview,
  dayIndex: number,
  activityIndex: number
): ItineraryPreview {
  const dayPlans = draft.dayPlans.map((day) =>
    day.dayIndex === dayIndex
      ? {
          ...day,
          activities: day.activities.filter(
            (_activity, index) => index !== activityIndex
          ),
        }
      : day
  );

  return rebuildItineraryPreview(draft, dayPlans);
}

function moveActivityInPreview(
  draft: ItineraryPreview,
  dayIndex: number,
  activityIndex: number,
  direction: -1 | 1
): ItineraryPreview {
  const targetIndex = activityIndex + direction;
  const dayPlans = draft.dayPlans.map((day) => {
    if (day.dayIndex !== dayIndex) {
      return day;
    }

    const activities = [...day.activities];
    if (targetIndex < 0 || targetIndex >= activities.length) {
      return day;
    }

    const [moved] = activities.splice(activityIndex, 1);
    activities.splice(targetIndex, 0, moved);

    return {
      ...day,
      activities,
    };
  });

  return rebuildItineraryPreview(draft, dayPlans);
}

function moveActivityToDay(
  draft: ItineraryPreview,
  sourceDayIndex: number,
  activityIndex: number,
  targetDayIndex: number
): ItineraryPreview {
  if (sourceDayIndex === targetDayIndex) {
    return draft;
  }

  const targetDay = draft.dayPlans.find(
    (day) => day.dayIndex === targetDayIndex
  );

  if (!targetDay) {
    return draft;
  }

  const sourceDay = draft.dayPlans.find(
    (day) => day.dayIndex === sourceDayIndex
  );

  if (!sourceDay) {
    return draft;
  }

  if (activityIndex < 0 || activityIndex >= sourceDay.activities.length) {
    return draft;
  }

  const activityToMove = sourceDay.activities[activityIndex];
  const updatedActivity: GeneratedActivity = {
    ...activityToMove,
    dayIndex: targetDayIndex,
  };

  const dayPlans = draft.dayPlans.map((day) => {
    if (day.dayIndex === sourceDayIndex) {
      return {
        ...day,
        activities: day.activities.filter(
          (_activity, index) => index !== activityIndex
        ),
      };
    }

    if (day.dayIndex === targetDayIndex) {
      return {
        ...day,
        activities: [...day.activities, updatedActivity],
      };
    }

    return day;
  });

  return rebuildItineraryPreview(draft, dayPlans);
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

function getTripDurationDays(startIso: string, endIso: string): number | null {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (endDay <= startDay) {
      return null;
    }
    const diffMs = endDay.getTime() - startDay.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(days) || days < 1) {
      return null;
    }
    return days;
  } catch {
    return null;
  }
}

function formatTripDuration(startIso: string, endIso: string): string | null {
  const days = getTripDurationDays(startIso, endIso);
  if (days === null) {
    return null;
  }
  const nights = Math.max(0, days - 1);
  if (nights === 0) {
    return `${days} calendar day`;
  }
  return `${nights} night${nights === 1 ? "" : "s"} (${days} calendar day${days === 1 ? "" : "s"})`;
}

function mapSavedItineraryToPreview(
  saved: SavedItinerary,
  trip: Trip
): ItineraryPreview {
  const activitiesByDay = new Map<number, { activity: GeneratedActivity }[]>();

  saved.days.forEach((activity) => {
    const dayIndex =
      Number.isInteger(activity.dayIndex) && activity.dayIndex >= 1
        ? activity.dayIndex
        : 1;
    const estimatedCost =
      typeof activity.estimatedCost === "number" &&
      Number.isFinite(activity.estimatedCost) &&
      activity.estimatedCost >= 0
        ? activity.estimatedCost
        : 0;

    const normalized: GeneratedActivity = {
      dayIndex,
      startTime: activity.startTime ?? "",
      endTime: activity.endTime ?? "",
      title: activity.title,
      description: activity.description ?? "",
      category: activity.category ?? "activity",
      locationName: activity.locationName ?? "",
      estimatedCost,
      notes: activity.notes ?? "",
      latitude: activity.latitude,
      longitude: activity.longitude,
      mapUrl: activity.mapUrl,
      source: activity.source,
    };

    const dayActivities = activitiesByDay.get(dayIndex) ?? [];
    dayActivities.push({ activity: normalized });
    activitiesByDay.set(dayIndex, dayActivities);
  });

  const maxSavedDay = Math.max(0, ...activitiesByDay.keys());
  const tripDuration = getTripDurationDays(trip.startDate, trip.endDate) ?? 0;
  const durationDays = Math.max(tripDuration, maxSavedDay);
  const dayPlans: ItineraryPreview["dayPlans"] = [];
  const days: GeneratedActivity[] = [];

  for (let dayIndex = 1; dayIndex <= durationDays; dayIndex++) {
    const entries = activitiesByDay.get(dayIndex) ?? [];
    const activities = entries.map((entry) => entry.activity);

    dayPlans.push({ dayIndex, activities });
    days.push(...activities);
  }

  const savedTotal = saved.estimatedTotalCost;
  const estimatedTotalCost =
    typeof savedTotal === "number" && Number.isFinite(savedTotal)
      ? savedTotal
      : days.reduce((total, activity) => total + activity.estimatedCost, 0);
  const dailyBudget =
    durationDays > 0 && Number.isFinite(trip.budget)
      ? Math.floor(trip.budget / durationDays)
      : 0;

  return {
    durationDays,
    dailyBudget,
    estimatedTotalCost,
    dayPlans,
    days,
  };
}

function getTripStatusCategory(trip: Trip): "upcoming" | "ongoing" | "completed" | "unknown" {
  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unknown";
  }
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (nowDate < startDate) {
    return "upcoming";
  }
  if (nowDate > endDate) {
    return "completed";
  }
  return "ongoing";
}

type AuthView = "login" | "register";

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>(authUser ? "dashboard" : "destinations");
  const [destinationSearch, setDestinationSearch] = useState("");

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loadingAttractions, setLoadingAttractions] = useState(false);
  const [attractionError, setAttractionError] = useState("");
  const [attractionWarning, setAttractionWarning] = useState("");
  const [attractionSource, setAttractionSource] = useState("");
  const [loadingDest, setLoadingDest] = useState(true);
  const [errorDest, setErrorDest] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [errorTrips, setErrorTrips] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseMessage, setExpenseMessage] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Food" as ExpenseCategory,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loadingPacking, setLoadingPacking] = useState(false);
  const [packingError, setPackingError] = useState("");
  const [packingMessage, setPackingMessage] = useState("");
  const [packingSubmitting, setPackingSubmitting] = useState(false);
  const [editingPackingId, setEditingPackingId] = useState<string | null>(null);
  const [packingForm, setPackingForm] = useState({
    name: "",
    category: "Essentials" as PackingCategory,
    quantity: "1",
    notes: "",
  });
  const [calendarItinerary, setCalendarItinerary] = useState<SavedItinerary | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItineraryPreview | null>(null);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [savingItinerary, setSavingItinerary] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [itineraryError, setItineraryError] = useState("");
  const [itineraryMessage, setItineraryMessage] = useState("");
  const itineraryRequestIdRef = useRef(0);
  const generateInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const editSnapshotRef = useRef<{
    draft: ItineraryPreview;
    draftSaved: boolean;
  } | null>(null);
  const [editingItinerary, setEditingItinerary] = useState(false);
  const [itineraryEditDirty, setItineraryEditDirty] = useState(false);
  const [itineraryInterests, setItineraryInterests] = useState<ItineraryInterest[]>([
    "sightseeing",
    "relaxation",
  ]);
  const [itineraryPace, setItineraryPace] = useState<TravelPace>("balanced");
  const [itineraryDailyBudget, setItineraryDailyBudget] = useState("");
  const [tripSearchQuery, setTripSearchQuery] = useState("");
  type TripStatusFilterValue = "all" | "upcoming" | "ongoing" | "completed";
  type TripSortValue = "startDesc" | "startAsc" | "budgetDesc" | "budgetAsc";
  const [tripStatusFilterValue, setTripStatusFilterValue] = useState<TripStatusFilterValue>("all");
  const [tripSortValue, setTripSortValue] = useState<TripSortValue>("startDesc");

  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);

  const [showTripForm, setShowTripForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [budget, setBudget] = useState("");
  const [tripMessage, setTripMessage] = useState("");
  const [tripError, setTripError] = useState("");
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!selectedDestination) {
      setAttractions([]);
      return;
    }
    setLoadingAttractions(true);
    setAttractionError("");
    getDestinationAttractions(selectedDestination._id)
      .then((result) => {
        setAttractions(result.data);
        setAttractionSource(result.source);
        setAttractionWarning(result.warning || "");
      })
      .catch((error: unknown) => {
        setAttractions([]);
        setAttractionError(
          error instanceof Error
            ? error.message
            : "Failed to fetch attraction data."
        );
      })
      .finally(() => setLoadingAttractions(false));
  }, [selectedDestination]);

  useEffect(() => {
    getDestinations()
      .then((data) => {
        setDestinations(data);
      })
      .catch((err: unknown) => {
        setErrorDest(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
      })
      .finally(() => setLoadingDest(false));
  }, []);

  const today = new Date().toLocaleDateString("en-CA");

  function handleBackToDestinations() {
    resetItineraryState();
    setSelectedDestination(null);
    setShowTripForm(false);
    setTripMessage("");
    setTripError("");
    setViewMode("destinations");
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpenseForm({
      title: "",
      amount: "",
      category: "Food",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }

  function resetPackingForm() {
    setEditingPackingId(null);
    setPackingForm({
      name: "",
      category: "Essentials",
      quantity: "1",
      notes: "",
    });
  }

  async function loadPackingItems(tripId: string) {
    setLoadingPacking(true);
    setPackingError("");
    try {
      setPackingItems(await getPackingItems(tripId));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch packing items.";
      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      setPackingError(message);
    } finally {
      setLoadingPacking(false);
    }
  }

  async function loadExpenses(tripId: string) {
    setLoadingExpenses(true);
    setExpenseError("");
    try {
      setExpenses(await getExpenses(tripId));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch expenses.";
      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }

      setExpenseError(message);
    } finally {
      setLoadingExpenses(false);
    }
  }

  function handleAuthLogout() {
    clearAuthToken();
    setAuthUser(null);
    setTrips([]);
    setSelectedTrip(null);
    setExpenses([]);
    setPackingItems([]);
    resetPackingForm();
    resetExpenseForm();
    setDraft(null);
    resetItineraryState();
    setViewMode("destinations");
    setAuthMessage("Logged out.");
    setAuthError("");
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);

    try {
      if (authView === "register") {
        const result = await registerUser(authName, authEmail, authPassword);
        setAuthToken(result.token);
        setAuthUser(result.user);
        setAuthMessage("Registration successful.");
        setAuthName("");
        setAuthPassword("");
      } else {
        const result = await loginUser(authEmail, authPassword);
        setAuthToken(result.token);
        setAuthUser(result.user);
        setAuthMessage("Login successful.");
        setAuthPassword("");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function fetchTrips() {
    setLoadingTrips(true);
    setErrorTrips("");
    getTrips()
      .then((data) => setTrips(data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to fetch trips";
        if (message.toLowerCase().includes("unauthorized")) {
          handleAuthLogout();
          setAuthError("Session expired. Please log in again.");
          return;
        }
        if (message.toLowerCase().includes("forbidden")) {
          setErrorTrips("You do not have permission to access these trips.");
          return;
        }
        setErrorTrips(message);
      })
      .finally(() => setLoadingTrips(false));
  }

  function handleShowTrips() {
    resetItineraryState();
    setSelectedDestination(null);
    setShowTripForm(false);
    setTripMessage("");
    setTripError("");
    setSelectedTrip(null);
    setTripSearchQuery("");
    setTripStatusFilterValue("all");
    setTripSortValue("startDesc");
    setViewMode("trips");
    if (trips.length === 0 && !loadingTrips) {
      fetchTrips();
    }
  }

  function handleShowPacking() {
    resetItineraryState();
    setSelectedDestination(null);
    setShowTripForm(false);
    setTripMessage("");
    setTripError("");
    setSelectedTrip(null);
    setPackingItems([]);
    resetPackingForm();
    setPackingError("");
    setPackingMessage("");
    setViewMode("packing");
    if (trips.length === 0 && !loadingTrips) {
      fetchTrips();
    }
  }

  function handleSelectPackingTrip(trip: Trip) {
    setSelectedTrip(trip);
    setPackingItems([]);
    resetPackingForm();
    setPackingError("");
    setPackingMessage("");
    void loadPackingItems(trip._id);
  }

  function handleShowCalendar() {
    resetItineraryState();
    setSelectedDestination(null);
    setShowTripForm(false);
    setTripMessage("");
    setTripError("");
    setSelectedTrip(null);
    setCalendarItinerary(null);
    setCalendarError("");
    setCalendarSelectedDate(null);
    setCalendarMonth(new Date());
    setViewMode("calendar");
    if (trips.length === 0 && !loadingTrips) {
      fetchTrips();
    }
  }

  async function handleSelectCalendarTrip(trip: Trip) {
    setSelectedTrip(trip);
    setCalendarItinerary(null);
    setCalendarError("");
    setCalendarSelectedDate(getDateKey(new Date(trip.startDate)));
    setCalendarMonth(new Date(trip.startDate));
    setLoadingCalendar(true);

    try {
      const savedItinerary = await getItinerary(trip._id);
      setCalendarItinerary(savedItinerary);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch saved itinerary.";
      if (message.toLowerCase().includes("itinerary not found")) {
        setCalendarItinerary(null);
      } else {
        setCalendarError(message);
      }
    } finally {
      setLoadingCalendar(false);
    }
  }

  function shiftCalendarMonth(amount: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  function handleClearTripFilters() {
    setTripSearchQuery("");
    setTripStatusFilterValue("all");
    setTripSortValue("startDesc");
  }

  function resetItineraryState() {
    itineraryRequestIdRef.current += 1;
    generateInFlightRef.current = false;
    saveInFlightRef.current = false;
    editSnapshotRef.current = null;
    setDraft(null);
    setLoadingItinerary(false);
    setGeneratingDraft(false);
    setSavingItinerary(false);
    setDraftSaved(false);
    setEditingItinerary(false);
    setItineraryEditDirty(false);
    setItineraryError("");
    setItineraryMessage("");
  }

  async function loadSavedItinerary(trip: Trip) {
    const requestId = ++itineraryRequestIdRef.current;

    setLoadingItinerary(true);
    setItineraryError("");
    setItineraryMessage("");

    try {
      const savedItinerary = await getItinerary(trip._id);

      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      if (!savedItinerary) {
        setDraft(null);
        setDraftSaved(false);
        return;
      }

      setDraft(mapSavedItineraryToPreview(savedItinerary, trip));
      setDraftSaved(true);
      setItineraryMessage("Saved itinerary loaded.");
    } catch (err: unknown) {
      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch itinerary. Please try again.";

      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      if (message.toLowerCase().includes("forbidden")) {
        setItineraryError("You do not have permission to access this itinerary.");
        setDraft(null);
        setDraftSaved(false);
        return;
      }

      setDraft(null);
      setDraftSaved(false);
      setItineraryError(message);
    } finally {
      if (itineraryRequestIdRef.current === requestId) {
        setLoadingItinerary(false);
      }
    }
  }

  function handleViewTripDetails(trip: Trip) {
    resetItineraryState();
    resetExpenseForm();
    setExpenses([]);
    setExpenseMessage("");
    setExpenseError("");
    setSelectedTrip(trip);
    setViewMode("tripDetail");
    void loadSavedItinerary(trip);
    void loadExpenses(trip._id);
    void loadPackingItems(trip._id);
  }

  function startEditingPackingItem(item: PackingItem) {
    setEditingPackingId(item._id);
    setPackingForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      notes: item.notes || "",
    });
    setPackingError("");
    setPackingMessage("");
  }

  async function handlePackingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrip || packingSubmitting) return;

    const name = packingForm.name.trim();
    const quantity = Number(packingForm.quantity);
    if (!name) {
      setPackingError("Packing item name is required.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setPackingError("Quantity must be a whole number from 1 to 100.");
      return;
    }

    setPackingSubmitting(true);
    setPackingError("");
    setPackingMessage("");
    const input = {
      name,
      category: packingForm.category,
      quantity,
      notes: packingForm.notes.trim(),
    };

    try {
      if (editingPackingId) {
        const updated = await updatePackingItem(
          selectedTrip._id,
          editingPackingId,
          input
        );
        setPackingItems((items) =>
          items.map((item) => (item._id === updated._id ? updated : item))
        );
        setPackingMessage("Packing item updated successfully.");
      } else {
        const created = await createPackingItem(selectedTrip._id, input);
        setPackingItems((items) => [...items, created]);
        setPackingMessage("Packing item added successfully.");
      }
      resetPackingForm();
    } catch (error: unknown) {
      setPackingError(
        error instanceof Error ? error.message : "Failed to save packing item."
      );
    } finally {
      setPackingSubmitting(false);
    }
  }

  async function handleTogglePackingItem(item: PackingItem) {
    if (!selectedTrip || packingSubmitting) return;
    setPackingSubmitting(true);
    setPackingError("");
    setPackingMessage("");
    try {
      const updated = await updatePackingItem(selectedTrip._id, item._id, {
        isPacked: !item.isPacked,
      });
      setPackingItems((items) =>
        items.map((current) => (current._id === updated._id ? updated : current))
      );
    } catch (error: unknown) {
      setPackingError(
        error instanceof Error ? error.message : "Failed to update packing item."
      );
    } finally {
      setPackingSubmitting(false);
    }
  }

  async function handleDeletePackingItem(item: PackingItem) {
    if (!selectedTrip || packingSubmitting) return;
    if (!window.confirm(`Delete "${item.name}" from the packing checklist?`)) {
      return;
    }

    setPackingSubmitting(true);
    setPackingError("");
    setPackingMessage("");
    try {
      await deletePackingItem(selectedTrip._id, item._id);
      setPackingItems((items) => items.filter((current) => current._id !== item._id));
      if (editingPackingId === item._id) resetPackingForm();
      setPackingMessage("Packing item deleted successfully.");
    } catch (error: unknown) {
      setPackingError(
        error instanceof Error ? error.message : "Failed to delete packing item."
      );
    } finally {
      setPackingSubmitting(false);
    }
  }

  async function handleAddPackingSuggestions() {
    if (!selectedTrip || packingSubmitting) return;
    const normalizeName = (name: string) => name.trim().toLowerCase();
    const existing = new Set(packingItems.map((item) => normalizeName(item.name)));
    const suggestions = PACKING_SUGGESTIONS.filter(
      (item) => !existing.has(normalizeName(item.name))
    );
    if (suggestions.length === 0) {
      setPackingMessage("Starter suggestions are already on your checklist.");
      return;
    }

    setPackingSubmitting(true);
    setPackingError("");
    setPackingMessage("");
    try {
      const created = await Promise.all(
        suggestions.map((item) => createPackingItem(selectedTrip._id, item))
      );
      setPackingItems((items) => [...items, ...created]);
      setPackingMessage(`${created.length} starter packing items added.`);
    } catch (error: unknown) {
      setPackingError(
        error instanceof Error ? error.message : "Failed to add starter items."
      );
    } finally {
      setPackingSubmitting(false);
    }
  }

  async function handleDeleteTrip(): Promise<void> {
    if (!selectedTrip || deletingTrip) return;

    const destinationName =
      typeof selectedTrip.destination === "object" &&
      selectedTrip.destination !== null
        ? selectedTrip.destination.name
        : "this trip";
    const confirmed = window.confirm(
      `Delete the trip to ${destinationName}? This permanently removes the trip, its itinerary, and its expenses.`
    );
    if (!confirmed) return;

    setDeletingTrip(true);
    setTripError("");
    setTripMessage("");
    try {
      await deleteTrip(selectedTrip._id);
      setTrips((currentTrips) =>
        currentTrips.filter((trip) => trip._id !== selectedTrip._id)
      );
      setSelectedTrip(null);
      resetItineraryState();
      setExpenses([]);
      setPackingItems([]);
      resetPackingForm();
      setViewMode("trips");
      setTripMessage(`Trip to ${destinationName} was deleted.`);
    } catch (error) {
      setTripError(
        error instanceof Error ? error.message : "Failed to delete trip."
      );
    } finally {
      setDeletingTrip(false);
    }
  }

  function validateExpenseForm(): string | null {
    if (!expenseForm.title.trim()) return "Expense title is required.";
    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Enter a positive expense amount.";
    }
    if (!expenseForm.date || Number.isNaN(new Date(expenseForm.date).getTime())) {
      return "Enter a valid expense date.";
    }
    return null;
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrip || expenseSubmitting) return;

    const validationError = validateExpenseForm();
    if (validationError) {
      setExpenseError(validationError);
      setExpenseMessage("");
      return;
    }

    setExpenseSubmitting(true);
    setExpenseError("");
    setExpenseMessage("");
    const input = {
      title: expenseForm.title.trim(),
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      date: expenseForm.date,
      notes: expenseForm.notes.trim(),
    };

    try {
      if (editingExpenseId) {
        await updateExpense(selectedTrip._id, editingExpenseId, input);
        setExpenseMessage("Expense updated successfully.");
      } else {
        await createExpense(selectedTrip._id, input);
        setExpenseMessage("Expense added successfully.");
      }
      resetExpenseForm();
      await loadExpenses(selectedTrip._id);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save expense.";
      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      setExpenseError(message);
    } finally {
      setExpenseSubmitting(false);
    }
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpenseId(expense._id);
    setExpenseForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date.slice(0, 10),
      notes: expense.notes || "",
    });
    setExpenseError("");
    setExpenseMessage("");
  }

  async function handleDeleteExpense(expense: Expense) {
    if (!selectedTrip || expenseSubmitting) return;
    if (!window.confirm(`Delete "${expense.title}"?`)) return;

    setExpenseSubmitting(true);
    setExpenseError("");
    setExpenseMessage("");
    try {
      await deleteExpense(selectedTrip._id, expense._id);
      if (editingExpenseId === expense._id) resetExpenseForm();
      setExpenseMessage("Expense deleted successfully.");
      await loadExpenses(selectedTrip._id);
    } catch (error: unknown) {
      setExpenseError(
        error instanceof Error ? error.message : "Failed to delete expense."
      );
    } finally {
      setExpenseSubmitting(false);
    }
  }

  // handleBackToTrips removed (unused after auth gating)

  async function handleGenerateDraft() {
    if (
      !selectedTrip ||
      loadingItinerary ||
      editingItinerary ||
      generateInFlightRef.current ||
      saveInFlightRef.current
    ) {
      return;
    }

    const tripId = selectedTrip._id;
    const requestId = ++itineraryRequestIdRef.current;

    generateInFlightRef.current = true;
    editSnapshotRef.current = null;
    setGeneratingDraft(true);
    setEditingItinerary(false);
    setItineraryEditDirty(false);
    setItineraryError("");
    setItineraryMessage("");

    try {
      const dailyBudgetValue =
        itineraryDailyBudget.trim() === ""
          ? undefined
          : Number(itineraryDailyBudget);
      if (itineraryInterests.length === 0) {
        setItineraryError("Choose at least one interest before generating.");
        return;
      }
      if (
        dailyBudgetValue !== undefined &&
        (!Number.isFinite(dailyBudgetValue) || dailyBudgetValue < 0)
      ) {
        setItineraryError("Daily budget must be a non-negative number.");
        return;
      }
      const preferences: ItineraryPreferences = {
        interests: itineraryInterests,
        pace: itineraryPace,
        dailyBudget: dailyBudgetValue,
      };
      const nextDraft = await generateItineraryDraft(tripId, preferences);

      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      setDraft(nextDraft);
      setDraftSaved(false);
      setItineraryMessage("Draft generated. Review it before saving.");
    } catch (err: unknown) {
      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate itinerary draft. Please try again.";

      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      if (message.toLowerCase().includes("forbidden")) {
        setItineraryError("You do not have permission to access this itinerary.");
        return;
      }

      setItineraryError(message);
    } finally {
      if (itineraryRequestIdRef.current === requestId) {
        generateInFlightRef.current = false;
        setGeneratingDraft(false);
      }
    }
  }

  function handleStartEditingItinerary() {
    if (!draft || loadingItinerary || savingItinerary || generatingDraft) {
      return;
    }

    editSnapshotRef.current = { draft, draftSaved };
    setEditingItinerary(true);
    setItineraryEditDirty(false);
    setItineraryError("");
    setItineraryMessage(
      "Edit, add or remove activities below. Changes are not saved until you save them."
    );
  }

  function handleCancelEditingItinerary() {
    if (
      itineraryEditDirty &&
      !window.confirm("Discard your unsaved itinerary changes?")
    ) {
      return;
    }

    const snapshot = editSnapshotRef.current;
    if (snapshot) {
      setDraft(snapshot.draft);
      setDraftSaved(snapshot.draftSaved);
    }

    editSnapshotRef.current = null;
    setEditingItinerary(false);
    setItineraryEditDirty(false);
    setItineraryError("");
    setItineraryMessage(
      snapshot?.draftSaved
        ? "Saved itinerary restored."
        : "Itinerary draft restored."
    );
  }

  function handleActivityChange(
    dayIndex: number,
    activityIndex: number,
    patch: Partial<GeneratedActivity>
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return updateActivityInPreview(current, dayIndex, activityIndex, patch);
    });
    setDraftSaved(false);
    setItineraryEditDirty(true);
    setItineraryError("");
    setItineraryMessage("");
  }

  function handleAddActivity(dayIndex: number) {
    if (!draft || !editingItinerary) {
      return;
    }

    setDraft((current) =>
      current ? addActivityToPreview(current, dayIndex) : current
    );
    setDraftSaved(false);
    setItineraryEditDirty(true);
    setItineraryError("");
    setItineraryMessage(
      `Activity added to Day ${dayIndex}. Save changes to keep it.`
    );
  }

  function handleRemoveActivity(dayIndex: number, activityIndex: number) {
    if (!draft || !editingItinerary) {
      return;
    }

    if (draft.days.length <= 1) {
      setItineraryError(
        "An itinerary must contain at least one activity. The final activity cannot be removed."
      );
      return;
    }

    setDraft((current) => {
      if (!current || current.days.length <= 1) {
        return current;
      }

      return removeActivityFromPreview(current, dayIndex, activityIndex);
    });
    setDraftSaved(false);
    setItineraryEditDirty(true);
    setItineraryError("");
    setItineraryMessage(
      `Activity removed from Day ${dayIndex}. Save changes to keep this update.`
    );
  }

  function handleMoveActivity(
    dayIndex: number,
    activityIndex: number,
    direction: -1 | 1
  ) {
    if (!draft || !editingItinerary) {
      return;
    }

    const dayActivities = draft.dayPlans.find(
      (day) => day.dayIndex === dayIndex
    )?.activities;

    if (!dayActivities) {
      return;
    }

    const targetIndex = activityIndex + direction;
    if (targetIndex < 0 || targetIndex >= dayActivities.length) {
      return;
    }

    setDraft((current) =>
      current
        ? moveActivityInPreview(current, dayIndex, activityIndex, direction)
        : current
    );
    setDraftSaved(false);
    setItineraryEditDirty(true);
    setItineraryError("");
    setItineraryMessage(
      `Activity moved on Day ${dayIndex}. Save changes to keep this order.`
    );
  }

  function handleMoveActivityToDay(
    sourceDayIndex: number,
    activityIndex: number,
    targetDayIndex: number
  ) {
    if (!draft || !editingItinerary) {
      return;
    }

    if (sourceDayIndex === targetDayIndex) {
      return;
    }

    if (!draft.dayPlans.some((day) => day.dayIndex === targetDayIndex)) {
      setItineraryError(
        `Day ${targetDayIndex} is not available for this itinerary.`
      );
      return;
    }

    setDraft((current) =>
      current
        ? moveActivityToDay(current, sourceDayIndex, activityIndex, targetDayIndex)
        : current
    );
    setDraftSaved(false);
    setItineraryEditDirty(true);
    setItineraryError("");
    setItineraryMessage(
      `Activity moved to Day ${targetDayIndex}. Save changes to keep this update.`
    );
  }

  async function handleSaveItinerary() {
    if (
      !selectedTrip ||
      !draft ||
      draftSaved ||
      loadingItinerary ||
      saveInFlightRef.current ||
      generateInFlightRef.current
    ) {
      return;
    }

    if (editingItinerary) {
      const validationError = validateItineraryPreview(draft);
      if (validationError) {
        setItineraryError(validationError);
        return;
      }
    }

    const wasEditing = editingItinerary;
    const confirmed = window.confirm(
      wasEditing
        ? "Save these itinerary changes? This will replace the saved itinerary for this trip."
        : "Save this draft? If this trip already has a saved itinerary, it will be replaced."
    );

    if (!confirmed) {
      return;
    }

    const tripId = selectedTrip._id;
    const draftDays = draft.days;
    const generatedBy = wasEditing ? "manual" : "rule-based";
    const requestId = ++itineraryRequestIdRef.current;

    saveInFlightRef.current = true;
    setSavingItinerary(true);
    setItineraryError("");
    setItineraryMessage("");

    try {
      await saveItinerary(tripId, draftDays, generatedBy);

      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      editSnapshotRef.current = null;
      setDraftSaved(true);
      setEditingItinerary(false);
      setItineraryEditDirty(false);
      setItineraryMessage(
        wasEditing ? "Itinerary changes saved." : "Itinerary saved."
      );
    } catch (err: unknown) {
      if (itineraryRequestIdRef.current !== requestId) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Failed to save itinerary. Please try again.";

      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      if (message.toLowerCase().includes("forbidden")) {
        setItineraryError("You do not have permission to save this itinerary.");
        return;
      }

      setItineraryError(message);
    } finally {
      if (itineraryRequestIdRef.current === requestId) {
        saveInFlightRef.current = false;
        setSavingItinerary(false);
      }
    }
  }

  function handleRetryTrips() {
    fetchTrips();
  }

  async function handleTripSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedDestination) {
      setTripError("Please select a destination.");
      return;
    }

    setTripMessage("");
    setTripError("");

    if (endDate < startDate) {
      setTripError("End date must be on or after the start date.");
      return;
    }

    const travelerCount = Number(travelers);
    const totalBudget = Number(budget);

    if (
      !Number.isInteger(travelerCount) ||
      travelerCount < 1 ||
      travelerCount > 50 ||
      !Number.isFinite(totalBudget) ||
      totalBudget < 1
    ) {
      setTripError(
        "Enter between 1 and 50 travelers and a valid budget."
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await createTrip({
        destinationId: selectedDestination._id,
        startDate,
        endDate,
        travelers: travelerCount,
        budget: totalBudget,
      });

      setTripMessage(
        result.message || "Trip created successfully!"
      );
      setShowTripForm(false);
      setStartDate("");
      setEndDate("");
      setTravelers("1");
      setBudget("");
      if (viewMode === "trips" || viewMode === "tripDetail") {
        fetchTrips();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create trip. Please try again.";

      if (message.toLowerCase().includes("unauthorized")) {
        handleAuthLogout();
        setAuthError("Session expired. Please log in again.");
        return;
      }
      if (message.toLowerCase().includes("forbidden")) {
        setTripError("You do not have permission to create a trip.");
        return;
      }

      setTripError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <h2>TravelMate</h2>
            <span>Trip Planner</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {authUser && (
            <button
              type="button"
              className={`nav-item ${viewMode === "dashboard" ? "active" : ""}`}
              onClick={() => {
                setViewMode("dashboard");
                setSelectedDestination(null);
                setSelectedTrip(null);
                resetItineraryState();
                if (trips.length === 0 && !loadingTrips) {
                  fetchTrips();
                }
              }}
              style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
            >
              Dashboard
            </button>
          )}
          <button
            type="button"
            className={`nav-item ${(viewMode === "destinations" && !selectedDestination) || selectedDestination ? "active" : ""}`}
            onClick={handleBackToDestinations}
            style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
          >
            Explore Destinations
          </button>
          {authUser && (
            <>
              <button
                type="button"
                className={`nav-item ${viewMode === "trips" ? "active" : ""}`}
                onClick={handleShowTrips}
                style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
              >
                My Trips
              </button>
              <button
                type="button"
                className={`nav-item ${viewMode === "packing" ? "active" : ""}`}
                onClick={handleShowPacking}
                style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
              >
                🎒 Packing Checklist
              </button>
              <button
                type="button"
                className={`nav-item ${viewMode === "calendar" ? "active" : ""}`}
                onClick={handleShowCalendar}
                style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}
              >
                Itinerary Calendar
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          {authUser ? (
            <div className="user-info">
              <div className="user-details">
                <div className="user-name">{authUser.name}</div>
                <div className="user-email">{authUser.email}</div>
              </div>
              <button className="logout-btn" onClick={handleAuthLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <button
                className="auth-link"
                onClick={() => {
                  setAuthView("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
                style={{ background: "transparent" }}
              >
                Login
              </button>
              <button
                className="auth-link primary"
                onClick={() => {
                  setAuthView("register");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="main-content">

      {authUser && viewMode === "dashboard" ? (
        <section className="destinations">
          <div className="dashboard-hero">
            <div className="page-header">
              <p className="eyebrow">Your next journey</p>
              <h1>Welcome back, {authUser.name}</h1>
              <p>Plan meaningful trips, organize itineraries, and keep every travel detail in one place.</p>
            </div>
            <TravelImageFrame
              image={getDestinationImage("jaipur")}
              alt="Jaipur travel scene"
              className="dashboard-hero-image"
            />
          </div>

          <div className="grid grid-3">
            <div className="card">
              <div className="card-header">
                <h2>Total Trips</h2>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--navy)" }}>
                {loadingTrips ? "..." : trips.length}
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h2>Upcoming Trips</h2>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--teal)" }}>
                {loadingTrips
                  ? "..."
                  : trips.filter((t) => new Date(t.startDate) > new Date()).length}
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h2>Destinations</h2>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--success)" }}>
                {loadingDest ? "..." : destinations.length}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                onClick={() => setViewMode("destinations")}
              >
                Explore Destinations
              </button>
              <button className="btn btn-secondary" onClick={handleShowTrips}>
                View All Trips
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setViewMode("destinations")}
              >
                Plan a Trip
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>My Trips Preview</h2>
              <button className="btn btn-secondary" onClick={handleShowTrips}>
                View All
              </button>
            </div>
            {loadingTrips && <p>Loading trips...</p>}
            {errorTrips && <div className="alert alert-error">{errorTrips}</div>}
            {!loadingTrips && trips.length === 0 && (
              <div className="empty-state">
                <h3>No trips yet</h3>
                <p>Start by exploring destinations and planning your first trip</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "1rem" }}
                  onClick={() => setViewMode("destinations")}
                >
                  Explore Destinations
                </button>
              </div>
            )}
            {!loadingTrips && trips.length > 0 && (
              <div className="grid grid-2">
                {trips.slice(0, 4).map((trip) => {
                  const dest = typeof trip.destination === "object" ? trip.destination : null;
                  const status = getTripStatus(trip.startDate, trip.endDate);
                  const statusColors: Record<string, string> = {
                    Upcoming: "#f57c00",
                    Ongoing: "#2e7d32",
                    Completed: "#666666",
                  };
                  return (
                    <div key={trip._id} className="trip-card">
                      <TravelImageFrame
                        image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined}
                        alt={dest ? dest.name : "Trip"}
                      />
                      <div className="trip-card-body">
                        {dest && ((dest as any).location || dest.country) && (
                          <span className="location">{(dest as any).location || dest.country}</span>
                        )}
                        <h3>{dest ? dest.name : "Destination"}</h3>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                          <p style={{ margin: 0 }}>
                            {new Date(trip.startDate).toLocaleDateString()} -{" "}
                            {new Date(trip.endDate).toLocaleDateString()}
                          </p>
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              background: `${statusColors[status]}15`,
                              color: statusColors[status],
                              border: `1px solid ${statusColors[status]}40`,
                            }}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="trip-card-meta">
                          <span>{trip.travelers} traveler{trip.travelers !== 1 ? "s" : ""}</span>
                          <span>Budget: ${trip.budget}</span>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ marginTop: "0.75rem" }}
                          onClick={() => handleViewTripDetails(trip)}
                        >
                          View Details & Itinerary
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Discover Destinations</h2>
              <button className="btn btn-secondary" onClick={() => setViewMode("destinations")}>
                View All
              </button>
            </div>
            {loadingDest && <p>Loading destinations...</p>}
            {errorDest && <div className="alert alert-error">{errorDest}</div>}
            {!loadingDest && destinations.length === 0 && (
              <div className="empty-state">
                <h3>No destinations available</h3>
              </div>
            )}
            {!loadingDest && destinations.length > 0 && (
              <div className="grid grid-3">
                {destinations.slice(0, 3).map((dest) => (
                  <div
                    key={dest._id}
                    className="destination-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedDestination(dest);
                      setViewMode("destinations");
                    }}
                  >
                    <TravelImageFrame
                      image={getDestinationImage(dest.name, dest.imageUrl)}
                      alt={dest.name}
                    />
                    <div className="destination-info">
                      {(dest as any).location || dest.country ? (
                        <span className="location">{(dest as any).location || dest.country}</span>
                      ) : null}
                      <h3>{dest.name}</h3>
                      <p>{dest.description?.substring(0, 80)}{dest.description && dest.description.length > 80 ? "..." : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : authUser && viewMode === "packing" ? (
        <section className="destinations packing-page">
          <div className="page-header">
            <h1>Packing Checklist</h1>
            <p>Keep every trip organized with a saved packing list.</p>
          </div>

          {loadingTrips && <p role="status">Loading your trips...</p>}
          {errorTrips && <p className="error" role="alert">{errorTrips}</p>}
          {!loadingTrips && trips.length === 0 && (
            <div className="card empty-state">
              <h2>No trips yet</h2>
              <p>Create a trip first, then build its packing checklist here.</p>
              <button type="button" className="btn btn-primary" onClick={handleShowTrips}>
                Go to My Trips
              </button>
            </div>
          )}

          {trips.length > 0 && (
            <div className="packing-page-layout">
              <div className="card packing-trip-selector">
                <h2>Select a trip</h2>
                <div className="packing-trip-list">
                  {trips.map((trip) => {
                    const destination =
                      typeof trip.destination === "object" && trip.destination
                        ? trip.destination.name
                        : "Trip";
                    return (
                      <button
                        type="button"
                        key={trip._id}
                        className={`packing-trip-option ${selectedTrip?._id === trip._id ? "selected" : ""}`}
                        onClick={() => handleSelectPackingTrip(trip)}
                      >
                        <strong>{destination}</strong>
                        <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTrip ? (
                <section className="card packing-page-card" aria-labelledby="packing-page-heading">
                  {(() => {
                    const packedCount = packingItems.filter((item) => item.isPacked).length;
                    const completion = packingItems.length > 0
                      ? (packedCount / packingItems.length) * 100
                      : 0;
                    return (
                      <>
                        <div className="itinerary-heading-row">
                          <div>
                            <h2 id="packing-page-heading">
                              {typeof selectedTrip.destination === "object" && selectedTrip.destination
                                ? selectedTrip.destination.name
                                : "Selected trip"}
                            </h2>
                            <p className="packing-summary">
                              {packedCount} of {packingItems.length} items packed · {completion.toFixed(0)}% complete
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => void handleAddPackingSuggestions()}
                            disabled={packingSubmitting || loadingPacking}
                          >
                            Add starter suggestions
                          </button>
                        </div>
                        <div className="packing-progress" aria-label={`Packing checklist ${completion.toFixed(0)} percent complete`}>
                          <span style={{ width: `${completion}%` }} />
                        </div>
                        <form className="packing-form" onSubmit={handlePackingSubmit}>
                          <h4>{editingPackingId ? "Edit packing item" : "Add packing item"}</h4>
                          <label>Item name<input value={packingForm.name} onChange={(event) => setPackingForm({ ...packingForm, name: event.target.value })} maxLength={120} required /></label>
                          <label>Category<select value={packingForm.category} onChange={(event) => setPackingForm({ ...packingForm, category: event.target.value as PackingCategory })}>{PACKING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                          <label>Quantity<input type="number" min="1" max="100" step="1" value={packingForm.quantity} onChange={(event) => setPackingForm({ ...packingForm, quantity: event.target.value })} required /></label>
                          <label>Notes <span className="field-hint">(optional)</span><textarea value={packingForm.notes} onChange={(event) => setPackingForm({ ...packingForm, notes: event.target.value })} maxLength={500} rows={2} /></label>
                          <div className="expense-form-actions">
                            <button type="submit" className="explore-button" disabled={packingSubmitting}>{packingSubmitting ? "Saving..." : editingPackingId ? "Update item" : "Add item"}</button>
                            {editingPackingId && <button type="button" className="btn btn-secondary" onClick={resetPackingForm} disabled={packingSubmitting}>Cancel</button>}
                          </div>
                        </form>
                        {loadingPacking && <p role="status">Loading packing checklist...</p>}
                        {packingError && <p className="error" role="alert">{packingError}</p>}
                        {packingMessage && <p className="success" role="status">{packingMessage}</p>}
                        {!loadingPacking && packingItems.length === 0 && <p className="muted packing-empty">No items yet. Add an item or use starter suggestions.</p>}
                        {!loadingPacking && packingItems.length > 0 && (
                          <div className="packing-category-list">
                            {PACKING_CATEGORIES.map((category) => {
                              const categoryItems = packingItems.filter((item) => item.category === category);
                              if (categoryItems.length === 0) return null;
                              return (
                                <div className="packing-category" key={category}>
                                  <h4>{category}</h4>
                                  {categoryItems.map((item) => (
                                    <article className={`packing-item ${item.isPacked ? "packed" : ""}`} key={item._id}>
                                      <label className="packing-item-check">
                                        <input type="checkbox" checked={item.isPacked} onChange={() => void handleTogglePackingItem(item)} disabled={packingSubmitting} />
                                        <span><strong>{item.name}</strong><small>Quantity: {item.quantity}{item.notes ? ` · ${item.notes}` : ""}</small></span>
                                      </label>
                                      <div className="expense-row-actions">
                                        <button type="button" className="text-button" onClick={() => startEditingPackingItem(item)} disabled={packingSubmitting}>Edit</button>
                                        <button type="button" className="text-button danger" onClick={() => void handleDeletePackingItem(item)} disabled={packingSubmitting}>Delete</button>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>
              ) : (
                <div className="card empty-state">
                  <h2>Choose a trip</h2>
                  <p>Select one of your trips to view its saved packing checklist.</p>
                </div>
              )}
            </div>
          )}
        </section>
      ) : authUser && viewMode === "calendar" ? (
        <section className="destinations calendar-page">
          <div className="page-header">
            <h1>Itinerary Calendar</h1>
            <p>View saved itinerary activities by date.</p>
          </div>

          {loadingTrips && <p role="status">Loading your trips...</p>}
          {errorTrips && <p className="error" role="alert">{errorTrips}</p>}
          {!loadingTrips && trips.length === 0 && (
            <div className="card empty-state">
              <h2>No trips yet</h2>
              <p>Create a trip and save an itinerary before using the calendar.</p>
              <button type="button" className="btn btn-primary" onClick={handleShowTrips}>
                Go to My Trips
              </button>
            </div>
          )}

          {trips.length > 0 && (
            <div className="calendar-layout">
              <div className="card calendar-trip-selector">
                <h2>Select a trip</h2>
                <div className="packing-trip-list">
                  {trips.map((trip) => {
                    const destination =
                      typeof trip.destination === "object" && trip.destination
                        ? trip.destination.name
                        : "Trip";
                    return (
                      <button
                        type="button"
                        key={trip._id}
                        className={`packing-trip-option ${selectedTrip?._id === trip._id ? "selected" : ""}`}
                        onClick={() => void handleSelectCalendarTrip(trip)}
                      >
                        <strong>{destination}</strong>
                        <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTrip && (
                <div className="calendar-content">
                  {loadingCalendar && <p role="status">Loading saved itinerary...</p>}
                  {calendarError && <p className="error" role="alert">{calendarError}</p>}
                  {!loadingCalendar && !calendarItinerary && !calendarError && (
                    <div className="card empty-state">
                      <h2>No saved itinerary</h2>
                      <p>Save an itinerary for this trip before viewing it on the calendar.</p>
                    </div>
                  )}
                  {calendarItinerary && (
                    <section className="card itinerary-calendar-card" aria-labelledby="calendar-heading">
                      <div className="calendar-toolbar">
                        <button type="button" className="btn btn-secondary" onClick={() => shiftCalendarMonth(-1)}>
                          Previous Month
                        </button>
                        <h2 id="calendar-heading">
                          {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                        </h2>
                        <button type="button" className="btn btn-secondary" onClick={() => shiftCalendarMonth(1)}>
                          Next Month
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            const today = new Date();
                            setCalendarMonth(today);
                            setCalendarSelectedDate(getDateKey(today));
                          }}
                        >
                          Today
                        </button>
                      </div>

                      <div className="calendar-weekdays" aria-hidden="true">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                      <div className="calendar-grid">
                        {Array.from({
                          length: getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()),
                        }).map((_, index) => (
                          <span className="calendar-cell calendar-cell-empty" key={`empty-${index}`} />
                        ))}
                        {Array.from({
                          length: getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()),
                        }).map((_, index) => {
                          const date = new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth(),
                            index + 1
                          );
                          const dateKey = getDateKey(date);
                          const activities = getActivitiesForDate(calendarItinerary, selectedTrip, date);
                          return (
                            <button
                              type="button"
                              className={`calendar-cell ${calendarSelectedDate === dateKey ? "selected" : ""} ${activities.length > 0 ? "has-activities" : ""}`}
                              key={dateKey}
                              onClick={() => setCalendarSelectedDate(dateKey)}
                            >
                              <strong>{index + 1}</strong>
                              {activities.length > 0 && (
                                <span className="calendar-activity-count">
                                  {activities.length} {activities.length === 1 ? "activity" : "activities"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="calendar-day-details">
                        <h3>
                          {calendarSelectedDate
                            ? new Date(`${calendarSelectedDate}T00:00:00`).toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Select a date"}
                        </h3>
                        {calendarSelectedDate && (() => {
                          const selectedDate = new Date(`${calendarSelectedDate}T00:00:00`);
                          const activities = getActivitiesForDate(calendarItinerary, selectedTrip, selectedDate);
                          if (activities.length === 0) {
                            return <p className="muted">No saved activities for this date.</p>;
                          }
                          return (
                            <div className="calendar-activities">
                              {activities.map((activity, index) => (
                                <article className="calendar-activity" key={`${activity.title}-${activity.startTime}-${index}`}>
                                  <strong>{activity.title}</strong>
                                  <span>
                                    {activity.startTime && activity.endTime
                                      ? `${activity.startTime} – ${activity.endTime}`
                                      : activity.startTime || "Time not specified"}
                                  </span>
                                  {activity.locationName && <small>{activity.locationName}</small>}
                                </article>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      ) : authUser && viewMode === "destinations" && !selectedDestination ? (
        <section className="destinations">
          <div className="page-header">
            <h1>Explore Destinations</h1>
            <p>Discover amazing places and start planning your trip</p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search destinations by name or country..."
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                className="form-input"
                style={{ flex: "1", minWidth: "250px" }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDestinationSearch("");
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {loadingDest && <p>Loading destinations...</p>}
          {errorDest && (
            <div className="alert alert-error">
              {errorDest}
              <button
                className="btn btn-secondary"
                style={{ marginLeft: "1rem" }}
                onClick={() => {
                  setLoadingDest(true);
                  setErrorDest("");
                  getDestinations()
                    .then((data) => {
                      setDestinations(data);
                    })
                    .catch((err: unknown) => {
                      setErrorDest(err instanceof Error ? err.message : "Something went wrong");
                    })
                    .finally(() => setLoadingDest(false));
                }}
              >
                Retry
              </button>
            </div>
          )}
          {!loadingDest && !errorDest && (
            <>
              {(() => {
                const filtered = destinations.filter((dest) => {
                  if (!destinationSearch.trim()) return true;
                  const search = destinationSearch.toLowerCase();
                  return (
                    dest.name.toLowerCase().includes(search) ||
                    dest.country.toLowerCase().includes(search) ||
                    (dest.state && dest.state.toLowerCase().includes(search))
                  );
                });
                if (filtered.length === 0) {
                  return (
                    <div className="empty-state">
                      <h3>No destinations found</h3>
                      <p>Try adjusting your search terms</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-3">
                    {filtered.map((dest) => (
                      <div
                        key={dest._id}
                        className="destination-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedDestination(dest)}
                      >
                        <TravelImageFrame
                          image={getDestinationImage(dest.name, dest.imageUrl)}
                          alt={dest.name}
                        />
                        <div className="destination-info">
                          <span className="location">
                            {dest.state ? `${dest.state}, ${dest.country}` : dest.country}
                          </span>
                          <h3>{dest.name}</h3>
                          <p>{dest.description ? dest.description.substring(0, 80) + (dest.description.length > 80 ? "..." : "") : ""}</p>
                          {dest.tags && dest.tags.length > 0 && (
                            <div className="tags">
                              {dest.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx}>{tag}</span>
                              ))}
                            </div>
                          )}
                          <button className="btn btn-primary" style={{ marginTop: "0.75rem", width: "100%" }}>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </section>
      ) : null}

      {!authUser && authChecked && (
        <section
          className="auth-page"
          style={
            authBackgroundImage
              ? {
                  backgroundImage: `linear-gradient(rgba(23, 63, 53, 0.28), rgba(247, 245, 239, 0.72)), url("${authBackgroundImage.imageUrl}")`,
                }
              : undefined
          }
        >
          <div className="trip-form auth-card">
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              {authView === "login" ? "Login" : "Register"}
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>
              Sign in to create and manage your trips and itineraries.
            </p>
            <form onSubmit={handleAuthSubmit}>
              {authView === "register" && (
                <>
                  <label htmlFor="authName">Name</label>
                  <input
                    id="authName"
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required
                  />
                </>
              )}
              <label htmlFor="authEmail">Email</label>
              <input
                id="authEmail"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
              <label htmlFor="authPassword">Password</label>
              <input
                id="authPassword"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              {authError && <p className="error auth-status">{authError}</p>}
              {authMessage && <p className="success auth-status">{authMessage}</p>}
              <button type="submit" className="explore-button" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authView === "login"
                    ? "Login"
                    : "Register"}
              </button>
            </form>
            <button
              type="button"
              className="explore-button itinerary-secondary-button"
              style={{ marginTop: "0.6rem" }}
              onClick={() => {
                setAuthView(authView === "login" ? "register" : "login");
                setAuthError("");
                setAuthMessage("");
              }}
            >
              {authView === "login"
                ? "Need an account? Register"
                : "Already have an account? Login"}
            </button>
          </div>
        </section>
      )}

      {authUser && viewMode === "tripDetail" && selectedTrip ? (
        <section className="destination-details trip-details-page">
            {authUser && (
              <button
                type="button"
                className="explore-button"
                onClick={handleShowTrips}
              >
                Saved Trips
              </button>
            )}

          {(() => {
            const dest =
              typeof selectedTrip.destination === "object" &&
              selectedTrip.destination !== null
                ? selectedTrip.destination
                : null;
            const totalExpenses = expenses.reduce(
              (total, expense) => total + expense.amount,
              0
            );
            const tripBudget = Number(selectedTrip.budget) || 0;
            const remainingBudget = tripBudget - totalExpenses;
            const usagePercentage =
              tripBudget > 0 ? (totalExpenses / tripBudget) * 100 : 0;
            const categoryTotals = EXPENSE_CATEGORIES.map((category) => {
              const total = expenses
                .filter((expense) => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0);
              return {
                category,
                total,
                share: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
              };
            });

            return (
              <>
                <TravelImageFrame
                  image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined}
                  alt={dest?.name || "Trip Details"}
                  className="trip-detail-image"
                />
                <h2>Trip Details</h2>
                <p style={{ color: "var(--green)", fontWeight: 600 }}>
                  {dest?.name || "Unknown Destination"}
                  {dest
                    ? dest.state
                      ? ` • ${dest.state}, ${dest.country}`
                      : dest.country
                        ? ` • ${dest.country}`
                        : ""
                    : ""}
                </p>

                {dest?.description && <p>{dest.description}</p>}

                <div className="trip-form trip-information-card">
                  <h3>Trip Information</h3>
                  <p>
                    <strong>Start Date:</strong> {formatDate(selectedTrip.startDate)}
                  </p>
                  <p>
                    <strong>End Date:</strong> {formatDate(selectedTrip.endDate)}
                  </p>
                  {(() => {
                    const durationText = formatTripDuration(selectedTrip.startDate, selectedTrip.endDate);
                    if (!durationText) return null;
                    return (
                      <p>
                        <strong>Duration:</strong> {durationText}
                      </p>
                    );
                  })()}
                  <p>
                    <strong>Number of Travelers:</strong> {selectedTrip.travelers}
                  </p>
                  <p>
                    <strong>Total Budget:</strong> {formatCurrency(selectedTrip.budget)}
                  </p>
                  <p className="trip-id" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    Trip ID: {selectedTrip._id}
                  </p>
                </div>

                <section className="trip-form budget-card" aria-labelledby="budget-heading">
                  <div className="itinerary-heading-row">
                    <h3 id="budget-heading">Trip budget</h3>
                    <span
                      className={`budget-status ${
                        tripBudget > 0 && totalExpenses > tripBudget
                          ? "over"
                          : totalExpenses === tripBudget && tripBudget > 0
                            ? "used"
                            : "within"
                      }`}
                    >
                      {tripBudget > 0 && totalExpenses > tripBudget
                        ? "Over budget"
                        : totalExpenses === tripBudget && tripBudget > 0
                          ? "Budget fully used"
                          : "Within budget"}
                    </span>
                  </div>
                  <div className="budget-summary-grid">
                    <div><span>Total budget</span><strong>{formatCurrency(tripBudget)}</strong></div>
                    <div><span>Total expenses</span><strong>{formatCurrency(totalExpenses)}</strong></div>
                    <div><span>Remaining</span><strong className={remainingBudget < 0 ? "budget-negative" : ""}>{formatCurrency(remainingBudget)}</strong></div>
                  </div>
                  <div className="budget-progress" aria-label={`Budget usage ${usagePercentage.toFixed(1)} percent`}>
                    <span style={{ width: `${Math.min(100, Math.max(0, usagePercentage))}%` }} />
                  </div>
                  <p className="budget-usage">
                    {tripBudget > 0
                      ? `${usagePercentage.toFixed(1)}% of budget used`
                      : "No budget was set for this trip."}
                  </p>
                  {remainingBudget < 0 && (
                    <p className="warning" role="alert">
                      You are {formatCurrency(Math.abs(remainingBudget))} over budget.
                    </p>
                  )}

                  <div className="expense-layout">
                    <form className="expense-form" onSubmit={handleExpenseSubmit}>
                      <h4>{editingExpenseId ? "Edit expense" : "Add expense"}</h4>
                      <label>
                        Expense name
                        <input
                          value={expenseForm.title}
                          onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
                          required
                          maxLength={120}
                        />
                      </label>
                      <label>
                        Amount
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Category
                        <select
                          value={expenseForm.category}
                          onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value as ExpenseCategory })}
                        >
                          {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={expenseForm.date}
                          onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Notes <span className="field-hint">(optional)</span>
                        <textarea
                          value={expenseForm.notes}
                          onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })}
                          rows={3}
                          maxLength={500}
                        />
                      </label>
                      <div className="expense-form-actions">
                        <button className="explore-button" type="submit" disabled={expenseSubmitting}>
                          {expenseSubmitting ? "Saving..." : editingExpenseId ? "Update expense" : "Add expense"}
                        </button>
                        {editingExpenseId && (
                          <button className="btn btn-secondary" type="button" onClick={resetExpenseForm} disabled={expenseSubmitting}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="expense-list">
                      <h4>Expenses</h4>
                      {loadingExpenses && <p role="status">Loading expenses...</p>}
                      {expenseError && <p className="error" role="alert">{expenseError}</p>}
                      {expenseMessage && <p className="success" role="status">{expenseMessage}</p>}
                      {!loadingExpenses && expenses.length === 0 && <p className="muted">No expenses recorded yet.</p>}
                      {!loadingExpenses && expenses.map((expense) => (
                        <article className="expense-row" key={expense._id}>
                          <div>
                            <strong>{expense.title}</strong>
                            <span>{expense.category} · {new Date(expense.date).toLocaleDateString()}</span>
                            {expense.notes && <small>{expense.notes}</small>}
                          </div>
                          <div className="expense-row-actions">
                            <strong>{formatCurrency(expense.amount)}</strong>
                            <button type="button" className="text-button" onClick={() => startEditingExpense(expense)} disabled={expenseSubmitting}>Edit</button>
                            <button type="button" className="text-button danger" onClick={() => void handleDeleteExpense(expense)} disabled={expenseSubmitting}>Delete</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="expense-breakdown">
                    <h4>Spending breakdown</h4>
                    <div className="breakdown-grid">
                      {categoryTotals.map(({ category, total, share }) => (
                        <div key={category}>
                          <span>{category}</span>
                          <strong>{formatCurrency(total)}</strong>
                          <small>{totalExpenses > 0 ? `${share.toFixed(1)}% of spending` : "No spending"}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="trip-form packing-card" aria-labelledby="packing-heading">
                  {(() => {
                    const packedCount = packingItems.filter((item) => item.isPacked).length;
                    const completion = packingItems.length > 0
                      ? (packedCount / packingItems.length) * 100
                      : 0;

                    return (
                      <>
                        <div className="itinerary-heading-row">
                          <div>
                            <h3 id="packing-heading">Packing Checklist</h3>
                            <p className="packing-summary">
                              {packedCount} of {packingItems.length} items packed · {completion.toFixed(0)}% complete
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => void handleAddPackingSuggestions()}
                            disabled={packingSubmitting || loadingPacking}
                          >
                            Add starter suggestions
                          </button>
                        </div>

                        <div
                          className="packing-progress"
                          aria-label={`Packing checklist ${completion.toFixed(0)} percent complete`}
                        >
                          <span style={{ width: `${completion}%` }} />
                        </div>

                        <form className="packing-form" onSubmit={handlePackingSubmit}>
                          <h4>{editingPackingId ? "Edit packing item" : "Add packing item"}</h4>
                          <label>
                            Item name
                            <input
                              value={packingForm.name}
                              onChange={(event) =>
                                setPackingForm({ ...packingForm, name: event.target.value })
                              }
                              maxLength={120}
                              required
                            />
                          </label>
                          <label>
                            Category
                            <select
                              value={packingForm.category}
                              onChange={(event) =>
                                setPackingForm({
                                  ...packingForm,
                                  category: event.target.value as PackingCategory,
                                })
                              }
                            >
                              {PACKING_CATEGORIES.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Quantity
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={packingForm.quantity}
                              onChange={(event) =>
                                setPackingForm({ ...packingForm, quantity: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label>
                            Notes <span className="field-hint">(optional)</span>
                            <textarea
                              value={packingForm.notes}
                              onChange={(event) =>
                                setPackingForm({ ...packingForm, notes: event.target.value })
                              }
                              maxLength={500}
                              rows={2}
                            />
                          </label>
                          <div className="expense-form-actions">
                            <button type="submit" className="explore-button" disabled={packingSubmitting}>
                              {packingSubmitting
                                ? "Saving..."
                                : editingPackingId
                                  ? "Update item"
                                  : "Add item"}
                            </button>
                            {editingPackingId && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetPackingForm}
                                disabled={packingSubmitting}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>

                        {loadingPacking && <p role="status">Loading packing checklist...</p>}
                        {packingError && <p className="error" role="alert">{packingError}</p>}
                        {packingMessage && <p className="success" role="status">{packingMessage}</p>}
                        {!loadingPacking && packingItems.length === 0 && (
                          <p className="muted packing-empty">
                            Your checklist is empty. Add an item or use starter suggestions to begin.
                          </p>
                        )}
                        {!loadingPacking && packingItems.length > 0 && (
                          <div className="packing-category-list">
                            {PACKING_CATEGORIES.map((category) => {
                              const categoryItems = packingItems.filter(
                                (item) => item.category === category
                              );
                              if (categoryItems.length === 0) return null;
                              return (
                                <div className="packing-category" key={category}>
                                  <h4>{category}</h4>
                                  {categoryItems.map((item) => (
                                    <article className={`packing-item ${item.isPacked ? "packed" : ""}`} key={item._id}>
                                      <label className="packing-item-check">
                                        <input
                                          type="checkbox"
                                          checked={item.isPacked}
                                          onChange={() => void handleTogglePackingItem(item)}
                                          disabled={packingSubmitting}
                                        />
                                        <span>
                                          <strong>{item.name}</strong>
                                          <small className="packing-item-quantity">
                                            Quantity: {item.quantity}
                                          </small>
                                          {item.notes && (
                                            <small className="packing-item-notes">{item.notes}</small>
                                          )}
                                        </span>
                                      </label>
                                      <div className="expense-row-actions">
                                        <button
                                          type="button"
                                          className="text-button"
                                          onClick={() => startEditingPackingItem(item)}
                                          disabled={packingSubmitting}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="text-button danger"
                                          onClick={() => void handleDeletePackingItem(item)}
                                          disabled={packingSubmitting}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </section>

                <section
                  className="trip-form itinerary-card"
                  aria-labelledby="itinerary-heading"
                  aria-busy={
                    loadingItinerary || generatingDraft || savingItinerary
                  }
                >
                  <div className="itinerary-heading-row">
                    <h3 id="itinerary-heading">
                      {draftSaved
                        ? "Saved itinerary"
                        : draft
                          ? "Itinerary Draft"
                          : "Itinerary"}
                    </h3>
                    {draft && (
                      <span
                        className={`itinerary-badge ${draftSaved ? "saved" : ""}`}
                      >
                        {draftSaved ? "Saved"                         : "Draft — not saved"}
                      </span>
                    )}
                  </div>

                  <p className="itinerary-intro">
                    Review or generate a sample itinerary. Generating a draft
                    does not change a saved itinerary until you save it.
                  </p>

                  {loadingItinerary && (
                    <p role="status">Loading saved itinerary...</p>
                  )}

                  <div className="itinerary-preferences">
                    <div className="itinerary-preferences-heading">
                      <h4>Travel preferences</h4>
                      <span>Used only for the next draft</span>
                    </div>
                    <fieldset>
                      <legend>Interests</legend>
                      <div className="itinerary-interest-grid">
                        {(
                          [
                            "nature",
                            "adventure",
                            "culture",
                            "food",
                            "sightseeing",
                            "relaxation",
                            "shopping",
                          ] as ItineraryInterest[]
                        ).map((interest) => (
                          <label key={interest}>
                            <input
                              type="checkbox"
                              checked={itineraryInterests.includes(interest)}
                              onChange={(event) => {
                                setItineraryInterests((current) =>
                                  event.target.checked
                                    ? [...current, interest]
                                    : current.filter((item) => item !== interest)
                                );
                              }}
                            />
                            <span>{interest}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="itinerary-preference-fields">
                      <label>
                        Travel pace
                        <select
                          value={itineraryPace}
                          onChange={(event) =>
                            setItineraryPace(event.target.value as TravelPace)
                          }
                        >
                          <option value="relaxed">Relaxed</option>
                          <option value="balanced">Balanced</option>
                          <option value="packed">Packed</option>
                        </select>
                      </label>
                      <label>
                        Daily activity budget
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Optional; defaults to trip budget per day"
                          value={itineraryDailyBudget}
                          onChange={(event) =>
                            setItineraryDailyBudget(event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="explore-button"
                    onClick={handleGenerateDraft}
                    disabled={
                      loadingItinerary ||
                      generatingDraft ||
                      savingItinerary ||
                      editingItinerary
                    }
                  >
                    {generatingDraft
                      ? "Generating itinerary draft..."
                      : draft
                        ? "Regenerate itinerary draft"
                        : "Generate itinerary draft"}
                  </button>

                  {itineraryError && (
                    <p className="error" role="alert">
                      {itineraryError}
                    </p>
                  )}

                  {itineraryMessage && (
                    <p className="success" role="status">
                      {itineraryMessage}
                    </p>
                  )}

                  {draft && (
                    <>
                      <div className="itinerary-summary">
                        <p>
                          <strong>Duration:</strong> {draft.durationDays}{" "}
                          day{draft.durationDays === 1 ? "" : "s"}
                        </p>
                        <p>
                          <strong>Estimated total:</strong>{" "}
                          {formatCurrency(draft.estimatedTotalCost)}
                        </p>
                        <p>
                          <strong>Daily budget:</strong>{" "}
                          {formatCurrency(draft.dailyBudget)}
                        </p>
                      </div>

                      {draft.budgetWarning && (
                        <p className="warning">
                          Budget warning: {draft.budgetWarning}
                        </p>
                      )}

                      <div className="itinerary-days">
                        {draft.dayPlans.map((day) => (
                          <section
                            className="itinerary-day"
                            key={day.dayIndex}
                            aria-labelledby={`itinerary-day-${day.dayIndex}`}
                          >
                            <h4 id={`itinerary-day-${day.dayIndex}`}>
                              Day {day.dayIndex}
                            </h4>

                            {day.activities.length === 0 ? (
                              <p>
                                {editingItinerary
                                  ? "No activities for this day yet."
                                  : "No activities for this day."}
                              </p>
                            ) : (
                              <ul className="itinerary-activity-list">
                                {day.activities.map((activity, index) => {
                                  const activityDuration = formatActivityDuration(
                                    activity.startTime,
                                    activity.endTime
                                  );
                                  const activityKey = `${day.dayIndex}-${index}`;

                                  if (editingItinerary) {
                                    return (
                                      <li
                                        className="itinerary-activity itinerary-activity-editing"
                                        key={activityKey}
                                      >
                                        <div className="itinerary-edit-field">
                                          <label htmlFor={`activity-title-${activityKey}`}>
                                            Title
                                          </label>
                                          <input
                                            id={`activity-title-${activityKey}`}
                                            type="text"
                                            value={activity.title}
                                            onChange={(event) =>
                                              handleActivityChange(
                                                day.dayIndex,
                                                index,
                                                { title: event.target.value }
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="itinerary-edit-field">
                                          <label htmlFor={`activity-description-${activityKey}`}>
                                            Description
                                          </label>
                                          <textarea
                                            id={`activity-description-${activityKey}`}
                                            rows={3}
                                            value={activity.description}
                                            onChange={(event) =>
                                              handleActivityChange(
                                                day.dayIndex,
                                                index,
                                                { description: event.target.value }
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="itinerary-edit-grid">
                                          <div className="itinerary-edit-field">
                                            <label htmlFor={`activity-start-${activityKey}`}>
                                              Start time
                                            </label>
                                            <input
                                              id={`activity-start-${activityKey}`}
                                              type="time"
                                              value={activity.startTime}
                                              onChange={(event) =>
                                                handleActivityChange(
                                                  day.dayIndex,
                                                  index,
                                                  { startTime: event.target.value }
                                                )
                                              }
                                            />
                                          </div>

                                          <div className="itinerary-edit-field">
                                            <label htmlFor={`activity-end-${activityKey}`}>
                                              End time
                                            </label>
                                            <input
                                              id={`activity-end-${activityKey}`}
                                              type="time"
                                              value={activity.endTime}
                                              onChange={(event) =>
                                                handleActivityChange(
                                                  day.dayIndex,
                                                  index,
                                                  { endTime: event.target.value }
                                                )
                                              }
                                            />
                                          </div>

                                          <div className="itinerary-edit-field">
                                            <label htmlFor={`activity-cost-${activityKey}`}>
                                              Estimated cost (INR)
                                            </label>
                                            <input
                                              id={`activity-cost-${activityKey}`}
                                              type="number"
                                              min="0"
                                              step="any"
                                              value={
                                                Number.isFinite(activity.estimatedCost)
                                                  ? activity.estimatedCost
                                                  : 0
                                              }
                                              onChange={(event) =>
                                                handleActivityChange(
                                                  day.dayIndex,
                                                  index,
                                                  {
                                                    estimatedCost: Number(
                                                      event.target.value
                                                    ),
                                                  }
                                                )
                                              }
                                            />
                                          </div>
                                        </div>

                                        <p className="itinerary-activity-duration">
                                          <strong>Duration:</strong>{" "}
                                          {activityDuration ??
                                            "Enter valid start and end times to show duration."}
                                        </p>

                                        <div className="itinerary-activity-edit-actions">
                                          <div className="itinerary-move-actions">
                                            <button
                                              type="button"
                                              className="itinerary-move-button"
                                              onClick={() =>
                                                handleMoveActivity(
                                                  day.dayIndex,
                                                  index,
                                                  -1
                                                )
                                              }
                                              disabled={savingItinerary || index === 0}
                                              title="Move activity up"
                                            >
                                              Move Up
                                            </button>
                                            <button
                                              type="button"
                                              className="itinerary-move-button"
                                              onClick={() =>
                                                handleMoveActivity(
                                                  day.dayIndex,
                                                  index,
                                                  1
                                                )
                                              }
                                              disabled={
                                                savingItinerary ||
                                                index === day.activities.length - 1
                                              }
                                              title="Move activity down"
                                            >
                                              Move Down
                                            </button>
                                            {draft.dayPlans.length > 1 && (
                                              <select
                                                className="itinerary-move-select"
                                                aria-label={`Move activity ${index + 1} on Day ${day.dayIndex} to another day`}
                                                defaultValue=""
                                                disabled={savingItinerary}
                                                onChange={(event) => {
                                                  const value = event.target.value;
                                                  if (value === "") {
                                                    return;
                                                  }

                                                  const targetDay = Number(value);
                                                  if (Number.isInteger(targetDay)) {
                                                    handleMoveActivityToDay(
                                                      day.dayIndex,
                                                      index,
                                                      targetDay
                                                    );
                                                  }

                                                  event.target.value = "";
                                                }}
                                              >
                                                <option value="" disabled>
                                                  Move to day...
                                                </option>
                                                {draft.dayPlans
                                                  .filter(
                                                    (targetDay) =>
                                                      targetDay.dayIndex !==
                                                      day.dayIndex
                                                  )
                                                  .map((targetDay) => (
                                                    <option
                                                      key={targetDay.dayIndex}
                                                      value={targetDay.dayIndex}
                                                    >
                                                      Day {targetDay.dayIndex}
                                                    </option>
                                                  ))}
                                              </select>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="itinerary-remove-button"
                                            onClick={() =>
                                              handleRemoveActivity(
                                                day.dayIndex,
                                                index
                                              )
                                            }
                                            disabled={
                                              savingItinerary ||
                                              draft.days.length <= 1
                                            }
                                            title={
                                              draft.days.length <= 1
                                                ? "An itinerary must contain at least one activity."
                                                : undefined
                                            }
                                          >
                                            Remove activity
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  }

                                  return (
                                    <li
                                      className="itinerary-activity"
                                      key={`${activityKey}-${activity.startTime}-${activity.title}`}
                                    >
                                      <div className="itinerary-activity-header">
                                        <strong className="itinerary-activity-title">
                                          {activity.title}
                                        </strong>
                                        <span className="itinerary-activity-cost">
                                          {formatCurrency(activity.estimatedCost)}
                                        </span>
                                      </div>

                                      <div className="itinerary-activity-meta">
                                        {activity.startTime && activity.endTime ? (
                                          <span>
                                            {activity.startTime} – {activity.endTime}
                                          </span>
                                        ) : activity.startTime ? (
                                          <span>{activity.startTime}</span>
                                        ) : activity.endTime ? (
                                          <span>Until {activity.endTime}</span>
                                        ) : null}
                                        {activityDuration && (
                                          <span>Duration: {activityDuration}</span>
                                        )}
                                        <span className="itinerary-category">
                                          {activity.category}
                                        </span>
                                        {activity.locationName && (
                                          <span>{activity.locationName}</span>
                                        )}
                                        {activity.mapUrl && (
                                          <a
                                            href={activity.mapUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Map
                                          </a>
                                        )}
                                      </div>

                                      {activity.description && (
                                        <p className="itinerary-activity-description">
                                          {activity.description}
                                        </p>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {editingItinerary && (
                              <button
                                type="button"
                                className="explore-button itinerary-secondary-button itinerary-add-button"
                                onClick={() => handleAddActivity(day.dayIndex)}
                                disabled={savingItinerary}
                              >
                                Add activity to Day {day.dayIndex}
                              </button>
                            )}
                          </section>
                        ))}
                      </div>

                      <p className="itinerary-note">
                        Generated activities are sample data, not verified
                        real-world recommendations.
                      </p>

                      {editingItinerary && draft.days.length <= 1 && (
                        <p className="itinerary-note">
                          At least one activity is required. Add another
                          activity before removing the final one.
                        </p>
                      )}

                      <div className="itinerary-actions">
                        {!editingItinerary && (
                          <button
                            type="button"
                            className="explore-button itinerary-secondary-button"
                            onClick={handleStartEditingItinerary}
                            disabled={
                              loadingItinerary ||
                              savingItinerary ||
                              generatingDraft
                            }
                          >
                            Edit activities
                          </button>
                        )}

                        {editingItinerary ? (
                          <>
                            <button
                              type="button"
                              className="explore-button"
                              onClick={handleSaveItinerary}
                              disabled={
                                loadingItinerary ||
                                savingItinerary ||
                                generatingDraft ||
                                !itineraryEditDirty
                              }
                            >
                              {savingItinerary
                                ? "Saving changes..."
                                : "Save activity changes"}
                            </button>
                            <button
                              type="button"
                              className="explore-button itinerary-secondary-button"
                              onClick={handleCancelEditingItinerary}
                              disabled={savingItinerary}
                            >
                              Cancel editing
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="explore-button"
                            onClick={handleSaveItinerary}
                            disabled={
                              loadingItinerary ||
                              savingItinerary ||
                              generatingDraft ||
                              draftSaved
                            }
                          >
                            {savingItinerary
                              ? "Saving itinerary..."
                              : draftSaved
                                ? "Saved"
                                : "Save itinerary"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </section>

                {dest?.tags && dest.tags.length > 0 && (
                  <div className="tags">
                    {dest.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}

                <div className="trip-delete-actions">
                  <button
                    type="button"
                    className="trip-delete-button"
                    onClick={() => void handleDeleteTrip()}
                    disabled={deletingTrip}
                  >
                    {deletingTrip ? "Deleting trip..." : "Delete Trip"}
                  </button>
                </div>
              </>
            );
          })()}
        </section>
      ) : authUser && viewMode === "trips" && !selectedDestination ? (
        <section className="destinations">
          <div className="page-header">
            <h1>My Trips</h1>
            <p>Review your saved plans, filter trips, and continue planning.</p>
          </div>
          {tripMessage && (
            <p className="success" role="status">
              {tripMessage}
            </p>
          )}
          {tripError && (
            <p className="error" role="alert">
              {tripError}
            </p>
          )}

          <div className="trip-form trip-filters">
            <div className="trip-filter-grid">
              <div className="trip-filter-field">
                <label htmlFor="tripSearchQuery">Search by destination name</label>
                <input
                  id="tripSearchQuery"
                  type="search"
                  value={tripSearchQuery}
                  onChange={(e) => setTripSearchQuery(e.target.value)}
                  placeholder="e.g. Goa"
                />
              </div>
              <div className="trip-filter-field">
                <label htmlFor="tripStatusFilter">Status</label>
                <select
                  id="tripStatusFilter"
                  value={tripStatusFilterValue}
                  onChange={(e) => setTripStatusFilterValue(e.target.value as TripStatusFilterValue)}
                  style={{ minHeight: "48px", borderRadius: "5px", border: "1px solid #cfd7cf", padding: "0.6rem 0.8rem", font: "inherit" }}
                >
                  <option value="all">All</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="trip-filter-field">
                <label htmlFor="tripSort">Sort by</label>
                <select
                  id="tripSort"
                  value={tripSortValue}
                  onChange={(e) => setTripSortValue(e.target.value as TripSortValue)}
                  style={{ minHeight: "48px", borderRadius: "5px", border: "1px solid #cfd7cf", padding: "0.6rem 0.8rem", font: "inherit" }}
                >
                  <option value="startDesc">Start date: Newest first</option>
                  <option value="startAsc">Start date: Oldest first</option>
                  <option value="budgetDesc">Budget: Highest first</option>
                  <option value="budgetAsc">Budget: Lowest first</option>
                </select>
              </div>
            </div>
            {(tripSearchQuery.trim() || tripStatusFilterValue !== "all" || tripSortValue !== "startDesc") && (
              <div className="trip-filter-actions">
                <button
                type="button"
                className="explore-button"
                onClick={handleClearTripFilters}
              >
                Clear filters and sort
                </button>
              </div>
            )}
          </div>

          {(() => {
            const normalizedQuery = tripSearchQuery.trim().toLowerCase();
            const filtered = trips.filter((trip) => {
              const dest =
                typeof trip.destination === "object" && trip.destination !== null
                  ? trip.destination
                  : null;
              if (normalizedQuery) {
                const name = dest?.name;
                if (typeof name !== "string") return false;
                if (!name.toLowerCase().includes(normalizedQuery)) return false;
              }
              if (tripStatusFilterValue !== "all") {
                const status = getTripStatusCategory(trip);
                if (tripStatusFilterValue === "upcoming") {
                  if (status !== "upcoming") return false;
                } else if (tripStatusFilterValue === "ongoing") {
                  if (status !== "ongoing") return false;
                } else if (tripStatusFilterValue === "completed") {
                  if (status !== "completed") return false;
                }
              }
              return true;
            });
            const visibleTrips = [...filtered].sort((a, b) => {
              if (tripSortValue === "budgetAsc") {
                const aBudget = typeof a.budget === "number" && !Number.isNaN(a.budget) ? a.budget : Number.POSITIVE_INFINITY;
                const bBudget = typeof b.budget === "number" && !Number.isNaN(b.budget) ? b.budget : Number.POSITIVE_INFINITY;
                if (aBudget === bBudget) return 0;
                return aBudget - bBudget;
              }
              if (tripSortValue === "budgetDesc") {
                const aBudget = typeof a.budget === "number" && !Number.isNaN(a.budget) ? a.budget : Number.NEGATIVE_INFINITY;
                const bBudget = typeof b.budget === "number" && !Number.isNaN(b.budget) ? b.budget : Number.NEGATIVE_INFINITY;
                if (aBudget === bBudget) return 0;
                return bBudget - aBudget;
              }
              const aStart = new Date(a.startDate).getTime();
              const bStart = new Date(b.startDate).getTime();
              const aInvalid = Number.isNaN(aStart);
              const bInvalid = Number.isNaN(bStart);
              if (aInvalid && bInvalid) return 0;
              if (aInvalid) return 1;
              if (bInvalid) return -1;
              if (tripSortValue === "startAsc") {
                if (aStart === bStart) return 0;
                return aStart - bStart;
              }
              if (aStart === bStart) return 0;
              return bStart - aStart;
            });

            return (
              <>
                {loadingTrips && <p>Loading trips...</p>}

                {errorTrips && (
                  <div>
                    <p className="error">{errorTrips}</p>
                    <button
                      type="button"
                      className="explore-button"
                      onClick={handleRetryTrips}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loadingTrips && !errorTrips && trips.length === 0 && (
                  <div className="empty-state trip-empty-state">
                    <h3>No saved trips yet</h3>
                    <p>Plan your first trip from Explore Destinations and it will appear here.</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBackToDestinations}
                    >
                      Explore Destinations
                    </button>
                  </div>
                )}

                {!loadingTrips && !errorTrips && trips.length > 0 && visibleTrips.length === 0 && (
                  <div className="empty-state trip-empty-state">
                    <h3>No matching trips</h3>
                    <p>Try adjusting your search, status, or sorting options.</p>
                  </div>
                )}

                {!loadingTrips && !errorTrips && visibleTrips.length > 0 && (
                  <div className="destination-grid">
                    {visibleTrips.map((trip) => {
                      const dest =
                        typeof trip.destination === "object" && trip.destination !== null
                          ? trip.destination
                          : null;

                      return (
                        <article className="trip-card" key={trip._id}>
                          <TravelImageFrame
                            image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined}
                            alt={dest?.name ? `Trip to ${dest.name}` : "Trip"}
                          />

                          <div className="trip-card-body">
                            <p className="location">
                              {dest
                                ? dest.state
                                  ? `${dest.state}, ${dest.country}`
                                  : dest.country
                                : "Destination details unavailable"}
                            </p>

                            <h3>{dest?.name || "Unknown Destination"}</h3>

                            <div className="trip-card-meta">
                              <span>
                                <strong>Dates:</strong> {formatDate(trip.startDate)} -{" "}
                                {formatDate(trip.endDate)}
                              </span>
                              {(() => {
                                const durationText = formatTripDuration(trip.startDate, trip.endDate);
                                if (!durationText) return null;
                                return (
                                  <span>
                                    <strong>Duration:</strong> {durationText}
                                  </span>
                                );
                              })()}
                              <span>
                                <strong>Travelers:</strong> {trip.travelers}
                              </span>
                              <span>
                                <strong>Budget:</strong> {formatCurrency(trip.budget)}
                              </span>
                            </div>

                            {dest?.tags && dest.tags.length > 0 && (
                              <div className="tags">
                                {dest.tags.map((tag) => (
                                  <span key={tag}>{tag}</span>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              className="explore-button"
                              onClick={() => handleViewTripDetails(trip)}
                            >
                              View Details
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      ) : authUser && selectedDestination ? (
        <section className="destination-details">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBackToDestinations}
            style={{ marginBottom: "1rem" }}
          >
            ← Back to Destinations
          </button>

          <div className="card">
            <div className="card-header">
              <h2>{selectedDestination.name}</h2>
            </div>
            <p style={{ marginBottom: "1rem" }}>
              {selectedDestination.state
                ? `${selectedDestination.state}, ${selectedDestination.country}`
                : selectedDestination.country}
            </p>

            {(selectedDestination as any).imageUrl ? (
              <img src={(selectedDestination as any).imageUrl} alt={selectedDestination.name} />
            ) : (selectedDestination as any).image ? (
              <img src={(selectedDestination as any).image} alt={selectedDestination.name} />
            ) : (
              <div className="destination-placeholder" style={{ height: "300px", borderRadius: "6px" }}>
                {selectedDestination.name}
              </div>
            )}

            <p style={{ marginTop: "1rem" }}>
              {selectedDestination.description ||
                "Discover the highlights of this destination."}
            </p>

            {selectedDestination.tags && selectedDestination.tags.length > 0 && (
              <div className="tags" style={{ marginTop: "0.75rem" }}>
                {selectedDestination.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}

            {typeof selectedDestination.averageCostPerDay === "number" &&
              Number.isFinite(selectedDestination.averageCostPerDay) &&
              selectedDestination.averageCostPerDay > 0 && (
                <p style={{ color: "var(--navy)", fontWeight: 600, marginTop: "0.75rem" }}>
                  Average cost per day: {formatCurrency(selectedDestination.averageCostPerDay)}
                </p>
              )}
          </div>

          <section className="card attraction-card" aria-labelledby="attractions-heading">
            <div className="card-header">
              <div>
                <h2 id="attractions-heading">Real mapped attractions</h2>
                <p className="attraction-subtitle">
                  Names and map links come from OpenStreetMap when available.
                </p>
              </div>
              {attractionSource && (
                <span className="itinerary-badge">
                  {attractionSource === "openstreetmap"
                    ? "Live map data"
                    : attractionSource === "cached"
                      ? "Cached map data"
                      : "Curated starter data"}
                </span>
              )}
            </div>
            {loadingAttractions && <p role="status">Loading mapped attractions...</p>}
            {attractionError && <p className="error" role="alert">{attractionError}</p>}
            {attractionWarning && <p className="warning">{attractionWarning}</p>}
            {!loadingAttractions && !attractionError && attractions.length === 0 && (
              <p className="muted">No mapped attractions are available for this destination yet.</p>
            )}
            {!loadingAttractions && attractions.length > 0 && (
              <div className="attraction-grid">
                {attractions.slice(0, 12).map((attraction) => (
                  <article className="attraction-item" key={attraction.id}>
                    <TravelImageFrame
                      image={
                        findTravelImage(attraction.name) ??
                        getDestinationImage(selectedDestination.name)
                      }
                      alt={attraction.name}
                      className="attraction-image"
                    />
                    <div>
                      <h3>{attraction.name}</h3>
                      <p>
                        {attraction.category} · estimated visit{" "}
                        {attraction.estimatedDurationMinutes} minutes
                      </p>
                    </div>
                    {attraction.mapUrl && (
                      <a
                        href={attraction.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View map
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
            <p className="attraction-attribution">
              © OpenStreetMap contributors. Attraction duration and category are estimates.
            </p>
          </section>

          {tripMessage && (
            <p className="success" role="status">
              {tripMessage}
            </p>
          )}

          {tripError && (
            <p className="error" role="alert">
              {tripError}
            </p>
          )}

          {!showTripForm &&
            (authUser ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setTripMessage("");
                setTripError("");
                setShowTripForm(true);
                setViewMode("destinations");
              }}
            >
              Plan a Trip to {selectedDestination.name}
            </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAuthView("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Login to Plan a Trip
              </button>
            ))}

          {showTripForm && (() => {
            let estimateContent: React.ReactNode = null;
            const costPerDay = selectedDestination.averageCostPerDay;
            const hasValidCost =
              typeof costPerDay === "number" &&
              Number.isFinite(costPerDay) &&
              costPerDay > 0;
            if (hasValidCost && startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              if (
                !Number.isNaN(start.getTime()) &&
                !Number.isNaN(end.getTime())
              ) {
                const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                if (endDay > startDay) {
                  const diffMs = endDay.getTime() - startDay.getTime();
                  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                  const travelerCountNum = Number(travelers);
                  if (Number.isInteger(travelerCountNum) && travelerCountNum > 0) {
                    const estimatedTotal = costPerDay * days * travelerCountNum;
                    if (Number.isFinite(estimatedTotal) && estimatedTotal > 0) {
                      estimateContent = (
                        <div
                          style={{
                            background: "#f2f5f0",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            padding: "0.8rem 1rem",
                            display: "grid",
                            gap: "0.25rem",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "var(--green-dark)" }}>
                            Estimated total cost: {formatCurrency(estimatedTotal)}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                            Based on {formatCurrency(costPerDay)} per day for {travelerCountNum} traveler{travelerCountNum === 1 ? "" : "s"} over {days} day{days === 1 ? "" : "s"}.
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                            This is an estimate, not a guaranteed or exact trip cost.
                          </div>
                        </div>
                      );
                    }
                  }
                }
              }
            }
            if (!estimateContent && hasValidCost) {
              estimateContent = (
                <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  Enter valid travel dates and traveler count to estimate your trip cost.
                </div>
              );
            }

            return (
            <form className="trip-form" onSubmit={handleTripSubmit}>
              <h3>Plan Your Trip to {selectedDestination.name}</h3>

              <label htmlFor="startDate">Start Date</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />

              <label htmlFor="endDate">End Date</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />

              <label htmlFor="travelers">Number of Travelers</label>
              <input
                id="travelers"
                name="travelers"
                type="number"
                min="1"
                max="50"
                value={travelers}
                onChange={(event) => setTravelers(event.target.value)}
                required
              />

              {(() => {
                const durationText = formatTripDuration(startDate, endDate);
                if (!durationText) return null;
                return (
                  <div style={{ color: "var(--green-dark)", fontWeight: 600 }}>
                    Duration: {durationText}
                  </div>
                );
              })()}

              {estimateContent}

              <label htmlFor="budget">Total Budget (INR)</label>
              <input
                id="budget"
                name="budget"
                type="number"
                min="1"
                step="any"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Enter your total budget"
                required
              />

              <button
                type="submit"
                className="explore-button"
                disabled={submitting}
              >
                {submitting ? "Creating Trip..." : "Create Trip"}
              </button>

              <button
                type="button"
                className="explore-button"
                disabled={submitting}
                onClick={() => {
                  setShowTripForm(false);
                  setTripError("");
                }}
              >
                Cancel
              </button>
            </form>
            );
          })()}

          {selectedDestination.tags && selectedDestination.tags.length > 0 && (
            <div className="tags">
              {selectedDestination.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </section>
      ) : null}
      </main>
    </div>
  );
}

export default App;
