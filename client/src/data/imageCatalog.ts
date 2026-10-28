export interface TravelImage {
  key: string;
  imageUrl: string;
  sourcePageUrl: string;
  attribution: string;
  license: string;
}

const images: TravelImage[] = [
  {
    key: "agra",
    imageUrl: "/images/destinations/agra-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Taj_Mahal,_Agra,_India_edit2.jpg",
    attribution: "Wikimedia Commons",
    license: "CC BY-SA 4.0; see file page",
  },
  {
    key: "hawa mahal",
    imageUrl: "/images/destinations/jaipur-cover.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg",
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
    license: "CC BY-SA 4.0; see file page",
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
];

export function findTravelImage(value: string | undefined): TravelImage | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return images.find((image) => normalized.includes(image.key));
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
