"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Leaf } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check account status to show specific error message (skip for ADMIN/CUSTOMER)
        try {
          const statusRes = await fetch(
            `/api/auth/check-status?email=${encodeURIComponent(email)}`,
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            // Admin and Customer are always approved, don't show verification message
            if (statusData.role === "ADMIN" || statusData.role === "CUSTOMER") {
              setError("Invalid credentials");
            } else if (statusData.status === "PENDING_VERIFICATION") {
              setError(
                "Your account is under admin verification. Please wait for approval.",
              );
            } else if (statusData.status === "REJECTED") {
              setError(
                "Your registration was rejected by admin. Please contact admin for clarification.",
              );
            } else {
              setError("Invalid credentials");
            }
          } else {
            setError("Invalid credentials");
          }
        } catch {
          setError("Invalid credentials");
        }
      } else {
        // Redirect to appropriate dashboard based on role
        if (result?.ok) {
          // Get user session to check role
          const session = await fetch("/api/auth/session").then((res) =>
            res.json(),
          );
          const userRole = session?.user?.role;

          // Redirect based on role
          switch (userRole) {
            case "CUSTOMER":
              router.push("/customer/store/products");
              break;
            case "FARMER":
              router.push("/dashboard/farmer");
              break;
            case "CR":
              router.push("/dashboard/cr");
              break;
            case "PICKUP_AGENT":
              router.push("/dashboard/agent");
              break;
            case "ADMIN":
              router.push("/dashboard/admin");
              break;
            default:
              router.push("/dashboard");
          }
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: "Admin",
      email: "admin@farm2home.com",
      password: "admin123",
      color: "bg-red-500",
    },
    {
      role: "Farmer",
      email: "farmer@farm2home.com",
      password: "farmer123",
      color: "bg-green-500",
    },
    {
      role: "Customer",
      email: "customer@farm2home.com",
      password: "customer123",
      color: "bg-blue-500",
    },
    {
      role: "CR",
      email: "cr@farm2home.com",
      password: "cr123",
      color: "bg-purple-500",
    },
    {
      role: "Agent",
      email: "agent@farm2home.com",
      password: "agent123",
      color: "bg-orange-500",
    },
  ];

  const fillDemoAccount = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);

    // Auto-submit after a brief delay to allow state to update
    setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          // Check account status to show specific error message (skip for ADMIN/CUSTOMER)
          try {
            const statusRes = await fetch(
              `/api/auth/check-status?email=${encodeURIComponent(email)}`,
            );
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              // Admin and Customer are always approved, don't show verification message
              if (
                statusData.role === "ADMIN" ||
                statusData.role === "CUSTOMER"
              ) {
                setError("Invalid credentials");
              } else if (statusData.status === "PENDING_VERIFICATION") {
                setError(
                  "Your account is under admin verification. Please wait for approval.",
                );
              } else if (statusData.status === "REJECTED") {
                setError(
                  "Your registration was rejected by admin. Please contact admin for clarification.",
                );
              } else {
                setError("Invalid credentials");
              }
            } else {
              setError("Invalid credentials");
            }
          } catch {
            setError("Invalid credentials");
          }
          setLoading(false);
        } else if (result?.ok) {
          // Get user session to check role and redirect appropriately
          const session = await fetch("/api/auth/session").then((res) =>
            res.json(),
          );
          const userRole = session?.user?.role;

          // Redirect based on role
          switch (userRole) {
            case "CUSTOMER":
              router.push("/customer/store/products");
              break;
            case "FARMER":
              router.push("/dashboard/farmer");
              break;
            case "CR":
              router.push("/dashboard/cr");
              break;
            case "PICKUP_AGENT":
              router.push("/dashboard/agent");
              break;
            case "ADMIN":
              router.push("/dashboard/admin");
              break;
            default:
              router.push("/dashboard");
          }
        }
      } catch (error) {
        setError("An error occurred. Please try again.");
        setLoading(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding */}
          <div className="hidden lg:block">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-8">
                <div className="bg-green-600 p-3 rounded-2xl mr-4">
                  <Leaf className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900">Farm2Home</h1>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Fresh from Farm to Your Door
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Connect directly with local farmers for the freshest produce.
                Experience the convenience of farm-fresh vegetables delivered to
                your doorstep.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">Fresh Produce</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="text-2xl font-bold text-green-600">24/7</div>
                  <div className="text-sm text-gray-600">Support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-600 p-2 rounded-xl mr-3">
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Welcome Back
                  </CardTitle>
                </div>
                <p className="text-gray-600">
                  Sign in to your account to continue
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/auth/role-selection"
                      className="font-medium text-green-600 hover:text-green-500 transition-colors"
                    >
                      Sign up here
                    </Link>
                  </p>
                </div>

                {/* Demo Accounts */}
                <div className="border-t pt-6">
                  <p className="text-sm font-medium text-gray-700 mb-4 text-center">
                    Demo Accounts
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {demoAccounts.map((account, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          fillDemoAccount(account.email, account.password)
                        }
                        className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${account.color} mr-3`}
                        ></div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900">
                            {account.role}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.email}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
