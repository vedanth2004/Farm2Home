import { describe, it, expect } from "vitest";
import { hasRole, can, UserRole } from "@/lib/rbac";

describe("RBAC System", () => {
  describe("hasRole", () => {
    it("should allow admin to access all roles", () => {
      expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.FARMER)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.CR)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.PICKUP_AGENT)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.CUSTOMER)).toBe(true);
    });

    it("should allow farmer to access farmer and customer roles", () => {
      expect(hasRole(UserRole.FARMER, UserRole.FARMER)).toBe(true);
      expect(hasRole(UserRole.FARMER, UserRole.CUSTOMER)).toBe(true);
      expect(hasRole(UserRole.FARMER, UserRole.ADMIN)).toBe(false);
    });

    it("should allow customer to access only customer role", () => {
      expect(hasRole(UserRole.CUSTOMER, UserRole.CUSTOMER)).toBe(true);
      expect(hasRole(UserRole.CUSTOMER, UserRole.FARMER)).toBe(false);
      expect(hasRole(UserRole.CUSTOMER, UserRole.ADMIN)).toBe(false);
    });
  });

  describe("can", () => {
    it("should allow admin to perform all actions", () => {
      expect(can(UserRole.ADMIN, "read:users")).toBe(true);
      expect(can(UserRole.ADMIN, "write:products")).toBe(true);
      expect(can(UserRole.ADMIN, "approve:products")).toBe(true);
      expect(can(UserRole.ADMIN, "read:analytics")).toBe(true);
    });

    it("should allow farmer to manage products and view orders", () => {
      expect(can(UserRole.FARMER, "read:products")).toBe(true);
      expect(can(UserRole.FARMER, "write:products")).toBe(true);
      expect(can(UserRole.FARMER, "read:orders")).toBe(true);
      expect(can(UserRole.FARMER, "approve:products")).toBe(false);
      expect(can(UserRole.FARMER, "read:users")).toBe(false);
    });

    it("should allow customer to browse products and place orders", () => {
      expect(can(UserRole.CUSTOMER, "read:products")).toBe(true);
      expect(can(UserRole.CUSTOMER, "read:orders")).toBe(true);
      expect(can(UserRole.CUSTOMER, "write:orders")).toBe(true);
      expect(can(UserRole.CUSTOMER, "write:products")).toBe(false);
      expect(can(UserRole.CUSTOMER, "read:analytics")).toBe(false);
    });
  });
});
