"use client";

import { useState, useEffect } from "react";
import UserManagement from "./UserManagement";

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

interface UserManagementWrapperProps {
  initialUsers: User[];
}

export default function UserManagementWrapper({
  initialUsers,
}: UserManagementWrapperProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    // Handle URL hash changes
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#user-management") {
        // Check if there are specific actions in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get("action");

        if (action === "add") {
          setShowAddForm(true);
        } else if (action === "filter") {
          setShowFilter(true);
        }
      }
    };

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Check initial hash
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Function to trigger add user form
  const triggerAddUser = () => {
    setShowAddForm(true);
    // Scroll to the user management section
    const element = document.getElementById("user-management");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Function to trigger filter
  const triggerFilter = () => {
    setShowFilter(true);
    // Scroll to the user management section
    const element = document.getElementById("user-management");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Expose functions to parent component
  useEffect(() => {
    // Store functions on window object for parent to access
    (window as any).triggerAddUser = triggerAddUser;
    (window as any).triggerFilter = triggerFilter;
  }, []);

  return (
    <div id="user-management">
      <UserManagement
        initialUsers={initialUsers}
        showAddForm={showAddForm}
        showFilter={showFilter}
        onAddFormClose={() => setShowAddForm(false)}
        onFilterClose={() => setShowFilter(false)}
      />
    </div>
  );
}
