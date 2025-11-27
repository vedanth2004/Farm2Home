import { prisma } from "@/lib/prisma";
import opencage from "opencage-api-client";

// ============================================================================
// CONSTANTS
// ============================================================================

const EARTH_RADIUS_KM = 6371;
const CR_OPERATIONAL_RADIUS_KM = 50; // CRs control 50km radius zone
const FARMER_TO_CR_MAX_DISTANCE_KM = 50; // Farmers must be within 50km of CR
const CUSTOMER_TO_FARMER_MAX_DISTANCE_KM = 50; // Customers see farmers within 50km
const AGENT_DELIVERY_RADIUS_KM = 30; // Agents deliver within 30km

// ============================================================================
// TYPES
// ============================================================================

export interface LocationData {
  latitude: number;
  longitude: number;
  pincode: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
}

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

export interface DistanceCheckResult {
  withinRange: boolean;
  distanceKm: number;
}

export interface NearestEntityResult<T> {
  entity: T;
  distanceKm: number;
}

// ============================================================================
// HAVERSINE DISTANCE CALCULATION
// ============================================================================

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two points on Earth using Haversine formula
 *
 * Formula: d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat₁) × cos(lat₂) × sin²(Δlon/2)))
 * where R = 6371 km (Earth's radius)
 *
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.asin(Math.sqrt(a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance between two coordinate points
 */
export function calculateDistance(
  point1: CoordinatePoint,
  point2: CoordinatePoint,
): number {
  return calculateHaversineDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude,
  );
}

// ============================================================================
// PINCODE TO COORDINATES (OpenCage API)
// ============================================================================

/**
 * Fetch location data for a PIN code using OpenCage API
 * Returns latitude, longitude, district, state, etc.
 */
export async function geocodePincode(
  pincode: string,
): Promise<LocationData | null> {
  try {
    const API_KEY = process.env.OPENCAGE_KEY || process.env.OPENCAGE_API_KEY;
    if (!API_KEY) {
      console.warn(
        "OPENCAGE_KEY not set, using fallback geocoding (Nominatim)",
      );
      // Fallback: use Nominatim directly (more reliable than wrapper)
      try {
        const NOMINATIM_URL =
          process.env.NOMINATIM_BASE_URL ||
          "https://nominatim.openstreetmap.org";
        const response = await fetch(
          `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(`${pincode}, India`)}&limit=1&countrycodes=in`,
          {
            headers: {
              "User-Agent": "Farm2Home/1.0 (contact@farm2home.com)",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Nominatim request failed");
        }

        const results = await response.json();

        if (!results || results.length === 0) {
          console.warn(`No Nominatim results for pincode: ${pincode}`);
          return null;
        }

        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`Invalid coordinates for pincode: ${pincode}`);
          return null;
        }

        // Parse address components - Nominatim structure can vary
        const address = result.address || {};
        const displayName = result.display_name || "";

        // Try to extract city/state from address or display_name
        let city =
          address.city || address.town || address.village || address.suburb;
        let state = address.state || address.state_district || address.region;

        // If not in address, try parsing from display_name
        if (!city || !state) {
          const parts = displayName.split(",").map((s: string) => s.trim());
          // Usually format is: "City, State, Country"
          if (parts.length >= 2 && !city) {
            city = parts[0];
          }
          if (parts.length >= 2 && !state) {
            state = parts[1];
          }
        }

        return {
          latitude: lat,
          longitude: lon,
          pincode,
          city: city || undefined,
          state: state || undefined,
          country: address.country || "India",
        };
      } catch (error: any) {
        console.error(
          `Nominatim geocoding error for ${pincode}:`,
          error.message,
        );
        return null;
      }
    }

    const response = await opencage.geocode({
      q: `${pincode}, India`,
      key: API_KEY,
      countrycode: "in",
      limit: 1,
    });

    if (
      !response ||
      !response.status ||
      response.status.code !== 200 ||
      !response.results ||
      response.results.length === 0
    ) {
      console.warn(`No results for pincode: ${pincode}`);
      return null;
    }

    const result = response.results[0];
    const components = result.components || {};

    // Type assertion to allow access to additional OpenCage properties
    const componentsAny = components as any;

    // Verify it's in India
    const country =
      components.country || components.country_code?.toUpperCase() || "";
    if (
      country !== "India" &&
      country !== "IN" &&
      components.country_code !== "in"
    ) {
      console.warn(`Pincode ${pincode} is not in India`);
      return null;
    }

    return {
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      pincode,
      city:
        components.city ||
        components.town ||
        components.suburb ||
        components.village ||
        undefined,
      state: components.state || componentsAny.state_district || undefined,
      district:
        components.county ||
        componentsAny.state_district ||
        componentsAny.region ||
        undefined,
      country: components.country || "India",
    };
  } catch (error: any) {
    console.error(`Geocoding error for pincode ${pincode}:`, error.message);
    return null;
  }
}

/**
 * Get or fetch coordinates for a PIN code and update address if needed
 */
export async function getCoordinatesForPincode(
  pincode: string,
  addressId?: string,
): Promise<CoordinatePoint | null> {
  // First, try to get from existing address if addressId provided
  if (addressId) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      select: { lat: true, lon: true },
    });

    if (address?.lat && address?.lon) {
      return {
        latitude: address.lat,
        longitude: address.lon,
      };
    }
  }

  // Try to find any address with this pincode that has coordinates
  const existingAddress = await prisma.address.findFirst({
    where: {
      postalCode: pincode,
      lat: { not: null },
      lon: { not: null },
    },
    select: { lat: true, lon: true },
  });

  if (existingAddress?.lat && existingAddress?.lon) {
    return {
      latitude: existingAddress.lat,
      longitude: existingAddress.lon,
    };
  }

  // Fetch from OpenCage API
  const location = await geocodePincode(pincode);
  if (!location) {
    return null;
  }

  // Update address if addressId provided
  if (addressId) {
    try {
      await prisma.address.update({
        where: { id: addressId },
        data: {
          lat: location.latitude,
          lon: location.longitude,
        },
      });
    } catch (error) {
      console.error("Failed to update address coordinates:", error);
    }
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

// ============================================================================
// CR REGISTRATION: DISTANCE CHECK
// ============================================================================

/**
 * Check if new CR location conflicts with existing CRs (within 50km)
 * Used during CR registration approval
 */
export async function checkCRRegistrationDistance(newPincode: string): Promise<{
  canRegister: boolean;
  reason?: string;
  conflictingCR?: any;
  distanceKm?: number;
  location?: LocationData;
}> {
  const location = await geocodePincode(newPincode);
  if (!location) {
    return {
      canRegister: false,
      reason: "Invalid or unresolvable pincode",
    };
  }

  // Get all existing approved CRs with their coordinates
  const existingCRs = await prisma.cRProfile.findMany({
    where: {
      user: {
        accountStatus: "APPROVED",
      },
    },
    include: {
      user: {
        include: {
          addresses: {
            where: {
              lat: { not: null },
              lon: { not: null },
            },
            take: 1,
          },
        },
      },
    },
  });

  // Check distance to each existing CR
  for (const cr of existingCRs) {
    const crAddress = cr.user.addresses[0];
    if (!crAddress?.lat || !crAddress?.lon) {
      continue; // Skip CRs without coordinates
    }

    const distance = calculateHaversineDistance(
      location.latitude,
      location.longitude,
      crAddress.lat,
      crAddress.lon,
    );

    if (distance <= CR_OPERATIONAL_RADIUS_KM) {
      return {
        canRegister: false,
        reason: `Too close to existing CR (${distance.toFixed(2)} km away)`,
        conflictingCR: {
          id: cr.id,
          displayId: cr.user.displayId,
          name: cr.user.name,
        },
        distanceKm: distance,
        location,
      };
    }
  }

  return {
    canRegister: true,
    location,
  };
}

// ============================================================================
// FARMER REGISTRATION: FIND NEAREST CR
// ============================================================================

/**
 * Find nearest CR within 50km for farmer registration
 */
export async function findNearestCRForFarmer(farmerPincode: string): Promise<{
  crFound: boolean;
  crId?: string;
  distanceKm?: number;
  reason?: string;
  location?: LocationData;
}> {
  const location = await geocodePincode(farmerPincode);
  if (!location) {
    return {
      crFound: false,
      reason: "Invalid or unresolvable pincode",
    };
  }

  // Get all approved CRs with coordinates
  const existingCRs = await prisma.cRProfile.findMany({
    where: {
      user: {
        accountStatus: "APPROVED",
      },
    },
    include: {
      user: {
        include: {
          addresses: {
            where: {
              lat: { not: null },
              lon: { not: null },
            },
            take: 1,
          },
        },
      },
    },
  });

  let nearestCR: {
    crId: string;
    distanceKm: number;
  } | null = null;

  // Find nearest CR within 50km
  for (const cr of existingCRs) {
    const crAddress = cr.user.addresses[0];
    if (!crAddress?.lat || !crAddress?.lon) {
      continue;
    }

    const distance = calculateHaversineDistance(
      location.latitude,
      location.longitude,
      crAddress.lat,
      crAddress.lon,
    );

    if (
      distance <= FARMER_TO_CR_MAX_DISTANCE_KM &&
      (!nearestCR || distance < nearestCR.distanceKm)
    ) {
      nearestCR = {
        crId: cr.id,
        distanceKm: distance,
      };
    }
  }

  if (!nearestCR) {
    return {
      crFound: false,
      reason: `No CR found within ${FARMER_TO_CR_MAX_DISTANCE_KM}km radius`,
      location,
    };
  }

  return {
    crFound: true,
    crId: nearestCR.crId,
    distanceKm: nearestCR.distanceKm,
    location,
  };
}

// ============================================================================
// CUSTOMER PRODUCT VISIBILITY: FILTER BY 50KM
// ============================================================================

/**
 * Filter farmers visible to customer (within 50km)
 */
export async function filterFarmersByDistance(
  customerPincode: string,
  farmerIds?: string[],
): Promise<string[]> {
  const customerLocation = await geocodePincode(customerPincode);
  if (!customerLocation) {
    console.warn(`Could not geocode customer pincode: ${customerPincode}`);
    return []; // No location = no visibility
  }

  // Get farmers with their addresses
  const farmers = await prisma.farmerProfile.findMany({
    where: {
      ...(farmerIds && farmerIds.length > 0 ? { id: { in: farmerIds } } : {}),
      user: {
        accountStatus: "APPROVED",
        addresses: {
          some: {
            lat: { not: null },
            lon: { not: null },
          },
        },
      },
    },
    include: {
      user: {
        include: {
          addresses: {
            where: {
              lat: { not: null },
              lon: { not: null },
            },
            take: 1,
          },
        },
      },
    },
  });

  const visibleFarmerIds: string[] = [];

  for (const farmer of farmers) {
    const farmerAddress = farmer.user.addresses[0];
    if (!farmerAddress?.lat || !farmerAddress?.lon) {
      continue;
    }

    const distance = calculateHaversineDistance(
      customerLocation.latitude,
      customerLocation.longitude,
      farmerAddress.lat,
      farmerAddress.lon,
    );

    if (distance <= CUSTOMER_TO_FARMER_MAX_DISTANCE_KM) {
      visibleFarmerIds.push(farmer.id);
    }
  }

  return visibleFarmerIds;
}

// ============================================================================
// AGENT ASSIGNMENT: 30KM DELIVERY RADIUS
// ============================================================================

/**
 * Find nearest available agent within 30km for delivery
 */
export async function findNearestAgentForDelivery(
  customerPincode: string,
): Promise<{
  agentFound: boolean;
  agentId?: string;
  distanceKm?: number;
  agentPincode?: string;
  reason?: string;
}> {
  const customerLocation = await geocodePincode(customerPincode);
  if (!customerLocation) {
    return {
      agentFound: false,
      reason: "Could not geocode customer location",
    };
  }

  // Get all available agents with coordinates
  const agents = await prisma.pickupAgentProfile.findMany({
    where: {
      user: {
        accountStatus: "APPROVED",
        addresses: {
          some: {
            lat: { not: null },
            lon: { not: null },
          },
        },
      },
    },
    include: {
      user: {
        include: {
          addresses: {
            where: {
              lat: { not: null },
              lon: { not: null },
            },
            take: 1,
          },
        },
      },
    },
  });

  let nearestAgent: {
    agentId: string;
    distanceKm: number;
    agentPincode: string;
  } | null = null;

  // Find nearest agent within 30km
  for (const agent of agents) {
    const agentAddress = agent.user.addresses[0];
    if (!agentAddress?.lat || !agentAddress?.lon) {
      continue;
    }

    const distance = calculateHaversineDistance(
      customerLocation.latitude,
      customerLocation.longitude,
      agentAddress.lat,
      agentAddress.lon,
    );

    if (
      distance <= AGENT_DELIVERY_RADIUS_KM &&
      (!nearestAgent || distance < nearestAgent.distanceKm)
    ) {
      nearestAgent = {
        agentId: agent.id,
        distanceKm: distance,
        agentPincode: agentAddress.postalCode || "",
      };
    }
  }

  if (!nearestAgent) {
    return {
      agentFound: false,
      reason: `No agent found within ${AGENT_DELIVERY_RADIUS_KM}km radius`,
    };
  }

  return {
    agentFound: true,
    agentId: nearestAgent.agentId,
    distanceKm: nearestAgent.distanceKm,
    agentPincode: nearestAgent.agentPincode,
  };
}

/**
 * Find farmers within 50km for order pickup
 */
export async function findFarmersWithinPickupRadius(
  orderItems: Array<{ listingId: string }>,
): Promise<{
  farmers: Array<{ farmerId: string; distanceKm: number }>;
  allWithinRange: boolean;
}> {
  // Get all unique farmers from order items
  const listings = await prisma.productListing.findMany({
    where: {
      id: { in: orderItems.map((item) => item.listingId) },
    },
    include: {
      product: {
        include: {
          farmer: {
            include: {
              user: {
                include: {
                  addresses: {
                    where: {
                      lat: { not: null },
                      lon: { not: null },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const farmers: Array<{ farmerId: string; distanceKm: number }> = [];
  let allWithinRange = true;

  for (const listing of listings) {
    const farmerAddress = listing.product.farmer.user.addresses[0];
    if (!farmerAddress?.lat || !farmerAddress?.lon) {
      allWithinRange = false;
      continue;
    }

    // For now, we don't have customer location in this context
    // This function would be called with customer coordinates
    // For now, just collect farmer IDs
    farmers.push({
      farmerId: listing.product.farmer.id,
      distanceKm: 0, // Will be calculated when customer location is available
    });
  }

  return { farmers, allWithinRange };
}

// ============================================================================
// HELPER: UPDATE ADDRESS COORDINATES
// ============================================================================

/**
 * Update address coordinates from pincode if not already set
 */
export async function updateAddressCoordinates(
  addressId: string,
  pincode: string,
): Promise<boolean> {
  try {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      return false;
    }

    // If coordinates already exist, don't update
    if (address.lat && address.lon) {
      return true;
    }

    const location = await geocodePincode(pincode);
    if (!location) {
      return false;
    }

    await prisma.address.update({
      where: { id: addressId },
      data: {
        lat: location.latitude,
        lon: location.longitude,
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to update address coordinates:", error);
    return false;
  }
}
