/* ==========================================================================
 * TRAVELMATE — MAIN CLIENT APPLICATION (App.tsx)
 * --------------------------------------------------------------------------
 * Architecture Overview:
 * 1. Imports & Core Types
 * 2. Pure Helper Functions & Date/Currency Utilities
 * 3. App Component State & Lifecycle Refs
 * 4. Data Fetching & API Synchronization Effects
 * 5. Authentication & Session Handlers
 * 6. Destination Discovery & Route Optimizer Handlers
 * 7. Trip CRUD & Smart Itinerary Handlers
 * 8. Expense Logging & Packing Checklist Handlers
 * 9. Main Layout, Sidebar Navigation & Modals
 * 10. Screen Views (Dashboard, Catalog, Trip Details, Calendar)
 * ========================================================================== */
/* --- SECTION 1: IMPORTS & TYPE DEFINITIONS --- */
import { useEffect, useMemo, useRef, useState } from "react";
import { createTrip, createExpense, deleteTrip, updateTrip, deleteExpense, generateItineraryDraft, getExpenses, getItinerary, getPackingItems, getTrips, createPackingItem, deletePackingItem, saveItinerary, updatePackingItem, updateExpense, optimizeItineraryDay, optimizeAllItineraryDays, EXPENSE_CATEGORIES, PACKING_CATEGORIES, } from "./api/tripApi";
import { getDestinationAttractions, getDestinations, optimizeRoute, } from "./api/destinationApi";
import { clearAuthToken, clearStoredUser, getAuthToken, getStoredUser, loginUser, registerUser, setAuthToken, setStoredUser, } from "./api/authApi";
import { authBackgroundImage, getAttractionImage, getDestinationImage, } from "./data/imageCatalog";
import "./App.css";
import "./styles/layout.css";
/* --- SECTION 2: PURE UTILITIES & FORMATTING HELPERS --- */
const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}
function getDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}
function getActivitiesForDate(itinerary, trip, date) {
    const tripStart = new Date(trip.startDate);
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDate = new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate());
    const dayIndex = Math.floor((selectedDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return itinerary.days
        .filter((activity) => activity.dayIndex === dayIndex)
        .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
}
const PACKING_SUGGESTIONS = [
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
const PACKING_CATEGORY_META = {
    Essentials: { icon: "🎒", description: "Water bottle, wallet, sunglasses, keys & daypack" },
    Clothing: { icon: "👕", description: "Outfits, walking shoes, sleepwear, socks & layers" },
    Toiletries: { icon: "🧼", description: "Toothbrush, shampoo, sunscreen, soap & towel" },
    Electronics: { icon: "🔌", description: "Phone charger, power bank, adapter & earphones" },
    Documents: { icon: "🪪", description: "ID, tickets, hotel bookings, cards & insurance" },
    Medicines: { icon: "💊", description: "First aid, prescriptions, pain relief & ORS" },
};
function TravelImageFrame({ image, alt, className = "", }) {
    const [failedUrl, setFailedUrl] = useState(null);
    if (!image || failedUrl === image.imageUrl) {
        return <div className={`destination-placeholder ${className}`}>{alt}</div>;
    }
    return (<img key={image.imageUrl} className={className} src={image.imageUrl} alt={alt} loading="lazy" onError={() => setFailedUrl(image.imageUrl)}/>);
}
function ProgressRing({ radius = 36, strokeWidth = 6, progress = 0, color = "#10b981", bgColor = "#e2e8f0", label = "", sublabel = "", }) {
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const safeProgress = Math.min(100, Math.max(0, progress));
    const strokeDashoffset = circumference - (safeProgress / 100) * circumference;
    return (<div className="dashboard-ring-item">
      <div className="dashboard-ring-svg-wrapper">
        <svg height={radius * 2} width={radius * 2} className="dashboard-progress-ring">
          <circle stroke={bgColor} fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius}/>
          <circle stroke={color} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset, transition: "stroke-dashoffset 0.6s ease" }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} transform={`rotate(-90 ${radius} ${radius})`}/>
        </svg>
        <span className="dashboard-ring-value">{Math.round(safeProgress)}%</span>
      </div>
      <div className="dashboard-ring-label-group">
        <strong className="dashboard-ring-label">{label}</strong>
        <span className="dashboard-ring-sublabel">{sublabel}</span>
      </div>
    </div>);
}
function getTripStatus(startDate, endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return "Upcoming";
        }
        if (now < start)
            return "Upcoming";
        if (now > end)
            return "Completed";
        return "Ongoing";
    }
    catch {
        return "Upcoming";
    }
}
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}
function getActivityDurationMinutes(startTime, endTime) {
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
function formatActivityDuration(startTime, endTime) {
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
function hasValidCoordinates(activity) {
    return (typeof activity.latitude === "number" &&
        typeof activity.longitude === "number" &&
        Number.isFinite(activity.latitude) &&
        Number.isFinite(activity.longitude) &&
        activity.latitude >= -90 &&
        activity.latitude <= 90 &&
        activity.longitude >= -180 &&
        activity.longitude <= 180);
}
function validateItineraryPreview(draft) {
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
            if (activity.startTime &&
                activity.endTime &&
                getActivityDurationMinutes(activity.startTime, activity.endTime) === null) {
                return `${activityLabel}: end time must be later than start time.`;
            }
            if (!Number.isFinite(activity.estimatedCost) ||
                activity.estimatedCost < 0) {
                return `${activityLabel}: estimated cost must be a finite non-negative number.`;
            }
        }
    }
    return null;
}
function rebuildItineraryPreview(draft, dayPlans) {
    const days = dayPlans.flatMap((day) => day.activities);
    const estimatedTotalCost = days.reduce((total, activity) => total + activity.estimatedCost, 0);
    return {
        ...draft,
        dayPlans,
        days,
        estimatedTotalCost,
    };
}
function updateActivityInPreview(draft, dayIndex, activityIndex, patch) {
    const dayPlans = draft.dayPlans.map((day) => {
        if (day.dayIndex !== dayIndex) {
            return day;
        }
        return {
            ...day,
            activities: day.activities.map((activity, index) => index === activityIndex ? { ...activity, ...patch } : activity),
        };
    });
    return rebuildItineraryPreview(draft, dayPlans);
}
function addActivityToPreview(draft, dayIndex) {
    const newActivity = {
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
    const dayPlans = draft.dayPlans.map((day) => day.dayIndex === dayIndex
        ? { ...day, activities: [...day.activities, newActivity] }
        : day);
    return rebuildItineraryPreview(draft, dayPlans);
}
function removeActivityFromPreview(draft, dayIndex, activityIndex) {
    const dayPlans = draft.dayPlans.map((day) => day.dayIndex === dayIndex
        ? {
            ...day,
            activities: day.activities.filter((_activity, index) => index !== activityIndex),
        }
        : day);
    return rebuildItineraryPreview(draft, dayPlans);
}
function moveActivityInPreview(draft, dayIndex, activityIndex, direction) {
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
function moveActivityToDay(draft, sourceDayIndex, activityIndex, targetDayIndex) {
    if (sourceDayIndex === targetDayIndex) {
        return draft;
    }
    const targetDay = draft.dayPlans.find((day) => day.dayIndex === targetDayIndex);
    if (!targetDay) {
        return draft;
    }
    const sourceDay = draft.dayPlans.find((day) => day.dayIndex === sourceDayIndex);
    if (!sourceDay) {
        return draft;
    }
    if (activityIndex < 0 || activityIndex >= sourceDay.activities.length) {
        return draft;
    }
    const activityToMove = sourceDay.activities[activityIndex];
    const updatedActivity = {
        ...activityToMove,
        dayIndex: targetDayIndex,
    };
    const dayPlans = draft.dayPlans.map((day) => {
        if (day.dayIndex === sourceDayIndex) {
            return {
                ...day,
                activities: day.activities.filter((_activity, index) => index !== activityIndex),
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
function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    catch {
        return iso;
    }
}
function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    }
    catch {
        return String(amount);
    }
}
function getTripDurationDays(startIso, endIso) {
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
    }
    catch {
        return null;
    }
}
function formatTripDuration(startIso, endIso) {
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
function getDayCalendarDate(startIso, dayIndex) {
    try {
        const start = new Date(startIso);
        if (Number.isNaN(start.getTime()))
            return null;
        const target = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        target.setDate(target.getDate() + (dayIndex - 1));
        return target.toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    catch {
        return null;
    }
}
function mapSavedItineraryToPreview(saved, trip) {
    const activitiesByDay = new Map();
    saved.days.forEach((activity) => {
        const dayIndex = Number.isInteger(activity.dayIndex) && activity.dayIndex >= 1
            ? activity.dayIndex
            : 1;
        const estimatedCost = typeof activity.estimatedCost === "number" &&
            Number.isFinite(activity.estimatedCost) &&
            activity.estimatedCost >= 0
            ? activity.estimatedCost
            : 0;
        const normalized = {
            dayIndex,
            startTime: activity.startTime ?? "",
            endTime: activity.endTime ?? "",
            title: (activity.title || "").replace(/^Sample:\s*/i, "").trim(),
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
    const dayPlans = [];
    const days = [];
    for (let dayIndex = 1; dayIndex <= durationDays; dayIndex++) {
        const entries = activitiesByDay.get(dayIndex) ?? [];
        const activities = entries.map((entry) => entry.activity);
        dayPlans.push({ dayIndex, activities });
        days.push(...activities);
    }
    const savedTotal = saved.estimatedTotalCost;
    const estimatedTotalCost = typeof savedTotal === "number" && Number.isFinite(savedTotal)
        ? savedTotal
        : days.reduce((total, activity) => total + activity.estimatedCost, 0);
    const dailyBudget = durationDays > 0 && Number.isFinite(trip.budget)
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
function getTripStatusCategory(trip) {
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
function getInitialAuthUser() {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
        return storedUser;
    }
    if (!token && storedUser) {
        clearAuthToken();
        clearStoredUser();
    }
    return null;
}
function getInitialExpenseForm() {
    return {
        title: "",
        amount: "",
        category: "Food",
        date: new Date().toISOString().slice(0, 10),
        notes: "",
    };
}
const TODAY_LOCALE_DATE_STRING = new Date().toLocaleDateString("en-CA");
function getCurrentDate() {
    return new Date();
}
/* --- SECTION 3: APP COMPONENT STATE & LIFECYCLE REFS --- */
function App() {
    const [authUser, setAuthUser] = useState(getInitialAuthUser);
    const [authChecked] = useState(true);
    const [authView, setAuthView] = useState("login");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const [authMessage, setAuthMessage] = useState("");
    const [viewMode, setViewMode] = useState(() => getStoredUser() ? "dashboard" : "destinations");
    const [destinationSearch, setDestinationSearch] = useState("");
    const [destinationTagFilter, setDestinationTagFilter] = useState("all");
    const [destinations, setDestinations] = useState([]);
    const destinationCategoryTags = useMemo(() => {
        const tagSet = new Set();
        destinations.forEach((dest) => {
            if (Array.isArray(dest.tags)) {
                dest.tags.forEach((tag) => {
                    if (typeof tag === "string" && tag.trim()) {
                        tagSet.add(tag.trim());
                    }
                });
            }
        });
        return Array.from(tagSet);
    }, [destinations]);
    const [attractions, setAttractions] = useState([]);
    const [loadingAttractions, setLoadingAttractions] = useState(false);
    const [attractionError, setAttractionError] = useState("");
    const [attractionWarning, setAttractionWarning] = useState("");
    const [attractionSource, setAttractionSource] = useState("");
    const [selectedAttractionIds, setSelectedAttractionIds] = useState([]);
    const [startAttractionId, setStartAttractionId] = useState("");
    const [optimizingRoute, setOptimizingRoute] = useState(false);
    const [routeResult, setRouteResult] = useState(null);
    const [routeError, setRouteError] = useState("");
    const routeRequestIdRef = useRef(0);
    const [loadingDest, setLoadingDest] = useState(true);
    const [errorDest, setErrorDest] = useState("");
    const [trips, setTrips] = useState([]);
    const [loadingTrips, setLoadingTrips] = useState(false);
    const [hasFetchedTrips, setHasFetchedTrips] = useState(false);
    const [errorTrips, setErrorTrips] = useState("");
    const prevAuthUserIdRef = useRef(authUser ? authUser._id : null);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [editingTrip, setEditingTrip] = useState(false);
    const [editTripForm, setEditTripForm] = useState({
        startDate: "",
        endDate: "",
        travelers: "1",
        budget: "",
    });
    const [editTripSubmitting, setEditTripSubmitting] = useState(false);
    const [editTripError, setEditTripError] = useState("");
    const [editTripMessage, setEditTripMessage] = useState("");
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [expenseError, setExpenseError] = useState("");
    const [expenseMessage, setExpenseMessage] = useState("");
    const [expenseSubmitting, setExpenseSubmitting] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [expenseForm, setExpenseForm] = useState(getInitialExpenseForm);
    const [packingItems, setPackingItems] = useState([]);
    const [loadingPacking, setLoadingPacking] = useState(false);
    const [packingError, setPackingError] = useState("");
    const [packingMessage, setPackingMessage] = useState("");
    const [packingSubmitting, setPackingSubmitting] = useState(false);
    const [editingPackingId, setEditingPackingId] = useState(null);
    const [packingActiveCategory, setPackingActiveCategory] = useState(null);
    const [packingForm, setPackingForm] = useState({
        name: "",
        category: "Essentials",
        quantity: "1",
        notes: "",
    });
    const [calendarItinerary, setCalendarItinerary] = useState(null);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const [calendarError, setCalendarError] = useState("");
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loadingItinerary, setLoadingItinerary] = useState(false);
    const [generatingDraft, setGeneratingDraft] = useState(false);
    const [savingItinerary, setSavingItinerary] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [itineraryError, setItineraryError] = useState("");
    const [itineraryMessage, setItineraryMessage] = useState("");
    const [optimizingDayIndex, setOptimizingDayIndex] = useState(null);
    const [dayOptimizationStats, setDayOptimizationStats] = useState({});
    const optimizeInFlightRef = useRef(false);
    const itineraryRequestIdRef = useRef(0);
    const generateInFlightRef = useRef(false);
    const saveInFlightRef = useRef(false);
    const editSnapshotRef = useRef(null);
    const [editingItinerary, setEditingItinerary] = useState(false);
    const [itineraryEditDirty, setItineraryEditDirty] = useState(false);
    const [itineraryInterests, setItineraryInterests] = useState([
        "sightseeing",
        "relaxation",
    ]);
    const [itineraryPace, setItineraryPace] = useState("balanced");
    const [itineraryDailyBudget, setItineraryDailyBudget] = useState("");
    const [tripSearchQuery, setTripSearchQuery] = useState("");
    const [tripStatusFilterValue, setTripStatusFilterValue] = useState("all");
    const [tripSortValue, setTripSortValue] = useState("startDesc");
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [showTripForm, setShowTripForm] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [travelers, setTravelers] = useState("1");
    const [budget, setBudget] = useState("");
    const [tripMessage, setTripMessage] = useState("");
    const [tripError, setTripError] = useState("");
    const [deletingTrip, setDeletingTrip] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    /* --- SECTION 4: DATA FETCHING & SYNCHRONIZATION EFFECTS --- */
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape" && showPrintModal) {
                setShowPrintModal(false);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showPrintModal]);
    useEffect(() => {
        routeRequestIdRef.current += 1;
        // oxlint-disable-next-line react/set-state-in-effect
        setOptimizingRoute(false);
        setSelectedAttractionIds([]);
        setStartAttractionId("");
        setRouteResult(null);
        setRouteError("");
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
            .catch((error) => {
            setAttractions([]);
            setAttractionError(error instanceof Error
                ? error.message
                : "Failed to fetch attraction data.");
        })
            .finally(() => setLoadingAttractions(false));
    }, [selectedDestination]);
    /* --- SECTION 5: DESTINATION CATALOG & ROUTE OPTIMIZER EVENT HANDLERS --- */
    function handleToggleAttraction(id) {
        routeRequestIdRef.current += 1;
        setOptimizingRoute(false);
        setSelectedAttractionIds((prev) => {
            const isSelected = prev.includes(id);
            const next = isSelected ? prev.filter((item) => item !== id) : [...prev, id];
            if (isSelected && startAttractionId === id) {
                setStartAttractionId("");
            }
            return next;
        });
        setRouteResult(null);
        setRouteError("");
    }
    function handleSelectAllAttractions() {
        routeRequestIdRef.current += 1;
        setOptimizingRoute(false);
        const topAttractions = attractions.slice(0, 12).map((a) => a.id);
        setSelectedAttractionIds(topAttractions);
        setRouteResult(null);
        setRouteError("");
    }
    function handleClearAttractionSelection() {
        routeRequestIdRef.current += 1;
        setOptimizingRoute(false);
        setSelectedAttractionIds([]);
        setStartAttractionId("");
        setRouteResult(null);
        setRouteError("");
    }
    function handleChangeStartAttraction(id) {
        routeRequestIdRef.current += 1;
        setOptimizingRoute(false);
        setStartAttractionId(id);
        setRouteResult(null);
        setRouteError("");
    }
    async function handleOptimizeRoute() {
        if (!selectedDestination)
            return;
        if (selectedAttractionIds.length < 2) {
            setRouteError("Please select at least 2 attractions to calculate an optimized route.");
            return;
        }
        const currentDestId = selectedDestination._id;
        const requestId = ++routeRequestIdRef.current;
        setOptimizingRoute(true);
        setRouteError("");
        try {
            const result = await optimizeRoute(currentDestId, {
                attractionIds: selectedAttractionIds,
                startAttractionId: startAttractionId || undefined,
            });
            // Ignore response if request has been superseded or user changed selection/destination
            if (routeRequestIdRef.current !== requestId) {
                return;
            }
            setRouteResult(result);
        }
        catch (err) {
            if (routeRequestIdRef.current !== requestId) {
                return;
            }
            setRouteError(err instanceof Error ? err.message : "Failed to calculate optimized route.");
        }
        finally {
            if (routeRequestIdRef.current === requestId) {
                setOptimizingRoute(false);
            }
        }
    }
    useEffect(() => {
        getDestinations()
            .then((data) => {
            setDestinations(data);
        })
            .catch((err) => {
            setErrorDest(err instanceof Error
                ? err.message
                : "Something went wrong");
        })
            .finally(() => setLoadingDest(false));
    }, []);
    const today = TODAY_LOCALE_DATE_STRING;
    const upcomingTripsCount = trips.filter((t) => getTripStatus(t.startDate, t.endDate) === "Upcoming").length;
    function handleBackToDestinations() {
        routeRequestIdRef.current += 1;
        setOptimizingRoute(false);
        setSelectedAttractionIds([]);
        setStartAttractionId("");
        setRouteResult(null);
        setRouteError("");
        resetItineraryState();
        setSelectedDestination(null);
        setShowTripForm(false);
        setTripMessage("");
        setTripError("");
        setViewMode("destinations");
    }
    function resetExpenseForm() {
        setEditingExpenseId(null);
        setExpenseForm(getInitialExpenseForm());
    }
    function resetPackingForm() {
        setEditingPackingId(null);
        setPackingForm({
            name: "",
            category: packingActiveCategory || "Essentials",
            quantity: "1",
            notes: "",
        });
    }
    async function loadPackingItems(tripId) {
        setLoadingPacking(true);
        setPackingError("");
        try {
            setPackingItems(await getPackingItems(tripId));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch packing items.";
            if (message.toLowerCase().includes("unauthorized")) {
                handleAuthLogout();
                setAuthError("Session expired. Please log in again.");
                return;
            }
            setPackingError(message);
        }
        finally {
            setLoadingPacking(false);
        }
    }
    async function loadExpenses(tripId) {
        setLoadingExpenses(true);
        setExpenseError("");
        try {
            setExpenses(await getExpenses(tripId));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch expenses.";
            if (message.toLowerCase().includes("unauthorized")) {
                handleAuthLogout();
                setAuthError("Session expired. Please log in again.");
                return;
            }
            setExpenseError(message);
        }
        finally {
            setLoadingExpenses(false);
        }
    }
    /* --- SECTION 6: AUTHENTICATION & SESSION EVENT HANDLERS --- */
    function handleAuthLogout() {
        clearAuthToken();
        clearStoredUser();
        setAuthUser(null);
        setTrips([]);
        setHasFetchedTrips(false);
        prevAuthUserIdRef.current = null;
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
    async function handleAuthSubmit(event) {
        event.preventDefault();
        setAuthError("");
        setAuthMessage("");
        setAuthLoading(true);
        try {
            if (authView === "register") {
                const result = await registerUser(authName, authEmail, authPassword);
                setAuthToken(result.token);
                setStoredUser(result.user);
                setAuthUser(result.user);
                setAuthMessage("Registration successful.");
                setAuthName("");
                setAuthPassword("");
            }
            else {
                const result = await loginUser(authEmail, authPassword);
                setAuthToken(result.token);
                setStoredUser(result.user);
                setAuthUser(result.user);
                setAuthMessage("Login successful.");
                setAuthPassword("");
            }
            if (selectedDestination) {
                setShowTripForm(true);
                setViewMode("destinations");
            }
            else {
                setViewMode("dashboard");
                fetchTrips();
            }
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : "Authentication failed");
        }
        finally {
            setAuthLoading(false);
        }
    }
    function fetchTrips() {
        setLoadingTrips(true);
        setErrorTrips("");
        getTrips()
            .then((data) => setTrips(data))
            .catch((err) => {
            const message = err instanceof Error ? err.message : "Failed to fetch trips";
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
            .finally(() => {
            setLoadingTrips(false);
            setHasFetchedTrips(true);
        });
    }
    useEffect(() => {
        const currentUserId = authUser ? authUser._id : null;
        if (prevAuthUserIdRef.current !== currentUserId) {
            prevAuthUserIdRef.current = currentUserId;
            setHasFetchedTrips(false);
            if (currentUserId && viewMode === "dashboard") {
                fetchTrips();
            }
            return;
        }
        if (authUser && viewMode === "dashboard" && !hasFetchedTrips && !loadingTrips) {
            fetchTrips();
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser, viewMode, hasFetchedTrips, loadingTrips]);
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
        if (!hasFetchedTrips && !loadingTrips) {
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
        setPackingActiveCategory(null);
        setViewMode("packing");
        if (!hasFetchedTrips && !loadingTrips) {
            fetchTrips();
        }
    }
    function handleSelectPackingTrip(trip) {
        setSelectedTrip(trip);
        setPackingItems([]);
        setPackingActiveCategory(null);
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
        setCalendarMonth(getCurrentDate());
        setViewMode("calendar");
        if (!hasFetchedTrips && !loadingTrips) {
            fetchTrips();
        }
    }
    async function handleSelectCalendarTrip(trip) {
        setSelectedTrip(trip);
        setCalendarItinerary(null);
        setCalendarError("");
        setCalendarSelectedDate(getDateKey(new Date(trip.startDate)));
        setCalendarMonth(new Date(trip.startDate));
        setLoadingCalendar(true);
        try {
            const savedItinerary = await getItinerary(trip._id);
            setCalendarItinerary(savedItinerary);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch saved itinerary.";
            if (message.toLowerCase().includes("itinerary not found")) {
                setCalendarItinerary(null);
            }
            else {
                setCalendarError(message);
            }
        }
        finally {
            setLoadingCalendar(false);
        }
    }
    function shiftCalendarMonth(amount) {
        setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    }
    function handleClearTripFilters() {
        setTripSearchQuery("");
        setTripStatusFilterValue("all");
        setTripSortValue("startDesc");
    }
    /* --- SECTION 7: TRIP MANAGEMENT & ITINERARY PLANNING HANDLERS --- */
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
        setOptimizingDayIndex(null);
        setDayOptimizationStats({});
        optimizeInFlightRef.current = false;
        setItineraryError("");
        setItineraryMessage("");
    }
    async function loadSavedItinerary(trip) {
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
        }
        catch (err) {
            if (itineraryRequestIdRef.current !== requestId) {
                return;
            }
            const message = err instanceof Error
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
        }
        finally {
            if (itineraryRequestIdRef.current === requestId) {
                setLoadingItinerary(false);
            }
        }
    }
    function handleViewTripDetails(trip) {
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
    function startEditingPackingItem(item) {
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
    /* --- SECTION 8: SMART PACKING CHECKLIST & EXPENSE TRACKER HANDLERS --- */
    async function handlePackingSubmit(event) {
        event.preventDefault();
        if (!selectedTrip || packingSubmitting)
            return;
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
                const updated = await updatePackingItem(selectedTrip._id, editingPackingId, input);
                setPackingItems((items) => items.map((item) => (item._id === updated._id ? updated : item)));
                setPackingMessage("Packing item updated successfully.");
            }
            else {
                const created = await createPackingItem(selectedTrip._id, input);
                setPackingItems((items) => [...items, created]);
                setPackingMessage("Packing item added successfully.");
            }
            resetPackingForm();
        }
        catch (error) {
            setPackingError(error instanceof Error ? error.message : "Failed to save packing item.");
        }
        finally {
            setPackingSubmitting(false);
        }
    }
    async function handleTogglePackingItem(item) {
        if (!selectedTrip || packingSubmitting)
            return;
        setPackingSubmitting(true);
        setPackingError("");
        setPackingMessage("");
        try {
            const updated = await updatePackingItem(selectedTrip._id, item._id, {
                isPacked: !item.isPacked,
            });
            setPackingItems((items) => items.map((current) => (current._id === updated._id ? updated : current)));
        }
        catch (error) {
            setPackingError(error instanceof Error ? error.message : "Failed to update packing item.");
        }
        finally {
            setPackingSubmitting(false);
        }
    }
    async function handleDeletePackingItem(item) {
        if (!selectedTrip || packingSubmitting)
            return;
        if (!window.confirm(`Delete "${item.name}" from the packing checklist?`)) {
            return;
        }
        setPackingSubmitting(true);
        setPackingError("");
        setPackingMessage("");
        try {
            await deletePackingItem(selectedTrip._id, item._id);
            setPackingItems((items) => items.filter((current) => current._id !== item._id));
            if (editingPackingId === item._id)
                resetPackingForm();
            setPackingMessage("Packing item deleted successfully.");
        }
        catch (error) {
            setPackingError(error instanceof Error ? error.message : "Failed to delete packing item.");
        }
        finally {
            setPackingSubmitting(false);
        }
    }
    async function handleAddPackingSuggestions(categoryFilter) {
        if (!selectedTrip || packingSubmitting)
            return;
        const normalizeName = (name) => name.trim().toLowerCase();
        const existing = new Set(packingItems.map((item) => normalizeName(item.name)));
        let pool = PACKING_SUGGESTIONS;
        if (categoryFilter) {
            pool = pool.filter((item) => item.category === categoryFilter);
        }
        const suggestions = pool.filter((item) => !existing.has(normalizeName(item.name)));
        if (suggestions.length === 0) {
            setPackingMessage(categoryFilter
                ? `Starter suggestions for ${categoryFilter} are already added.`
                : "Starter suggestions are already on your checklist.");
            return;
        }
        setPackingSubmitting(true);
        setPackingError("");
        setPackingMessage("");
        try {
            const created = await Promise.all(suggestions.map((item) => createPackingItem(selectedTrip._id, item)));
            setPackingItems((items) => [...items, ...created]);
            setPackingMessage(categoryFilter
                ? `${created.length} starter ${categoryFilter} items added.`
                : `${created.length} starter packing items added.`);
        }
        catch (error) {
            setPackingError(error instanceof Error ? error.message : "Failed to add starter items.");
        }
        finally {
            setPackingSubmitting(false);
        }
    }
    async function handleDeleteTrip() {
        if (!selectedTrip || deletingTrip)
            return;
        const destinationName = typeof selectedTrip.destination === "object" &&
            selectedTrip.destination !== null
            ? selectedTrip.destination.name
            : "this trip";
        const confirmed = window.confirm(`Delete the trip to ${destinationName}? This permanently removes the trip, its itinerary, and its expenses.`);
        if (!confirmed)
            return;
        setDeletingTrip(true);
        setTripError("");
        setTripMessage("");
        try {
            await deleteTrip(selectedTrip._id);
            setTrips((currentTrips) => currentTrips.filter((trip) => trip._id !== selectedTrip._id));
            setSelectedTrip(null);
            resetItineraryState();
            setExpenses([]);
            setPackingItems([]);
            resetPackingForm();
            setViewMode("trips");
            setTripMessage(`Trip to ${destinationName} was deleted.`);
        }
        catch (error) {
            setTripError(error instanceof Error ? error.message : "Failed to delete trip.");
        }
        finally {
            setDeletingTrip(false);
        }
    }
    function handleStartEditTrip() {
        if (!selectedTrip)
            return;
        const startYMD = selectedTrip.startDate
            ? new Date(selectedTrip.startDate).toISOString().slice(0, 10)
            : "";
        const endYMD = selectedTrip.endDate
            ? new Date(selectedTrip.endDate).toISOString().slice(0, 10)
            : "";
        setEditTripForm({
            startDate: startYMD,
            endDate: endYMD,
            travelers: String(selectedTrip.travelers || 1),
            budget: String(selectedTrip.budget || ""),
        });
        setEditTripError("");
        setEditTripMessage("");
        setEditingTrip(true);
    }
    function handleCancelEditTrip() {
        setEditingTrip(false);
        setEditTripError("");
    }
    async function handleUpdateTripSubmit(e) {
        e.preventDefault();
        if (!selectedTrip || editTripSubmitting)
            return;
        setEditTripError("");
        setEditTripMessage("");
        if (!editTripForm.startDate || !editTripForm.endDate) {
            setEditTripError("Please provide both start and end dates.");
            return;
        }
        const start = new Date(editTripForm.startDate);
        const end = new Date(editTripForm.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setEditTripError("Please provide valid travel dates.");
            return;
        }
        if (start > end) {
            setEditTripError("Start date must be before or equal to end date.");
            return;
        }
        const diffNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffNights > 30) {
            setEditTripError("Trip duration cannot exceed 30 nights.");
            return;
        }
        const travelersNum = Number(editTripForm.travelers);
        if (!Number.isInteger(travelersNum) ||
            travelersNum < 1 ||
            travelersNum > 50) {
            setEditTripError("Travelers must be an integer between 1 and 50.");
            return;
        }
        const budgetNum = Number(editTripForm.budget);
        if (!Number.isFinite(budgetNum) || budgetNum < 1) {
            setEditTripError("Budget must be a positive number.");
            return;
        }
        setEditTripSubmitting(true);
        try {
            const result = await updateTrip(selectedTrip._id, {
                startDate: editTripForm.startDate,
                endDate: editTripForm.endDate,
                travelers: travelersNum,
                budget: budgetNum,
            });
            setSelectedTrip(result.data);
            setTrips((prevTrips) => prevTrips.map((t) => (t._id === result.data._id ? result.data : t)));
            setEditTripMessage(result.message || "Trip updated successfully.");
            setEditingTrip(false);
        }
        catch (err) {
            setEditTripError(err instanceof Error ? err.message : "Failed to update trip.");
        }
        finally {
            setEditTripSubmitting(false);
        }
    }
    function validateExpenseForm() {
        if (!expenseForm.title.trim())
            return "Expense title is required.";
        const amount = Number(expenseForm.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return "Enter a positive expense amount.";
        }
        if (!expenseForm.date || Number.isNaN(new Date(expenseForm.date).getTime())) {
            return "Enter a valid expense date.";
        }
        return null;
    }
    async function handleExpenseSubmit(event) {
        event.preventDefault();
        if (!selectedTrip || expenseSubmitting)
            return;
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
            }
            else {
                await createExpense(selectedTrip._id, input);
                setExpenseMessage("Expense added successfully.");
            }
            resetExpenseForm();
            await loadExpenses(selectedTrip._id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save expense.";
            if (message.toLowerCase().includes("unauthorized")) {
                handleAuthLogout();
                setAuthError("Session expired. Please log in again.");
                return;
            }
            setExpenseError(message);
        }
        finally {
            setExpenseSubmitting(false);
        }
    }
    function startEditingExpense(expense) {
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
    async function handleDeleteExpense(expense) {
        if (!selectedTrip || expenseSubmitting)
            return;
        if (!window.confirm(`Delete "${expense.title}"?`))
            return;
        setExpenseSubmitting(true);
        setExpenseError("");
        setExpenseMessage("");
        try {
            await deleteExpense(selectedTrip._id, expense._id);
            if (editingExpenseId === expense._id)
                resetExpenseForm();
            setExpenseMessage("Expense deleted successfully.");
            await loadExpenses(selectedTrip._id);
        }
        catch (error) {
            setExpenseError(error instanceof Error ? error.message : "Failed to delete expense.");
        }
        finally {
            setExpenseSubmitting(false);
        }
    }
    // handleBackToTrips removed (unused after auth gating)
    async function handleGenerateDraft() {
        if (!selectedTrip ||
            loadingItinerary ||
            editingItinerary ||
            generateInFlightRef.current ||
            saveInFlightRef.current) {
            return;
        }
        const tripId = selectedTrip._id;
        const requestId = ++itineraryRequestIdRef.current;
        generateInFlightRef.current = true;
        editSnapshotRef.current = null;
        setGeneratingDraft(true);
        setEditingItinerary(false);
        setItineraryEditDirty(false);
        setOptimizingDayIndex(null);
        setDayOptimizationStats({});
        optimizeInFlightRef.current = false;
        setItineraryError("");
        setItineraryMessage("");
        try {
            const dailyBudgetValue = itineraryDailyBudget.trim() === ""
                ? undefined
                : Number(itineraryDailyBudget);
            if (itineraryInterests.length === 0) {
                setItineraryError("Choose at least one interest before generating.");
                return;
            }
            if (dailyBudgetValue !== undefined &&
                (!Number.isFinite(dailyBudgetValue) || dailyBudgetValue < 0)) {
                setItineraryError("Daily budget must be a non-negative number.");
                return;
            }
            const preferences = {
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
        }
        catch (err) {
            if (itineraryRequestIdRef.current !== requestId) {
                return;
            }
            const message = err instanceof Error
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
        }
        finally {
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
        setItineraryMessage("Edit, add or remove activities below. Changes are not saved until you save them.");
    }
    function handleCancelEditingItinerary() {
        if (itineraryEditDirty &&
            !window.confirm("Discard your unsaved itinerary changes?")) {
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
        setItineraryMessage(snapshot?.draftSaved
            ? "Saved itinerary restored."
            : "Itinerary draft restored.");
    }
    function handleActivityChange(dayIndex, activityIndex, patch) {
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
    function handleAddActivity(dayIndex) {
        if (!draft || !editingItinerary) {
            return;
        }
        setDraft((current) => current ? addActivityToPreview(current, dayIndex) : current);
        setDraftSaved(false);
        setItineraryEditDirty(true);
        setItineraryError("");
        setItineraryMessage(`Activity added to Day ${dayIndex}. Save changes to keep it.`);
    }
    function handleRemoveActivity(dayIndex, activityIndex) {
        if (!draft || !editingItinerary) {
            return;
        }
        if (draft.days.length <= 1) {
            setItineraryError("An itinerary must contain at least one activity. The final activity cannot be removed.");
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
        setItineraryMessage(`Activity removed from Day ${dayIndex}. Save changes to keep this update.`);
    }
    function handleMoveActivity(dayIndex, activityIndex, direction) {
        if (!draft || !editingItinerary) {
            return;
        }
        const dayActivities = draft.dayPlans.find((day) => day.dayIndex === dayIndex)?.activities;
        if (!dayActivities) {
            return;
        }
        const targetIndex = activityIndex + direction;
        if (targetIndex < 0 || targetIndex >= dayActivities.length) {
            return;
        }
        setDraft((current) => current
            ? moveActivityInPreview(current, dayIndex, activityIndex, direction)
            : current);
        setDraftSaved(false);
        setItineraryEditDirty(true);
        setItineraryError("");
        setItineraryMessage(`Activity moved on Day ${dayIndex}. Save changes to keep this order.`);
    }
    function handleMoveActivityToDay(sourceDayIndex, activityIndex, targetDayIndex) {
        if (!draft || !editingItinerary) {
            return;
        }
        if (sourceDayIndex === targetDayIndex) {
            return;
        }
        if (!draft.dayPlans.some((day) => day.dayIndex === targetDayIndex)) {
            setItineraryError(`Day ${targetDayIndex} is not available for this itinerary.`);
            return;
        }
        setDraft((current) => current
            ? moveActivityToDay(current, sourceDayIndex, activityIndex, targetDayIndex)
            : current);
        setDraftSaved(false);
        setItineraryEditDirty(true);
        setItineraryError("");
        setItineraryMessage(`Activity moved to Day ${targetDayIndex}. Save changes to keep this update.`);
    }
    async function handleOptimizeDayRoute(dayIndex) {
        if (!selectedTrip ||
            !draft ||
            loadingItinerary ||
            savingItinerary ||
            generatingDraft ||
            optimizeInFlightRef.current ||
            optimizingDayIndex !== null) {
            return;
        }
        const dayPlan = draft.dayPlans.find((d) => Number(d.dayIndex) === Number(dayIndex));
        if (!dayPlan) {
            return;
        }
        const tripId = selectedTrip._id;
        optimizeInFlightRef.current = true;
        setOptimizingDayIndex(dayIndex);
        setItineraryError("");
        setItineraryMessage("");
        try {
            const [result] = await Promise.all([
                optimizeItineraryDay(tripId, {
                    dayIndex: Number(dayIndex),
                    activities: dayPlan.activities,
                }),
                new Promise((resolve) => setTimeout(resolve, 250)),
            ]);
            const normalizedActivities = result.activities.map((a) => ({
                dayIndex: Number(a.dayIndex),
                startTime: a.startTime ?? "",
                endTime: a.endTime ?? "",
                title: a.title,
                description: a.description ?? "",
                category: a.category ?? "activity",
                locationName: a.locationName ?? "",
                estimatedCost: Number(a.estimatedCost) || 0,
                notes: a.notes ?? "",
                latitude: a.latitude,
                longitude: a.longitude,
                mapUrl: a.mapUrl,
                source: a.source,
            }));
            const nextDayPlans = draft.dayPlans.map((d) => {
                if (Number(d.dayIndex) !== Number(dayIndex)) {
                    return d;
                }
                return {
                    ...d,
                    activities: normalizedActivities,
                };
            });
            const nextDraft = rebuildItineraryPreview(draft, nextDayPlans);
            setDraft(nextDraft);
            setDraftSaved(false);
            if (editingItinerary) {
                setItineraryEditDirty(true);
            }
            if (result.optimized) {
                setDayOptimizationStats((prev) => ({
                    ...prev,
                    [Number(dayIndex)]: {
                        totalDistanceKm: result.totalDistanceKm,
                        legsCount: result.legs.length,
                        optimized: true,
                        message: `~${result.totalDistanceKm} km across ${result.legs.length} legs`,
                    },
                }));
                setItineraryMessage(`Day ${dayIndex} route optimized (~${result.totalDistanceKm} km total distance). Save changes to persist.`);
            }
            else {
                const coordCount = result.activities.filter(hasValidCoordinates).length;
                const note = coordCount === 0
                    ? "No coordinates"
                    : "1 coordinate (already optimal)";
                setDayOptimizationStats((prev) => ({
                    ...prev,
                    [Number(dayIndex)]: {
                        totalDistanceKm: 0,
                        legsCount: 0,
                        optimized: false,
                        message: note,
                    },
                }));
                setItineraryMessage(`Day ${dayIndex} route checked. Fewer than 2 coordinated attractions found to reorder.`);
            }
        }
        catch (err) {
            const message = err instanceof Error
                ? err.message
                : `Failed to optimize Day ${dayIndex} route.`;
            if (message.toLowerCase().includes("unauthorized")) {
                handleAuthLogout();
                setAuthError("Session expired. Please log in again.");
                return;
            }
            setItineraryError(message);
        }
        finally {
            optimizeInFlightRef.current = false;
            setOptimizingDayIndex(null);
        }
    }
    async function handleOptimizeAllDaysRoute() {
        if (!selectedTrip ||
            !draft ||
            loadingItinerary ||
            savingItinerary ||
            generatingDraft ||
            optimizeInFlightRef.current ||
            optimizingDayIndex !== null ||
            draft.days.length === 0) {
            return;
        }
        const tripId = selectedTrip._id;
        optimizeInFlightRef.current = true;
        setOptimizingDayIndex("all");
        setItineraryError("");
        setItineraryMessage("");
        try {
            const [result] = await Promise.all([
                optimizeAllItineraryDays(tripId, {
                    activities: draft.days,
                }),
                new Promise((resolve) => setTimeout(resolve, 300)),
            ]);
            const newDayPlans = [];
            const dayStats = {};
            for (const dayResult of result.dayResults) {
                const normalizedActivities = dayResult.activities.map((a) => ({
                    dayIndex: Number(a.dayIndex),
                    startTime: a.startTime ?? "",
                    endTime: a.endTime ?? "",
                    title: a.title,
                    description: a.description ?? "",
                    category: a.category ?? "activity",
                    locationName: a.locationName ?? "",
                    estimatedCost: Number(a.estimatedCost) || 0,
                    notes: a.notes ?? "",
                    latitude: a.latitude,
                    longitude: a.longitude,
                    mapUrl: a.mapUrl,
                    source: a.source,
                }));
                newDayPlans.push({
                    dayIndex: dayResult.dayIndex,
                    activities: normalizedActivities,
                });
                const coordCount = normalizedActivities.filter(hasValidCoordinates).length;
                dayStats[dayResult.dayIndex] = {
                    totalDistanceKm: dayResult.totalDistanceKm,
                    legsCount: dayResult.legs.length,
                    optimized: dayResult.optimized,
                    message: dayResult.optimized
                        ? `~${dayResult.totalDistanceKm} km across ${dayResult.legs.length} legs`
                        : coordCount === 0
                            ? "No coordinates"
                            : "1 coordinate (already optimal)",
                };
            }
            // Preserve any days not returned in dayResults (e.g. empty days)
            for (const d of draft.dayPlans) {
                if (!newDayPlans.some((np) => np.dayIndex === d.dayIndex)) {
                    newDayPlans.push(d);
                }
            }
            newDayPlans.sort((a, b) => a.dayIndex - b.dayIndex);
            const nextDraft = rebuildItineraryPreview(draft, newDayPlans);
            setDraft(nextDraft);
            setDraftSaved(false);
            if (editingItinerary) {
                setItineraryEditDirty(true);
            }
            setDayOptimizationStats((prev) => ({ ...prev, ...dayStats }));
            const optimizedCount = result.dayResults.filter((r) => r.optimized).length;
            if (optimizedCount > 0) {
                setItineraryMessage(`All ${optimizedCount} eligible days optimized (~${result.totalDistanceKm} km total distance). Save changes to persist.`);
            }
            else {
                setItineraryMessage("All itinerary days checked. No days with 2+ coordinated attractions found.");
            }
        }
        catch (err) {
            const message = err instanceof Error
                ? err.message
                : "Failed to optimize all itinerary days route.";
            if (message.toLowerCase().includes("unauthorized")) {
                handleAuthLogout();
                setAuthError("Session expired. Please log in again.");
                return;
            }
            setItineraryError(message);
        }
        finally {
            optimizeInFlightRef.current = false;
            setOptimizingDayIndex(null);
        }
    }
    async function handleSaveItinerary() {
        if (!selectedTrip ||
            !draft ||
            draftSaved ||
            loadingItinerary ||
            saveInFlightRef.current ||
            generateInFlightRef.current) {
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
        const confirmed = window.confirm(wasEditing
            ? "Save these itinerary changes? This will replace the saved itinerary for this trip."
            : "Save this draft? If this trip already has a saved itinerary, it will be replaced.");
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
            setItineraryMessage(wasEditing ? "Itinerary changes saved." : "Itinerary saved.");
        }
        catch (err) {
            if (itineraryRequestIdRef.current !== requestId) {
                return;
            }
            const message = err instanceof Error
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
        }
        finally {
            if (itineraryRequestIdRef.current === requestId) {
                saveInFlightRef.current = false;
                setSavingItinerary(false);
            }
        }
    }
    function handleRetryTrips() {
        fetchTrips();
    }
    async function handleTripSubmit(event) {
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
        if (!Number.isInteger(travelerCount) ||
            travelerCount < 1 ||
            travelerCount > 50 ||
            !Number.isFinite(totalBudget) ||
            totalBudget < 1) {
            setTripError("Enter between 1 and 50 travelers and a valid budget.");
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
            setTripMessage(result.message || "Trip created successfully!");
            setShowTripForm(false);
            setStartDate("");
            setEndDate("");
            setTravelers("1");
            setBudget("");
            fetchTrips();
        }
        catch (err) {
            const message = err instanceof Error
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
        }
        finally {
            setSubmitting(false);
        }
    }
    /* --- SECTION 9: MAIN JSX LAYOUT & VIEW RENDERING --- */
    return (<div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <h2>TravelMate</h2>
            <span>Trip Planner</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {authUser && (<button type="button" className={`nav-item ${viewMode === "dashboard" ? "active" : ""}`} onClick={() => {
                setViewMode("dashboard");
                setSelectedDestination(null);
                setSelectedTrip(null);
                resetItineraryState();
                if (!hasFetchedTrips && !loadingTrips) {
                    fetchTrips();
                }
            }} style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}>
              Dashboard
            </button>)}
          <button type="button" className={`nav-item ${(viewMode === "destinations" && !selectedDestination) || selectedDestination ? "active" : ""}`} onClick={handleBackToDestinations} style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}>
            Explore Destinations
          </button>
          {authUser && (<>
              <button type="button" className={`nav-item ${viewMode === "trips" ? "active" : ""}`} onClick={handleShowTrips} style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}>
                My Trips
              </button>
              <button type="button" className={`nav-item ${viewMode === "packing" ? "active" : ""}`} onClick={handleShowPacking} style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}>
                🎒 Packing Checklist
              </button>
              <button type="button" className={`nav-item ${viewMode === "calendar" ? "active" : ""}`} onClick={handleShowCalendar} style={{ background: "transparent", border: "none", textAlign: "left", width: "100%" }}>
                Itinerary Calendar
              </button>
            </>)}
        </nav>
        <div className="sidebar-footer">
          {authUser ? (<div className="user-info">
              <div className="user-details">
                <div className="user-name">{authUser.name}</div>
                <div className="user-email">{authUser.email}</div>
              </div>
              <button className="logout-btn" onClick={handleAuthLogout}>
                Logout
              </button>
            </div>) : (<div className="auth-actions">
              <button className="auth-link" onClick={() => {
                setSelectedDestination(null);
                setAuthView("login");
                setAuthError("");
                setAuthMessage("");
            }} style={{ background: "transparent" }}>
                Login
              </button>
              <button className="auth-link primary" onClick={() => {
                setSelectedDestination(null);
                setAuthView("register");
                setAuthError("");
                setAuthMessage("");
            }}>
                Register
              </button>
            </div>)}
        </div>
      </aside>
      <main className="main-content">

        {authUser && viewMode === "dashboard" ? (<section className="destinations dashboard-view">
            <div className="dashboard-hero-card">
              <div className="dashboard-hero-content">
                <span className="dashboard-hero-eyebrow">Travel Management Hub</span>
                <h1 className="dashboard-hero-title">Welcome back, {authUser.name}</h1>
                <p className="dashboard-hero-subtitle">
                  Plan meaningful journeys, organize curated itineraries, and track every travel detail in one place.
                </p>
                <div className="dashboard-hero-badge">
                  <span className="badge-dot" aria-hidden="true"/>
                  {trips.length === 0
                ? "Ready to plan your first adventure"
                : `${upcomingTripsCount} upcoming adventure${upcomingTripsCount === 1 ? "" : "s"} planned`}
                </div>
              </div>
              <div className="dashboard-hero-media">
                <TravelImageFrame image={getDestinationImage("jaipur")} alt="Jaipur royal architecture travel scene" className="dashboard-hero-img"/>
              </div>
            </div>

            <div className="dashboard-kpi-grid">
              <div className="dashboard-kpi-card kpi-navy">
                <div className="kpi-header">
                  <span className="kpi-label">Total Trips</span>
                  <span className="kpi-icon-wrapper" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </span>
                </div>
                <div className="dashboard-metric-value kpi-val-navy">
                  {loadingTrips ? "..." : trips.length}
                </div>
                <span className="kpi-footer-text">Organized travel journeys</span>
              </div>

              <div className="dashboard-kpi-card kpi-teal">
                <div className="kpi-header">
                  <span className="kpi-label">Upcoming Trips</span>
                  <span className="kpi-icon-wrapper" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                </div>
                <div className="dashboard-metric-value kpi-val-teal">
                  {loadingTrips ? "..." : upcomingTripsCount}
                </div>
                <span className="kpi-footer-text">Scheduled future departures</span>
              </div>

              <div className="dashboard-kpi-card kpi-emerald">
                <div className="kpi-header">
                  <span className="kpi-label">Destinations</span>
                  <span className="kpi-icon-wrapper" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                </div>
                <div className="dashboard-metric-value kpi-val-emerald">
                  {loadingDest ? "..." : destinations.length}
                </div>
                <span className="kpi-footer-text">Curated Indian destinations</span>
              </div>
            </div>

            {/* Visual Progress Rings & Analytics */}
            {(() => {
                const completedTrips = trips.filter((t) => getTripStatus(t.startDate, t.endDate) === "Completed").length;
                const completionRate = trips.length > 0 ? (completedTrips / trips.length) * 100 : 0;
                const upcomingRate = trips.length > 0 ? (upcomingTripsCount / trips.length) * 100 : 0;
                const exploredDestIds = new Set(trips
                    .map((t) => (typeof t.destination === "object" && t.destination ? t.destination._id : t.destination))
                    .filter(Boolean));
                const destCoverage = destinations.length > 0
                    ? Math.min(100, (exploredDestIds.size / destinations.length) * 100)
                    : 0;
                return (<div className="dashboard-metrics-row">
                  <div className="dashboard-metrics-header">
                    <h2 className="dashboard-metrics-title">Journey Progress & Analytics</h2>
                    <p className="dashboard-metrics-subtitle">Visual overview of your travel completion and exploration progress</p>
                  </div>
                  <div className="dashboard-rings-grid">
                    <ProgressRing progress={completionRate} color="#10b981" label="Trip Completion" sublabel={`${completedTrips} of ${trips.length} journeys completed`}/>
                    <ProgressRing progress={upcomingRate} color="#3b82f6" label="Upcoming Readiness" sublabel={`${upcomingTripsCount} departures scheduled`}/>
                    <ProgressRing progress={destCoverage} color="#f59e0b" label="Destinations Explored" sublabel={`${exploredDestIds.size} of ${destinations.length || 10} destinations planned`}/>
                  </div>
                </div>);
            })()}

            <div className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2 className="dashboard-section-title">Quick Actions</h2>
                  <p className="dashboard-section-subtitle">Jump straight into your travel planning workflows</p>
                </div>
              </div>
              <div className="dashboard-actions-grid">
                <button type="button" className="dashboard-action-tile" onClick={handleBackToDestinations}>
                  <div className="action-tile-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                    </svg>
                  </div>
                  <div className="action-tile-body">
                    <h3>Explore Destinations</h3>
                    <p>Browse curated Indian destinations, local attractions, and travel insights</p>
                  </div>
                  <span className="action-tile-arrow" aria-hidden="true">→</span>
                </button>

                <button type="button" className="dashboard-action-tile" onClick={handleBackToDestinations}>
                  <div className="action-tile-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                      <line x1="12" y1="14" x2="12" y2="18"/>
                      <line x1="10" y1="16" x2="14" y2="16"/>
                    </svg>
                  </div>
                  <div className="action-tile-body">
                    <h3>Plan a New Trip</h3>
                    <p>Select a destination to set dates, travelers, and custom budget</p>
                  </div>
                  <span className="action-tile-arrow" aria-hidden="true">→</span>
                </button>

                <button type="button" className="dashboard-action-tile" onClick={handleShowTrips}>
                  <div className="action-tile-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <div className="action-tile-body">
                    <h3>View Saved Trips</h3>
                    <p>Manage existing itineraries, track expenses, and check packing lists</p>
                  </div>
                  <span className="action-tile-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            <div className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2 className="dashboard-section-title">Recent Journeys</h2>
                  <p className="dashboard-section-subtitle">Your planned and past travel itineraries</p>
                </div>
                {trips.length > 0 && (<button type="button" className="dashboard-link-btn" onClick={handleShowTrips}>
                    View All ({trips.length}) <span aria-hidden="true">→</span>
                  </button>)}
              </div>
              {loadingTrips && (<div className="dashboard-trips-loading">
                  <div className="spinner-small"/>
                  <p>Loading trips...</p>
                </div>)}
              {errorTrips && !loadingTrips && (<div className="dashboard-trips-error">
                  <div className="alert alert-error">{errorTrips}</div>
                  <button type="button" className="btn btn-secondary" onClick={handleRetryTrips} style={{ marginTop: "0.5rem" }}>
                    Retry
                  </button>
                </div>)}
              {!loadingTrips && !errorTrips && trips.length === 0 && (<div className="empty-state">
                  <h3>No trips yet</h3>
                  <p>Start by exploring destinations and planning your first trip</p>
                  <button type="button" className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={handleBackToDestinations}>
                    Explore Destinations
                  </button>
                </div>)}
              {!loadingTrips && !errorTrips && trips.length > 0 && (<div className="dashboard-trip-grid">
                  {trips.slice(0, 4).map((trip) => {
                    const dest = typeof trip.destination === "object" ? trip.destination : null;
                    const status = getTripStatus(trip.startDate, trip.endDate);
                    const statusClass = status === "Upcoming"
                        ? "status-upcoming"
                        : status === "Ongoing"
                            ? "status-ongoing"
                            : "status-completed";
                    const locationDisplay = dest
                        ? (dest.state ? `${dest.state}, ${dest.country}` : dest.country)
                        : null;
                    return (<div key={trip._id} className="dashboard-trip-tile">
                        <div className="dashboard-trip-tile-media">
                          <TravelImageFrame image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined} alt={dest ? dest.name : "Trip"}/>
                          <span className={`trip-status-badge ${statusClass}`}>
                            {status}
                          </span>
                        </div>
                        <div className="dashboard-trip-tile-body">
                          {locationDisplay && (<span className="location-tag">
                              <span aria-hidden="true">📍</span> {locationDisplay}
                            </span>)}
                          <h3>{dest ? dest.name : "Destination"}</h3>
                          <div className="trip-tile-chips">
                            <span className="trip-tile-chip" title="Travel Dates">
                              <span aria-hidden="true">📅</span> {trip.startDate.slice(0, 10)} to {trip.endDate.slice(0, 10)}
                            </span>
                            <span className="trip-tile-chip" title="Travelers">
                              <span aria-hidden="true">👥</span> {trip.travelers} traveler{trip.travelers !== 1 ? "s" : ""}
                            </span>
                            <span className="trip-tile-chip" title="Budget">
                              <span aria-hidden="true">💰</span> {formatCurrency(trip.budget)}
                            </span>
                          </div>
                          <button type="button" className="dashboard-trip-btn" onClick={() => handleViewTripDetails(trip)}>
                            View Details & Itinerary <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      </div>);
                })}
                </div>)}
            </div>

            <div className="dashboard-section-card">
              <div className="dashboard-section-header">
                <div>
                  <h2 className="dashboard-section-title">Curated Destinations</h2>
                  <p className="dashboard-section-subtitle">Inspiration for your upcoming Indian getaways</p>
                </div>
                <button type="button" className="dashboard-link-btn" onClick={handleBackToDestinations}>
                  Explore Catalog ({destinations.length}) <span aria-hidden="true">→</span>
                </button>
              </div>
              {loadingDest && (<div className="dashboard-trips-loading" style={{ minHeight: "160px" }}>
                  <div className="spinner-small"/>
                  <p>Loading destinations...</p>
                </div>)}
              {errorDest && !loadingDest && <div className="alert alert-error">{errorDest}</div>}
              {!loadingDest && !errorDest && destinations.length === 0 && (<div className="empty-state">
                  <h3>No destinations available</h3>
                </div>)}
              {!loadingDest && !errorDest && destinations.length > 0 && (<div className="dashboard-dest-grid">
                  {destinations.slice(0, 3).map((dest) => {
                    const locationDisplay = dest.state ? `${dest.state}, ${dest.country}` : dest.country;
                    return (<div key={dest._id} className="dashboard-dest-tile" role="button" tabIndex={0} onClick={() => {
                            setSelectedDestination(dest);
                            setViewMode("destinations");
                        }} onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedDestination(dest);
                                setViewMode("destinations");
                            }
                        }}>
                        <div className="dashboard-dest-tile-media">
                          <TravelImageFrame image={getDestinationImage(dest.name, dest.imageUrl)} alt={dest.name}/>
                          {locationDisplay && (<span className="dest-tile-location-badge">
                              <span aria-hidden="true">📍</span> {locationDisplay}
                            </span>)}
                        </div>
                        <div className="dashboard-dest-tile-body">
                          <h3>{dest.name}</h3>
                          <p>{dest.description ? dest.description : "Discover historic monuments, cultural heritage, and vibrant local cuisine."}</p>
                          <span className="dest-tile-action-prompt">
                            Explore Attractions & Routes <span aria-hidden="true">→</span>
                          </span>
                        </div>
                      </div>);
                })}
                </div>)}
            </div>
          </section>) : authUser && viewMode === "packing" ? (<section className="destinations packing-page">
            <div className="page-header">
              <h1>Packing Checklist</h1>
              <p>Keep every trip organized with a saved packing list.</p>
            </div>

            {loadingTrips && <p role="status">Loading your trips...</p>}
            {errorTrips && <p className="error" role="alert">{errorTrips}</p>}
            {!loadingTrips && trips.length === 0 && (<div className="card empty-state">
                <h2>No trips yet</h2>
                <p>Create a trip first, then build its packing checklist here.</p>
                <button type="button" className="btn btn-primary" onClick={handleShowTrips}>
                  Go to My Trips
                </button>
              </div>)}

            {trips.length > 0 && (<div className="packing-page-layout">
                <div className="card packing-trip-selector">
                  <h2>Select a trip</h2>
                  <div className="packing-trip-list">
                    {trips.map((trip) => {
                    const destination = typeof trip.destination === "object" && trip.destination
                        ? trip.destination.name
                        : "Trip";
                    return (<button type="button" key={trip._id} className={`packing-trip-option ${selectedTrip?._id === trip._id ? "selected" : ""}`} onClick={() => handleSelectPackingTrip(trip)}>
                          <strong>{destination}</strong>
                          <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                        </button>);
                })}
                  </div>
                </div>

                {selectedTrip ? (<section className="card packing-page-card" aria-labelledby="packing-page-heading">
                    {(() => {
                        const packedCount = packingItems.filter((item) => item.isPacked).length;
                        const completion = packingItems.length > 0
                            ? (packedCount / packingItems.length) * 100
                            : 0;
                        return (<>
                          <div className="itinerary-heading-row">
                            <div>
                              <h2 id="packing-page-heading">
                                {typeof selectedTrip.destination === "object" && selectedTrip.destination
                                ? selectedTrip.destination.name
                                : "Selected trip"} Packing Hub
                              </h2>
                              <p className="packing-summary">
                                {packedCount} of {packingItems.length} items packed · {completion.toFixed(0)}% complete
                              </p>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => void handleAddPackingSuggestions()} disabled={packingSubmitting || loadingPacking}>
                              ✨ Add All Starter Suggestions
                            </button>
                          </div>
                          <div className="packing-progress" aria-label={`Packing checklist ${completion.toFixed(0)} percent complete`}>
                            <span style={{ width: `${completion}%` }}/>
                          </div>

                          {loadingPacking && <p role="status">Loading packing checklist...</p>}
                          {packingError && <p className="error" role="alert">{packingError}</p>}
                          {packingMessage && <p className="success" role="status">{packingMessage}</p>}

                          {packingActiveCategory === null ? (<div className="packing-hub-view">
                              <div className="packing-hub-intro">
                                <div className="packing-hub-intro-text">
                                  <h3>Category Checklist Hub</h3>
                                  <p>Select any category below to open its dedicated checklist, view items, or add category essentials.</p>
                                </div>
                                <span className="badge">
                                  {PACKING_CATEGORIES.length} Categories
                                </span>
                              </div>

                              <div className="packing-category-hub-grid">
                                {PACKING_CATEGORIES.map((category) => {
                                    const categoryItems = packingItems.filter((item) => item.category === category);
                                    const catPacked = categoryItems.filter((item) => item.isPacked).length;
                                    const catPercent = categoryItems.length > 0
                                        ? (catPacked / categoryItems.length) * 100
                                        : 0;
                                    const meta = PACKING_CATEGORY_META[category];
                                    return (<div key={category} className="packing-category-hub-card" onClick={() => {
                                            setPackingActiveCategory(category);
                                            setPackingForm((prev) => ({ ...prev, category }));
                                        }}>
                                      <div>
                                        <div className="hub-card-header">
                                          <span className="hub-card-icon">{meta.icon}</span>
                                          <div className="hub-card-meta">
                                            <h3 className="hub-card-title">{category}</h3>
                                            <span className="hub-card-count">
                                              {categoryItems.length === 0
                                            ? "0 items · Empty"
                                            : `${catPacked}/${categoryItems.length} packed (${catPercent.toFixed(0)}%)`}
                                            </span>
                                          </div>
                                          <span className="hub-card-arrow" aria-hidden="true">→</span>
                                        </div>
                                        <p className="hub-card-desc">{meta.description}</p>
                                        <div className="packing-mini-progress">
                                          <span style={{ width: `${catPercent}%` }}/>
                                        </div>
                                      </div>

                                      <div className="hub-card-actions" onClick={(e) => e.stopPropagation()}>
                                        <button type="button" className="btn btn-sm btn-outline" onClick={() => {
                                            setPackingActiveCategory(category);
                                            setPackingForm((prev) => ({ ...prev, category }));
                                        }}>
                                          Open {category} ({categoryItems.length}) →
                                        </button>
                                        {categoryItems.length === 0 && (<button type="button" className="btn btn-sm btn-secondary" onClick={() => void handleAddPackingSuggestions(category)} disabled={packingSubmitting}>
                                            ✨ Add Starters
                                          </button>)}
                                      </div>
                                    </div>);
                                })}
                              </div>
                            </div>) : ((() => {
                                const activeCategory = packingActiveCategory;
                                const categoryItems = packingItems.filter((item) => item.category === activeCategory);
                                const catPacked = categoryItems.filter((item) => item.isPacked).length;
                                const catPercent = categoryItems.length > 0
                                    ? (catPacked / categoryItems.length) * 100
                                    : 0;
                                const meta = PACKING_CATEGORY_META[activeCategory];
                                return (<div className="packing-dedicated-view">
                                  <div className="packing-dedicated-header">
                                    <button type="button" className="btn btn-secondary btn-back-hub" onClick={() => {
                                        setPackingActiveCategory(null);
                                        resetPackingForm();
                                    }}>
                                      ← Back to All Categories
                                    </button>
                                    <div className="packing-dedicated-title-row">
                                      <h2>
                                        <span>{meta.icon}</span> {activeCategory} Checklist
                                      </h2>
                                      <span className="badge">
                                        {catPacked} of {categoryItems.length} packed ({catPercent.toFixed(0)}%)
                                      </span>
                                    </div>
                                    <div className="packing-progress" style={{ margin: "0.5rem 0 0" }}>
                                      <span style={{ width: `${catPercent}%` }}/>
                                    </div>
                                  </div>

                                  <form className="packing-form" onSubmit={handlePackingSubmit}>
                                    <h4>
                                      {editingPackingId
                                        ? `Edit ${activeCategory} Item`
                                        : `+ Add Item to ${activeCategory}`}
                                    </h4>
                                    <label>
                                      Item name
                                      <input value={packingForm.name} onChange={(event) => setPackingForm({ ...packingForm, name: event.target.value })} maxLength={120} placeholder={`e.g. ${activeCategory === "Clothing" ? "Light Jacket" : activeCategory === "Electronics" ? "Power Bank" : "Item name"}`} required/>
                                    </label>
                                    <label>
                                      Quantity
                                      <input type="number" min="1" max="100" step="1" value={packingForm.quantity} onChange={(event) => setPackingForm({ ...packingForm, quantity: event.target.value })} required/>
                                    </label>
                                    <label>
                                      Notes <span className="field-hint">(optional)</span>
                                      <textarea value={packingForm.notes} onChange={(event) => setPackingForm({ ...packingForm, notes: event.target.value })} maxLength={500} rows={2} placeholder="e.g. keep in hand luggage"/>
                                    </label>
                                    <div className="expense-form-actions">
                                      <button type="submit" className="explore-button" disabled={packingSubmitting}>
                                        {packingSubmitting
                                        ? "Saving..."
                                        : editingPackingId
                                            ? "Update Item"
                                            : `Add to ${activeCategory}`}
                                      </button>
                                      {editingPackingId && (<button type="button" className="btn btn-secondary" onClick={resetPackingForm} disabled={packingSubmitting}>
                                          Cancel
                                        </button>)}
                                      <button type="button" className="btn btn-secondary" onClick={() => void handleAddPackingSuggestions(activeCategory)} disabled={packingSubmitting}>
                                        ✨ Add {activeCategory} Starters
                                      </button>
                                    </div>
                                  </form>

                                  {categoryItems.length === 0 ? (<div className="packing-category-empty">
                                      <p>No items in {activeCategory} yet.</p>
                                      <button type="button" className="btn btn-primary" onClick={() => void handleAddPackingSuggestions(activeCategory)} disabled={packingSubmitting}>
                                        ✨ Add Starter Items for {activeCategory}
                                      </button>
                                    </div>) : (<div className="packing-category-list">
                                      <div className="packing-category">
                                        <h4>{activeCategory} Items ({categoryItems.length})</h4>
                                        {categoryItems.map((item) => (<article className={`packing-item ${item.isPacked ? "packed" : ""}`} key={item._id}>
                                            <label className="packing-item-check">
                                              <input type="checkbox" checked={item.isPacked} onChange={() => void handleTogglePackingItem(item)} disabled={packingSubmitting}/>
                                              <span>
                                                <strong>{item.name}</strong>
                                                <small>
                                                  Quantity: {item.quantity}
                                                  {item.notes ? ` · ${item.notes}` : ""}
                                                </small>
                                              </span>
                                            </label>
                                            <div className="expense-row-actions">
                                              <button type="button" className="text-button" onClick={() => startEditingPackingItem(item)} disabled={packingSubmitting}>
                                                Edit
                                              </button>
                                              <button type="button" className="text-button danger" onClick={() => void handleDeletePackingItem(item)} disabled={packingSubmitting}>
                                                Delete
                                              </button>
                                            </div>
                                          </article>))}
                                      </div>
                                    </div>)}

                                  <div>
                                    <button type="button" className="btn btn-secondary btn-back-hub" onClick={() => {
                                        setPackingActiveCategory(null);
                                        resetPackingForm();
                                    }}>
                                      ← Back to All Categories
                                    </button>
                                  </div>
                                </div>);
                            })())}
                        </>);
                    })()}
                  </section>) : (<div className="card empty-state">
                    <h2>Choose a trip</h2>
                    <p>Select one of your trips to view its saved packing checklist.</p>
                  </div>)}
              </div>)}
          </section>) : authUser && viewMode === "calendar" ? (<section className="destinations calendar-page">
            <div className="page-header">
              <h1>Itinerary Calendar</h1>
              <p>View saved itinerary activities by date.</p>
            </div>

            {loadingTrips && <p role="status">Loading your trips...</p>}
            {errorTrips && <p className="error" role="alert">{errorTrips}</p>}
            {!loadingTrips && trips.length === 0 && (<div className="card empty-state">
                <h2>No trips yet</h2>
                <p>Create a trip and save an itinerary before using the calendar.</p>
                <button type="button" className="btn btn-primary" onClick={handleShowTrips}>
                  Go to My Trips
                </button>
              </div>)}

            {trips.length > 0 && (<div className="calendar-layout">
                <div className="card calendar-trip-selector">
                  <h2>Select a trip</h2>
                  <div className="packing-trip-list">
                    {trips.map((trip) => {
                    const destination = typeof trip.destination === "object" && trip.destination
                        ? trip.destination.name
                        : "Trip";
                    return (<button type="button" key={trip._id} className={`packing-trip-option ${selectedTrip?._id === trip._id ? "selected" : ""}`} onClick={() => void handleSelectCalendarTrip(trip)}>
                          <strong>{destination}</strong>
                          <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                        </button>);
                })}
                  </div>
                </div>

                {selectedTrip && (<div className="calendar-content">
                    {loadingCalendar && <p role="status">Loading saved itinerary...</p>}
                    {calendarError && <p className="error" role="alert">{calendarError}</p>}
                    {!loadingCalendar && !calendarItinerary && !calendarError && (<div className="card empty-state">
                        <h2>No saved itinerary</h2>
                        <p>Save an itinerary for this trip before viewing it on the calendar.</p>
                      </div>)}
                    {calendarItinerary && (<section className="card itinerary-calendar-card" aria-labelledby="calendar-heading">
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
                          <button type="button" className="btn btn-secondary" onClick={() => {
                            const today = new Date();
                            setCalendarMonth(today);
                            setCalendarSelectedDate(getDateKey(today));
                        }}>
                            Today
                          </button>
                        </div>

                        <div className="calendar-weekdays" aria-hidden="true">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (<span key={day}>{day}</span>))}
                        </div>
                        <div className="calendar-grid">
                          {Array.from({
                            length: getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()),
                        }).map((_, index) => (<span className="calendar-cell calendar-cell-empty" key={`empty-${index}`}/>))}
                          {Array.from({
                            length: getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()),
                        }).map((_, index) => {
                            const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
                            const dateKey = getDateKey(date);
                            const activities = getActivitiesForDate(calendarItinerary, selectedTrip, date);
                            return (<button type="button" className={`calendar-cell ${calendarSelectedDate === dateKey ? "selected" : ""} ${activities.length > 0 ? "has-activities" : ""}`} key={dateKey} onClick={() => setCalendarSelectedDate(dateKey)}>
                                <strong>{index + 1}</strong>
                                {activities.length > 0 && (<span className="calendar-activity-count">
                                    {activities.length} {activities.length === 1 ? "activity" : "activities"}
                                  </span>)}
                              </button>);
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
                            return (<div className="calendar-activities">
                                {activities.map((activity, index) => (<article className="calendar-activity" key={`${activity.title}-${activity.startTime}-${index}`}>
                                    <strong>{activity.title}</strong>
                                    <span>
                                      {activity.startTime && activity.endTime
                                        ? `${activity.startTime} – ${activity.endTime}`
                                        : activity.startTime || "Time not specified"}
                                    </span>
                                    {activity.locationName && <small>{activity.locationName}</small>}
                                  </article>))}
                              </div>);
                        })()}
                        </div>
                      </section>)}
                  </div>)}
              </div>)}
          </section>) : authUser && viewMode === "destinations" && !selectedDestination ? (<section className="destinations" aria-label="Explore Destinations">
            {/* Editorial Hero Banner */}
            <div className="dest-hero-card">
              <div className="dest-hero-content">
                <div className="dest-hero-eyebrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                  </svg>
                  <span>Curated Travel Catalog</span>
                </div>
                <h1 className="dest-hero-title">Explore Handcrafted Destinations</h1>
                <p className="dest-hero-subtitle">
                  Discover India's most captivating heritage sites, coastal retreats, and vibrant cultural hubs. Select any destination to inspect mapped attractions and optimize your route.
                </p>
                <div className="dest-hero-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{destinations.length} destinations ready to explore</span>
                </div>
              </div>
              <div className="dest-hero-media">
                <TravelImageFrame image={getDestinationImage("jaipur")} alt="Historic Jaipur architecture" className="dest-hero-img"/>
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="dest-search-bar">
              <div className="dest-search-input-group">
                <svg className="dest-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search destinations by name, state, or country..." value={destinationSearch} onChange={(e) => setDestinationSearch(e.target.value)} className="dest-search-input" aria-label="Search destinations by name, state, or country"/>
                {(destinationSearch || destinationTagFilter !== "all") && (<button type="button" className="dest-search-clear" onClick={() => {
                    setDestinationSearch("");
                    setDestinationTagFilter("all");
                }}>
                    Reset
                  </button>)}
              </div>

              {destinationCategoryTags.length > 0 && (<div className="dest-filter-pills" role="toolbar" aria-label="Filter by destination category">
                  <span className="dest-filter-pill-label">Categories:</span>
                  <button type="button" className={`dest-filter-pill ${destinationTagFilter === "all" ? "active" : ""}`} onClick={() => setDestinationTagFilter("all")} aria-pressed={destinationTagFilter === "all"}>
                    All
                  </button>
                  {destinationCategoryTags.map((tag) => (<button key={tag} type="button" className={`dest-filter-pill ${destinationTagFilter === tag ? "active" : ""}`} onClick={() => setDestinationTagFilter(tag)} aria-pressed={destinationTagFilter === tag}>
                      {tag}
                    </button>))}
                </div>)}
            </div>

            {/* Loading State */}
            {loadingDest && (<div className="dashboard-trips-loading" style={{ minHeight: "220px" }}>
                <div className="dashboard-loading-spinner"/>
                <p>Loading curated destinations...</p>
              </div>)}

            {/* Error State */}
            {errorDest && (<div className="alert alert-error" style={{ marginBottom: "1.5rem" }} role="alert">
                <span>{errorDest}</span>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "1rem" }} onClick={() => {
                    setLoadingDest(true);
                    setErrorDest("");
                    getDestinations()
                        .then((data) => {
                        setDestinations(data);
                    })
                        .catch((err) => {
                        setErrorDest(err instanceof Error ? err.message : "Something went wrong");
                    })
                        .finally(() => setLoadingDest(false));
                }}>
                  Retry
                </button>
              </div>)}

            {/* Destination Grid */}
            {!loadingDest && !errorDest && (<>
                {(() => {
                    const filtered = destinations.filter((dest) => {
                        if (destinationTagFilter !== "all") {
                            if (!dest.tags || !dest.tags.includes(destinationTagFilter)) {
                                return false;
                            }
                        }
                        if (!destinationSearch.trim())
                            return true;
                        const search = destinationSearch.toLowerCase();
                        return (dest.name.toLowerCase().includes(search) ||
                            dest.country.toLowerCase().includes(search) ||
                            (dest.state && dest.state.toLowerCase().includes(search)));
                    });
                    if (filtered.length === 0) {
                        return (<div className="empty-state" style={{ minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: "0.75rem", opacity: 0.6 }}>
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <h3 style={{ fontFamily: "var(--heading, 'Fraunces', Georgia, serif)", color: "var(--navy)", marginBottom: "0.25rem" }}>
                          No destinations found
                        </h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                          {destinationSearch ? `No matches for "${destinationSearch}"` : "No destinations match the selected filter."} Try adjusting your criteria.
                        </p>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                                setDestinationSearch("");
                                setDestinationTagFilter("all");
                            }}>
                          Clear Filters
                        </button>
                      </div>);
                    }
                    return (<div className="dest-catalog-grid">
                      {filtered.map((dest) => {
                            const destImg = getDestinationImage(dest.name, dest.imageUrl);
                            return (<div key={dest._id} className="dest-catalog-card" role="button" tabIndex={0} onClick={() => setSelectedDestination(dest)} onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setSelectedDestination(dest);
                                    }
                                }} aria-label={`View details and plan trip to ${dest.name}`}>
                            <div className="dest-card-media">
                              <TravelImageFrame image={destImg} alt={dest.name}/>
                              <span className="dest-card-location-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                  <circle cx="12" cy="10" r="3"/>
                                </svg>
                                {dest.state ? `${dest.state}, ${dest.country}` : dest.country}
                              </span>
                            </div>

                            <div className="dest-card-body">
                              <h3 className="dest-card-title">{dest.name}</h3>
                              <p className="dest-card-desc">
                                {dest.description || "Discover the iconic monuments, scenic beauty, and local traditions of this destination."}
                              </p>

                              {dest.tags && dest.tags.length > 0 && (<div className="dest-card-tags">
                                  {dest.tags.map((tag, idx) => (<span key={idx} className="dest-tag-chip">
                                      {tag}
                                    </span>))}
                                </div>)}

                              <div className="dest-card-footer">
                                <div className="dest-card-cost">
                                  <span className="dest-card-cost-label">Est. Daily Cost</span>
                                  <span className="dest-card-cost-value">
                                    {typeof dest.averageCostPerDay === "number" && dest.averageCostPerDay > 0
                                    ? formatCurrency(dest.averageCostPerDay)
                                    : "Moderate"}
                                  </span>
                                </div>
                                <button type="button" className="dest-card-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDestination(dest);
                                }} aria-label={`Explore and plan trip to ${dest.name}`}>
                                  <span>Explore &amp; Plan</span>
                                  <span aria-hidden="true">→</span>
                                </button>
                              </div>
                            </div>
                          </div>);
                        })}
                    </div>);
                })()}
              </>)}
          </section>) : null}

        {!authUser && authChecked && (<section className="auth-page">
            <div className="auth-split-card">
              {/* Left Hero Pane */}
              <div className="auth-hero-pane">
                {authBackgroundImage && (<img src={authBackgroundImage.imageUrl} alt="Travel inspiration" className="auth-hero-bg"/>)}
                <div className="auth-hero-overlay"/>
                <div className="auth-hero-content">
                  <div className="auth-brand-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span>TravelMate</span>
                  </div>

                  <div className="auth-hero-text">
                    <h2 className="auth-hero-title">Your next adventure starts here.</h2>
                    <p className="auth-hero-subtitle">
                      Plan memorable journeys, discover destinations and organize every detail with TravelMate.
                    </p>

                    <div className="auth-feature-list">
                      <div className="auth-feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Route optimization for local attractions</span>
                      </div>
                      <div className="auth-feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Real-time budget & expense tracking</span>
                      </div>
                      <div className="auth-feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Personalized day-by-day itineraries</span>
                      </div>
                    </div>
                  </div>

                  <div className="auth-hero-footer">
                    <span>Smart Trip Planner • TravelMate V2</span>
                  </div>
                </div>
              </div>

              {/* Right Form Pane */}
              <div className="auth-form-pane">
                <div className="auth-form-header">
                  <div className="auth-eyebrow">
                    {authView === "login" ? "WELCOME BACK" : "START PLANNING"}
                  </div>
                  <h2 className="auth-title">
                    {authView === "login" ? "Log in to TravelMate" : "Create your account"}
                  </h2>
                  <p className="auth-subtitle">
                    {authView === "login"
                ? "Enter your credentials to access your trips and itineraries."
                : "Sign up in seconds to start organizing your journeys."}
                  </p>
                </div>

                {/* Segmented Tab Switcher */}
                <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
                  <button type="button" role="tab" aria-selected={authView === "login"} className={`auth-tab-btn ${authView === "login" ? "active" : ""}`} onClick={() => {
                setAuthView("login");
                setAuthError("");
                setAuthMessage("");
            }}>
                    Log In
                  </button>
                  <button type="button" role="tab" aria-selected={authView === "register"} className={`auth-tab-btn ${authView === "register" ? "active" : ""}`} onClick={() => {
                setAuthView("register");
                setAuthError("");
                setAuthMessage("");
            }}>
                    Register
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="auth-form-content">
                  {authView === "register" && (<div className="auth-field-group">
                      <label htmlFor="authName" className="auth-field-label">Full Name</label>
                      <div className="auth-input-wrapper">
                        <input id="authName" type="text" className="auth-input" placeholder="e.g. Jane Doe" value={authName} onChange={(e) => setAuthName(e.target.value)} required autoComplete="name"/>
                      </div>
                    </div>)}

                  <div className="auth-field-group">
                    <label htmlFor="authEmail" className="auth-field-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <input id="authEmail" type="email" className="auth-input" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required autoComplete="email"/>
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label htmlFor="authPassword" className="auth-field-label">Password</label>
                    <div className="auth-input-wrapper">
                      <input id="authPassword" type={showPassword ? "text" : "password"} className="auth-input auth-input-with-toggle" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required autoComplete={authView === "login" ? "current-password" : "new-password"}/>
                      <button type="button" className="password-toggle-btn" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>)}
                      </button>
                    </div>
                  </div>

                  {authError && (<div className="auth-alert-error" role="alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>{authError}</span>
                    </div>)}

                  {authMessage && (<div className="auth-alert-success" role="status">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <span>{authMessage}</span>
                    </div>)}

                  <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                    {authLoading ? (<>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true">
                          <line x1="12" y1="2" x2="12" y2="6"/>
                          <line x1="12" y1="18" x2="12" y2="22"/>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                          <line x1="2" y1="12" x2="6" y2="12"/>
                          <line x1="18" y1="12" x2="22" y2="12"/>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                        </svg>
                        <span>Please wait...</span>
                      </>) : authView === "login" ? ("Log In") : ("Create Account")}
                  </button>
                </form>

                <div className="auth-switch-prompt">
                  <span>
                    {authView === "login" ? "Don't have an account?" : "Already have an account?"}
                  </span>{" "}
                  <button type="button" className="auth-switch-link" onClick={() => {
                setAuthView(authView === "login" ? "register" : "login");
                setAuthError("");
                setAuthMessage("");
            }}>
                    {authView === "login" ? "Register here" : "Log in here"}
                  </button>
                </div>
              </div>
            </div>
          </section>)}

        {authUser && viewMode === "tripDetail" && selectedTrip ? (<section className="destination-details trip-details-page">
            {authUser && (<div className="trip-back-nav">
                <button type="button" className="trip-back-button" onClick={handleShowTrips} aria-label="Back to saved trips">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back to Saved Trips</span>
                </button>
              </div>)}

            {(() => {
                const dest = typeof selectedTrip.destination === "object" &&
                    selectedTrip.destination !== null
                    ? selectedTrip.destination
                    : null;
                const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
                const tripBudget = Number(selectedTrip.budget) || 0;
                const remainingBudget = tripBudget - totalExpenses;
                const usagePercentage = tripBudget > 0 ? (totalExpenses / tripBudget) * 100 : 0;
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
                return (<>
                  <header className="trip-detail-hero-header">
                    <TravelImageFrame image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined} alt={dest?.name || "Trip Details"} className="trip-detail-image"/>
                    <div className="trip-detail-title-group">
                      <div className="trip-detail-badge-row">
                        <span className="trip-destination-pill">
                          {dest?.name || "Unknown Destination"}
                          {dest
                        ? dest.state
                            ? ` • ${dest.state}, ${dest.country}`
                            : dest.country
                                ? ` • ${dest.country}`
                                : ""
                        : ""}
                        </span>
                      </div>
                      <h2 className="trip-detail-heading">Trip Details</h2>
                      {dest?.description && (<p className="trip-detail-description">{dest.description}</p>)}
                    </div>
                  </header>

                  <div className="trip-form trip-information-card">
                    <div className="trip-card-header">
                      <div className="trip-card-title-group">
                        <h3 style={{ margin: 0 }}>Trip Information</h3>
                        <span className="trip-id-badge" title={`Trip ID: ${selectedTrip._id}`}>
                          ID: {selectedTrip._id.slice(-6)}
                        </span>
                      </div>
                      <button type="button" className="btn btn-secondary edit-trip-btn" onClick={handleStartEditTrip}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit Trip Details</span>
                      </button>
                    </div>
                    {editTripMessage && (<p className="success" role="status" style={{ margin: "0.5rem 0 1rem" }}>
                        {editTripMessage}
                      </p>)}
                    <div className="trip-metrics-grid">
                      <div className="trip-metric-tile">
                        <span className="trip-metric-label">Dates</span>
                        <strong className="trip-metric-value">
                          {formatDate(selectedTrip.startDate)} – {formatDate(selectedTrip.endDate)}
                        </strong>
                      </div>
                      <div className="trip-metric-tile">
                        <span className="trip-metric-label">Duration</span>
                        <strong className="trip-metric-value">
                          {formatTripDuration(selectedTrip.startDate, selectedTrip.endDate) || "Single Day"}
                        </strong>
                      </div>
                      <div className="trip-metric-tile">
                        <span className="trip-metric-label">Number of Travelers</span>
                        <strong className="trip-metric-value">
                          {selectedTrip.travelers} {selectedTrip.travelers === 1 ? "Traveler" : "Travelers"}
                        </strong>
                      </div>
                      <div className="trip-metric-tile">
                        <span className="trip-metric-label">Total Budget</span>
                        <strong className="trip-metric-value trip-budget-highlight">
                          {formatCurrency(selectedTrip.budget)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {editingTrip && (<div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-trip-modal-title">
                      <div className="modal-content">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <h3 id="edit-trip-modal-title" style={{ margin: 0, fontSize: "1.4rem" }}>Edit Trip Details</h3>
                          <button type="button" onClick={handleCancelEditTrip} disabled={editTripSubmitting} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }} aria-label="Close modal">
                            &times;
                          </button>
                        </div>

                        {editTripError && (<div className="alert alert-error" style={{ marginBottom: "1rem" }} role="alert">
                            {editTripError}
                          </div>)}

                        <form className="trip-form" onSubmit={handleUpdateTripSubmit} style={{ marginTop: 0, maxWidth: "100%", padding: 0, border: "none", background: "transparent" }}>
                          <label htmlFor="edit-start-date">
                            Start Date
                            <input id="edit-start-date" type="date" value={editTripForm.startDate} onChange={(e) => setEditTripForm({ ...editTripForm, startDate: e.target.value })} required disabled={editTripSubmitting}/>
                          </label>

                          <label htmlFor="edit-end-date">
                            End Date
                            <input id="edit-end-date" type="date" value={editTripForm.endDate} onChange={(e) => setEditTripForm({ ...editTripForm, endDate: e.target.value })} required disabled={editTripSubmitting}/>
                          </label>

                          <label htmlFor="edit-travelers">
                            Number of Travelers (1 - 50)
                            <input id="edit-travelers" type="number" min="1" max="50" step="1" value={editTripForm.travelers} onChange={(e) => setEditTripForm({ ...editTripForm, travelers: e.target.value })} required disabled={editTripSubmitting}/>
                          </label>

                          <label htmlFor="edit-budget">
                            Total Budget (₹)
                            <input id="edit-budget" type="number" min="1" step="any" value={editTripForm.budget} onChange={(e) => setEditTripForm({ ...editTripForm, budget: e.target.value })} required disabled={editTripSubmitting}/>
                          </label>

                          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                            <button type="button" className="btn btn-secondary" onClick={handleCancelEditTrip} disabled={editTripSubmitting}>
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={editTripSubmitting}>
                              {editTripSubmitting ? "Saving changes..." : "Save Changes"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>)}

                  {showPrintModal && selectedTrip && (<div className="modal-overlay print-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="print-modal-title" onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowPrintModal(false);
                            }
                        }}>
                      <div className="modal-content print-modal-content">
                        <div className="print-modal-actions no-print">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 600, color: "var(--green)" }}>Printable Itinerary Summary</span>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>
                              Close
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                              </svg>
                              Print / Save as PDF
                            </button>
                          </div>
                        </div>

                        <article className="printable-itinerary" id="printable-itinerary-document">
                          <header className="printable-header">
                            <div className="printable-brand-row">
                              <div>
                                <h1 id="print-modal-title" className="printable-title">
                                  {dest?.name || "Trip"} Itinerary
                                </h1>
                                <p className="printable-subtitle">
                                  {dest?.state ? `${dest.state}, ` : ""}{dest?.country || ""}
                                </p>
                              </div>
                              <div className="printable-badge">
                                <span>TravelMate V2</span>
                              </div>
                            </div>
                            {dest?.description && (<p className="printable-dest-description">{dest.description}</p>)}

                            <div className="printable-meta-grid">
                              <div className="printable-meta-item">
                                <span className="printable-meta-label">Dates</span>
                                <span className="printable-meta-val">
                                  {formatDate(selectedTrip.startDate)} – {formatDate(selectedTrip.endDate)}
                                </span>
                              </div>
                              <div className="printable-meta-item">
                                <span className="printable-meta-label">Duration</span>
                                <span className="printable-meta-val">
                                  {formatTripDuration(selectedTrip.startDate, selectedTrip.endDate) || `${draft?.durationDays || 1} Days`}
                                </span>
                              </div>
                              <div className="printable-meta-item">
                                <span className="printable-meta-label">Travelers</span>
                                <span className="printable-meta-val">
                                  {selectedTrip.travelers} traveler{selectedTrip.travelers === 1 ? "" : "s"}
                                </span>
                              </div>
                              <div className="printable-meta-item">
                                <span className="printable-meta-label">Total Trip Budget</span>
                                <span className="printable-meta-val">
                                  {formatCurrency(selectedTrip.budget)}
                                </span>
                              </div>
                              {draft && typeof draft.estimatedTotalCost === "number" && (<div className="printable-meta-item">
                                  <span className="printable-meta-label">Est. Activities Total</span>
                                  <span className="printable-meta-val">
                                    {formatCurrency(draft.estimatedTotalCost)}
                                  </span>
                                </div>)}
                            </div>
                          </header>

                          <section className="printable-body" aria-label="Day-wise schedule">
                            {!draft || draft.days.length === 0 ? (<div className="printable-empty-state">
                                <p>No activities have been added or generated for this trip yet.</p>
                                <p style={{ fontSize: "0.85rem", color: "#666" }}>
                                  Generate an itinerary draft or add activities in TravelMate to export your detailed schedule.
                                </p>
                              </div>) : (draft.dayPlans.map((day) => {
                            const dayDateStr = getDayCalendarDate(selectedTrip.startDate, day.dayIndex);
                            const dayTotalCost = day.activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
                            return (<div key={day.dayIndex} className="printable-day-card">
                                    <div className="printable-day-header">
                                      <h3>
                                        Day {day.dayIndex}
                                        {dayDateStr && <span className="printable-day-date"> • {dayDateStr}</span>}
                                      </h3>
                                      {dayTotalCost > 0 && (<span className="printable-day-cost">
                                          Day Total: {formatCurrency(dayTotalCost)}
                                        </span>)}
                                    </div>

                                    {day.activities.length === 0 ? (<p className="printable-no-activities">No activities scheduled for this day.</p>) : (<ol className="printable-activity-list">
                                        {day.activities.map((act, actIdx) => (<li key={`${day.dayIndex}-${actIdx}`} className="printable-activity-item">
                                            <div className="printable-act-top">
                                              <span className="printable-act-title">{act.title}</span>
                                              {act.estimatedCost > 0 && (<span className="printable-act-cost">
                                                  {formatCurrency(act.estimatedCost)}
                                                </span>)}
                                            </div>

                                            <div className="printable-act-meta">
                                              {act.startTime && act.endTime ? (<span className="printable-act-time">{act.startTime} – {act.endTime}</span>) : act.startTime ? (<span className="printable-act-time">{act.startTime}</span>) : null}
                                              {act.category && (<span className="printable-act-cat">Category: {act.category}</span>)}
                                              {act.locationName && (<span className="printable-act-loc">Location: {act.locationName}</span>)}
                                            </div>

                                            {act.description && (<p className="printable-act-desc">{act.description}</p>)}
                                            {act.notes && (<p className="printable-act-notes">
                                                <strong>Note:</strong> {act.notes}
                                              </p>)}
                                          </li>))}
                                      </ol>)}
                                  </div>);
                        }))}
                          </section>

                          <footer className="printable-footer">
                            <p>Generated by TravelMate • Personalized Trip Planning & Route Optimization</p>
                          </footer>
                        </article>
                      </div>
                    </div>)}

                  <section className="trip-form budget-card" aria-labelledby="budget-heading">
                    <div className="itinerary-heading-row">
                      <h3 id="budget-heading">Trip budget</h3>
                      <span className={`budget-status ${tripBudget > 0 && totalExpenses > tripBudget
                        ? "over"
                        : totalExpenses === tripBudget && tripBudget > 0
                            ? "used"
                            : "within"}`}>
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
                      <span style={{ width: `${Math.min(100, Math.max(0, usagePercentage))}%` }}/>
                    </div>
                    <div className="budget-usage-row">
                      <p className="budget-usage">
                        {tripBudget > 0
                        ? `${usagePercentage.toFixed(1)}% of budget used`
                        : "No budget was set for this trip."}
                      </p>
                      {remainingBudget < 0 && (<p className="warning" role="alert" style={{ margin: 0 }}>
                          You are {formatCurrency(Math.abs(remainingBudget))} over budget.
                        </p>)}
                    </div>

                    <div className="expense-layout">
                      <form className="expense-form expense-form-card" onSubmit={handleExpenseSubmit}>
                        <h4>{editingExpenseId ? "Edit expense" : "Add expense"}</h4>
                        <label>
                          Expense name
                          <input value={expenseForm.title} onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })} required maxLength={120}/>
                        </label>
                        <label>
                          Amount (₹)
                          <input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} required/>
                        </label>
                        <label>
                          Category
                          <select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}>
                            {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                          </select>
                        </label>
                        <label>
                          Date
                          <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} required/>
                        </label>
                        <label>
                          Notes <span className="field-hint">(optional)</span>
                          <textarea value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} rows={3} maxLength={500}/>
                        </label>
                        <div className="expense-form-actions">
                          <button className="explore-button" type="submit" disabled={expenseSubmitting}>
                            {expenseSubmitting ? "Saving..." : editingExpenseId ? "Update expense" : "Add expense"}
                          </button>
                          {editingExpenseId && (<button className="btn btn-secondary" type="button" onClick={resetExpenseForm} disabled={expenseSubmitting}>
                              Cancel
                            </button>)}
                        </div>
                      </form>

                      <div className="expense-list expense-list-container">
                        <div className="expense-list-header">
                          <h4>Expenses</h4>
                          <span className="expense-list-count">
                            {expenses.length} item{expenses.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {loadingExpenses && <p role="status">Loading expenses...</p>}
                        {expenseError && <p className="error" role="alert">{expenseError}</p>}
                        {expenseMessage && <p className="success" role="status">{expenseMessage}</p>}
                        {!loadingExpenses && expenses.length === 0 && <p className="muted">No expenses recorded yet.</p>}
                        {!loadingExpenses && (<div className="expense-items-scrollable">
                            {expenses.map((expense) => (<article className="expense-row" key={expense._id}>
                                <div className="expense-row-info">
                                  <strong>{expense.title}</strong>
                                  <div className="expense-row-meta">
                                    <span className="expense-category-tag">{expense.category}</span>
                                    <span>·</span>
                                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                                  </div>
                                  {expense.notes && <span className="expense-row-notes">{expense.notes}</span>}
                                </div>
                                <div className="expense-row-actions">
                                  <strong className="expense-amount-badge">{formatCurrency(expense.amount)}</strong>
                                  <button type="button" className="text-button" onClick={() => startEditingExpense(expense)} disabled={expenseSubmitting}>Edit</button>
                                  <button type="button" className="text-button danger" onClick={() => void handleDeleteExpense(expense)} disabled={expenseSubmitting}>Delete</button>
                                </div>
                              </article>))}
                          </div>)}
                      </div>
                    </div>

                    <div className="expense-breakdown">
                      <h4>Spending breakdown</h4>
                      <div className="breakdown-grid">
                        {categoryTotals.map(({ category, total, share }) => (<div className="breakdown-card" key={category}>
                            <span>{category}</span>
                            <strong>{formatCurrency(total)}</strong>
                            <small>{totalExpenses > 0 ? `${share.toFixed(1)}% of spending` : "No spending"}</small>
                            <div className="breakdown-progress-mini">
                              <span style={{ width: `${Math.min(100, Math.max(0, share))}%` }}/>
                            </div>
                          </div>))}
                      </div>
                    </div>
                  </section>

                  <section className="trip-form packing-card" aria-labelledby="packing-heading">
                    {(() => {
                        const packedCount = packingItems.filter((item) => item.isPacked).length;
                        const completion = packingItems.length > 0
                            ? (packedCount / packingItems.length) * 100
                            : 0;
                        return (<>
                          <div className="packing-card-header">
                            <div className="packing-card-title-group">
                              <h3 id="packing-heading">Packing Checklist Hub</h3>
                              <span className="packing-status-pill">
                                {packedCount} of {packingItems.length} packed · {completion.toFixed(0)}%
                              </span>
                            </div>
                            <button type="button" className="btn btn-secondary packing-suggest-btn" onClick={() => void handleAddPackingSuggestions()} disabled={packingSubmitting || loadingPacking}>
                              ✨ Add All Starter Suggestions
                            </button>
                          </div>

                          <div className="packing-progress" aria-label={`Packing checklist ${completion.toFixed(0)} percent complete`}>
                            <span style={{ width: `${completion}%` }}/>
                          </div>

                          {loadingPacking && <p role="status">Loading packing checklist...</p>}
                          {packingError && <p className="error" role="alert">{packingError}</p>}
                          {packingMessage && <p className="success" role="status">{packingMessage}</p>}

                          {packingActiveCategory === null ? (<div className="packing-hub-view">
                              <div className="packing-hub-intro">
                                <div className="packing-hub-intro-text">
                                  <h3>Category Checklist Hub</h3>
                                  <p>Select any category to open its dedicated checklist or add starter suggestions.</p>
                                </div>
                                <span className="badge">
                                  {PACKING_CATEGORIES.length} Categories
                                </span>
                              </div>

                              <div className="packing-category-hub-grid">
                                {PACKING_CATEGORIES.map((category) => {
                                    const categoryItems = packingItems.filter((item) => item.category === category);
                                    const catPacked = categoryItems.filter((item) => item.isPacked).length;
                                    const catPercent = categoryItems.length > 0
                                        ? (catPacked / categoryItems.length) * 100
                                        : 0;
                                    const meta = PACKING_CATEGORY_META[category];
                                    return (<div key={category} className="packing-category-hub-card" onClick={() => {
                                            setPackingActiveCategory(category);
                                            setPackingForm((prev) => ({ ...prev, category }));
                                        }}>
                                      <div>
                                        <div className="hub-card-header">
                                          <span className="hub-card-icon">{meta.icon}</span>
                                          <div className="hub-card-meta">
                                            <h3 className="hub-card-title">{category}</h3>
                                            <span className="hub-card-count">
                                              {categoryItems.length === 0
                                            ? "0 items · Empty"
                                            : `${catPacked}/${categoryItems.length} packed (${catPercent.toFixed(0)}%)`}
                                            </span>
                                          </div>
                                          <span className="hub-card-arrow" aria-hidden="true">→</span>
                                        </div>
                                        <p className="hub-card-desc">{meta.description}</p>
                                        <div className="packing-mini-progress">
                                          <span style={{ width: `${catPercent}%` }}/>
                                        </div>
                                      </div>

                                      <div className="hub-card-actions" onClick={(e) => e.stopPropagation()}>
                                        <button type="button" className="btn btn-sm btn-outline" onClick={() => {
                                            setPackingActiveCategory(category);
                                            setPackingForm((prev) => ({ ...prev, category }));
                                        }}>
                                          Open {category} ({categoryItems.length}) →
                                        </button>
                                        {categoryItems.length === 0 && (<button type="button" className="btn btn-sm btn-secondary" onClick={() => void handleAddPackingSuggestions(category)} disabled={packingSubmitting}>
                                            ✨ Add Starters
                                          </button>)}
                                      </div>
                                    </div>);
                                })}
                              </div>
                            </div>) : ((() => {
                                const activeCategory = packingActiveCategory;
                                const categoryItems = packingItems.filter((item) => item.category === activeCategory);
                                const catPacked = categoryItems.filter((item) => item.isPacked).length;
                                const catPercent = categoryItems.length > 0
                                    ? (catPacked / categoryItems.length) * 100
                                    : 0;
                                const meta = PACKING_CATEGORY_META[activeCategory];
                                return (<div className="packing-dedicated-view">
                                  <div className="packing-dedicated-header">
                                    <button type="button" className="btn btn-secondary btn-back-hub" onClick={() => {
                                        setPackingActiveCategory(null);
                                        resetPackingForm();
                                    }}>
                                      ← Back to All Categories
                                    </button>
                                    <div className="packing-dedicated-title-row">
                                      <h2>
                                        <span>{meta.icon}</span> {activeCategory} Checklist
                                      </h2>
                                      <span className="badge">
                                        {catPacked} of {categoryItems.length} packed ({catPercent.toFixed(0)}%)
                                      </span>
                                    </div>
                                    <div className="packing-progress" style={{ margin: "0.5rem 0 0" }}>
                                      <span style={{ width: `${catPercent}%` }}/>
                                    </div>
                                  </div>

                                  <div className="packing-form-card">
                                    <form onSubmit={handlePackingSubmit}>
                                      <h4>
                                        {editingPackingId
                                        ? `Edit ${activeCategory} Item`
                                        : `+ Add Item to ${activeCategory}`}
                                      </h4>
                                      <div className="packing-form-grid">
                                        <label className="packing-field-name">
                                          Item name
                                          <input value={packingForm.name} onChange={(event) => setPackingForm({ ...packingForm, name: event.target.value })} maxLength={120} placeholder={`e.g. ${activeCategory === "Clothing" ? "Light Jacket" : activeCategory === "Electronics" ? "Power Bank" : "Item name"}`} required/>
                                        </label>
                                        <label className="packing-field-qty">
                                          Quantity
                                          <input type="number" min="1" max="100" step="1" value={packingForm.quantity} onChange={(event) => setPackingForm({ ...packingForm, quantity: event.target.value })} required/>
                                        </label>
                                        <label className="packing-field-notes">
                                          Notes <span className="field-hint">(optional)</span>
                                          <textarea value={packingForm.notes} onChange={(event) => setPackingForm({ ...packingForm, notes: event.target.value })} maxLength={500} rows={2} placeholder="e.g. keep in hand luggage"/>
                                        </label>
                                        <div className="packing-form-actions">
                                          <button type="submit" className="explore-button" disabled={packingSubmitting}>
                                            {packingSubmitting
                                        ? "Saving..."
                                        : editingPackingId
                                            ? "Update item"
                                            : `Add to ${activeCategory}`}
                                          </button>
                                          {editingPackingId && (<button type="button" className="btn btn-secondary" onClick={resetPackingForm} disabled={packingSubmitting}>
                                              Cancel
                                            </button>)}
                                          <button type="button" className="btn btn-secondary" onClick={() => void handleAddPackingSuggestions(activeCategory)} disabled={packingSubmitting}>
                                            ✨ Add {activeCategory} Starters
                                          </button>
                                        </div>
                                      </div>
                                    </form>
                                  </div>

                                  {categoryItems.length === 0 ? (<div className="packing-category-empty">
                                      <p>No items in {activeCategory} yet.</p>
                                      <button type="button" className="btn btn-primary" onClick={() => void handleAddPackingSuggestions(activeCategory)} disabled={packingSubmitting}>
                                        ✨ Add Starter Items for {activeCategory}
                                      </button>
                                    </div>) : (<div className="packing-items-group">
                                      {categoryItems.map((item) => (<article className={`packing-item ${item.isPacked ? "packed" : ""}`} key={item._id}>
                                          <label className="packing-item-check">
                                            <input type="checkbox" checked={item.isPacked} onChange={() => void handleTogglePackingItem(item)} disabled={packingSubmitting} aria-label={`Mark ${item.name} as ${item.isPacked ? "unpacked" : "packed"}`}/>
                                            <div className="packing-item-content">
                                              <div className="packing-item-title-row">
                                                <strong className="packing-item-name">{item.name}</strong>
                                                <span className="packing-item-qty-tag">Qty: {item.quantity}</span>
                                              </div>
                                              {item.notes && (<p className="packing-item-notes">{item.notes}</p>)}
                                            </div>
                                          </label>
                                          <div className="packing-item-actions">
                                            <button type="button" className="text-button" onClick={() => startEditingPackingItem(item)} disabled={packingSubmitting}>
                                              Edit
                                            </button>
                                            <button type="button" className="text-button danger" onClick={() => void handleDeletePackingItem(item)} disabled={packingSubmitting}>
                                              Delete
                                            </button>
                                          </div>
                                        </article>))}
                                    </div>)}

                                  <div>
                                    <button type="button" className="btn btn-secondary btn-back-hub" onClick={() => {
                                        setPackingActiveCategory(null);
                                        resetPackingForm();
                                    }}>
                                      ← Back to All Categories
                                    </button>
                                  </div>
                                </div>);
                            })())}
                        </>);
                    })()}
                  </section>

                  <section className="trip-form itinerary-card" aria-labelledby="itinerary-heading" aria-busy={loadingItinerary || generatingDraft || savingItinerary}>
                    <div className="itinerary-card-header">
                      <div className="itinerary-card-title-group">
                        <h3 id="itinerary-heading">
                          {draftSaved
                        ? "Saved Itinerary"
                        : draft
                            ? "Itinerary Draft"
                            : "Itinerary"}
                        </h3>
                        {draft && (<span className={`itinerary-status-pill ${draftSaved ? "saved" : "draft"}`}>
                            {draftSaved ? "✓ Saved" : "Draft — not saved"}
                          </span>)}
                      </div>

                      {draft && (<div className="itinerary-card-header-actions">
                          <button type="button" className="btn btn-secondary itinerary-optimize-all-btn" onClick={handleOptimizeAllDaysRoute} disabled={loadingItinerary ||
                            savingItinerary ||
                            generatingDraft ||
                            optimizingDayIndex !== null ||
                            draft.days.length === 0} title="Optimize attraction visiting sequence across all days using shortest travel distance">
                            {optimizingDayIndex === "all" ? (<>
                                <span className="itinerary-btn-spinner" aria-hidden="true"/>
                                <span>Optimizing All Days...</span>
                              </>) : (<>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                </svg>
                                <span>Optimize All Days</span>
                              </>)}
                          </button>

                          {!editingItinerary && (<button type="button" className="btn btn-secondary print-summary-btn" onClick={() => setShowPrintModal(true)} title="Open printable itinerary summary">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                              </svg>
                              Print / Export Summary
                            </button>)}
                        </div>)}
                    </div>

                    <p className="itinerary-intro">
                      Review your schedule or customize travel preferences to generate a sample itinerary.
                      Generating a draft does not replace your saved itinerary until you save it.
                    </p>

                    {loadingItinerary && (<p role="status" className="itinerary-loading-notice">
                        Loading saved itinerary...
                      </p>)}

                    <div className="itinerary-preferences-card">
                      <div className="itinerary-preferences-header">
                        <h4>Travel Preferences</h4>
                        <span className="itinerary-pref-hint">Used for the next generated draft</span>
                      </div>

                      <div className="itinerary-pref-group">
                        <span className="itinerary-pref-label">Interests (select any)</span>
                        <div className="itinerary-interest-chips">
                          {[
                        "nature",
                        "adventure",
                        "culture",
                        "food",
                        "sightseeing",
                        "relaxation",
                        "shopping",
                    ].map((interest) => {
                        const active = itineraryInterests.includes(interest);
                        return (<label key={interest} className={`itinerary-interest-chip ${active ? "active" : ""}`}>
                                <input type="checkbox" checked={active} onChange={(event) => {
                                setItineraryInterests((current) => event.target.checked
                                    ? [...current, interest]
                                    : current.filter((item) => item !== interest));
                            }} className="sr-only"/>
                                <span className="chip-indicator" aria-hidden="true">
                                  {active ? "✓" : "+"}
                                </span>
                                <span className="chip-text">{interest}</span>
                              </label>);
                    })}
                        </div>
                      </div>

                      <div className="itinerary-preference-fields">
                        <label className="itinerary-field">
                          <span className="itinerary-field-label">Travel Pace</span>
                          <select value={itineraryPace} onChange={(event) => setItineraryPace(event.target.value)} className="itinerary-select">
                            <option value="relaxed">Relaxed (1–2 stops / day)</option>
                            <option value="balanced">Balanced (2–3 stops / day)</option>
                            <option value="packed">Packed (4+ stops / day)</option>
                          </select>
                        </label>
                        <label className="itinerary-field">
                          <span className="itinerary-field-label">Daily Activity Budget (₹)</span>
                          <div className="itinerary-input-prefix-wrapper">
                            <span className="currency-prefix" aria-hidden="true">₹</span>
                            <input type="number" min="0" step="1" placeholder="Defaults to trip budget per day" value={itineraryDailyBudget} onChange={(event) => setItineraryDailyBudget(event.target.value)} className="itinerary-input with-prefix"/>
                          </div>
                        </label>
                      </div>

                      <div className="itinerary-generate-row">
                        <button type="button" className="explore-button itinerary-generate-btn" onClick={handleGenerateDraft} disabled={loadingItinerary ||
                        generatingDraft ||
                        savingItinerary ||
                        editingItinerary}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          {generatingDraft
                        ? "Generating itinerary draft..."
                        : draft
                            ? "Regenerate Itinerary Draft"
                            : "Generate Itinerary Draft"}
                        </button>
                      </div>
                    </div>

                    {itineraryError && (<p className="error" role="alert">
                        {itineraryError}
                      </p>)}

                    {itineraryMessage && (<p className="success" role="status">
                        {itineraryMessage}
                      </p>)}

                    {draft && (<>
                        <div className="itinerary-summary-banner">
                          <div className="itinerary-summary-tile">
                            <span className="itinerary-summary-label">Duration</span>
                            <span className="itinerary-summary-value">
                              {draft.durationDays} {draft.durationDays === 1 ? "Day" : "Days"}
                            </span>
                          </div>
                          <div className="itinerary-summary-tile highlight-tile">
                            <span className="itinerary-summary-label">Estimated Total</span>
                            <span className="itinerary-summary-value highlight-value">
                              {formatCurrency(draft.estimatedTotalCost)}
                            </span>
                          </div>
                          <div className="itinerary-summary-tile">
                            <span className="itinerary-summary-label">Daily Budget Target</span>
                            <span className="itinerary-summary-value">
                              {formatCurrency(draft.dailyBudget)}
                            </span>
                          </div>
                          <div className="itinerary-summary-tile">
                            <span className="itinerary-summary-label">Total Activities</span>
                            <span className="itinerary-summary-value">
                              {draft.dayPlans.reduce((sum, d) => sum + d.activities.length, 0)} stops
                            </span>
                          </div>
                        </div>

                        {draft.budgetWarning && (<div className="warning itinerary-budget-warning" role="alert">
                            <span className="warning-icon" aria-hidden="true">⚠️</span>
                            <span>Budget advisory: {draft.budgetWarning}</span>
                          </div>)}

                        <div className="itinerary-days-container">
                          {draft.dayPlans.map((day) => {
                            const dayDateStr = selectedTrip ? getDayCalendarDate(selectedTrip.startDate, day.dayIndex) : null;
                            const dayTotalCost = day.activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
                            return (<section className="itinerary-day-card" key={day.dayIndex} aria-labelledby={`itinerary-day-${day.dayIndex}`}>
                                <div className="itinerary-day-header">
                                  <div className="itinerary-day-title-group">
                                    <h4 id={`itinerary-day-${day.dayIndex}`} className="itinerary-day-title">
                                      Day {day.dayIndex}
                                    </h4>
                                    {dayDateStr && (<span className="itinerary-day-date-tag">
                                        {dayDateStr}
                                      </span>)}
                                  </div>
                                  <div className="itinerary-day-meta-tags">
                                    {dayOptimizationStats[day.dayIndex] && (dayOptimizationStats[day.dayIndex].optimized ? (<span className="itinerary-day-distance-badge" title={`Straight-line route distance: ~${dayOptimizationStats[day.dayIndex].totalDistanceKm} km across ${dayOptimizationStats[day.dayIndex].legsCount} legs`}>
                                          🧭 ~{dayOptimizationStats[day.dayIndex].totalDistanceKm} km
                                        </span>) : (<span className="itinerary-day-checked-badge" title={`Route checked: ${dayOptimizationStats[day.dayIndex].message}`}>
                                          ✓ Route checked ({dayOptimizationStats[day.dayIndex].message})
                                        </span>))}
                                    <span className="itinerary-day-count-badge">
                                      {day.activities.length} {day.activities.length === 1 ? "stop" : "stops"}
                                    </span>
                                    {dayTotalCost > 0 && (<span className="itinerary-day-cost-subtotal">
                                        Est: {formatCurrency(dayTotalCost)}
                                      </span>)}
                                    <button type="button" className="btn btn-secondary itinerary-optimize-day-btn" onClick={() => handleOptimizeDayRoute(day.dayIndex)} disabled={loadingItinerary ||
                                    savingItinerary ||
                                    generatingDraft ||
                                    optimizingDayIndex !== null} title={day.activities.length < 2
                                    ? `Check Day ${day.dayIndex} visiting route`
                                    : `Optimize visit sequence for Day ${day.dayIndex} using shortest travel distance`} aria-label={`Optimize Day ${day.dayIndex} route`}>
                                      {optimizingDayIndex === day.dayIndex ? (<>
                                          <span className="itinerary-btn-spinner" aria-hidden="true"/>
                                          <span>Optimizing...</span>
                                        </>) : (<>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                          </svg>
                                          <span>Optimize Day Route</span>
                                        </>)}
                                    </button>
                                  </div>
                                </div>

                                {day.activities.length === 0 ? (<p className="itinerary-day-empty-msg">
                                    {editingItinerary
                                        ? "No activities for this day yet. Click below to add one."
                                        : "No activities scheduled for this day."}
                                  </p>) : (<div className="itinerary-timeline">
                                    {day.activities.map((activity, index) => {
                                        const activityDuration = formatActivityDuration(activity.startTime, activity.endTime);
                                        const activityKey = `${day.dayIndex}-${index}`;
                                        const isLast = index === day.activities.length - 1;
                                        if (editingItinerary) {
                                            return (<div className="itinerary-timeline-item editing-item" key={activityKey}>
                                            <div className="itinerary-timeline-indicator">
                                              <span className="timeline-node editing-node" aria-hidden="true"/>
                                              {!isLast && <span className="timeline-connector" aria-hidden="true"/>}
                                            </div>

                                            <div className="itinerary-activity-editing-card">
                                              <div className="itinerary-edit-field">
                                                <label htmlFor={`activity-title-${activityKey}`}>
                                                  Activity Title
                                                </label>
                                                <input id={`activity-title-${activityKey}`} type="text" value={activity.title} onChange={(event) => handleActivityChange(day.dayIndex, index, { title: event.target.value })} className="itinerary-input" required/>
                                              </div>

                                              <div className="itinerary-edit-field">
                                                <label htmlFor={`activity-description-${activityKey}`}>
                                                  Description
                                                </label>
                                                <textarea id={`activity-description-${activityKey}`} rows={2} value={activity.description} onChange={(event) => handleActivityChange(day.dayIndex, index, { description: event.target.value })} className="itinerary-textarea"/>
                                              </div>

                                              <div className="itinerary-edit-grid">
                                                <div className="itinerary-edit-field">
                                                  <label htmlFor={`activity-start-${activityKey}`}>
                                                    Start Time
                                                  </label>
                                                  <input id={`activity-start-${activityKey}`} type="time" value={activity.startTime} onChange={(event) => handleActivityChange(day.dayIndex, index, { startTime: event.target.value })} className="itinerary-input"/>
                                                </div>

                                                <div className="itinerary-edit-field">
                                                  <label htmlFor={`activity-end-${activityKey}`}>
                                                    End Time
                                                  </label>
                                                  <input id={`activity-end-${activityKey}`} type="time" value={activity.endTime} onChange={(event) => handleActivityChange(day.dayIndex, index, { endTime: event.target.value })} className="itinerary-input"/>
                                                </div>

                                                <div className="itinerary-edit-field">
                                                  <label htmlFor={`activity-cost-${activityKey}`}>
                                                    Estimated Cost (₹)
                                                  </label>
                                                  <input id={`activity-cost-${activityKey}`} type="number" min="0" step="any" value={Number.isFinite(activity.estimatedCost)
                                                    ? activity.estimatedCost
                                                    : 0} onChange={(event) => handleActivityChange(day.dayIndex, index, {
                                                    estimatedCost: Number(event.target.value),
                                                })} className="itinerary-input"/>
                                                </div>
                                              </div>

                                              {activityDuration && (<p className="itinerary-activity-duration">
                                                  ⏱ Estimated duration: <strong>{activityDuration}</strong>
                                                </p>)}

                                              <div className="itinerary-activity-edit-actions">
                                                <div className="itinerary-move-actions">
                                                  <button type="button" className="itinerary-move-button" onClick={() => handleMoveActivity(day.dayIndex, index, -1)} disabled={savingItinerary || index === 0} title="Move activity up">
                                                    ↑ Move Up
                                                  </button>
                                                  <button type="button" className="itinerary-move-button" onClick={() => handleMoveActivity(day.dayIndex, index, 1)} disabled={savingItinerary ||
                                                    index === day.activities.length - 1} title="Move activity down">
                                                    ↓ Move Down
                                                  </button>
                                                  {draft.dayPlans.length > 1 && (<select className="itinerary-move-select" aria-label={`Move activity ${index + 1} on Day ${day.dayIndex} to another day`} defaultValue="" disabled={savingItinerary} onChange={(event) => {
                                                        const value = event.target.value;
                                                        if (value === "")
                                                            return;
                                                        const targetDay = Number(value);
                                                        if (Number.isInteger(targetDay)) {
                                                            handleMoveActivityToDay(day.dayIndex, index, targetDay);
                                                        }
                                                        event.target.value = "";
                                                    }}>
                                                      <option value="" disabled>
                                                        Move to day...
                                                      </option>
                                                      {draft.dayPlans
                                                        .filter((targetDay) => targetDay.dayIndex !==
                                                        day.dayIndex)
                                                        .map((targetDay) => (<option key={targetDay.dayIndex} value={targetDay.dayIndex}>
                                                            Day {targetDay.dayIndex}
                                                          </option>))}
                                                    </select>)}
                                                </div>
                                                <button type="button" className="itinerary-remove-button" onClick={() => handleRemoveActivity(day.dayIndex, index)} disabled={savingItinerary ||
                                                    draft.days.length <= 1} title={draft.days.length <= 1
                                                    ? "An itinerary must contain at least one activity."
                                                    : undefined}>
                                                  Delete Activity
                                                </button>
                                              </div>
                                            </div>
                                          </div>);
                                        }
                                        const prevActivity = index > 0 ? day.activities[index - 1] : null;
                                        const hasLegCoords = prevActivity &&
                                            typeof prevActivity.latitude === "number" &&
                                            typeof prevActivity.longitude === "number" &&
                                            typeof activity.latitude === "number" &&
                                            typeof activity.longitude === "number";
                                        const legDistKm = hasLegCoords
                                            ? calculateDistanceKm(prevActivity.latitude, prevActivity.longitude, activity.latitude, activity.longitude)
                                            : 0;
                                        return (<div key={`${activityKey}-${activity.startTime}-${activity.title}`}>
                                          {legDistKm > 0 && (<div className="itinerary-transit-pill">
                                              🚗 ~{legDistKm} km ({Math.max(5, Math.round(legDistKm * 3.5))} mins travel)
                                            </div>)}
                                          <div className="itinerary-timeline-item">
                                            <div className="itinerary-timeline-indicator">
                                              <span className="timeline-node" aria-hidden="true"/>
                                              {!isLast && <span className="timeline-connector" aria-hidden="true"/>}
                                            </div>

                                            <article className="itinerary-activity-card">
                                              <div className="itinerary-act-header-row">
                                                <div className="itinerary-act-title-group">
                                                  {activity.startTime && (<span className="itinerary-act-time-pill">
                                                      {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ""}
                                                    </span>)}
                                                  <h5 className="itinerary-act-title">
                                                    {(activity.title || "").replace(/^Sample:\s*/i, "").trim()}
                                                  </h5>
                                                </div>
                                              <span className="itinerary-act-cost-badge">
                                                {activity.estimatedCost > 0
                                                ? formatCurrency(activity.estimatedCost)
                                                : "Free"}
                                              </span>
                                            </div>

                                            <div className="itinerary-act-secondary-row">
                                              {activityDuration && (<span className="itinerary-act-duration">
                                                  ⏱ {activityDuration}
                                                </span>)}
                                              {activity.category && (<span className="itinerary-category-pill">
                                                  {activity.category}
                                                </span>)}
                                              {activity.locationName && (<span className="itinerary-act-location">
                                                  📍 {activity.locationName}
                                                </span>)}
                                              {activity.mapUrl && (<a href={activity.mapUrl} target="_blank" rel="noreferrer" className="itinerary-act-map-link">
                                                  Map ↗
                                                </a>)}
                                            </div>

                                            {activity.description && (<p className="itinerary-act-description">
                                                {activity.description}
                                              </p>)}
                                          </article>
                                        </div>
                                      </div>);
                                    })}
                                  </div>)}

                                {editingItinerary && (<button type="button" className="itinerary-add-activity-btn" onClick={() => handleAddActivity(day.dayIndex)} disabled={savingItinerary}>
                                    + Add activity to Day {day.dayIndex}
                                  </button>)}
                              </section>);
                        })}
                        </div>

                        <p className="itinerary-note">
                          Generated activities are sample recommendations tailored to your selected destination, pace and interests.
                        </p>

                        {editingItinerary && draft.days.length <= 1 && (<p className="itinerary-note">
                            At least one activity is required. Add another activity before deleting the final one.
                          </p>)}

                        <div className="itinerary-actions-bar">
                          {!editingItinerary ? (<>
                              <button type="button" className="btn btn-secondary itinerary-action-btn" onClick={handleStartEditingItinerary} disabled={loadingItinerary ||
                                savingItinerary ||
                                generatingDraft}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit Activities
                              </button>
                              <button type="button" className="btn btn-secondary itinerary-action-btn optimize-all-btn" onClick={handleOptimizeAllDaysRoute} disabled={loadingItinerary ||
                                savingItinerary ||
                                generatingDraft ||
                                optimizingDayIndex !== null ||
                                draft.days.length === 0} title="Optimize attraction visiting sequence across all days using shortest travel distance">
                                {optimizingDayIndex === "all" ? (<>
                                    <span className="itinerary-btn-spinner" aria-hidden="true"/>
                                    <span>Optimizing All Days...</span>
                                  </>) : (<>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                    </svg>
                                    <span>Optimize All Days</span>
                                  </>)}
                              </button>
                              <button type="button" className="btn btn-secondary itinerary-action-btn" onClick={() => setShowPrintModal(true)} disabled={loadingItinerary || generatingDraft}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="6 9 6 2 18 2 18 9"/>
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                  <rect x="6" y="14" width="12" height="8"/>
                                </svg>
                                Print / Export Summary
                              </button>
                              <button type="button" className="btn btn-primary itinerary-action-btn save-btn" onClick={handleSaveItinerary} disabled={loadingItinerary ||
                                savingItinerary ||
                                generatingDraft ||
                                draftSaved}>
                                {savingItinerary
                                ? "Saving Itinerary..."
                                : draftSaved
                                    ? "✓ Itinerary Saved"
                                    : "Save Itinerary"}
                              </button>
                            </>) : (<>
                              <button type="button" className="btn btn-primary itinerary-action-btn save-btn" onClick={handleSaveItinerary} disabled={loadingItinerary ||
                                savingItinerary ||
                                generatingDraft ||
                                !itineraryEditDirty}>
                                {savingItinerary
                                ? "Saving Changes..."
                                : "Save Activity Changes"}
                              </button>
                              <button type="button" className="btn btn-secondary itinerary-action-btn" onClick={handleCancelEditingItinerary} disabled={savingItinerary}>
                                Cancel Editing
                              </button>
                            </>)}
                        </div>
                      </>)}
                  </section>

                  {dest?.tags && dest.tags.length > 0 && (<div className="tags">
                      {dest.tags.map((tag) => (<span key={tag}>{tag}</span>))}
                    </div>)}

                  <div className="trip-delete-actions">
                    <button type="button" className="trip-delete-button" onClick={() => void handleDeleteTrip()} disabled={deletingTrip}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      {deletingTrip ? "Deleting trip..." : "Delete Trip"}
                    </button>
                  </div>
                </>);
            })()}
          </section>) : authUser && viewMode === "trips" && !selectedDestination ? (<section className="destinations">
            <div className="page-header">
              <h1>My Trips</h1>
              <p>Review your saved plans, filter trips, and continue planning.</p>
            </div>
            {tripMessage && (<p className="success" role="status">
                {tripMessage}
              </p>)}
            {tripError && (<p className="error" role="alert">
                {tripError}
              </p>)}

            <div className="trip-form trip-filters">
              <div className="trip-filter-grid">
                <div className="trip-filter-field">
                  <label htmlFor="tripSearchQuery">Search by destination name</label>
                  <input id="tripSearchQuery" type="search" value={tripSearchQuery} onChange={(e) => setTripSearchQuery(e.target.value)} placeholder="e.g. Goa"/>
                </div>
                <div className="trip-filter-field">
                  <label htmlFor="tripStatusFilter">Status</label>
                  <select id="tripStatusFilter" value={tripStatusFilterValue} onChange={(e) => setTripStatusFilterValue(e.target.value)} style={{ minHeight: "48px", borderRadius: "5px", border: "1px solid #cfd7cf", padding: "0.6rem 0.8rem", font: "inherit" }}>
                    <option value="all">All</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="trip-filter-field">
                  <label htmlFor="tripSort">Sort by</label>
                  <select id="tripSort" value={tripSortValue} onChange={(e) => setTripSortValue(e.target.value)} style={{ minHeight: "48px", borderRadius: "5px", border: "1px solid #cfd7cf", padding: "0.6rem 0.8rem", font: "inherit" }}>
                    <option value="startDesc">Start date: Newest first</option>
                    <option value="startAsc">Start date: Oldest first</option>
                    <option value="budgetDesc">Budget: Highest first</option>
                    <option value="budgetAsc">Budget: Lowest first</option>
                  </select>
                </div>
              </div>
              {(tripSearchQuery.trim() || tripStatusFilterValue !== "all" || tripSortValue !== "startDesc") && (<div className="trip-filter-actions">
                  <button type="button" className="explore-button" onClick={handleClearTripFilters}>
                    Clear filters and sort
                  </button>
                </div>)}
            </div>

            {(() => {
                const normalizedQuery = tripSearchQuery.trim().toLowerCase();
                const filtered = trips.filter((trip) => {
                    const dest = typeof trip.destination === "object" && trip.destination !== null
                        ? trip.destination
                        : null;
                    if (normalizedQuery) {
                        const name = dest?.name;
                        if (typeof name !== "string")
                            return false;
                        if (!name.toLowerCase().includes(normalizedQuery))
                            return false;
                    }
                    if (tripStatusFilterValue !== "all") {
                        const status = getTripStatusCategory(trip);
                        if (tripStatusFilterValue === "upcoming") {
                            if (status !== "upcoming")
                                return false;
                        }
                        else if (tripStatusFilterValue === "ongoing") {
                            if (status !== "ongoing")
                                return false;
                        }
                        else if (tripStatusFilterValue === "completed") {
                            if (status !== "completed")
                                return false;
                        }
                    }
                    return true;
                });
                const visibleTrips = [...filtered].sort((a, b) => {
                    if (tripSortValue === "budgetAsc") {
                        const aBudget = typeof a.budget === "number" && !Number.isNaN(a.budget) ? a.budget : Number.POSITIVE_INFINITY;
                        const bBudget = typeof b.budget === "number" && !Number.isNaN(b.budget) ? b.budget : Number.POSITIVE_INFINITY;
                        if (aBudget === bBudget)
                            return 0;
                        return aBudget - bBudget;
                    }
                    if (tripSortValue === "budgetDesc") {
                        const aBudget = typeof a.budget === "number" && !Number.isNaN(a.budget) ? a.budget : Number.NEGATIVE_INFINITY;
                        const bBudget = typeof b.budget === "number" && !Number.isNaN(b.budget) ? b.budget : Number.NEGATIVE_INFINITY;
                        if (aBudget === bBudget)
                            return 0;
                        return bBudget - aBudget;
                    }
                    const aStart = new Date(a.startDate).getTime();
                    const bStart = new Date(b.startDate).getTime();
                    const aInvalid = Number.isNaN(aStart);
                    const bInvalid = Number.isNaN(bStart);
                    if (aInvalid && bInvalid)
                        return 0;
                    if (aInvalid)
                        return 1;
                    if (bInvalid)
                        return -1;
                    if (tripSortValue === "startAsc") {
                        if (aStart === bStart)
                            return 0;
                        return aStart - bStart;
                    }
                    if (aStart === bStart)
                        return 0;
                    return bStart - aStart;
                });
                return (<>
                  {loadingTrips && <p>Loading trips...</p>}

                  {errorTrips && (<div>
                      <p className="error">{errorTrips}</p>
                      <button type="button" className="explore-button" onClick={handleRetryTrips}>
                        Retry
                      </button>
                    </div>)}

                  {!loadingTrips && !errorTrips && trips.length === 0 && (<div className="empty-state trip-empty-state">
                      <h3>No saved trips yet</h3>
                      <p>Plan your first trip from Explore Destinations and it will appear here.</p>
                      <button type="button" className="btn btn-primary" onClick={handleBackToDestinations}>
                        Explore Destinations
                      </button>
                    </div>)}

                  {!loadingTrips && !errorTrips && trips.length > 0 && visibleTrips.length === 0 && (<div className="empty-state trip-empty-state">
                      <h3>No matching trips</h3>
                      <p>Try adjusting your search, status, or sorting options.</p>
                    </div>)}

                  {!loadingTrips && !errorTrips && visibleTrips.length > 0 && (<div className="destination-grid">
                      {visibleTrips.map((trip) => {
                            const dest = typeof trip.destination === "object" && trip.destination !== null
                                ? trip.destination
                                : null;
                            return (<article className="trip-card" key={trip._id}>
                            <TravelImageFrame image={dest ? getDestinationImage(dest.name, dest.imageUrl) : undefined} alt={dest?.name ? `Trip to ${dest.name}` : "Trip"}/>

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
                                    if (!durationText)
                                        return null;
                                    return (<span>
                                      <strong>Duration:</strong> {durationText}
                                    </span>);
                                })()}
                                <span>
                                  <strong>Travelers:</strong> {trip.travelers}
                                </span>
                                <span>
                                  <strong>Budget:</strong> {formatCurrency(trip.budget)}
                                </span>
                              </div>

                              {dest?.tags && dest.tags.length > 0 && (<div className="tags">
                                  {dest.tags.map((tag) => (<span key={tag}>{tag}</span>))}
                                </div>)}

                              <button type="button" className="explore-button" onClick={() => handleViewTripDetails(trip)}>
                                View Details
                              </button>
                            </div>
                          </article>);
                        })}
                    </div>)}
                </>);
            })()}
          </section>) : authUser && selectedDestination ? (<section className="destination-details" aria-label={`Details for ${selectedDestination.name}`}>
            {/* Top Navigation & Action Bar */}
            <div className="dest-detail-nav">
              <button type="button" className="dest-back-btn" onClick={handleBackToDestinations} aria-label="Back to Destinations catalog">
                <span aria-hidden="true">←</span>
                <span>Back to Destinations</span>
              </button>

              {!showTripForm && (<button type="button" className="dest-plan-top-btn" onClick={() => {
                    setTripMessage("");
                    setTripError("");
                    setShowTripForm(true);
                    setViewMode("destinations");
                }} aria-label={`Plan a trip to ${selectedDestination.name}`}>
                  <span>Plan a Trip to {selectedDestination.name}</span>
                  <span aria-hidden="true">→</span>
                </button>)}
            </div>

            {/* Destination Hero Showcase */}
            <div className="dest-detail-hero">
              <div className="dest-detail-hero-content">
                <span className="dest-detail-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {selectedDestination.state
                ? `${selectedDestination.state}, ${selectedDestination.country}`
                : selectedDestination.country}
                </span>

                <h1 className="dest-detail-title">{selectedDestination.name}</h1>

                <p className="dest-detail-desc">
                  {selectedDestination.description ||
                "Discover the iconic highlights, cultural heritage, and scenic wonders of this curated destination."}
                </p>

                {selectedDestination.tags && selectedDestination.tags.length > 0 && (<div className="dest-detail-tags">
                    {selectedDestination.tags.map((tag, idx) => (<span key={idx} className="dest-tag-chip">
                        {tag}
                      </span>))}
                  </div>)}

                <div className="dest-detail-meta-grid">
                  {typeof selectedDestination.averageCostPerDay === "number" &&
                Number.isFinite(selectedDestination.averageCostPerDay) &&
                selectedDestination.averageCostPerDay > 0 && (<div className="dest-detail-meta-box">
                        <span className="dest-detail-meta-label">Est. Cost / Day</span>
                        <span className="dest-detail-meta-value">
                          {formatCurrency(selectedDestination.averageCostPerDay)}
                        </span>
                      </div>)}
                  <div className="dest-detail-meta-box">
                    <span className="dest-detail-meta-label">Mapped Attractions</span>
                    <span className="dest-detail-meta-value">{attractions.length}</span>
                  </div>
                  <div className="dest-detail-meta-box">
                    <span className="dest-detail-meta-label">Map Data</span>
                    <span className="dest-detail-meta-value" style={{ textTransform: "capitalize", fontSize: "0.95rem" }}>
                      {attractionSource === "openstreetmap"
                ? "Live OSM"
                : attractionSource === "cached"
                    ? "Cached"
                    : "Curated"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dest-detail-hero-media">
                <TravelImageFrame image={getDestinationImage(selectedDestination.name, selectedDestination.imageUrl)} alt={selectedDestination.name} className="dest-detail-hero-img"/>
              </div>
            </div>

            {/* Smart Route Optimizer & Attractions Section */}
            <section className="dest-route-card" aria-labelledby="attractions-heading">
              <div className="dest-route-header">
                <div>
                  <h2 id="attractions-heading" className="dest-route-title">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                    <span>Smart Route Optimizer &amp; Attractions</span>
                  </h2>
                  <p className="dest-route-subtitle">
                    Select 2 or more attractions to calculate an optimized visiting sequence that minimizes straight-line travel distance.
                  </p>
                </div>
                {attractionSource && (<span className="itinerary-badge" style={{ alignSelf: "flex-start" }}>
                    {attractionSource === "openstreetmap"
                    ? "Live map data"
                    : attractionSource === "cached"
                        ? "Cached map data"
                        : "Curated starter data"}
                  </span>)}
              </div>

              {loadingAttractions && (<div className="dashboard-trips-loading" style={{ minHeight: "180px" }}>
                  <div className="dashboard-loading-spinner"/>
                  <p role="status">Loading mapped attractions...</p>
                </div>)}

              {attractionError && <div className="alert alert-error" role="alert">{attractionError}</div>}
              {attractionWarning && <div className="alert alert-warning">{attractionWarning}</div>}

              {!loadingAttractions && !attractionError && attractions.length === 0 && (<div className="empty-state" style={{ minHeight: "180px", textAlign: "center" }}>
                  <p className="muted">No mapped attractions are available for this destination yet.</p>
                </div>)}

              {!loadingAttractions && attractions.length > 0 && (<>
                  <div className="dest-route-controls" aria-label="Smart Route Optimizer Controls">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="dest-route-badge">
                        <strong>{selectedAttractionIds.length}</strong> of {Math.min(attractions.length, 12)} selected
                      </span>
                      {selectedAttractionIds.length < 2 && (<span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          (Select at least {2 - selectedAttractionIds.length} more)
                        </span>)}
                      <div className="dest-route-actions">
                        {selectedAttractionIds.length > 0 && (<button type="button" className="btn btn-secondary btn-sm" onClick={handleClearAttractionSelection} disabled={optimizingRoute}>
                            Clear Selection
                          </button>)}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleSelectAllAttractions} disabled={optimizingRoute || attractions.length === 0}>
                          Select All ({Math.min(attractions.length, 12)})
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      {selectedAttractionIds.length > 0 && (<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <label htmlFor="route-start-attraction" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--navy)" }}>
                            Start from:
                          </label>
                          <select id="route-start-attraction" value={startAttractionId} onChange={(e) => handleChangeStartAttraction(e.target.value)} disabled={optimizingRoute} className="dest-route-select">
                            <option value="">Auto (first selected)</option>
                            {attractions
                        .filter((a) => selectedAttractionIds.includes(a.id))
                        .map((attr) => (<option key={attr.id} value={attr.id}>
                                  {attr.name}
                                </option>))}
                          </select>
                        </div>)}

                      <button type="button" className="btn btn-primary btn-sm route-optimize-btn" onClick={handleOptimizeRoute} disabled={selectedAttractionIds.length < 2 || optimizingRoute}>
                        {optimizingRoute ? "Optimizing Route..." : "Suggest Visiting Order →"}
                      </button>
                    </div>
                  </div>

                  {routeError && (<div className="alert alert-error route-alert" role="alert" style={{ marginBottom: "1rem" }}>
                      {routeError}
                    </div>)}

                  {/* Route Optimization Result */}
                  {routeResult && (<div className="dest-route-result-card" aria-labelledby="route-result-heading">
                      <div className="route-result-header">
                        <div>
                          <span className="itinerary-badge" style={{ background: "var(--navy)", color: "#fff" }}>
                            Optimized Sequence
                          </span>
                          <h3 id="route-result-heading" style={{ marginTop: "0.4rem", fontFamily: "var(--heading, 'Fraunces', Georgia, serif)" }}>
                            Suggested Visiting Order for {routeResult.destinationName}
                          </h3>
                        </div>
                        <div className="route-result-metrics">
                          <div className="route-metric-pill">
                            <span className="metric-label">Total Distance:</span>
                            <span className="metric-value">{routeResult.totalDistanceKm} km</span>
                          </div>
                          <div className="route-metric-pill">
                            <span className="metric-label">Stops:</span>
                            <span className="metric-value">{routeResult.orderedStops.length}</span>
                          </div>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRouteResult(null)}>
                            Dismiss Route
                          </button>
                        </div>
                      </div>

                      <div className="route-disclaimer-box" role="note" style={{ marginTop: "0.75rem" }}>
                        <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>ℹ️</span>
                        <p>{routeResult.disclaimer}</p>
                      </div>

                      <div className="dest-route-timeline">
                        {routeResult.orderedStops.map((stop, idx) => (<div key={stop.id}>
                            {idx > 0 && routeResult.legs[idx - 1] && (<div className="dest-route-leg-pill">
                                <span aria-hidden="true">↓</span>
                                <span>{routeResult.legs[idx - 1].distanceKm} km from {routeResult.legs[idx - 1].fromName}</span>
                              </div>)}

                            <div className="dest-route-stop-card">
                              <div className="dest-route-stop-num">{stop.order}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--navy)" }}>
                                    {stop.name}
                                  </h4>
                                  {stop.category && (<span className="dest-tag-chip" style={{ fontSize: "0.7rem" }}>
                                      {stop.category}
                                    </span>)}
                                </div>
                                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0.25rem 0 0" }}>
                                  {stop.locality ? `${stop.locality} · ` : ""}
                                  Estimated visit: {stop.estimatedDurationMinutes ?? 120} mins
                                  {stop.distanceFromPreviousKm > 0 ? ` · +${stop.distanceFromPreviousKm} km straight-line` : " · Starting Point"}
                                </p>
                              </div>
                              {stop.mapUrl && (<a href={stop.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem", color: "var(--teal-dark)", fontWeight: 600, textDecoration: "none" }}>
                                  View map ↗
                                </a>)}
                            </div>
                          </div>))}
                      </div>
                    </div>)}

                  {/* Attractions Selection Grid */}
                  <div className="dest-attractions-grid">
                    {attractions.slice(0, 12).map((attraction, attractionIdx) => {
                    const isSelected = selectedAttractionIds.includes(attraction.id);
                    return (<article className={`dest-attraction-card ${isSelected ? "selected" : ""}`} key={attraction.id}>
                          <div className="dest-attraction-check">
                            <label className="attraction-checkbox-label" style={{ margin: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleToggleAttraction(attraction.id)} aria-label={`Select ${attraction.name} for route optimization`}/>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: isSelected ? "var(--navy)" : "var(--text-secondary)" }}>
                                {isSelected ? "Selected for route" : "Select for route"}
                              </span>
                            </label>
                          </div>
                          <div className="dest-attraction-body">
                            <TravelImageFrame image={getAttractionImage(attraction.name, selectedDestination.name, attractionIdx)} alt={attraction.name} className="dest-attraction-img"/>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.2rem" }}>
                                {attraction.name}
                              </h4>
                              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                                <span style={{ textTransform: "capitalize" }}>{attraction.category}</span>
                                {" · "}
                                {attraction.estimatedDurationMinutes} mins
                              </p>
                              {attraction.mapUrl && (<a href={attraction.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "var(--teal-dark)", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "0.35rem" }}>
                                  View map ↗
                                </a>)}
                            </div>
                          </div>
                        </article>);
                })}
                  </div>
                </>)}

              <p className="attraction-attribution" style={{ marginTop: "1rem" }}>
                © OpenStreetMap contributors. Attraction duration and category are estimates.
              </p>
            </section>

            {tripMessage && (<p className="success" role="status" style={{ margin: "1rem 0" }}>
                {tripMessage}
              </p>)}

            {tripError && (<p className="error" role="alert" style={{ margin: "1rem 0" }}>
                {tripError}
              </p>)}

            {/* Bottom Trip Planning CTA Card */}
            {!showTripForm && (<div className="dest-plan-cta-card">
                <h3 className="dest-plan-cta-title">Ready to experience {selectedDestination.name}?</h3>
                <p className="dest-plan-cta-desc">
                  Create a personalized trip to organize your dates, calculate estimated budgets, build customized multi-day itineraries, and track expenses.
                </p>
                {authUser ? (<button type="button" className="btn btn-primary" onClick={() => {
                        setTripMessage("");
                        setTripError("");
                        setShowTripForm(true);
                        setViewMode("destinations");
                    }} style={{ padding: "0.75rem 1.85rem", fontSize: "0.95rem", fontWeight: 600 }}>
                    Plan a Trip to {selectedDestination.name} →
                  </button>) : (<button type="button" className="btn btn-primary" onClick={() => {
                        setAuthView("login");
                        setAuthError("");
                        setAuthMessage("");
                    }} style={{ padding: "0.75rem 1.85rem", fontSize: "0.95rem", fontWeight: 600 }}>
                    Login to Plan a Trip →
                  </button>)}
              </div>)}

            {showTripForm && (() => {
                let estimateContent = null;
                const costPerDay = selectedDestination.averageCostPerDay;
                const hasValidCost = typeof costPerDay === "number" &&
                    Number.isFinite(costPerDay) &&
                    costPerDay > 0;
                if (hasValidCost && startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    if (!Number.isNaN(start.getTime()) &&
                        !Number.isNaN(end.getTime())) {
                        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                        if (endDay > startDay) {
                            const diffMs = endDay.getTime() - startDay.getTime();
                            const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                            const travelerCountNum = Number(travelers);
                            if (Number.isInteger(travelerCountNum) && travelerCountNum > 0) {
                                const estimatedTotal = costPerDay * days * travelerCountNum;
                                if (Number.isFinite(estimatedTotal) && estimatedTotal > 0) {
                                    estimateContent = (<div style={{
                                            background: "#f2f5f0",
                                            border: "1px solid var(--line)",
                                            borderRadius: "6px",
                                            padding: "0.8rem 1rem",
                                            display: "grid",
                                            gap: "0.25rem",
                                        }}>
                            <div style={{ fontWeight: 700, color: "var(--green-dark)" }}>
                              Estimated total cost: {formatCurrency(estimatedTotal)}
                            </div>
                            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                              Based on {formatCurrency(costPerDay)} per day for {travelerCountNum} traveler{travelerCountNum === 1 ? "" : "s"} over {days} day{days === 1 ? "" : "s"}.
                            </div>
                            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                              This is an estimate, not a guaranteed or exact trip cost.
                            </div>
                          </div>);
                                }
                            }
                        }
                    }
                }
                if (!estimateContent && hasValidCost) {
                    estimateContent = (<div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    Enter valid travel dates and traveler count to estimate your trip cost.
                  </div>);
                }
                return (<form className="trip-form" onSubmit={handleTripSubmit}>
                  <h3>Plan Your Trip to {selectedDestination.name}</h3>

                  <label htmlFor="startDate">Start Date</label>
                  <input id="startDate" name="startDate" type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required/>

                  <label htmlFor="endDate">End Date</label>
                  <input id="endDate" name="endDate" type="date" min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} required/>

                  <label htmlFor="travelers">Number of Travelers</label>
                  <input id="travelers" name="travelers" type="number" min="1" max="50" value={travelers} onChange={(event) => setTravelers(event.target.value)} required/>

                  {(() => {
                        const durationText = formatTripDuration(startDate, endDate);
                        if (!durationText)
                            return null;
                        return (<div style={{ color: "var(--green-dark)", fontWeight: 600 }}>
                        Duration: {durationText}
                      </div>);
                    })()}

                  {estimateContent}

                  <label htmlFor="budget">Total Budget (INR)</label>
                  <input id="budget" name="budget" type="number" min="1" step="any" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Enter your total budget" required/>

                  <button type="submit" className="explore-button" disabled={submitting}>
                    {submitting ? "Creating Trip..." : "Create Trip"}
                  </button>

                  <button type="button" className="explore-button" disabled={submitting} onClick={() => {
                        setShowTripForm(false);
                        setTripError("");
                    }}>
                    Cancel
                  </button>
                </form>);
            })()}

          </section>) : null}
      </main>
    </div>);
}
export default App;
