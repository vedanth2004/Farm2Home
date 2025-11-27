"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  X,
  Loader2,
  MapPin,
} from "lucide-react";
import {
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
} from "@/lib/actions/user-actions";
// Define UserRole type manually
type UserRole = "ADMIN" | "FARMER" | "CR" | "CUSTOMER" | "PICKUP_AGENT";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  createdAt: string;
  addresses?: {
    id: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
}

interface UserManagementProps {
  initialUsers: User[];
  showAddForm?: boolean;
  showFilter?: boolean;
  onAddFormClose?: () => void;
  onFilterClose?: () => void;
}

export default function UserManagement({
  initialUsers,
  showAddForm: initialShowAddForm = false,
  showFilter: initialShowFilter = false,
  onAddFormClose,
  onFilterClose,
}: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Update showAddForm when prop changes
  useEffect(() => {
    setShowAddForm(initialShowAddForm);
  }, [initialShowAddForm]);

  // Handle form close
  const handleAddFormClose = () => {
    setShowAddForm(false);
    onAddFormClose?.();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If no search query, apply role filter only
      if (roleFilter === "ALL") {
        setUsers(initialUsers);
      } else {
        setUsers(initialUsers.filter((user: any) => user.role === roleFilter));
      }
      return;
    }

    setLoading(true);
    try {
      const result = await searchUsers(searchQuery, roleFilter);
      if (result.success) {
        setUsers(result.users as unknown as User[]);
      } else {
        setError(result.error || "Search failed");
      }
    } catch (error) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await createUser(formData);
      if (result.success) {
        setUsers([result.user as unknown as User, ...users]);
        setShowAddForm(false);
        setError("");
        setSuccess("User created successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to create user");
      }
    } catch (error) {
      setError("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await updateUser(userId, formData);
      if (result.success) {
        setUsers(
          users.map((user) =>
            user.id === userId ? (result.user as unknown as User) : user,
          ),
        );
        setEditingUser(null);
        setError("");
        setSuccess("User updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to update user");
      }
    } catch (error) {
      setError("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setLoading(true);
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        setUsers(users.filter((user) => user.id !== userId));
        setError("");
        setSuccess("User deleted successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Failed to delete user");
      }
    } catch (error) {
      setError("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

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
      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="FARMER">Farmer</option>
          <option value="CR">Community Rep</option>
          <option value="PICKUP_AGENT">Pickup Agent</option>
          <option value="CUSTOMER">Customer</option>
        </select>
        <Button
          onClick={() => {
            // Apply filter by role
            if (roleFilter === "ALL") {
              setUsers(initialUsers);
            } else {
              setUsers(
                initialUsers.filter((user: any) => user.role === roleFilter),
              );
            }
          }}
          variant="outline"
          data-filter-button
        >
          <Filter className="h-4 w-4 mr-2" />
          Apply Filter
        </Button>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={() => {
            setSearchQuery("");
            setRoleFilter("ALL");
            setUsers(initialUsers);
            setError("");
          }}
          variant="outline"
          disabled={loading}
        >
          Clear
        </Button>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700"
          data-add-user-button
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add New User</CardTitle>
              <Button variant="ghost" onClick={handleAddFormClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form action={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    name="role"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="FARMER">Farmer</option>
                    <option value="CR">Community Rep</option>
                    <option value="PICKUP_AGENT">Pickup Agent</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No users found</p>
              </div>
            ) : (
              users.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {(user as any).displayId && (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {(user as any).displayId}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-gray-600">{user.phone}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined{" "}
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </p>
                      {user.addresses && user.addresses.length > 0 && (
                        <div className="flex items-center mt-1">
                          <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">
                            {user.addresses[0].city}, {user.addresses[0].state}{" "}
                            - {user.addresses[0].postalCode}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role.replace("_", " ")}
                    </Badge>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
