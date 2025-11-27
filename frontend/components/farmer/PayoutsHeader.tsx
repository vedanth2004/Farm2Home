"use client";

import { Button } from "@/components/ui/button";
import { Download, CreditCard } from "lucide-react";

export default function PayoutsHeader() {
  const handleRequestPayout = () => {
    window.location.href = "/dashboard/farmer";
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    alert("Export functionality will be implemented soon");
  };

  return (
    <div className="flex space-x-3">
      <Button
        variant="outline"
        className="flex items-center"
        onClick={handleExportReport}
      >
        <Download className="h-4 w-4 mr-2" />
        Export Report
      </Button>
      <Button
        className="bg-green-600 hover:bg-green-700"
        onClick={handleRequestPayout}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Request Payout
      </Button>
    </div>
  );
}
