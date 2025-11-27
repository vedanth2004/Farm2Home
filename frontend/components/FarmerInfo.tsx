"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Phone, Mail, CheckCircle, Star } from "lucide-react";

interface FarmerInfoProps {
  farmer: {
    user: {
      name: string;
      email: string;
      phone?: string;
      addresses?: {
        city: string;
        state: string;
        postalCode: string;
        line1: string;
        line2?: string;
      }[];
    };
    verified: boolean;
    createdAt: string;
  };
}

export default function FarmerInfo({ farmer }: FarmerInfoProps) {
  const user = farmer.user;
  const primaryAddress = user.addresses?.[0];

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-green-800">
          <User className="h-5 w-5 mr-2" />
          Farmer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Farmer Name and Verification */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">Local Farmer</p>
          </div>
          <div className="flex items-center space-x-2">
            {farmer.verified ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-yellow-600 border-yellow-300"
              >
                Pending Verification
              </Badge>
            )}
          </div>
        </div>

        {/* Location Information */}
        {primaryAddress && (
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-green-600" />
              <span className="font-medium">Origin:</span>
            </div>
            <div className="ml-6 space-y-1">
              <p className="text-sm text-gray-700">
                {primaryAddress.line1}
                {primaryAddress.line2 && <span>, {primaryAddress.line2}</span>}
              </p>
              <p className="text-sm text-gray-700">
                {primaryAddress.city}, {primaryAddress.state} -{" "}
                {primaryAddress.postalCode}
              </p>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2">
          {user.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-green-600" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-green-600" />
            <span>{user.email}</span>
          </div>
        </div>

        {/* Farmer Stats */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-green-200">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.8</span>
            </div>
            <p className="text-xs text-gray-600">Rating</p>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {new Date(farmer.createdAt).getFullYear()}
            </div>
            <p className="text-xs text-gray-600">Since</p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Direct from farm to your table</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
