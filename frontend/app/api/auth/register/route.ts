import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { generateDisplayId } from "@/lib/utils/display-id";
import { createAuditLog } from "@/lib/utils/audit-log";
import {
  checkCRRegistrationDistance,
  findNearestCRForFarmer,
  geocodePincode,
  updateAddressCoordinates,
} from "@/lib/geocoding-distance";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = "CUSTOMER",
      // Location fields
      address,
      city,
      state,
      pincode,
      // Farmer specific fields
      govtId,
      upiId,
      description,
      // Agent specific fields
      vehicleType,
      serviceAreas,
      // CR specific fields
      experience,
    } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate location fields for all roles
    if (!address || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "Location information is required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with role-specific profiles
    const user = await prisma.$transaction(async (tx) => {
      // Determine account status: ADMIN and CUSTOMER are auto-approved, others need verification
      const accountStatus =
        role === "ADMIN" || role === "CUSTOMER"
          ? AccountStatus.APPROVED
          : AccountStatus.PENDING_VERIFICATION;

      // Generate IDs
      const internalId = uuidv4();
      const displayId = generateDisplayId(role as any);

      // Create user with IDs
      const newUser = await tx.user.create({
        data: {
          internalId,
          displayId,
          name,
          email,
          phone,
          password: hashedPassword,
          role: role as any,
          accountStatus,
          twoFactorEnabled: false,
          locale: "en",
        },
      });

      // Geocode pincode to get coordinates, district, and other location data
      const locationData = await geocodePincode(pincode);
      const latitude = locationData?.latitude || null;
      const longitude = locationData?.longitude || null;
      const district = locationData?.district || null;
      const geocodedCity = locationData?.city || city;
      const geocodedState = locationData?.state || state;

      // Create address with coordinates and district
      const userAddress = await tx.address.create({
        data: {
          userId: newUser.id,
          label: "Primary",
          line1: address,
          city: geocodedCity || city,
          district: district, // Store district from geocoding
          state: geocodedState || state,
          postalCode: pincode,
          country: "India",
          lat: latitude,
          lon: longitude,
        },
      });

      // For farmers, optionally find nearest CR (no distance requirement)
      // Store CR assignment and distance in FarmerProfile
      let farmerCRId: string | null = null;
      let farmerDistanceToCR: number | null = null;

      if (role === "FARMER") {
        // Find nearest CR if available (optional - no distance restriction)
        const nearestCR = await findNearestCRForFarmer(pincode);

        // Assign CR if found, but don't block registration if none available
        if (nearestCR.crFound) {
          farmerCRId = nearestCR.crId || null;
          farmerDistanceToCR = nearestCR.distanceKm || null;
        }
        // If no CR found, farmer can still register without CR assignment
      }

      // Create role-specific profiles
      if (role === "FARMER") {
        await tx.farmerProfile.create({
          data: {
            userId: newUser.id,
            govtId: govtId || null,
            upiId: upiId || null,
            verified: false,
            crId: farmerCRId, // Store assigned CR ID
            distanceToCR: farmerDistanceToCR ? farmerDistanceToCR : null, // Store distance to CR
          },
        });

        // Create approval request for farmers
        await tx.approvalRequest.create({
          data: {
            userId: newUser.id,
            displayId: displayId,
            role: role as any,
            status: "PENDING",
          },
        });
      } else if (role === "PICKUP_AGENT") {
        await tx.pickupAgentProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: vehicleType || "Bike",
            serviceAreas: serviceAreas
              ? serviceAreas.split(",").map((area: string) => area.trim())
              : [city],
          },
        });

        // Create approval request for agents
        await tx.approvalRequest.create({
          data: {
            userId: newUser.id,
            displayId: displayId,
            role: role as any,
            status: "PENDING",
          },
        });
      } else if (role === "CR") {
        // CR registration - no distance restrictions (CRs can register anywhere)
        // Still call the function to get location data, but it won't block registration
        await checkCRRegistrationDistance(pincode);

        // Update serviceAreas with dynamic pincode-to-radius logic
        // Include city, state, pincode, and district if available
        const crServiceAreas = [
          geocodedCity || city,
          geocodedState || state,
          pincode,
          ...(district ? [district] : []),
        ].filter(Boolean);

        await tx.cRProfile.create({
          data: {
            userId: newUser.id,
            serviceAreas: crServiceAreas, // Store service areas including district
          },
        });

        // Create approval request for CRs
        await tx.approvalRequest.create({
          data: {
            userId: newUser.id,
            displayId: displayId,
            role: role as any,
            status: "PENDING",
          },
        });
      }

      // For farmers, log CR assignment if available (optional - no distance restriction)
      if (role === "FARMER" && farmerCRId) {
        // Get the CR profile to log assignment
        const assignedCR = await tx.cRProfile.findUnique({
          where: { id: farmerCRId },
          include: {
            user: true,
          },
        });

        // Create assignment record (optional assignment)
        const assignmentData = {
          farmerId: newUser.id,
          farmerLocation: { city, state, pincode },
          assignedCR: assignedCR?.user.name || "Unknown CR",
          assignedCRId: farmerCRId,
          assignedCRDistanceKm: farmerDistanceToCR,
          assignmentDate: new Date(),
        };

        // Store assignment information
        console.log("Farmer CR assignment (optional):", assignmentData);
      }

      // Log successful registration
      await createAuditLog({
        userId: internalId,
        displayId: displayId,
        role: role as any,
        action: "User Registration",
        entityType: "User",
        entityId: newUser.id,
        metadata: {
          email: newUser.email,
          accountStatus: accountStatus,
          autoApproved: role === "ADMIN" || role === "CUSTOMER",
          requiresApproval:
            role === "FARMER" || role === "PICKUP_AGENT" || role === "CR",
        },
      });

      return newUser;
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        role: role,
        location: { city, state, pincode },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 },
    );
  }
}
