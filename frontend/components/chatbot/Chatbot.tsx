"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  Package,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  intent?: string;
  timestamp: Date;
}

interface SuggestedAction {
  label: string;
  action: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your Farm2Home assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch customer data on mount
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const response = await fetch("/api/customer/data");
        if (response.ok) {
          const data = await response.json();
          setCustomerData(data);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };

    if (isOpen) {
      fetchCustomerData();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          customer_id: customerData?.id,
          customer_data: customerData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: "bot",
        intent: data.intent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update suggested actions
      if (data.suggested_actions && data.suggested_actions.length > 0) {
        setSuggestedActions(data.suggested_actions);
      }
    } catch (error: any) {
      console.error("Chatbot error:", error);

      // Provide more specific error messages
      let errorText =
        "Sorry, I'm having trouble connecting. Please try again later.";

      if (
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("fetch")
      ) {
        errorText =
          "Chatbot service is not available. Please make sure the chatbot server is running on port 8001.";
      } else if (error.message) {
        errorText = `Error: ${error.message}`;
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50 animate-pulse"
          size="lg"
          title="Chat with Farm2Home Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-lg">Farm2Home Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {customerData && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-500 text-white border-blue-400"
                >
                  {customerData.total_orders || 0} orders
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-blue-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === "bot" && (
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      {message.sender === "user" && (
                        <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">
                          {message.text}
                        </p>
                        {message.intent && message.intent !== "general" && (
                          <Badge
                            variant="outline"
                            className="mt-2 text-xs"
                            style={{
                              backgroundColor:
                                message.intent === "discount"
                                  ? "#fef3c7"
                                  : message.intent === "churn"
                                    ? "#fee2e2"
                                    : "#dbeafe",
                            }}
                          >
                            {message.intent}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Buttons */}
            <div className="border-t p-3 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">Quick actions:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-8"
                >
                  <Link href="/customer/store/products">
                    <Package className="h-3 w-3 mr-1" />
                    Products
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-8"
                >
                  <Link href="/customer/store/cart">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Cart
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-8"
                >
                  <Link href="/customer/store/orders">
                    <Clock className="h-3 w-3 mr-1" />
                    Orders
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs h-8"
                >
                  <Link href="/customer/store/feedback">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Support
                  </Link>
                </Button>
              </div>
            </div>

            {/* Suggested Actions from Bot */}
            {suggestedActions.length > 0 && (
              <div className="border-t p-3 bg-blue-50">
                <p className="text-xs text-blue-700 mb-2 font-semibold">
                  Suggested:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const actionMap: Record<string, string> = {
                          "View Products": "/customer/store/products",
                          "Check Cart": "/customer/store/cart",
                          "Browse Products": "/customer/store/products",
                          "View Orders": "/customer/store/orders",
                          "Browse Categories": "/customer/store/products",
                          "My Orders": "/customer/store/orders",
                          "Contact Support": "/customer/store/feedback",
                        };
                        const href =
                          actionMap[action] || "/customer/store/products";
                        window.location.href = href;
                      }}
                      className="text-xs h-7 bg-white hover:bg-blue-100"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Ask about discounts, products, orders, or delivery
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
