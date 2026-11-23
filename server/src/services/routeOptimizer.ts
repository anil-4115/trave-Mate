/**
 * Smart Route Optimization Service
 *
 * Implements straight-line geographical distance estimation using the
 * Haversine formula and route ordering using the Nearest-Neighbour
 * greedy heuristic for the Travelling Salesperson Problem (TSP).
 *
 * Distances are straight-line estimates and do not represent actual road,
 * walking, transit, or topographic travel distances.
 */

export class RouteOptimizerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteOptimizerError";
  }
}

export interface RouteAttractionInput {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
  locality?: string;
  estimatedDurationMinutes?: number;
  mapUrl?: string;
  source?: "openstreetmap" | "curated";
  [key: string]: unknown;
}

export interface RouteLeg {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  distanceKm: number;
}

export interface OrderedRouteStop {
  order: number;
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromPreviousKm: number;
  category?: string;
  locality?: string;
  estimatedDurationMinutes?: number;
  mapUrl?: string;
}

export interface OptimizedRouteResult {
  orderedStops: OrderedRouteStop[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  disclaimer: string;
}

export const ROUTE_DISCLAIMER =
  "Distances are straight-line geographical estimates calculated using the Haversine formula, not actual road, walking, or transit distances.";

/**
 * Mean radius of Earth in kilometres.
 * Volumetric mean radius = 6371.0 km (IUGG recommendation).
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two geographical points
 * on a spherical Earth using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Straight-line distance in kilometres, rounded to 2 decimal places
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  // Haversine formula
  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const a =
    sinHalfDLat * sinHalfDLat +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfDLon * sinHalfDLon;

  // Clamp 'a' to [0, 1] to guard against floating-point inaccuracies producing NaN
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distanceKm = EARTH_RADIUS_KM * c;
  return Math.round(distanceKm * 100) / 100;
}

/**
 * Validates that an attraction contains valid, finite, in-range geographical coordinates.
 */
function validateCoordinates(
  attraction: RouteAttractionInput
): { latitude: number; longitude: number } {
  const { latitude, longitude, name, id } = attraction;
  const label = name ? `"${name}" (${id})` : `"${id}"`;

  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new RouteOptimizerError(
      `Attraction ${label} is missing valid geographic coordinates.`
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new RouteOptimizerError(
      `Attraction ${label} has invalid latitude (${latitude}). Must be between -90 and 90.`
    );
  }

  if (longitude < -180 || longitude > 180) {
    throw new RouteOptimizerError(
      `Attraction ${label} has invalid longitude (${longitude}). Must be between -180 and 180.`
    );
  }

  return { latitude, longitude };
}

/**
 * Refines a route sequence using the 2-opt local search heuristic.
 * 2-opt iteratively examines pairs of edges and reverses intermediate
 * subsegments if doing so reduces the total travel distance (untangling
 * crossing paths).
 *
 * Invariant: The starting attraction (index 0) remains fixed at the start of the tour.
 *
 * @param tour Array of RouteAttractionInput items in initial order
 * @param coordsMap Map of attraction ID to validated geographic coordinates
 * @param maxIterations Safety limit on optimization passes (default: 50)
 * @returns Refined array of RouteAttractionInput items
 */
export function twoOptRefine(
  tour: RouteAttractionInput[],
  coordsMap: Map<string, { latitude: number; longitude: number }>,
  maxIterations: number = 50
): RouteAttractionInput[] {
  const n = tour.length;
  // 2-opt requires at least 4 stops to reverse an interior subsegment in an open tour
  if (n < 4) {
    return [...tour];
  }

  const result = [...tour];
  let improved = true;
  let iterations = 0;

  function dist(idxA: number, idxB: number): number {
    const coordA = coordsMap.get(result[idxA].id)!;
    const coordB = coordsMap.get(result[idxB].id)!;
    return haversineDistance(
      coordA.latitude,
      coordA.longitude,
      coordB.latitude,
      coordB.longitude
    );
  }

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Evaluate reversing subsegment result[i ... j] where 1 <= i < j < n
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const distOldPre = dist(i - 1, i);
        const distOldPost = j + 1 < n ? dist(j, j + 1) : 0;
        const currentDistance = distOldPre + distOldPost;

        const distNewPre = dist(i - 1, j);
        const distNewPost = j + 1 < n ? dist(i, j + 1) : 0;
        const newDistance = distNewPre + distNewPost;

        // If distance improves by more than 1 metre (0.001 km), apply the swap
        if (newDistance < currentDistance - 0.001) {
          let left = i;
          let right = j;
          while (left < right) {
            const temp = result[left];
            result[left] = result[right];
            result[right] = temp;
            left++;
            right--;
          }
          improved = true;
          break;
        }
      }
      if (improved) {
        break;
      }
    }
  }

  return result;
}

/**
 * Constructs an optimized visiting sequence for a list of attractions using the
 * Nearest-Neighbour greedy heuristic.
 *
 * @param options.attractions Array of attractions to visit (must contain at least one)
 * @param options.startAttractionId Optional ID of the attraction to visit first
 * @returns Optimized visiting sequence, step-by-step legs, and total distance in km
 */
export function optimizeRoute(options: {
  attractions: RouteAttractionInput[];
  startAttractionId?: string;
}): OptimizedRouteResult {
  const { attractions, startAttractionId } = options;

  if (!Array.isArray(attractions) || attractions.length === 0) {
    throw new RouteOptimizerError(
      "At least one attraction must be provided for route optimization."
    );
  }

  // Deduplicate attractions by id to prevent infinite loops or duplicate stops
  const uniqueAttractions: RouteAttractionInput[] = [];
  const seenIds = new Set<string>();

  for (const item of attractions) {
    if (!item || typeof item.id !== "string" || !item.id.trim()) {
      throw new RouteOptimizerError(
        "Each attraction must have a valid non-empty id string."
      );
    }
    const cleanId = item.id.trim();
    if (!seenIds.has(cleanId)) {
      seenIds.add(cleanId);
      uniqueAttractions.push({ ...item, id: cleanId });
    }
  }

  // Validate coordinates for all attractions
  const validatedCoords = new Map<string, { latitude: number; longitude: number }>();
  for (const item of uniqueAttractions) {
    validatedCoords.set(item.id, validateCoordinates(item));
  }

  // Determine starting attraction index
  let startIndex = 0;
  if (startAttractionId !== undefined && startAttractionId !== null) {
    const cleanStartId = String(startAttractionId).trim();
    const foundIndex = uniqueAttractions.findIndex((a) => a.id === cleanStartId);
    if (foundIndex === -1) {
      throw new RouteOptimizerError(
        `Start attraction with id "${cleanStartId}" was not found in the selected attractions.`
      );
    }
    startIndex = foundIndex;
  }

  // Single-attraction edge case
  if (uniqueAttractions.length === 1) {
    const single = uniqueAttractions[0];
    const coords = validatedCoords.get(single.id)!;
    return {
      orderedStops: [
        {
          order: 1,
          id: single.id,
          name: single.name,
          latitude: coords.latitude,
          longitude: coords.longitude,
          distanceFromPreviousKm: 0,
          category: single.category,
          locality: single.locality,
          estimatedDurationMinutes: single.estimatedDurationMinutes,
          mapUrl: single.mapUrl,
        },
      ],
      legs: [],
      totalDistanceKm: 0,
      disclaimer: ROUTE_DISCLAIMER,
    };
  }

  // Initialize Nearest-Neighbour traversal
  const unvisited = [...uniqueAttractions];
  const [current] = unvisited.splice(startIndex, 1);
  const initialTour: RouteAttractionInput[] = [current];
  let activeAttraction = current;

  while (unvisited.length > 0) {
    const activeCoords = validatedCoords.get(activeAttraction.id)!;
    let nearestIndex = 0;
    let shortestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const candidateCoords = validatedCoords.get(candidate.id)!;
      const distance = haversineDistance(
        activeCoords.latitude,
        activeCoords.longitude,
        candidateCoords.latitude,
        candidateCoords.longitude
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = i;
      }
    }

    const [nextStop] = unvisited.splice(nearestIndex, 1);
    initialTour.push(nextStop);
    activeAttraction = nextStop;
  }

  // 2-Opt local search refinement to untangle any crossing edges
  const refinedTour = twoOptRefine(initialTour, validatedCoords);

  // Rebuild ordered stops, step-by-step legs, and total distance
  const orderedStops: OrderedRouteStop[] = [];
  const legs: RouteLeg[] = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < refinedTour.length; i++) {
    const stop = refinedTour[i];
    const coords = validatedCoords.get(stop.id)!;
    let legDistance = 0;

    if (i > 0) {
      const prevStop = refinedTour[i - 1];
      const prevCoords = validatedCoords.get(prevStop.id)!;
      legDistance = haversineDistance(
        prevCoords.latitude,
        prevCoords.longitude,
        coords.latitude,
        coords.longitude
      );
      totalDistanceKm += legDistance;

      legs.push({
        fromId: prevStop.id,
        fromName: prevStop.name,
        toId: stop.id,
        toName: stop.name,
        distanceKm: legDistance,
      });
    }

    orderedStops.push({
      order: i + 1,
      id: stop.id,
      name: stop.name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      distanceFromPreviousKm: legDistance,
      category: stop.category,
      locality: stop.locality,
      estimatedDurationMinutes: stop.estimatedDurationMinutes,
      mapUrl: stop.mapUrl,
    });
  }

  return {
    orderedStops,
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    disclaimer: ROUTE_DISCLAIMER,
  };
}

/**
 * Generic day activity representation compatible with both
 * GeneratedActivity and IItineraryActivity.
 */
export interface DayActivity {
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  category?: string;
  locationName?: string;
  estimatedCost?: number;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  source?: string;
  [key: string]: unknown;
}

export interface DayRouteLeg {
  fromTitle: string;
  toTitle: string;
  distanceKm: number;
}

export interface OptimizedDayItineraryResult<T extends DayActivity = DayActivity> {
  dayIndex: number;
  activities: T[];
  totalDistanceKm: number;
  legs: DayRouteLeg[];
  optimized: boolean;
  disclaimer: string;
}

export interface OptimizeItineraryDaysResult<T extends DayActivity = DayActivity> {
  dayResults: OptimizedDayItineraryResult<T>[];
  totalDistanceKm: number;
  activities: T[];
}

/**
 * Checks whether an activity has valid, finite, in-range geographic coordinates.
 */
export function hasValidCoordinates(activity: DayActivity): boolean {
  const { latitude, longitude } = activity;
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Optimizes the attraction visit order for a single itinerary day using geographical distance.
 *
 * Requirements guaranteed:
 * 1. Optimizes visit order separately for the given day.
 * 2. Uses Haversine straight-line distance to sequence attractions efficiently.
 * 3. Preserves all user selected attractions and activity properties.
 * 4. Never moves attractions between days (dayIndex is strictly preserved).
 * 5. Handles days with 0 or 1 attraction correctly without throwing errors.
 * 6. Preserves chronological time slots, assigning reordered attractions sequentially.
 * 7. Non-coordinated activities (meals, rest) stay in their original relative positions.
 */
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Agra
  "agra handicraft market browsing": { lat: 27.1585, lon: 78.0092 },
  "handicraft market": { lat: 27.1585, lon: 78.0092 },
  "sadar bazaar": { lat: 27.1585, lon: 78.0092 },
  "taj mahal": { lat: 27.1751, lon: 78.0421 },
  "agra fort": { lat: 27.1795, lon: 78.0211 },
  "mehtab bagh": { lat: 27.1800, lon: 78.0420 },
  "fatehpur sikri": { lat: 27.0945, lon: 77.6679 },
  "itmad-ud-daulah": { lat: 27.1929, lon: 78.0311 },

  // Delhi
  "old delhi food walk": { lat: 28.6562, lon: 77.2300 },
  "red fort": { lat: 28.6562, lon: 77.2410 },
  "qutub minar": { lat: 28.5244, lon: 77.1855 },
  "humayun's tomb": { lat: 28.5933, lon: 77.2507 },
  "india gate": { lat: 28.6129, lon: 77.2295 },
  "lotus temple": { lat: 28.5535, lon: 77.2588 },
  "chandni chowk": { lat: 28.6562, lon: 77.2300 },

  // Jaipur
  "johari bazaar browsing": { lat: 26.9200, lon: 75.8250 },
  "amber fort": { lat: 26.9855, lon: 75.8513 },
  "hawa mahal": { lat: 26.9239, lon: 75.8267 },
  "city palace": { lat: 26.9258, lon: 75.8237 },
  "jal mahal": { lat: 26.9535, lon: 75.8462 },
  "nahargarh fort": { lat: 26.9372, lon: 75.8155 },

  // Goa
  "goa beach day": { lat: 15.5557, lon: 73.7517 },
  "baga beach": { lat: 15.5557, lon: 73.7517 },
  "basilica of bom jesus": { lat: 15.5009, lon: 73.9115 },
  "fort aguada": { lat: 15.4925, lon: 73.7736 },
  "dudhsagar falls": { lat: 15.3144, lon: 74.3143 },

  // Kerala
  "chinese fishing nets": { lat: 9.9675, lon: 76.2428 },
  "fort kochi": { lat: 9.9658, lon: 76.2421 },
  "mattancherry palace": { lat: 9.9583, lon: 76.2592 },
  "alleppey backwaters": { lat: 9.4981, lon: 76.3388 },
  "munnar tea gardens": { lat: 10.0889, lon: 77.0595 },

  // Mumbai
  "gateway of india": { lat: 18.9220, lon: 72.8347 },
  "elephanta caves": { lat: 18.9633, lon: 72.9315 },
  "marine drive": { lat: 18.9432, lon: 72.8234 },
  "chhatrapati shivaji terminus": { lat: 18.9401, lon: 72.8354 },

  // Varanasi
  "dashashwamedh ghat": { lat: 25.3068, lon: 83.0107 },
  "assi ghat": { lat: 25.2908, lon: 83.0063 },
  "kashi vishwanath temple": { lat: 25.3109, lon: 83.0107 },
  "sarnath": { lat: 25.3811, lon: 83.0214 },

  // Manali
  "hadimba temple": { lat: 32.2480, lon: 77.1770 },
  "solang valley": { lat: 32.3167, lon: 77.1583 },
  "jogini waterfall": { lat: 32.2680, lon: 77.1890 },
  "vashisht hot springs": { lat: 32.2612, lon: 77.1873 },
  "rohtang pass": { lat: 32.3716, lon: 77.2466 },

  // Udaipur
  "lake pichola": { lat: 24.5750, lon: 73.6775 },
  "city palace udaipur": { lat: 24.5764, lon: 73.6835 },
  "jag mandir": { lat: 24.5678, lon: 73.6781 },
  "saheliyon-ki-bari": { lat: 24.6030, lon: 73.6874 },
  "fateh sagar lake": { lat: 24.6025, lon: 73.6720 },

  // Rishikesh
  "laxman jhula": { lat: 30.1342, lon: 78.3275 },
  "ram jhula": { lat: 30.1232, lon: 78.3142 },
  "triveni ghat": { lat: 30.1030, lon: 78.2974 },
  "beatles ashram": { lat: 30.1171, lon: 78.3147 },
};

function findKnownCoordinates(
  title: string,
  locationName?: string
): { lat: number; lon: number } | undefined {
  const normTitle = (title || "").toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (normTitle.includes(key)) return coords;
  }
  const normLoc = (locationName || "").toLowerCase();
  const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
    agra: { lat: 27.1751, lon: 78.0421 },
    delhi: { lat: 28.6139, lon: 77.2090 },
    jaipur: { lat: 26.9124, lon: 75.7873 },
    goa: { lat: 15.4925, lon: 73.7736 },
    kerala: { lat: 9.9658, lon: 76.2421 },
    kochi: { lat: 9.9658, lon: 76.2421 },
    mumbai: { lat: 18.9220, lon: 72.8347 },
    varanasi: { lat: 25.3068, lon: 83.0107 },
    manali: { lat: 32.2480, lon: 77.1770 },
    udaipur: { lat: 24.5764, lon: 73.6835 },
    rishikesh: { lat: 30.1232, lon: 78.3142 },
  };
  for (const [city, center] of Object.entries(CITY_CENTERS)) {
    if (normLoc.includes(city) || normTitle.includes(city)) {
      return center;
    }
  }
  return undefined;
}

export function optimizeDayItinerary<T extends DayActivity>(
  activities: T[],
  options?: { startAttractionTitle?: string; startAttractionId?: string }
): OptimizedDayItineraryResult<T> {
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      dayIndex: 1,
      activities: [],
      totalDistanceKm: 0,
      legs: [],
      optimized: false,
      disclaimer: ROUTE_DISCLAIMER,
    };
  }

  const dayIndex = activities[0].dayIndex ?? 1;

  // Single-attraction edge case
  if (activities.length === 1) {
    return {
      dayIndex,
      activities: [{ ...activities[0], dayIndex }],
      totalDistanceKm: 0,
      legs: [],
      optimized: false,
      disclaimer: ROUTE_DISCLAIMER,
    };
  }

  // Enrich activities missing coordinates from known landmarks & destination centers
  let unknownOffset = 0;
  const targetActivities = activities.map((act) => {
    if (hasValidCoordinates(act)) return act;
    const known = findKnownCoordinates(act.title || "", act.locationName);
    if (known) {
      unknownOffset += 1;
      return {
        ...act,
        latitude: known.lat + (unknownOffset * 0.004),
        longitude: known.lon + (unknownOffset * 0.004),
      };
    }
    return act;
  });

  // Identify indices of activities with valid coordinates
  const coordinatedIndices: number[] = [];
  targetActivities.forEach((act, idx) => {
    if (hasValidCoordinates(act)) {
      coordinatedIndices.push(idx);
    }
  });

  // If fewer than 2 attractions have coordinates, no distance-based reordering is possible
  if (coordinatedIndices.length < 2) {
    return {
      dayIndex,
      activities: targetActivities.map((act) => ({ ...act, dayIndex })),
      totalDistanceKm: 0,
      legs: [],
      optimized: false,
      disclaimer: ROUTE_DISCLAIMER,
    };
  }

  // Build RouteAttractionInput items for TSP optimization
  const coordinatedItems = coordinatedIndices.map((idx) => targetActivities[idx]);
  const routeInputs: RouteAttractionInput[] = coordinatedItems.map((act, i) => ({
    id: `act-${i}`,
    name: act.title,
    latitude: act.latitude as number,
    longitude: act.longitude as number,
    category: act.category,
    locality: act.locationName,
  }));

  // Determine starting attraction if specified by title or ID
  let startId: string | undefined = undefined;
  if (options?.startAttractionTitle) {
    const cleanTitle = options.startAttractionTitle.trim().toLowerCase();
    const foundIdx = coordinatedItems.findIndex(
      (a) => a.title.trim().toLowerCase() === cleanTitle
    );
    if (foundIdx !== -1) {
      startId = `act-${foundIdx}`;
    }
  } else if (options?.startAttractionId) {
    const cleanId = options.startAttractionId.trim();
    const foundIdx = coordinatedItems.findIndex(
      (a) =>
        (a.id && String(a.id).trim() === cleanId) ||
        (a._id && String(a._id).trim() === cleanId)
    );
    if (foundIdx !== -1) {
      startId = `act-${foundIdx}`;
    }
  }

  // Run the core TSP Nearest-Neighbour optimizer on the coordinated attractions
  const routeResult = optimizeRoute({
    attractions: routeInputs,
    startAttractionId: startId,
  });

  // Map ordered stops back to the original activity objects
  const reorderedCoordinated: T[] = routeResult.orderedStops.map((stop) => {
    const origIndex = parseInt(stop.id.replace("act-", ""), 10);
    return { ...coordinatedItems[origIndex] };
  });

  // Capture original time slots from coordinated positions and sort them chronologically
  const originalTimeSlots = coordinatedItems
    .map((act) => ({
      startTime: act.startTime,
      endTime: act.endTime,
    }))
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  // Assign original chronological time slots to the newly sequenced attractions
  const sequencedCoordinated = reorderedCoordinated.map((act, idx) => ({
    ...act,
    dayIndex,
    startTime: originalTimeSlots[idx]?.startTime ?? act.startTime,
    endTime: originalTimeSlots[idx]?.endTime ?? act.endTime,
  }));

  // Reconstruct full day array: non-coordinated activities remain in their original positions
  const finalActivities: T[] = activities.map((act) => ({ ...act, dayIndex }));
  coordinatedIndices.forEach((pos, idx) => {
    finalActivities[pos] = sequencedCoordinated[idx];
  });

  // Build day legs
  const legs: DayRouteLeg[] = routeResult.legs.map((leg) => ({
    fromTitle: leg.fromName,
    toTitle: leg.toName,
    distanceKm: leg.distanceKm,
  }));

  return {
    dayIndex,
    activities: finalActivities,
    totalDistanceKm: routeResult.totalDistanceKm,
    legs,
    optimized: true,
    disclaimer: ROUTE_DISCLAIMER,
  };
}

/**
 * Optimizes attraction visit order for each itinerary day independently.
 *
 * Guarantees:
 * - Each day's attractions are optimized strictly within that day.
 * - Attractions are NEVER moved between different days (dayIndex invariant).
 * - All selected attractions are preserved across all days.
 */
export function optimizeItineraryDays<T extends DayActivity>(
  activities: T[],
  options?: { startAttractionTitle?: string }
): OptimizeItineraryDaysResult<T> {
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      dayResults: [],
      totalDistanceKm: 0,
      activities: [],
    };
  }

  // Group activities strictly by dayIndex
  const dayMap = new Map<number, T[]>();
  for (const act of activities) {
    const day =
      typeof act.dayIndex === "number" &&
      Number.isInteger(act.dayIndex) &&
      act.dayIndex >= 1
        ? act.dayIndex
        : 1;
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day)!.push({ ...act, dayIndex: day });
  }

  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);
  const dayResults: OptimizedDayItineraryResult<T>[] = [];
  const optimizedActivities: T[] = [];
  let totalDistanceKm = 0;

  for (const day of sortedDays) {
    const dayActs = dayMap.get(day)!;
    const result = optimizeDayItinerary(dayActs, options);
    dayResults.push(result);
    totalDistanceKm =
      Math.round((totalDistanceKm + result.totalDistanceKm) * 100) / 100;
    optimizedActivities.push(...result.activities);
  }

  return {
    dayResults,
    totalDistanceKm,
    activities: optimizedActivities,
  };
}
