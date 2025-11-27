"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Leaf,
  CheckCircle,
  MapPin,
  Truck,
  Users,
  Shield,
  ArrowLeft,
  Building,
  Navigation,
  FileText,
  CreditCard,
} from "lucide-react";

export const dynamic = "force-dynamic";

const roleInfo = {
  CUSTOMER: {
    title: "Customer",
    icon: User,
    color: "bg-blue-500",
    description: "Browse and order fresh produce",
  },
  FARMER: {
    title: "Farmer",
    icon: Leaf,
    color: "bg-green-500",
    description: "Sell your fresh produce directly",
  },
  PICKUP_AGENT: {
    title: "Pickup Agent",
    icon: Truck,
    color: "bg-orange-500",
    description: "Help with pickup and delivery",
  },
  CR: {
    title: "Community Representative",
    icon: Users,
    color: "bg-purple-500",
    description: "Manage local deliveries",
  },
  ADMIN: {
    title: "Admin",
    icon: Shield,
    color: "bg-red-500",
    description: "Manage the platform",
  },
};

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedRole = searchParams.get("role") || "CUSTOMER";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: selectedRole,
    // Location fields
    address: "",
    city: "",
    state: "",
    pincode: "",
    // Farmer specific fields
    govtId: "",
    upiId: "",
    // Agent specific fields
    vehicleType: "",
    serviceAreas: "",
    // CR specific fields
    experience: "",
    // Additional fields
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);

  const roleData = roleInfo[selectedRole as keyof typeof roleInfo];
  const RoleIcon = roleData?.icon || User;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();

        // Auto sign in after successful registration
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Redirect based on role
          switch (formData.role) {
            case "CUSTOMER":
              router.push("/customer/store/products");
              break;
            case "FARMER":
              router.push("/dashboard/farmer");
              break;
            case "PICKUP_AGENT":
              router.push("/dashboard/agent");
              break;
            case "CR":
              router.push("/dashboard/cr");
              break;
            case "ADMIN":
              router.push("/dashboard/admin");
              break;
            default:
              router.push("/dashboard");
          }
        } else {
          // Show verification message for roles requiring approval
          if (
            formData.role === "FARMER" ||
            formData.role === "PICKUP_AGENT" ||
            formData.role === "CR"
          ) {
            setError(
              "Your account is under verification. You'll be notified once approved by the admin.",
            );
          } else {
            setError("Registration successful! Please sign in.");
          }
        }
      } else {
        const data = await response.json();
        setError(data.error || "Registration failed");
      }
    } catch (error) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
    });
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (step === 1) {
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        setError("Please fill in all required fields");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      setError("");
    }

    if (step === 2) {
      if (
        !formData.address ||
        !formData.city ||
        !formData.state ||
        !formData.pincode
      ) {
        setError("Please fill in all location fields");
        return;
      }
      setError("");
    }

    if (step === 3) {
      // Role-specific validation for step 3
      if (selectedRole === "FARMER") {
        if (!formData.govtId || !formData.upiId) {
          setError("Government ID and UPI ID are required for farmers");
          return;
        }
      } else if (selectedRole === "PICKUP_AGENT") {
        if (!formData.vehicleType || !formData.serviceAreas) {
          setError(
            "Vehicle type and service areas are required for pickup agents",
          );
          return;
        }
      } else if (selectedRole === "CR") {
        if (!formData.experience) {
          setError("Experience is required for community representatives");
          return;
        }
      }
      setError("");
    }

    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-xl ${roleData?.color} text-white`}>
            <RoleIcon className="h-6 w-6" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">
          {roleData?.title} Registration
        </h3>
        <p className="text-gray-600">{roleData?.description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <h3 className="text-xl font-semibold text-gray-900">
          Location Information
        </h3>
        <p className="text-gray-600">Help us connect you with local services</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          placeholder="Enter your full address"
          value={formData.address}
          onChange={handleChange}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            placeholder="Enter your city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            placeholder="Enter your state"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          name="pincode"
          placeholder="Enter your pincode"
          value={formData.pincode}
          onChange={handleChange}
          required
        />
      </div>

      {selectedRole === "FARMER" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <h4 className="font-medium text-green-800 mb-1">
                Automatic Assignment
              </h4>
              <p className="text-sm text-green-700">
                Based on your location, we&apos;ll automatically assign you a
                Community Representative and Pickup Agent to ensure smooth
                operations in your area.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    if (selectedRole === "FARMER") {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-xl font-semibold text-gray-900">
              Farmer Details
            </h3>
            <p className="text-gray-600">Additional information for farmers</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="govtId">Government ID</Label>
            <Input
              id="govtId"
              name="govtId"
              placeholder="Enter your government ID number"
              value={formData.govtId}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              name="upiId"
              placeholder="Enter your UPI ID for payments"
              value={formData.upiId}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Farm Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell us about your farm and products"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>
      );
    }

    if (selectedRole === "PICKUP_AGENT") {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Truck className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="text-xl font-semibold text-gray-900">
              Agent Details
            </h3>
            <p className="text-gray-600">Information for pickup agents</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) =>
                setFormData({ ...formData, vehicleType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bike">Bike</SelectItem>
                <SelectItem value="Scooter">Scooter</SelectItem>
                <SelectItem value="Car">Car</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceAreas">Service Areas</Label>
            <Textarea
              id="serviceAreas"
              name="serviceAreas"
              placeholder="List areas where you can provide pickup services (comma separated)"
              value={formData.serviceAreas}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>
      );
    }

    if (selectedRole === "CR") {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="text-xl font-semibold text-gray-900">CR Details</h3>
            <p className="text-gray-600">
              Information for community representatives
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience (Years)</Label>
            <Input
              id="experience"
              name="experience"
              type="number"
              placeholder="Enter years of experience"
              value={formData.experience}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Background</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell us about your background and why you want to be a CR"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h3 className="text-xl font-semibold text-gray-900">
            Review Information
          </h3>
          <p className="text-gray-600">
            Please review your information before submitting
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Name:</span>
            <span>{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Email:</span>
            <span>{formData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Phone:</span>
            <span>{formData.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Role:</span>
            <span>{roleData?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Location:</span>
            <span>
              {formData.city}, {formData.state}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-600 p-2 rounded-xl mr-3">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Farm2Home</h1>
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <p className="text-gray-600">
              Step {step} of 3 - {roleData?.title} Registration
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                  className="flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Create Account
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
