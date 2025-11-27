export type CustomerFeatures = {
  totalOrders: number;
  purchaseFrequency: number;
  avgOrderValue: number;
  lastPurchaseDaysAgo: number;
  totalItemsBought: number;
  repeatRate?: number; // Optional, not used in current model
  preferredCategory?: string;
  district?: string;
  postalCode?: string;
};

export type PredictionResponse = {
  predictedCategory: string | null;
  predictionProbability: number;
  predictedCategoryEncoded: number | null;
};

import { getAppBaseUrl } from "@/lib/runtime-env";

export async function predictCustomer(
  features: CustomerFeatures,
): Promise<PredictionResponse> {
  try {
    // Use absolute URL for server-side calls
    const baseUrl = getAppBaseUrl();
    const url = `${baseUrl}/api/ml/predict`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `ML API error (${res.status}): ${errorText.substring(0, 200)}`,
      );
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        `ML API returned non-JSON response: ${text.substring(0, 200)}`,
      );
    }

    return await res.json();
  } catch (error: any) {
    console.error("Error in predictCustomer:", error);
    throw error;
  }
}
