import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Extract only the 5 features required by the ML model
  const mlRequest = {
    totalOrders: body.totalOrders,
    purchaseFrequency: body.purchaseFrequency,
    avgOrderValue: body.avgOrderValue,
    lastPurchaseDaysAgo: body.lastPurchaseDaysAgo,
    totalItemsBought: body.totalItemsBought,
  };

  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

  const res = await fetch(`${ML_SERVICE_URL}/predict_customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mlRequest),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }
  const json = await res.json();
  return NextResponse.json(json);
}
