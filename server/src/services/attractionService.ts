export type AttractionCategory =
  | "sightseeing"
  | "nature"
  | "culture"
  | "food"
  | "relaxation"
  | "shopping"
  | "adventure";

export interface RealAttraction {
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

interface DestinationArea {
  aliases: string[];
  bbox: string;
}

interface CacheEntry {
  expiresAt: number;
  attractions: RealAttraction[];
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const AREAS: DestinationArea[] = [
  { aliases: ["agra"], bbox: "27.10,78.00,27.25,78.10" },
  { aliases: ["jaipur"], bbox: "26.80,75.70,27.05,75.90" },
  { aliases: ["delhi", "new delhi"], bbox: "28.45,76.95,28.80,77.35" },
  { aliases: ["goa"], bbox: "14.85,73.70,15.75,74.30" },
  { aliases: ["kerala", "kochi", "cochin"], bbox: "9.85,76.15,10.15,76.40" },
  { aliases: ["mumbai", "bombay"], bbox: "18.85,72.75,19.30,73.05" },
  { aliases: ["varanasi", "banaras"], bbox: "25.20,82.90,25.45,83.15" },
  { aliases: ["manali"], bbox: "32.15,77.05,32.35,77.30" },
  { aliases: ["udaipur"], bbox: "24.50,73.60,24.65,73.75" },
  { aliases: ["rishikesh"], bbox: "30.05,78.20,30.15,78.35" },
];

const CURATED: Record<string, RealAttraction[]> = {
  agra: [
    curated("agra-taj-mahal", "Taj Mahal", "culture", 27.1751, 78.0421),
    curated("agra-fort", "Agra Fort", "culture", 27.1795, 78.0211),
    curated("agra-mehtab-bagh", "Mehtab Bagh", "nature", 27.1800, 78.0420),
    curated("agra-itmad-ud-daulah", "Itmad-ud-Daulah", "culture", 27.1929, 78.0311),
    curated("agra-fatehpur-sikri", "Fatehpur Sikri", "culture", 27.0945, 77.6679),
    curated("agra-akbar-tomb", "Akbar's Tomb (Sikandra)", "culture", 27.2206, 77.9505),
  ],
  jaipur: [
    curated("jaipur-amber-fort", "Amber Fort", "culture", 26.9855, 75.8513),
    curated("jaipur-hawa-mahal", "Hawa Mahal", "culture", 26.9239, 75.8267),
    curated("jaipur-city-palace", "City Palace", "culture", 26.9258, 75.8237),
    curated("jaipur-jantar-mantar", "Jantar Mantar", "culture", 26.9248, 75.8246),
    curated("jaipur-jal-mahal", "Jal Mahal", "sightseeing", 26.9535, 75.8462),
    curated("jaipur-nahargarh", "Nahargarh Fort", "nature", 26.9372, 75.8155),
  ],
  delhi: [
    curated("delhi-red-fort", "Red Fort", "culture", 28.6562, 77.2410),
    curated("delhi-qutub-minar", "Qutub Minar", "culture", 28.5244, 77.1855),
    curated("delhi-humayun-tomb", "Humayun's Tomb", "culture", 28.5933, 77.2507),
    curated("delhi-india-gate", "India Gate", "sightseeing", 28.6129, 77.2295),
    curated("delhi-lotus-temple", "Lotus Temple", "culture", 28.5535, 77.2588),
    curated("delhi-jama-masjid", "Jama Masjid", "culture", 28.6507, 77.2334),
  ],
  goa: [
    curated("goa-baga-beach", "Baga Beach", "nature", 15.5557, 73.7517),
    curated("goa-basilica-bom-jesus", "Basilica of Bom Jesus", "culture", 15.5009, 73.9115),
    curated("goa-fort-aguada", "Fort Aguada", "sightseeing", 15.4925, 73.7736),
    curated("goa-dudhsagar", "Dudhsagar Falls", "nature", 15.3144, 74.3143),
    curated("goa-anjuna-beach", "Anjuna Beach", "nature", 15.5733, 73.7411),
    curated("goa-chapora-fort", "Chapora Fort", "culture", 15.6056, 73.7364),
  ],
  kerala: [
    curated("kerala-fort-kochi", "Fort Kochi", "culture", 9.9658, 76.2421),
    curated("kerala-chinese-fishing-nets", "Chinese Fishing Nets", "sightseeing", 9.9675, 76.2428),
    curated("kerala-mattancherry", "Mattancherry Palace", "culture", 9.9583, 76.2592),
    curated("kerala-alleppey", "Alleppey Backwaters", "nature", 9.4981, 76.3388),
    curated("kerala-munnar", "Munnar Tea Gardens", "nature", 10.0889, 77.0595),
  ],
  kochi: [
    curated("kochi-fort-kochi", "Fort Kochi", "culture", 9.9658, 76.2421),
    curated("kochi-chinese-fishing-nets", "Chinese Fishing Nets", "sightseeing", 9.9675, 76.2428),
    curated("kochi-mattancherry", "Mattancherry Palace", "culture", 9.9583, 76.2592),
    curated("kochi-alleppey", "Alleppey Backwaters", "nature", 9.4981, 76.3388),
    curated("kochi-munnar", "Munnar Tea Gardens", "nature", 10.0889, 77.0595),
  ],
  mumbai: [
    curated("mumbai-gateway", "Gateway of India", "culture", 18.9220, 72.8347),
    curated("mumbai-elephanta", "Elephanta Caves", "culture", 18.9633, 72.9315),
    curated("mumbai-marine-drive", "Marine Drive", "sightseeing", 18.9432, 72.8234),
    curated("mumbai-cst", "Chhatrapati Shivaji Terminus", "culture", 18.9401, 72.8354),
  ],
  varanasi: [
    curated("varanasi-dashashwamedh", "Dashashwamedh Ghat", "culture", 25.3068, 83.0107),
    curated("varanasi-assi", "Assi Ghat", "culture", 25.2908, 83.0063),
    curated("varanasi-kashi-vishwanath", "Kashi Vishwanath Temple", "culture", 25.3109, 83.0107),
    curated("varanasi-sarnath", "Sarnath", "culture", 25.3811, 83.0214),
  ],
  manali: [
    curated("manali-hadimba", "Hadimba Temple", "culture", 32.2480, 77.1770),
    curated("manali-solang", "Solang Valley", "nature", 32.3167, 77.1583),
    curated("manali-jogini", "Jogini Waterfall", "nature", 32.2680, 77.1890),
    curated("manali-vashisht", "Vashisht Hot Springs", "relaxation", 32.2612, 77.1873),
    curated("manali-rohtang", "Rohtang Pass Viewpoint", "adventure", 32.3716, 77.2466),
  ],
  udaipur: [
    curated("udaipur-city-palace", "City Palace", "culture", 24.5764, 73.6835),
    curated("udaipur-lake-pichola", "Lake Pichola", "nature", 24.5750, 73.6775),
    curated("udaipur-jag-mandir", "Jag Mandir", "culture", 24.5678, 73.6781),
    curated("udaipur-saheliyon", "Saheliyon-ki-Bari", "nature", 24.6030, 73.6874),
    curated("udaipur-fateh-sagar", "Fateh Sagar Lake", "nature", 24.6025, 73.6720),
    curated("udaipur-monsoon-palace", "Monsoon Palace (Sajjangarh)", "sightseeing", 24.5919, 73.6375),
  ],
  rishikesh: [
    curated("rishikesh-laxman-jhula", "Laxman Jhula", "sightseeing", 30.1342, 78.3275),
    curated("rishikesh-ram-jhula", "Ram Jhula", "sightseeing", 30.1232, 78.3142),
    curated("rishikesh-triveni-ghat", "Triveni Ghat", "culture", 30.1030, 78.2974),
    curated("rishikesh-beatles-ashram", "Beatles Ashram", "culture", 30.1171, 78.3147),
    curated("rishikesh-parmarth", "Parmarth Niketan", "relaxation", 30.1202, 78.3134),
    curated("rishikesh-neer-waterfall", "Neer Garh Waterfall", "nature", 30.1472, 78.3444),
  ],
};

function curated(
  id: string,
  name: string,
  category: AttractionCategory,
  latitude: number,
  longitude: number
): RealAttraction {
  return {
    id,
    name,
    category,
    latitude,
    longitude,
    mapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
    source: "curated",
    sourceLabel: "TravelMate curated starter record",
    estimatedDurationMinutes: 120,
  };
}

function findArea(destinationName: string): DestinationArea | undefined {
  const normalized = destinationName.toLowerCase();
  return AREAS.find((area) =>
    area.aliases.some((alias) => normalized.includes(alias))
  );
}

function categoryFromTags(tags: Record<string, string>): AttractionCategory {
  if (tags.tourism === "museum" || tags.historic || tags.amenity === "place_of_worship") {
    return "culture";
  }
  if (tags.tourism === "viewpoint" || tags.natural || tags.leisure === "beach_resort") {
    return "nature";
  }
  if (tags.tourism === "hotel" || tags.leisure === "park") {
    return "relaxation";
  }
  if (tags.shop) return "shopping";
  if (tags.amenity === "restaurant" || tags.amenity === "cafe") return "food";
  return "sightseeing";
}

function mapElement(element: {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}): RealAttraction | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    latitude,
    longitude,
    category: categoryFromTags(tags),
    locality: tags["addr:city"] || tags["addr:suburb"],
    mapUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    source: "openstreetmap",
    sourceLabel: "OpenStreetMap contributors",
    estimatedDurationMinutes: tags.tourism === "museum" ? 150 : 120,
  };
}

async function fetchFromOverpass(area: DestinationArea): Promise<RealAttraction[]> {
  const query = `[out:json][timeout:12];(nwr["tourism"](${area.bbox});nwr["historic"](${area.bbox});nwr["natural"](${area.bbox});nwr["amenity"="place_of_worship"](${area.bbox}););out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TravelMate/1.0 (college project)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Overpass returned HTTP ${response.status}`);
  }
  const result = (await response.json()) as { elements?: Array<Parameters<typeof mapElement>[0]> };
  const unique = new Map<string, RealAttraction>();
  for (const element of result.elements ?? []) {
    const attraction = mapElement(element);
    if (attraction && !unique.has(attraction.name.toLowerCase())) {
      unique.set(attraction.name.toLowerCase(), attraction);
    }
  }
  return [...unique.values()].slice(0, 80);
}

export async function getAttractions(destinationName: string): Promise<{
  attractions: RealAttraction[];
  source: "openstreetmap" | "cached" | "curated";
  warning?: string;
}> {
  const key = destinationName.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { attractions: cached.attractions, source: "cached" };
  }

  const area = findArea(destinationName);
  if (!area) {
    return {
      attractions: [],
      source: "curated",
      warning: "No mapped area is configured for this destination yet.",
    };
  }

  try {
    const attractions = await fetchFromOverpass(area);
    if (attractions.length > 0) {
      cache.set(key, { attractions, expiresAt: Date.now() + CACHE_TTL_MS });
      return { attractions, source: "openstreetmap" };
    }
    throw new Error("Overpass returned no named attractions.");
  } catch (error) {
    const curatedKey = area.aliases.find((alias) => CURATED[alias]);
    const attractions = curatedKey ? CURATED[curatedKey] : [];
    return {
      attractions,
      source: "curated",
      warning:
        "Live map data is temporarily unavailable; showing curated starter records where available.",
    };
  }
}
