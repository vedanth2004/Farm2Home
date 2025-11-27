import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
// Define UserRole enum manually
enum UserRole {
  ADMIN = "ADMIN",
  FARMER = "FARMER",
  CR = "CR",
  CUSTOMER = "CUSTOMER",
  PICKUP_AGENT = "PICKUP_AGENT",
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect to role-specific dashboard
    if (pathname === "/dashboard" && token?.role) {
      const role = token.role as UserRole;
      let redirectPath = "/dashboard";

      switch (role) {
        case UserRole.ADMIN:
          redirectPath = "/dashboard/admin";
          break;
        case UserRole.FARMER:
          redirectPath = "/dashboard/farmer";
          break;
        case UserRole.CR:
          redirectPath = "/dashboard/cr";
          break;
        case UserRole.PICKUP_AGENT:
          redirectPath = "/dashboard/agent";
          break;
        case UserRole.CUSTOMER:
          redirectPath = "/dashboard/customer";
          break;
      }

      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // Role-based route protection
    if (
      pathname.startsWith("/dashboard/admin") &&
      token?.role !== UserRole.ADMIN
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      pathname.startsWith("/dashboard/farmer") &&
      token?.role !== UserRole.FARMER
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/dashboard/cr") && token?.role !== UserRole.CR) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      pathname.startsWith("/dashboard/agent") &&
      token?.role !== UserRole.PICKUP_AGENT
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      pathname.startsWith("/dashboard/customer") &&
      token?.role !== UserRole.CUSTOMER
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect customers from dashboard to store
    if (
      pathname === "/dashboard/customer" &&
      token?.role === UserRole.CUSTOMER
    ) {
      return NextResponse.redirect(
        new URL("/customer/store/products", req.url),
      );
    }

    if (
      pathname.startsWith("/customer/store") &&
      token?.role !== UserRole.CUSTOMER
    ) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (
          req.nextUrl.pathname.startsWith("/auth") ||
          req.nextUrl.pathname.startsWith("/store") ||
          req.nextUrl.pathname.startsWith("/customer/store") ||
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api/auth")
        ) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*",
    "/store/:path*",
    "/customer/store/:path*",
    "/",
  ],
};
