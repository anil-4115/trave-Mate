export interface TravelImage {
  key: string;
  imageUrl: string;
  sourcePageUrl: string;
  attribution: string;
  license: string;
}

const images: TravelImage[] = [
  // --- DESTINATION COVERS ---
  {
    key: "agra",
    imageUrl: "/images/destinations/agra-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Taj_Mahal,_Agra,_India_edit2.jpg",
    attribution: "Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    key: "kerala",
    imageUrl: "/images/destinations/kochi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Chinese_Fishing_Nets_-_2.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "jaipur",
    imageUrl: "/images/destinations/jaipur-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/Category:Jaipur",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "delhi",
    imageUrl: "/images/destinations/delhi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:India_Gate_1_(New_Delhi).jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "goa",
    imageUrl: "/images/destinations/goa-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Palolem_beach.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "kochi",
    imageUrl: "/images/destinations/kochi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Chinese_Fishing_Nets_-_2.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "mumbai",
    imageUrl: "/images/destinations/mumbai-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Taj_Palace_Hotel_and_Taj_Tower_with_the_iconic_Gateway_of_India_in_the_background.jpg",
    attribution: "Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    key: "varanasi",
    imageUrl: "/images/destinations/varanasi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Varanasi_Munshi_Ghat3.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "manali",
    imageUrl: "/images/destinations/manali-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Yaks_on_Manali,_Himachal_Pradesh.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "udaipur",
    imageUrl: "/images/destinations/udaipur-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/Category:Udaipur",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "rishikesh",
    imageUrl: "/images/destinations/rishikesh-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/Category:Rishikesh",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },

  // --- DISTINCT ATTRACTIONS: AGRA ---
  {
    key: "taj mahal",
    imageUrl: "/images/destinations/agra-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Taj_Mahal,_Agra,_India_edit2.jpg",
    attribution: "Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    key: "agra fort",
    imageUrl: "https://images.unsplash.com/photo-1592635196078-9fdc757f27f4?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "mehtab bagh",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "fatehpur sikri",
    imageUrl: "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "itmad",
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "akbar",
    imageUrl: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "sikandra",
    imageUrl: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: DELHI ---
  {
    key: "red fort",
    imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "india gate",
    imageUrl: "/images/destinations/delhi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:India_Gate_1_(New_Delhi).jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "qutub minar",
    imageUrl: "https://images.unsplash.com/photo-1545126178-862ffb5625d3?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "humayun",
    imageUrl: "https://images.unsplash.com/photo-1608958435020-e8a7109ba809?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "lotus temple",
    imageUrl: "https://images.unsplash.com/photo-1597040663342-45b6af3d91a5?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "jama masjid",
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: JAIPUR ---
  {
    key: "hawa mahal",
    imageUrl: "/images/destinations/jaipur-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "amber fort",
    imageUrl: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "city palace",
    imageUrl: "https://images.unsplash.com/photo-1603258849045-8c0ec8bb5a67?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "jal mahal",
    imageUrl: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "jantar mantar",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "nahargarh",
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: GOA ---
  {
    key: "baga beach",
    imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "basilica",
    imageUrl: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "fort aguada",
    imageUrl: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "dudhsagar",
    imageUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "anjuna",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "chapora",
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: KERALA / KOCHI ---
  {
    key: "fort kochi",
    imageUrl: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "chinese fishing nets",
    imageUrl: "/images/destinations/kochi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Chinese_Fishing_Nets_-_2.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "mattancherry",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "alleppey",
    imageUrl: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "munnar",
    imageUrl: "https://images.unsplash.com/photo-1590740924908-144a19438965?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: MUMBAI ---
  {
    key: "gateway of india",
    imageUrl: "/images/destinations/mumbai-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Taj_Palace_Hotel_and_Taj_Tower_with_the_iconic_Gateway_of_India_in_the_background.jpg",
    attribution: "Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    key: "elephanta",
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "marine drive",
    imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "chhatrapati shivaji terminus",
    imageUrl: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "cst",
    imageUrl: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: MANALI ---
  {
    key: "hadimba",
    imageUrl: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "solang",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "jogini",
    imageUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "vashisht",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "rohtang",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: VARANASI ---
  {
    key: "dashashwamedh",
    imageUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "assi ghat",
    imageUrl: "/images/destinations/varanasi-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Varanasi_Munshi_Ghat3.jpg",
    attribution: "Wikimedia Commons",
    license: "See file page",
  },
  {
    key: "kashi vishwanath",
    imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "sarnath",
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: UDAIPUR ---
  {
    key: "lake pichola",
    imageUrl: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "jag mandir",
    imageUrl: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "saheliyon",
    imageUrl: "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "fateh sagar",
    imageUrl: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "monsoon palace",
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },

  // --- DISTINCT ATTRACTIONS: RISHIKESH ---
  {
    key: "laxman jhula",
    imageUrl: "https://images.unsplash.com/photo-1600100397608-f010e42e584f?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "ram jhula",
    imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "triveni ghat",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "beatles ashram",
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "parmarth",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
  {
    key: "neer",
    imageUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=400&q=80",
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  },
];

export function findTravelImage(value: string | undefined): TravelImage | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  const matches = images.filter((image) => normalized.includes(image.key));
  if (matches.length === 0) return undefined;
  // Specific longer attraction keys win over generic city names
  matches.sort((a, b) => b.key.length - a.key.length);
  return matches[0];
}

const FALLBACK_ATTRACTION_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=400&q=80",
];

export function getAttractionImage(
  attractionName: string,
  destinationName?: string,
  index = 0
): TravelImage {
  const direct = findTravelImage(attractionName);
  // Ensure we didn't just match the destination cover photo
  if (direct && direct.key !== destinationName?.toLowerCase()) {
    return direct;
  }
  const fallbackUrl = FALLBACK_ATTRACTION_IMAGES[index % FALLBACK_ATTRACTION_IMAGES.length];
  return {
    key: attractionName.toLowerCase(),
    imageUrl: fallbackUrl,
    sourcePageUrl: "https://unsplash.com",
    attribution: "Unsplash",
    license: "Unsplash License",
  };
}

export function getDestinationImage(
  destinationName: string | undefined,
  existingUrl?: string
): TravelImage | undefined {
  const localImage = findTravelImage(destinationName);
  if (localImage) return localImage;
  if (existingUrl?.startsWith("/")) {
    return {
      key: destinationName?.toLowerCase() || "destination",
      imageUrl: existingUrl,
      sourcePageUrl: "",
      attribution: "Destination image",
      license: "Provided by destination data",
    };
  }
  return findTravelImage(destinationName);
}

export const authBackgroundImage = findTravelImage("agra");
