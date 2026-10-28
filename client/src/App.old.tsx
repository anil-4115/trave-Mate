import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  createTrip,
  generateItineraryDraft,
  getItinerary,
  getTrips,
  saveItinerary,
  type GeneratedActivity,
  type GeneratedItineraryDraft,
  type SavedItinerary,
  type Trip,
} from "./api/tripApi";
import {
  getDestinations,
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
import "./App.css";

type ViewMode = "destinations" | "trips" | "tripDetail";
type ItineraryPreview = Omit<
  GeneratedItineraryDraft,
  "saved" | "generatedBy"
>;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

  const [viewMode, setViewMode] = useState<ViewMode>("destinations");

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [errorDest, setErrorDest] = useState("");
  const [destinationSearchQuery, setDestinationSearchQuery] = useState("");
  const [destinationTagFilter, setDestinationTagFilter] = useState<string>("all");
  type DestinationSortValue = "default" | "nameAsc" | "costAsc" | "costDesc";
  const [destinationSortValue, setDestinationSortValue] = useState<DestinationSortValue>("default");
  const [destinationOriginalOrder, setDestinationOriginalOrder] = useState<Map<string, number>>(new Map());

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [errorTrips, setErrorTrips] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
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
    getDestinations()
      .then((data) => {
        const orderMap = new Map<string, number>();
        data.forEach((d, idx) => {
          if (d && d._id) orderMap.set(d._id, idx);
        });
        setDestinationOriginalOrder(orderMap);
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

  function handleExplore(destination: Destination) {
    setSelectedDestination(destination);
    setShowTripForm(false);
    setStartDate("");
    setEndDate("");
    setTravelers("1");
    setBudget("");
    setTripMessage("");
    setTripError("");
    setViewMode("destinations");
  }

  function handleBackToDestinations() {
    resetItineraryState();
    setSelectedDestination(null);
    setShowTripForm(false);
    setTripMessage("");
    setTripError("");
    setDestinationSearchQuery("");
    setDestinationTagFilter("all");
    setDestinationSortValue("default");
    setViewMode("destinations");
  }

  function handleClearDestinationFilters() {
    setDestinationSearchQuery("");
    setDestinationTagFilter("all");
    setDestinationSortValue("default");
  }

  function handleAuthLogout() {
    clearAuthToken();
    setAuthUser(null);
    setTrips([]);
    setSelectedTrip(null);
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
    setSelectedTrip(trip);
    setViewMode("tripDetail");
    void loadSavedItinerary(trip);
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
      const nextDraft = await generateItineraryDraft(tripId);

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
    <main className="app">
      <header className="navbar">
        <h1>TravelMate</h1>
        <span>Smart Trip Planning</span>
        <nav className="nav-actions">
          <button
            type="button"
            className={`nav-button ${viewMode === "destinations" && !selectedDestination ? "active" : ""}`}
            onClick={handleBackToDestinations}
          >
            Browse Destinations
          </button>
          {authUser && (
            <button
              type="button"
              className={`nav-button ${viewMode === "trips" || viewMode === "tripDetail" ? "active" : ""}`}
              onClick={handleShowTrips}
            >
              Saved Trips
            </button>
          )}
          {authUser ? (
            <button
              type="button"
              className="nav-button"
              onClick={handleAuthLogout}
              title={authUser.email}
            >
              Logout ({authUser.name})
            </button>
          ) : (
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                setAuthView("login");
                setAuthError("");
                setAuthMessage("");
              }}
            >
              Login
            </button>
          )}
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR NEXT JOURNEY STARTS HERE</p>
        <h2>Plan trips with clarity and confidence.</h2>
        <p>
          Discover curated destinations, map your itinerary, and keep every
          trip in one place.
        </p>
        {authError && (
          <p className="error" role="alert" style={{ marginTop: "0.8rem" }}>
            {authError}
          </p>
        )}
        {authMessage && (
          <p className="success" role="status" style={{ marginTop: "0.8rem" }}>
            {authMessage}
          </p>
        )}
      </section>

      {!authUser && authChecked && (
        <section className="destinations">
          <div className="trip-form" style={{ maxWidth: "420px" }}>
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
              {authError && <p className="error">{authError}</p>}
              {authMessage && <p className="success">{authMessage}</p>}
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
        <section className="destination-details">
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

            return (
              <>
                {dest?.imageUrl ? (
                  <img
                    src={dest.imageUrl}
                    alt={dest.name || "Destination"}
                  />
                ) : (
                  <div className="destination-placeholder" style={{ height: "280px", borderRadius: "6px", margin: "1.5rem 0" }}>
                    {dest?.name ? dest.name : "Trip Details"}
                  </div>
                )}

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

                <div className="trip-form" style={{ maxWidth: "560px" }}>
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
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    Trip ID: {selectedTrip._id}
                  </p>
                </div>

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
                        {draftSaved ? "Saved" : "Draft — not saved"}
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
                                            {activity.startTime}�?"{activity.endTime}
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
              </>
            );
          })()}
        </section>
      ) : authUser && viewMode === "trips" && !selectedDestination ? (
        <section className="destinations">
          <h2>Saved Trips</h2>

          <div className="trip-form" style={{ maxWidth: "100%", marginTop: "0", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.8rem" }}>
              <div>
                <label htmlFor="tripSearchQuery">Search by destination name</label>
                <input
                  id="tripSearchQuery"
                  type="search"
                  value={tripSearchQuery}
                  onChange={(e) => setTripSearchQuery(e.target.value)}
                  placeholder="e.g. Goa"
                />
              </div>
              <div>
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
              <div>
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
              <button
                type="button"
                className="explore-button"
                onClick={handleClearTripFilters}
                style={{ width: "fit-content" }}
              >
                Clear filters and sort
              </button>
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
                  <p>No saved trips yet. Plan a trip from a destination to see it here.</p>
                )}

                {!loadingTrips && !errorTrips && trips.length > 0 && visibleTrips.length === 0 && (
                  <p>No trips match your search or filters. Try adjusting your search or filters.</p>
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
                          {dest?.imageUrl ? (
                            <img src={dest.imageUrl} alt={dest.name || "Destination"} />
                          ) : (
                            <div className="destination-placeholder">
                              {dest?.name ? `Trip to ${dest.name}` : "Trip"}
                            </div>
                          )}

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
      ) : selectedDestination ? (
        <section className="destination-details">
          <button
            type="button"
            className="explore-button"
            onClick={handleBackToDestinations}
          >
            ? Back to destinations
          </button>

          {selectedDestination.imageUrl && (
            <img
              src={selectedDestination.imageUrl}
              alt={selectedDestination.name}
            />
          )}

          <h2>{selectedDestination.name}</h2>

          <p>
            {selectedDestination.state
              ? `${selectedDestination.state}, ${selectedDestination.country}`
              : selectedDestination.country}
          </p>

          <p>
            {selectedDestination.description ||
              "Discover the highlights of this destination."}
          </p>

          {typeof selectedDestination.averageCostPerDay === "number" &&
            Number.isFinite(selectedDestination.averageCostPerDay) &&
            selectedDestination.averageCostPerDay > 0 && (
              <p style={{ color: "var(--green)", fontWeight: 600 }}>
                Average cost per day: {formatCurrency(selectedDestination.averageCostPerDay)}
              </p>
            )}

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
                className="explore-button"
                onClick={() => {
                  setTripMessage("");
                  setTripError("");
                  setShowTripForm(true);
                }}
              >
                Plan a Trip
              </button>
            ) : (
              <p style={{ color: "var(--muted)" }}>Log in to plan a trip.</p>
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
      ) : (
        <section className="destinations">
          <h2>Popular Destinations</h2>

          <div className="trip-form" style={{ maxWidth: "100%", marginTop: "0", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.8rem" }}>
              <div>
                <label htmlFor="destinationSearchQuery">Search destinations by name or country</label>
                <input
                  id="destinationSearchQuery"
                  type="search"
                  value={destinationSearchQuery}
                  onChange={(e) => setDestinationSearchQuery(e.target.value)}
                  placeholder="e.g. Goa or India"
                />
              </div>
              <div>
                <label htmlFor="destinationSort">Sort by</label>
                <select
                  id="destinationSort"
                  value={destinationSortValue}
                  onChange={(e) => setDestinationSortValue(e.target.value as DestinationSortValue)}
                  style={{ minHeight: "48px", borderRadius: "5px", border: "1px solid #cfd7cf", padding: "0.6rem 0.8rem", font: "inherit" }}
                >
                  <option value="default">Default order</option>
                  <option value="nameAsc">Name: A–Z</option>
                  <option value="costAsc">Daily cost: Low to high</option>
                  <option value="costDesc">Daily cost: High to low</option>
                </select>
              </div>
            </div>
            {(() => {
              const availableTags = Array.from(
                new Set(
                  destinations
                    .flatMap((d) => (Array.isArray(d.tags) ? d.tags : []))
                    .filter((tag) => typeof tag === "string" && tag.trim().length > 0)
                    .map((tag) => tag.trim())
                )
              ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
              if (availableTags.length === 0) return null;
              return (
                <div>
                  <label>Filter by tag</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`nav-button ${destinationTagFilter === "all" ? "active" : ""}`}
                      onClick={() => setDestinationTagFilter("all")}
                    >
                      All
                    </button>
                    {availableTags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        className={`nav-button ${destinationTagFilter.toLowerCase() === tag.toLowerCase() ? "active" : ""}`}
                        onClick={() => setDestinationTagFilter(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(destinationSearchQuery.trim() || destinationTagFilter !== "all" || destinationSortValue !== "default") && (
              <button
                type="button"
                className="explore-button"
                onClick={handleClearDestinationFilters}
                style={{ width: "fit-content" }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {(() => {
            const normalizedDestQuery = destinationSearchQuery.trim().toLowerCase();
            const filteredDestinations = destinations.filter((destination) => {
              const dest = destination as Destination & { tags?: unknown };
              if (normalizedDestQuery) {
                const name = typeof dest.name === "string" ? dest.name.toLowerCase() : "";
                const country = typeof dest.country === "string" ? dest.country.toLowerCase() : "";
                if (!(name.includes(normalizedDestQuery) || country.includes(normalizedDestQuery))) {
                  return false;
                }
              }
              if (destinationTagFilter !== "all") {
                const tags = Array.isArray(dest.tags) ? dest.tags : [];
                const hasTag = tags.some(
                  (t) => typeof t === "string" && t.trim().toLowerCase() === destinationTagFilter.toLowerCase()
                );
                if (!hasTag) return false;
              }
              return true;
            });
            const visibleDestinations = (() => {
              if (destinationSortValue === "default") {
                return [...filteredDestinations].sort((a, b) => {
                  const aIdx = (destinationOriginalOrder as any).get?.(a._id);
                  const bIdx = (destinationOriginalOrder as any).get?.(b._id);
                  if (typeof aIdx === "number" && typeof bIdx === "number") {
                    if (aIdx === bIdx) return 0;
                    return aIdx - bIdx;
                  }
                  return 0;
                });
              }
              if (destinationSortValue === "nameAsc") {
                return [...filteredDestinations].sort((a, b) => {
                  const aName = typeof a.name === "string" ? a.name : "";
                  const bName = typeof b.name === "string" ? b.name : "";
                  return aName.localeCompare(bName, undefined, { sensitivity: "base" });
                });
              }
              if (destinationSortValue === "costAsc") {
                return [...filteredDestinations].sort((a, b) => {
                  const aCost = (a as Destination).averageCostPerDay;
                  const bCost = (b as Destination).averageCostPerDay;
                  const aValid = typeof aCost === "number" && Number.isFinite(aCost) && aCost > 0;
                  const bValid = typeof bCost === "number" && Number.isFinite(bCost) && bCost > 0;
                  if (aValid && !bValid) return -1;
                  if (!aValid && bValid) return 1;
                  if (!aValid && !bValid) return 0;
                  if ((aCost as number) === (bCost as number)) return 0;
                  return (aCost as number) - (bCost as number);
                });
              }
              if (destinationSortValue === "costDesc") {
                return [...filteredDestinations].sort((a, b) => {
                  const aCost = (a as Destination).averageCostPerDay;
                  const bCost = (b as Destination).averageCostPerDay;
                  const aValid = typeof aCost === "number" && Number.isFinite(aCost) && aCost > 0;
                  const bValid = typeof bCost === "number" && Number.isFinite(bCost) && bCost > 0;
                  if (aValid && !bValid) return -1;
                  if (!aValid && bValid) return 1;
                  if (!aValid && !bValid) return 0;
                  if ((aCost as number) === (bCost as number)) return 0;
                  return (bCost as number) - (aCost as number);
                });
              }
              return [...filteredDestinations];
            })();

            return (
              <>
                {loadingDest && <p>Loading destinations...</p>}

                {errorDest && <p className="error">{errorDest}</p>}

                {!loadingDest && !errorDest && destinations.length === 0 && (
                  <p>No destinations found.</p>
                )}

                {!loadingDest && !errorDest && destinations.length > 0 && visibleDestinations.length === 0 && (
                  <p>No destinations match your filters.</p>
                )}

                {!loadingDest && !errorDest && visibleDestinations.length > 0 && (
                  <div className="destination-grid">
                    {visibleDestinations.map((destination) => {
                      const locationParts: string[] = [];
                      if (typeof destination.state === "string" && destination.state.trim().length > 0) {
                        locationParts.push(destination.state.trim());
                      }
                      if (typeof destination.country === "string" && destination.country.trim().length > 0) {
                        locationParts.push(destination.country.trim());
                      }
                      const locationText = locationParts.length > 0 ? locationParts.join(", ") : null;

                      const tags = Array.isArray(destination.tags)
                        ? destination.tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
                        : [];
                      const visibleTags = tags.slice(0, 2);
                      const remainingTagCount = tags.length - visibleTags.length;

                      return (
                        <article className="destination-card" key={destination._id}>
                          {destination.imageUrl ? (
                            <img src={destination.imageUrl} alt={destination.name} />
                          ) : (
                            <div className="destination-placeholder">
                              Explore {destination.name}
                            </div>
                          )}

                          <div className="destination-info">
                            {locationText && <p className="location">{locationText}</p>}

                            <h3>{destination.name}</h3>

                            <p>
                              {destination.description ||
                                "Discover the highlights of this destination."}
                            </p>

                            {typeof destination.averageCostPerDay === "number" &&
                              Number.isFinite(destination.averageCostPerDay) &&
                              destination.averageCostPerDay > 0 && (
                                <p style={{ color: "var(--green)", fontWeight: 600, marginTop: "0.25rem" }}>
                                  ≈ {formatCurrency(destination.averageCostPerDay)}/day
                                </p>
                              )}

                            {visibleTags.length > 0 && (
                              <div className="tags">
                                {visibleTags.map((tag) => (
                                  <span key={tag}>{tag.trim()}</span>
                                ))}
                                {remainingTagCount > 0 && <span>+{remainingTagCount}</span>}
                              </div>
                            )}

                            <button
                              type="button"
                              className="explore-button"
                              onClick={() => handleExplore(destination)}
                            >
                              Explore {destination.name}
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
      )}
    </main>
  );
}

export default App;
