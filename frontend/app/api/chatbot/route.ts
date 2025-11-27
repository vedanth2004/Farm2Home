import { NextRequest, NextResponse } from "next/server";

const CHATBOT_API_URL = process.env.CHATBOT_API_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, customer_id, customer_data } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 },
      );
    }

    // Forward request to chatbot API with customer data
    let response;
    try {
      response = await fetch(`${CHATBOT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          customer_id: customer_id || null,
          customer_data: customer_data || null,
        }),
        // Note: Timeout handled by fetch timeout or keep-alive settings
      });
    } catch (fetchError: any) {
      console.error("Failed to connect to chatbot service:", fetchError);

      // Check if it's a connection error
      if (
        fetchError.code === "ECONNREFUSED" ||
        fetchError.message?.includes("ECONNREFUSED")
      ) {
        return NextResponse.json(
          {
            error: "Chatbot service unavailable",
            message: `Cannot connect to chatbot service at ${CHATBOT_API_URL}. Please ensure the chatbot server is running on port 8001.`,
            response:
              "I'm sorry, but the chatbot service is currently unavailable. Please make sure the chatbot server is running, or try again later.",
          },
          { status: 503 },
        );
      }

      // Other fetch errors
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chatbot service error:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Chatbot service error",
          message: errorText,
          response:
            "I encountered an error processing your request. Please try again.",
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Chatbot API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
