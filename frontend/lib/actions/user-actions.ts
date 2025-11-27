"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
// Define UserRole type manually
type UserRole = "ADMIN" | "FARMER" | "CR" | "CUSTOMER" | "PICKUP_AGENT";
import bcrypt from "bcryptjs";

export async function createUser(formData: FormData) {
  try {
    await requirePermission("write:users");

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as UserRole;
    const phone = formData.get("phone") as string;

    if (!name || !email || !password || !role) {
      return { error: "Missing required fields" };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || null,
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Error creating user:", error);
    return { error: "Failed to create user" };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    await requirePermission("write:users");

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as UserRole;
    const phone = formData.get("phone") as string;

    if (!name || !email || !role) {
      return { error: "Missing required fields" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        phone: phone || null,
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Error updating user:", error);
    return { error: "Failed to update user" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await requirePermission("write:users");

    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { error: "Failed to delete user" };
  }
}

export async function searchUsers(query: string, role?: string) {
  try {
    await requirePermission("read:users");

    const where: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    };

    if (role && role !== "ALL") {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        farmerProfile: true,
        crProfile: true,
        pickupAgentProfile: true,
        addresses: true, // Include address information
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error searching users:", error);
    return { error: "Failed to search users" };
  }
}
