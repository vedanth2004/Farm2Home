"use client";

import { Button } from "@/components/ui/button";
import { Filter, UserCheck } from "lucide-react";

export default function UserManagementHeader() {
  const handleFilter = () => {
    if (typeof window !== "undefined" && (window as any).triggerFilter) {
      (window as any).triggerFilter();
    }
  };

  const handleAddUser = () => {
    if (typeof window !== "undefined" && (window as any).triggerAddUser) {
      (window as any).triggerAddUser();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          Manage user accounts and permissions
        </p>
      </div>
      <div className="flex space-x-3">
        <Button
          variant="outline"
          className="flex items-center"
          onClick={handleFilter}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleAddUser}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
    </div>
  );
}
