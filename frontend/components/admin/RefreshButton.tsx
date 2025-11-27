"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  loading: boolean;
  onRefresh: () => void;
}

export default function RefreshButton({
  loading,
  onRefresh,
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      className="flex items-center"
      onClick={onRefresh}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
