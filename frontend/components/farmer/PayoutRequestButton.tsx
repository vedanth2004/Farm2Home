"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface PayoutRequestButtonProps {
  pendingEarnings: number;
  currentPayout?: {
    id: string;
    status: string;
    amount: number;
    requestedAt?: Date;
  } | null;
}

export default function PayoutRequestButton({
  pendingEarnings,
  currentPayout,
}: PayoutRequestButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRequestPayout = async () => {
    if (pendingEarnings <= 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_payout" }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Payout request submitted successfully!");
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(result.error || "Failed to request payout");
      }
    } catch (error) {
      console.error("Error requesting payout:", error);
      alert("Error requesting payout");
    } finally {
      setLoading(false);
    }
  };

  // If there's a pending payout, show status instead of button
  if (currentPayout && currentPayout.status === "PENDING") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        <DollarSign className="h-4 w-4" />
        <span>
          Payout request pending (₹{Number(currentPayout.amount).toFixed(2)})
        </span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleRequestPayout}
      disabled={pendingEarnings <= 0 || loading}
      className="bg-green-600 hover:bg-green-700"
    >
      <DollarSign className="h-4 w-4 mr-2" />
      {loading
        ? "Requesting..."
        : `Request Payout (₹${Number(pendingEarnings).toLocaleString()})`}
    </Button>
  );
}
