interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface ReverseGeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `${process.env.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "Farm2Home/1.0 (contact@farm2home.com)",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const results = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      display_name: result.display_name,
      address: result.address,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<ReverseGeocodingResult | null> {
  try {
    const response = await fetch(
      `${process.env.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent": "Farm2Home/1.0 (contact@farm2home.com)",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding request failed");
    }

    const result = await response.json();

    return {
      lat: result.lat,
      lon: result.lon,
      display_name: result.display_name,
      address: result.address,
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateETA(
  distance: number,
  averageSpeed: number = 30,
): number {
  // Distance in km, average speed in km/h
  return (distance / averageSpeed) * 60; // Return ETA in minutes
}
