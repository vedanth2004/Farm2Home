import { NotificationChannel } from "@prisma/client";
import { predictCustomer } from "@/lib/ml-client";
import { notificationService } from "@/lib/notifications";
import { getAppBaseUrl } from "@/lib/runtime-env";
import { prisma } from "@/lib/prisma";
import { calculateCustomerFeatures } from "./ml-feature-calculator";

export interface CustomerPredictionResult {
  customerId: string;
  customerName: string;
  customerEmail: string;
  features: {
    totalOrders: number;
    purchaseFrequency: number;
    avgOrderValue: number;
    lastPurchaseDaysAgo: number;
    totalItemsBought: number;
  };
  prediction: {
    predictedCategory: string;
    predictionProbability: number;
    predictedCategoryEncoded: number;
  };
  notificationSent: boolean;
}

/**
 * Generate prediction and send notification for a single customer
 */
export async function generatePredictionAndNotify(
  customerId: string,
): Promise<CustomerPredictionResult> {
  try {
    // Get customer info
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      throw new Error("Customer not found or invalid role");
    }

    // Calculate features from database
    const features = await calculateCustomerFeatures(customerId);

    // Skip if customer has no orders
    if (features.totalOrders === 0) {
      return {
        customerId,
        customerName: customer.name,
        customerEmail: customer.email,
        features,
        prediction: {
          predictedCategory: "N/A",
          predictionProbability: 0,
          predictedCategoryEncoded: 0,
        },
        notificationSent: false,
      };
    }

    // Get prediction from ML service
    // Try FastAPI directly first, fallback to Next.js API proxy
    let prediction;
    let mlError: any = null;

    // Method 1: Try calling FastAPI directly (for server-side)
    try {
      // Use 127.0.0.1 instead of localhost for better server-side compatibility
      const mlServiceUrl =
        process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
      const predictUrl = `${mlServiceUrl}/predict_customer`;

      console.log(
        `[ML Prediction] Attempting direct FastAPI call: ${predictUrl}`,
      );
      console.log(`[ML Prediction] Features:`, {
        totalOrders: features.totalOrders,
        purchaseFrequency: features.purchaseFrequency,
        avgOrderValue: features.avgOrderValue,
        lastPurchaseDaysAgo: features.lastPurchaseDaysAgo,
        totalItemsBought: features.totalItemsBought,
      });

      // Create timeout signal for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(predictUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalOrders: features.totalOrders,
            purchaseFrequency: features.purchaseFrequency,
            avgOrderValue: features.avgOrderValue,
            lastPurchaseDaysAgo: features.lastPurchaseDaysAgo,
            totalItemsBought: features.totalItemsBought,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(
          `[ML Prediction] FastAPI response status: ${response.status}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ML Prediction] FastAPI error response:`, errorText);
          throw new Error(
            `FastAPI error (${response.status}): ${errorText.substring(0, 200)}`,
          );
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error(
            `[ML Prediction] FastAPI returned non-JSON:`,
            text.substring(0, 200),
          );
          throw new Error(
            `FastAPI returned non-JSON response: ${text.substring(0, 200)}`,
          );
        }

        const data = await response.json();
        console.log(`[ML Prediction] FastAPI prediction result:`, data);

        prediction = {
          predictedCategory: data.predictedCategory,
          predictionProbability: data.predictionProbability,
          predictedCategoryEncoded: data.predictedCategoryEncoded,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (directError: any) {
      console.warn(
        "[ML Prediction] Direct FastAPI call failed, trying Next.js API proxy:",
        directError.message,
      );
      mlError = directError;

      // Method 2: Fallback to Next.js API proxy route
      try {
        const baseUrl = getAppBaseUrl();
        const proxyUrl = `${baseUrl}/api/ml/predict`;

        console.log(
          `[ML Prediction] Attempting Next.js API proxy: ${proxyUrl}`,
        );

        // Create timeout signal for fetch
        const proxyController = new AbortController();
        const proxyTimeoutId = setTimeout(() => proxyController.abort(), 30000);

        try {
          const response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              totalOrders: features.totalOrders,
              purchaseFrequency: features.purchaseFrequency,
              avgOrderValue: features.avgOrderValue,
              lastPurchaseDaysAgo: features.lastPurchaseDaysAgo,
              totalItemsBought: features.totalItemsBought,
            }),
            signal: proxyController.signal,
          });

          clearTimeout(proxyTimeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `API proxy error (${response.status}): ${errorText.substring(0, 200)}`,
            );
          }

          const data = await response.json();
          console.log(`[ML Prediction] API proxy prediction result:`, data);

          prediction = {
            predictedCategory: data.predictedCategory,
            predictionProbability: data.predictionProbability,
            predictedCategoryEncoded: data.predictedCategoryEncoded,
          };
        } finally {
          clearTimeout(proxyTimeoutId);
        }
      } catch (proxyError: any) {
        console.error("[ML Prediction] Both FastAPI and API proxy failed");
        console.error("[ML Prediction] Direct error:", mlError?.message);
        console.error("[ML Prediction] Proxy error:", proxyError.message);
        throw new Error(
          `ML service unavailable: ${proxyError.message || mlError?.message || "Failed to get prediction"}`,
        );
      }
    }

    // Send notification if prediction confidence is high enough (>= 60%)
    let notificationSent = false;
    if (prediction.predictionProbability >= 0.6) {
      notificationSent = await sendPredictionNotification(
        customerId,
        customer.name,
        customer.email,
        prediction.predictedCategory || "Products",
        prediction.predictionProbability,
      );
    }

    return {
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      features,
      prediction: {
        predictedCategory: prediction.predictedCategory || "Unknown",
        predictionProbability: prediction.predictionProbability,
        predictedCategoryEncoded: prediction.predictedCategoryEncoded || 0,
      },
      notificationSent,
    };
  } catch (error: any) {
    console.error(
      `Error generating prediction for customer ${customerId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Generate predictions and notifications for all customers
 * Automatically fetches all customers from database and processes them
 */
export async function generatePredictionsForAllCustomers(): Promise<{
  total: number;
  successful: number;
  failed: number;
  notificationsSent: number;
  results: CustomerPredictionResult[];
}> {
  console.log("[ML Predictions] Fetching all customers from database...");

  // Get all customers from database
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  console.log(
    `[ML Predictions] Found ${customers.length} customers in database`,
  );

  const results: CustomerPredictionResult[] = [];
  let successful = 0;
  let failed = 0;
  let notificationsSent = 0;

  // Process in batches to avoid overwhelming the system
  const batchSize = 5; // Reduced batch size for stability
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    console.log(
      `[ML Predictions] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customers.length / batchSize)} (${batch.length} customers)`,
    );

    const batchResults = await Promise.allSettled(
      batch.map((customer) => {
        console.log(
          `[ML Predictions] Processing customer: ${customer.id} (${customer.name || customer.email})`,
        );
        return generatePredictionAndNotify(customer.id);
      }),
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
        if (result.value.prediction.predictedCategory !== "N/A") {
          successful++;
        }
        if (result.value.notificationSent) {
          notificationsSent++;
        }
        console.log(
          `[ML Predictions] ✅ Customer ${batch[index].id}: ${result.value.prediction.predictedCategory} (${(result.value.prediction.predictionProbability * 100).toFixed(1)}%)`,
        );
      } else {
        failed++;
        console.error(
          `[ML Predictions] ❌ Customer ${batch[index].id} failed:`,
          result.reason?.message || result.reason,
        );
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < customers.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  console.log(
    `[ML Predictions] Completed processing: ${successful} successful, ${failed} failed, ${notificationsSent} notifications sent`,
  );

  return {
    total: customers.length,
    successful,
    failed,
    notificationsSent,
    results,
  };
}

/**
 * Send notification to customer about their predicted category
 */
async function sendPredictionNotification(
  customerId: string,
  customerName: string,
  customerEmail: string,
  predictedCategory: string,
  probability: number,
): Promise<boolean> {
  try {
    const probabilityPercent = Math.round(probability * 100);
    const appBaseUrl = getAppBaseUrl();

    // Create notification message
    const message = `Based on your purchase history, we predict you'll love ${predictedCategory} products! Check out our ${predictedCategory} collection now.`;

    // Email template
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Personalized Recommendation for You!</h2>
        <p>Hi ${customerName},</p>
        <p>Based on your shopping patterns, we think you'll love our <strong>${predictedCategory}</strong> collection!</p>
        <p style="background-color: #f0fdf4; padding: 15px; border-radius: 5px;">
          <strong>Confidence: ${probabilityPercent}%</strong><br/>
          Our AI analyzed your purchase history and recommends exploring ${predictedCategory} products.
        </p>
        <a href="${appBaseUrl}/customer/store?category=${predictedCategory.toLowerCase()}" 
           style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          Shop ${predictedCategory} Products
        </a>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          This is an automated recommendation based on your purchase history. You can update your preferences anytime.
        </p>
      </div>
    `;

    // Send notification via multiple channels
    const sent = await notificationService.send({
      userId: customerId,
      type: "ML_PREDICTION",
      channel: NotificationChannel.INAPP,
      subject: `Recommended for You: ${predictedCategory} Products`,
      template: emailTemplate,
      data: {
        message,
        predictedCategory,
        probability,
        probabilityPercent,
        categoryUrl: `/customer/store?category=${predictedCategory.toLowerCase()}`,
      },
    });

    // Also send email if configured
    if (process.env.RESEND_API_KEY) {
      await notificationService.send({
        userId: customerId,
        type: "ML_PREDICTION_EMAIL",
        channel: NotificationChannel.EMAIL,
        subject: `🎯 Recommended for You: ${predictedCategory} Products`,
        template: emailTemplate,
        data: {
          message,
          predictedCategory,
          probability,
          probabilityPercent,
        },
      });
    }

    return sent;
  } catch (error) {
    console.error("Error sending prediction notification:", error);
    return false;
  }
}

/**
 * Generate prediction and notification for customers with recent activity
 * (customers who ordered in the last 30 days)
 * Automatically fetches customers from database based on order history
 */
export async function generatePredictionsForActiveCustomers(): Promise<{
  total: number;
  successful: number;
  failed: number;
  notificationsSent: number;
  results: CustomerPredictionResult[];
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(
    `[ML Predictions] Fetching active customers (orders in last 30 days from ${thirtyDaysAgo.toISOString()})...`,
  );

  // Get customers who have orders in the last 30 days from database
  const activeCustomers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      orders: {
        some: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
          status: {
            not: "CANCELLED",
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    distinct: ["id"],
  });

  console.log(
    `[ML Predictions] Found ${activeCustomers.length} active customers with orders in last 30 days`,
  );

  const results: CustomerPredictionResult[] = [];
  let successful = 0;
  let failed = 0;
  let notificationsSent = 0;

  // Process in batches
  const batchSize = 5; // Reduced batch size for stability
  for (let i = 0; i < activeCustomers.length; i += batchSize) {
    const batch = activeCustomers.slice(i, i + batchSize);
    console.log(
      `[ML Predictions] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activeCustomers.length / batchSize)} (${batch.length} customers)`,
    );

    const batchResults = await Promise.allSettled(
      batch.map((customer) => {
        console.log(
          `[ML Predictions] Processing active customer: ${customer.id} (${customer.name || customer.email})`,
        );
        return generatePredictionAndNotify(customer.id);
      }),
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
        if (result.value.prediction.predictedCategory !== "N/A") {
          successful++;
        }
        if (result.value.notificationSent) {
          notificationsSent++;
        }
        console.log(
          `[ML Predictions] ✅ Active customer ${batch[index].id}: ${result.value.prediction.predictedCategory} (${(result.value.prediction.predictionProbability * 100).toFixed(1)}%)`,
        );
      } else {
        failed++;
        console.error(
          `[ML Predictions] ❌ Active customer ${batch[index].id} failed:`,
          result.reason?.message || result.reason,
        );
      }
    });

    if (i + batchSize < activeCustomers.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  console.log(
    `[ML Predictions] Completed active customers processing: ${successful} successful, ${failed} failed, ${notificationsSent} notifications sent`,
  );

  return {
    total: activeCustomers.length,
    successful,
    failed,
    notificationsSent,
    results,
  };
}
