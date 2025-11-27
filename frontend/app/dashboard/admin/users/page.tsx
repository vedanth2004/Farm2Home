import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { Users, Shield } from "lucide-react";
import UserManagementWrapper from "@/components/admin/UserManagementWrapper";
import UserManagementHeader from "@/components/admin/UserManagementHeader";

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        internalId: true,
        displayId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        accountStatus: true,
        createdAt: true,
        farmerProfile: true,
        crProfile: true,
        pickupAgentProfile: true,
        addresses: true, // Include address information
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export default async function AdminUsersPage() {
  await requirePermission("read:users");

  const users = await getUsers();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "FARMER":
        return "bg-green-100 text-green-800";
      case "CR":
        return "bg-purple-100 text-purple-800";
      case "PICKUP_AGENT":
        return "bg-orange-100 text-orange-800";
      case "CUSTOMER":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <UserManagementHeader />

      {/* Search and Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-gray-500">All users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Farmers
            </CardTitle>
            <Shield className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u: any) => u.role === "FARMER").length}
            </div>
            <p className="text-xs text-gray-500">Active farmers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Customers
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u: any) => u.role === "CUSTOMER").length}
            </div>
            <p className="text-xs text-gray-500">Active customers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Staff
            </CardTitle>
            <Shield className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                users.filter((u: any) =>
                  ["CR", "PICKUP_AGENT"].includes(u.role),
                ).length
              }
            </div>
            <p className="text-xs text-gray-500">CR & Agents</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Component */}
      <UserManagementWrapper initialUsers={users as any} />
    </div>
  );
}
