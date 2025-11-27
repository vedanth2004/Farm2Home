import NextAuth from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      internalId: string; // UUID for internal tracking
      displayId: string; // Human-readable ID (e.g., FARM-ABC123)
      name: string;
      email: string;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
    internalId: string;
    displayId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    internalId: string;
    displayId: string;
  }
}
