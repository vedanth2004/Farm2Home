"use client";

import { useState } from "react";
import OrderStatusCard from "@/components/common/OrderStatusCard";

interface PickupJob {
  id: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    customer?: {
      name: string;
      email: string;
      phone?: string;
    };
    shippingAddress: {
      line1: string;
      city: string;
      postalCode: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      listing: {
        product: {
          name: string;
          description: string;
          farmer: {
            user: {
              name: string;
            };
          };
        };
      };
    }>;
  };
}

interface PickupJobsListProps {
  pickupJobs: PickupJob[];
}

export default function PickupJobsList({ pickupJobs }: PickupJobsListProps) {
  const [jobs, setJobs] = useState(pickupJobs);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update the local state
        setJobs(
          jobs.map((job) =>
            job.order.id === orderId
              ? { ...job, order: { ...job.order, status: newStatus } }
              : job,
          ),
        );
      } else {
        console.error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  return (
    <div className="space-y-6">
      {jobs.map((job) => (
        <div key={job.id}>
          <div className="mb-2">
            <h3 className="text-lg font-semibold">
              Pickup Job #{job.id.slice(-8)}
            </h3>
            <p className="text-sm text-gray-600">
              Created:{" "}
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(job.createdAt))}
            </p>
          </div>
          <OrderStatusCard
            order={job.order}
            userRole="PICKUP_AGENT"
            onStatusUpdate={handleStatusUpdate}
            showUpdateButton={true}
          />
        </div>
      ))}
    </div>
  );
}
