import { CRProfile, UserRole, Prisma } from "@prisma/client";

/**
 * Creates a comprehensive filter for CR service areas
 * Filters orders by customer address city, state, and postal code
 */
export function createCRServiceAreaFilter(crProfile: CRProfile) {
  return {
    OR: [
      // Filter by customer address city
      {
        customer: {
          addresses: {
            some: {
              city: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
      },
      // Filter by customer address state
      {
        customer: {
          addresses: {
            some: {
              state: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
      },
      // Filter by customer address pincode
      {
        customer: {
          addresses: {
            some: {
              postalCode: {
                in: crProfile.serviceAreas,
              },
            },
          },
        },
      },
    ],
  };
}

/**
 * Creates a comprehensive filter for pickup jobs in CR service areas
 */
export function createCRPickupJobFilter(crProfile: CRProfile) {
  return {
    order: createCRServiceAreaFilter(crProfile),
  };
}

/**
 * Creates a filter for farmers in CR service areas
 * Filters farmers by their own address city, state, and postal code
 */
export function createCRFarmerFilter(crProfile: CRProfile) {
  return {
    role: "FARMER" as UserRole,
    OR: [
      {
        addresses: {
          some: {
            city: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
      {
        addresses: {
          some: {
            state: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
      {
        addresses: {
          some: {
            postalCode: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
    ],
  };
}

/**
 * Creates a filter for pickup agents in CR service areas
 * Filters agents by their own address city, state, and postal code
 */
export function createCRAgentFilter(
  crProfile: CRProfile,
): Prisma.UserWhereInput {
  return {
    role: "PICKUP_AGENT",
    OR: [
      {
        addresses: {
          some: {
            city: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
      {
        addresses: {
          some: {
            state: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
      {
        addresses: {
          some: {
            postalCode: {
              in: crProfile.serviceAreas,
            },
          },
        },
      },
    ],
  };
}
