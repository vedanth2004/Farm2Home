"""
Farm2Home Chatbot API

A FastAPI-based chatbot backend using Google Gemini API for natural language responses.

Features:
- Natural language processing using Google Gemini API
- Intent recognition for discount, churn, and product recommendations
- Modular design for easy extension
- Integration with ML models for intelligent responses

Example Usage:
    POST /chat
    {
        "message": "Can I get a discount on organic apples?"
    }
    
    Response:
    {
        "response": "Sure! You're eligible for 7% off on organic apples today."
    }

Test Cases:
    1. Discount Query:
       Input:  { "message": "Can I get a discount on organic apples?" }
       Output: { "response": "Sure! You're eligible for 7% off on organic apples today." }
    
    2. Churn Query:
       Input:  { "message": "What's my churn risk?" }
       Output: { "response": "Your churn risk is currently low (15%). You're an active customer!" }
    
    3. Product Recommendation:
       Input:  { "message": "What products do you recommend?" }
       Output: { "response": "Based on your purchase history, I recommend fresh vegetables..." }
    
    4. General Query:
       Input:  { "message": "What are your delivery times?" }
       Output: { "response": "We typically deliver within 24-48 hours..." }
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
try:
    import google.generativeai as genai
    USE_OLD_API = True  # Use standard google-generativeai package
except ImportError:
    genai = None
    USE_OLD_API = False
    print("⚠️  Warning: google-generativeai not installed. Install with: pip install google-generativeai")
from typing import Optional, List
import re
import httpx
import json
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
STORAGE_DIR = os.getenv("ML_STORAGE_DIR", BASE_DIR)

# Try to create storage directory, fallback to BASE_DIR if permission denied
try:
    os.makedirs(STORAGE_DIR, exist_ok=True)
    # Test write permissions
    test_file = os.path.join(STORAGE_DIR, ".test_write")
    with open(test_file, "w") as f:
        f.write("test")
    os.remove(test_file)
except (PermissionError, OSError) as e:
    print(f"⚠️  Warning: Cannot write to {STORAGE_DIR}: {e}")
    print(f"   Falling back to BASE_DIR: {BASE_DIR}")
    STORAGE_DIR = BASE_DIR
    os.makedirs(STORAGE_DIR, exist_ok=True)

RAW_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").strip()
ALLOW_ALL_ORIGINS = RAW_ALLOWED_ORIGINS == "*"
PARSED_ALLOWED_ORIGINS = (
    ["*"]
    if ALLOW_ALL_ORIGINS
    else [
        origin.strip().rstrip("/")
        for origin in RAW_ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ]
)

# Initialize FastAPI app
app = FastAPI(
    title="Farm2Home Chatbot API",
    description="AI-powered chatbot for Farm2Home grocery e-commerce platform",
    version="1.0.0"
)

# CORS middleware
cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if ALLOW_ALL_ORIGINS:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = PARSED_ALLOWED_ORIGINS
    cors_kwargs["allow_credentials"] = True

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Load Gemini API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️  Warning: GEMINI_API_KEY not found in environment variables")
    print("   Set it using: export GEMINI_API_KEY='your-api-key'")
else:
    print("✅ Gemini API key found")

# ML Service URL (for integrating with ML models)
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8000")

# Chatbot conversations database
CHATBOT_DB_PATH = os.path.join(STORAGE_DIR, "chatbot_conversations.db")

def init_chatbot_database():
    """Initialize SQLite database for storing chatbot conversations"""
    try:
        # Remove the file if it exists and is not a valid database
        if os.path.exists(CHATBOT_DB_PATH):
            try:
                # Try to open it as a database to check if it's valid
                test_conn = sqlite3.connect(CHATBOT_DB_PATH)
                test_conn.execute("SELECT 1")
                test_conn.close()
            except sqlite3.DatabaseError:
                # File exists but is not a valid database, remove it
                os.remove(CHATBOT_DB_PATH)
                print(f"⚠️  Removed invalid database file: {CHATBOT_DB_PATH}")
        
        # Create or connect to the database
        conn = sqlite3.connect(CHATBOT_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chatbot_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT,
                message TEXT,
                response TEXT,
                intent TEXT,
                action_taken TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        print(f"✓ Chatbot conversations database initialized at {CHATBOT_DB_PATH}")
    except Exception as e:
        print(f"⚠️  Warning: Failed to initialize chatbot database: {e}")
        print(f"   The chatbot will still work, but conversation history won't be saved.")

# Initialize database on import
init_chatbot_database()

# Initialize Gemini model
model = None
try:
    if GEMINI_API_KEY and genai:
        # Configure Gemini API
        genai.configure(api_key=GEMINI_API_KEY)
        # Initialize model (using gemini-2.5-flash as primary)
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            print("✅ Gemini model (gemini-2.5-flash) loaded successfully")
        except Exception as e:
            print(f"⚠️  Warning: Failed to load gemini-2.5-flash: {e}")
            try:
                model = genai.GenerativeModel("gemini-2.0-flash-exp")
                print("✅ Gemini model (gemini-2.0-flash-exp) loaded successfully")
            except Exception as e2:
                try:
                    model = genai.GenerativeModel("gemini-pro")
                    print("✅ Gemini model (gemini-pro) loaded successfully")
                except Exception as e3:
                    print(f"⚠️  Warning: Failed to load any Gemini model: {e3}")
                    model = None
    else:
        print("⚠️  Warning: GEMINI_API_KEY not set or genai not available")
except Exception as e:
    print(f"⚠️  Warning: Failed to initialize Gemini: {e}")
    import traceback
    traceback.print_exc()
    model = None

# ==================== Request/Response Models ====================

class ChatRequest(BaseModel):
    message: str
    customer_id: Optional[str] = None  # For personalized responses
    customer_data: Optional[dict] = None  # Customer order history data

class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    action_taken: Optional[str] = None
    suggested_actions: Optional[list] = None  # Quick action buttons

# ==================== Intent Recognition ====================

def detect_intent(message: str) -> str:
    """
    Detect user intent from message using keyword-based recognition.
    
    Args:
        message: User's message text
        
    Returns:
        Intent type: 'discount', 'churn', 'recommendation', 'purchase_history', or 'general'
    """
    message_lower = message.lower()
    
    # Purchase history intent keywords (check FIRST to avoid false positives)
    purchase_history_keywords = [
        'my purchase', 'my order', 'my orders', 'my spending', 'my spend',
        'highest purchase', 'highest order', 'most expensive', 'biggest order',
        'largest order', 'top purchase', 'order history', 'purchase history',
        'what i bought', 'what i purchased', 'my highest', 'most i spent',
        'highest cost', 'highest amount', 'biggest purchase', 'which product',
        'most purchased', 'most bought', 'favorite product', 'top product',
        'what product', 'product i', 'most that i', 'most i have'
    ]
    
    # Check for purchase history queries FIRST (before discount)
    if any(keyword in message_lower for keyword in purchase_history_keywords):
        return 'purchase_history'
    
    # Discount intent keywords (removed ambiguous words like 'cost', 'price' when not in purchase context)
    discount_keywords = [
        'discount', 'discounts', 'off', 'deal', 'deals', 'sale', 'sales',
        'promo', 'promotion', 'coupon', 'coupons', 'cheap', 'cheaper',
        'affordable', 'save', 'savings', 'special offer', 'special price'
    ]
    
    # Only check for discount if message doesn't contain purchase-related words
    purchase_words = ['my', 'purchase', 'order', 'bought', 'spent', 'highest', 'most', 'expensive']
    is_purchase_query = any(word in message_lower for word in purchase_words)
    
    # Churn intent keywords
    churn_keywords = [
        'churn', 'risk', 'at risk', 'leaving', 'stop', 'stopping',
        'loyal', 'loyalty', 'retention', 'retain', 'engagement',
        'active', 'inactive'
    ]
    
    # Recommendation intent keywords
    recommendation_keywords = [
        'recommend', 'recommendation', 'suggest', 'suggestion',
        'what should', 'what to buy', 'best', 'popular', 'trending',
        'new products', 'what products', 'what items'
    ]
    
    # Cart intent keywords
    cart_keywords = [
        'my cart', 'cart', 'shopping cart', 'items in cart', 'what in cart',
        'cart items', 'cart products', 'my basket', 'basket'
    ]
    
    # Wishlist intent keywords
    wishlist_keywords = [
        'wishlist', 'wish list', 'my wishlist', 'saved items', 'saved products',
        'favorites', 'favourites', 'bookmarked', 'bookmarks'
    ]
    
    # Account/Loyalty intent keywords
    account_keywords = [
        'my account', 'account info', 'loyalty points', 'points', 'referral',
        'my profile', 'account status', 'member since'
    ]
    
    # Reviews intent keywords
    reviews_keywords = [
        'my reviews', 'my feedback', 'my ratings', 'reviews i gave',
        'feedback i left', 'my comments'
    ]
    
    # Inventory intent keywords
    inventory_keywords = [
        'inventory', 'stock', 'available', 'availability', 'in stock',
        'out of stock', 'quantity', 'how many', 'how much', 'left',
        'remaining', 'stock level', 'stock status', 'is available',
        'do you have', 'have you got', 'do you sell', 'can i buy'
    ]
    
    # Check for cart intent
    if any(keyword in message_lower for keyword in cart_keywords):
        return 'cart'
    
    # Check for wishlist intent
    if any(keyword in message_lower for keyword in wishlist_keywords):
        return 'wishlist'
    
    # Check for account intent
    if any(keyword in message_lower for keyword in account_keywords):
        return 'account'
    
    # Check for reviews intent
    if any(keyword in message_lower for keyword in reviews_keywords):
        return 'reviews'
    
    # Check for inventory intent (before discount to avoid conflicts)
    if any(keyword in message_lower for keyword in inventory_keywords):
        return 'inventory'
    
    # Check for discount intent (only if not a purchase query)
    if not is_purchase_query and any(keyword in message_lower for keyword in discount_keywords):
        return 'discount'
    
    # Check for churn intent
    if any(keyword in message_lower for keyword in churn_keywords):
        return 'churn'
    
    # Check for recommendation intent
    if any(keyword in message_lower for keyword in recommendation_keywords):
        return 'recommendation'
    
    # Default to general intent
    return 'general'

# ==================== Placeholder Functions for ML Integration ====================

async def suggest_discount(product_name: Optional[str] = None, product_id: Optional[str] = None, category: Optional[str] = None, base_price: Optional[float] = None) -> str:
    """
    Get discount suggestions from dynamic pricing ML model.
    
    Args:
        product_name: Optional product name
        product_id: Optional product ID
        category: Optional product category
        base_price: Optional base price
        
    Returns:
        Discount suggestion message
    """
    try:
        # Try to call the actual ML service
        async with httpx.AsyncClient(timeout=5.0) as client:
            # If we have product details, try to get prediction
            if product_id and base_price and category:
                # Get past sales volume (placeholder - would need to fetch from DB)
                past_sales_volume = 100.0  # Default value
                
                response = await client.post(
                    f"{ML_SERVICE_URL}/predict_dynamic_pricing",
                    json={
                        "product_id": product_id,
                        "product_name": product_name or "Product",
                        "base_price": base_price,
                        "category": category,
                        "past_sales_volume": past_sales_volume
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    discount = data.get("optimal_discount", 0)
                    final_price = data.get("final_selling_price", base_price)
                    confidence = data.get("confidence", "Medium")
                    
                    if discount > 0:
                        return f"Great news! Based on our dynamic pricing model, I can offer you a {discount:.1f}% discount on {product_name or 'this product'}. The discounted price would be ₹{final_price:.2f}. This is a {confidence.lower()} confidence recommendation. Would you like to add it to your cart?"
                    else:
                        return f"Currently, {product_name or 'this product'} is already at the best price. However, I can check for other products with discounts. What else are you looking for?"
            
            # If we only have product name, provide general response
            if product_name:
                return f"I'd be happy to check discounts for {product_name}! Our dynamic pricing model analyzes prices in real-time. Could you tell me the product category or ID so I can get you the exact discount?"
            
            return "I can help you find the best discounts! Our dynamic pricing model suggests optimal discounts for all products. Which product are you interested in? I can check the current discount offers for you."
            
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        print(f"ML service unavailable (timeout/connection error): {e}")
        # Fallback response when ML service is down
        if product_name:
            return f"I'd be happy to help you find discounts for {product_name}! We have various offers available. Would you like to browse our products to see current prices?"
        return "I can help you find great deals! Browse our products to see current discounts and special offers. What are you looking for?"
    except Exception as e:
        print(f"Error calling dynamic pricing API: {e}")
        # Fallback response
        if product_name:
            return f"I'd be happy to help you find discounts for {product_name}! We have various offers available. Would you like to browse our products?"
        return "I can help you find great deals! Browse our products to see current discounts. What are you looking for?"

async def predict_churn(customer_id: Optional[str] = None, customer_data: Optional[dict] = None) -> str:
    """
    Get churn prediction from ML model.
    
    Args:
        customer_id: Optional customer ID
        customer_data: Optional customer data dict with order history
        
    Returns:
        Churn prediction message
    """
    try:
        # If we have customer data, use it for prediction
        if customer_data:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{ML_SERVICE_URL}/predict_churn",
                    json={
                        "customer_id": customer_id or customer_data.get("id", "CUSTOMER"),
                        "last_purchase_date": customer_data.get("last_purchase_date", ""),
                        "total_orders": customer_data.get("total_orders", 0),
                        "avg_gap_days": customer_data.get("avg_gap_days", 0),
                        "total_spend": customer_data.get("total_spend", 0),
                        "spend_trend": customer_data.get("spend_trend", "stable"),
                        "days_since_last_order": customer_data.get("days_since_last_order", 0),
                        "category_preference": customer_data.get("category_preference", "Vegetables")
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    churn_risk = data.get("churnRisk", 0)
                    risk_level = data.get("riskLevel", "Low")
                    prediction = data.get("churnPrediction", 0)
                    
                    risk_percentage = churn_risk * 100
                    
                    if risk_level == "High":
                        return f"Based on our churn prediction model, your current churn risk is {risk_percentage:.1f}% ({risk_level}). We'd love to keep you as a valued customer! Would you like to see our special offers or browse new products?"
                    elif risk_level == "Medium":
                        return f"Your churn risk is currently {risk_percentage:.1f}% ({risk_level}). You're doing well! We have some great products and deals you might like. Would you like to explore?"
                    else:
                        return f"Great news! Your churn risk is {risk_percentage:.1f}% ({risk_level}). You're an active and valued customer! Keep shopping with us for the freshest produce."
        
        if customer_id:
            return f"To check your churn risk, I need more information about your purchase history. Please contact support or check your account dashboard for detailed insights."
        
        return "Our churn prediction model helps identify at-risk customers to provide better service. To check your personalized churn risk, I'll need your order history. Would you like to browse our products instead?"
        
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        print(f"ML service unavailable (timeout/connection error): {e}")
        # Fallback when ML service is down
        if customer_data:
            total_orders = customer_data.get('total_orders', 0)
            return f"Based on your account, you've made {total_orders} orders with us. You're a valued customer! Would you like to browse our latest products?"
        return "I can help you with your account information! You're an active customer with us. Would you like to browse products or check your orders?"
    except Exception as e:
        print(f"Error calling churn prediction API: {e}")
        # Fallback response
        if customer_data:
            total_orders = customer_data.get('total_orders', 0)
            return f"Based on your purchase history ({total_orders} orders), you're an active customer! Would you like to see more products?"
        return "I can help you with account information! Would you like to browse products or check your orders?"

async def get_inventory_info(product_name: Optional[str] = None, product_id: Optional[str] = None, category: Optional[str] = None) -> str:
    """
    Get inventory/stock information for products.
    
    Args:
        product_name: Optional product name to search for
        product_id: Optional product ID
        category: Optional product category
        
    Returns:
        Inventory information message
    """
    try:
        # Try to fetch from Next.js API (which has database access)
        NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://127.0.0.1:3000")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Build query parameters
            params = {}
            if product_id:
                # Get specific product stock
                try:
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/products/{product_id}/stock"
                    )
                    if response.status_code == 200:
                        data = response.json()
                        stock = data.get("availableStock", 0)
                        price = data.get("price", 0)
                        product_name = data.get("productName", "Product")
                        unit = data.get("unit", "unit")
                        
                        if stock > 0:
                            return f"Great news! {product_name} is available in stock. We have {stock} {unit}(s) available at ₹{price:.2f} per {unit}. Would you like to add it to your cart?"
                        else:
                            return f"Sorry, {product_name} is currently out of stock. We'll have it back in stock soon! Would you like me to notify you when it's available?"
                except Exception as e:
                    print(f"Error fetching product stock: {e}")
            
            # Search for products by name or category
            if product_name or category:
                params = {
                    "limit": 10,
                    "page": 1
                }
                if product_name:
                    params["search"] = product_name
                if category:
                    params["category"] = category
                
                try:
                    print(f"🔍 Searching products with params: {params}")
                    # Call products API - it should work without auth for public browsing
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/products",
                        params=params,
                        follow_redirects=True
                    )
                    print(f"📡 API Response status: {response.status_code}")
                    
                    if response.status_code != 200:
                        print(f"⚠️ Products API returned status {response.status_code}: {response.text[:200]}")
                        # Try to still parse if possible
                        if response.status_code == 401:
                            return "I need to check our inventory system. Please make sure you're logged in to check product availability."
                        elif response.status_code == 403:
                            return "I don't have permission to access inventory data. Please contact support."
                        else:
                            return f"I'm having trouble accessing our inventory right now (status: {response.status_code}). Please try again later or browse our products directly."
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"📦 Response data keys: {data.keys() if isinstance(data, dict) else 'not dict'}")
                        
                        # Handle different response structures
                        products = []
                        if isinstance(data, dict):
                            # Check for success response structure: { success: true, data: { items: [...] } }
                            if "success" in data and data.get("success") and "data" in data:
                                nested_data = data["data"]
                                if isinstance(nested_data, dict):
                                    products = nested_data.get("items", [])
                                elif isinstance(nested_data, list):
                                    products = nested_data
                            # Check for direct data structure: { data: { items: [...] } }
                            elif "data" in data and isinstance(data["data"], dict):
                                products = data["data"].get("items", [])
                            # Check for direct items: { items: [...] }
                            elif "items" in data:
                                products = data["items"]
                            # Check for data as list: { data: [...] }
                            elif isinstance(data.get("data"), list):
                                products = data["data"]
                        
                        print(f"📦 Found {len(products)} products")
                        if len(products) > 0:
                            print(f"📦 First product: {products[0].get('name', 'N/A')} with {len(products[0].get('listings', []))} listings")
                        
                        if len(products) > 0:
                            # Format inventory info for available products
                            inventory_info = []
                            total_stock = 0
                            
                            for product in products[:5]:  # Show top 5
                                prod_name = product.get("name", "Product")
                                listings = product.get("listings", [])
                                
                                if listings and len(listings) > 0:
                                    # Get first active listing with stock
                                    for listing in listings:
                                        stock = listing.get("availableQty", 0)
                                        # Try multiple price field names
                                        price = (listing.get("storePrice") or 
                                                listing.get("pricePerUnit") or 
                                                listing.get("farmerPrice") or 0)
                                        unit = product.get("baseUnit", "unit") or "unit"
                                        
                                        print(f"  📦 {prod_name}: stock={stock}, price={price}, unit={unit}")
                                        
                                        # Show all products with stock > 0, or if stock is 0, still show out of stock
                                        if stock > 0:
                                            total_stock += stock
                                            price_float = float(price) if price else 0.0
                                            inventory_info.append(f"• {prod_name}: {stock} {unit}(s) available at ₹{price_float:.2f} per {unit}")
                                            break  # Only show first listing with stock
                                        else:
                                            # If stock is 0, note it but don't add to list
                                            print(f"  ⚠️ {prod_name}: Out of stock (stock={stock})")
                                            break
                            
                            if inventory_info:
                                # If we found a specific product match, show detailed info
                                if product_name and len(products) == 1:
                                    prod = products[0]
                                    prod_name = prod.get("name", "Product")
                                    listings = prod.get("listings", [])
                                    if listings:
                                        listing = listings[0]
                                        stock = listing.get("availableQty", 0)
                                        price = listing.get("storePrice") or listing.get("pricePerUnit") or listing.get("storePrice", 0)
                                        unit = prod.get("baseUnit", "unit")
                                        price_float = float(price) if price else 0.0
                                        
                                        if stock > 0:
                                            return f"Great news! {prod_name} is available in stock. We have {stock} {unit}(s) available at ₹{price_float:.2f} per {unit}. Would you like to add it to your cart?"
                                        else:
                                            return f"Sorry, {prod_name} is currently out of stock. We'll have it back in stock soon! Would you like me to notify you when it's available?"
                                
                                # Multiple products found
                                result = f"Here are the available products:\n\n" + "\n".join(inventory_info)
                                if total_stock > 0:
                                    result += f"\n\nTotal stock available: {total_stock} units. Would you like more details about any of these?"
                                return result
                            else:
                                return f"I found products matching '{product_name or category}', but they're currently out of stock. Would you like me to check other categories?"
                        else:
                            return f"I couldn't find any products matching '{product_name or category}'. Could you provide more details or check a different category?"
                except Exception as e:
                    print(f"❌ Error searching products: {e}")
                    import traceback
                    print(f"Traceback: {traceback.format_exc()}")
            
            # General inventory response
            return "I can help you check product availability and stock levels! Please tell me which product you're looking for, or I can show you available products in a specific category. What would you like to know?"
            
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        print(f"Next.js API unavailable: {e}")
        return "I'm having trouble accessing our inventory system right now. Please try again in a moment, or browse our products directly on the website."
    except Exception as e:
        print(f"Error fetching inventory: {e}")
        return "I can help you check product availability! Please tell me which product you're interested in, and I'll check the stock for you."

async def recommend_products(user_preferences: Optional[str] = None, customer_data: Optional[dict] = None) -> str:
    """
    Get product recommendations using customer purchase prediction model.
    Now considers cart, wishlist, and order history for better recommendations.
    
    Args:
        user_preferences: Optional user preferences or category
        customer_data: Optional customer data (orders, cart, wishlist, etc.)
        
    Returns:
        Product recommendation message
    """
    try:
        # If we have customer data, try to get prediction
        if customer_data:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Calculate features from customer data
                total_orders = customer_data.get("total_orders", 0)
                purchase_frequency = customer_data.get("purchase_frequency", 0)
                avg_order_value = customer_data.get("avg_order_value", 0)
                last_purchase_days_ago = customer_data.get("last_purchase_days_ago", 0)
                total_items_bought = customer_data.get("total_items_bought", 0)
                
                if total_orders > 0:
                    response = await client.post(
                        f"{ML_SERVICE_URL}/predict_customer",
                        json={
                            "totalOrders": float(total_orders),
                            "purchaseFrequency": float(purchase_frequency),
                            "avgOrderValue": float(avg_order_value),
                            "lastPurchaseDaysAgo": float(last_purchase_days_ago),
                            "totalItemsBought": float(total_items_bought)
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        predicted_category = data.get("predictedCategory", "")
                        probability = data.get("predictionProbability", 0)
                        
                        if predicted_category:
                            return f"Based on your purchase history, I recommend checking out our {predicted_category} category! Our ML model predicts this is your preferred category with {probability*100:.1f}% confidence. We have fresh, high-quality {predicted_category.lower()} available. Would you like to see our selection?"
        
        # Consider wishlist preferences
        if customer_data:
            wishlist_preferred_category = customer_data.get('wishlist_preferred_category')
            wishlist_total = customer_data.get('wishlist_total', 0)
            if wishlist_preferred_category and wishlist_total > 0:
                return f"Based on your wishlist (you have {wishlist_total} items saved), I notice you're interested in {wishlist_preferred_category.lower()}! I recommend checking out our fresh {wishlist_preferred_category.lower()} selection. Would you like to see more products in this category or add items from your wishlist to your cart?"
        
        # Consider cart contents for recommendations
        if customer_data:
            cart_categories = customer_data.get('cart_categories', [])
            if cart_categories:
                top_cart_category = max(set(cart_categories), key=cart_categories.count) if cart_categories else None
                if top_cart_category:
                    return f"Based on what's in your cart, I recommend checking out more {top_cart_category.lower()} products! We have fresh, high-quality options in this category. Would you like to see more products?"
        
        # If we have preferences, use them
        if user_preferences:
            return f"Based on your interest in {user_preferences}, I recommend checking out our fresh selection! We have premium quality products in this category. Popular items include organic vegetables, fresh fruits, and premium grains. Would you like me to show you some specific products?"
        
        # Default recommendation
        return "Based on our smart recommendations, I suggest checking out our fresh vegetables, organic fruits, and premium grains. These are popular choices among our customers. What category interests you most? I can help you find the perfect products!"
        
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        print(f"ML service unavailable (timeout/connection error): {e}")
        # Fallback when ML service is down
        if customer_data:
            category_preference = customer_data.get('category_preference', 'products')
            return f"Based on your purchase history, I recommend checking out our {category_preference} category! We have fresh, high-quality products available. Would you like to browse?"
        if user_preferences:
            return f"Based on your interest in {user_preferences}, I recommend checking out our fresh selection! We have premium quality products. Would you like to see some specific items?"
        return "I recommend checking out our fresh vegetables, organic fruits, and premium grains! These are popular choices. What category interests you most?"
    except Exception as e:
        print(f"Error calling recommendation API: {e}")
        # Fallback response
        if user_preferences:
            return f"Based on your interest in {user_preferences}, I recommend checking out our fresh selection! We have premium quality products in this category. Would you like me to show you some popular items?"
        return "Based on your purchase history and our smart recommendations, I suggest checking out our fresh vegetables, organic fruits, and premium grains. These are popular choices among our customers. What category interests you most?"

# ==================== Gemini Response Generation ====================

async def generate_gemini_response(message: str, context: Optional[str] = None) -> str:
    """
    Generate response using Google Gemini API.
    
    Args:
        message: User's message
        context: Optional context for the conversation
        
    Returns:
        AI-generated response
    """
    if model is None:
        print("⚠️  WARNING: Gemini model is None - using fallback responses")
        # If Gemini model is not available, provide a helpful response based on the message
        if "purchase" in message.lower() or "order" in message.lower() or "bought" in message.lower():
            return "I can help you with your purchase history! Please check your order history in the 'My Orders' section, or I can help you browse products."
        elif "delivery" in message.lower() or "ship" in message.lower():
            return "We typically deliver within 24-48 hours. You can track your orders in the 'My Orders' section. For specific delivery questions, please contact our support team."
        elif "product" in message.lower() or "item" in message.lower():
            return "I'd be happy to help you find products! You can browse our full catalog in the Products section. What category are you interested in?"
        else:
            return "Hello! I'm your Farm2Home assistant. I can help you with product information, discounts, orders, and delivery. What would you like to know?"
    
    try:
        # Create context-aware prompt
        prompt = f"""You are a helpful and friendly assistant for Farm2Home, a grocery e-commerce platform that connects customers directly with local farmers.

Your role is to:
- Help customers with grocery shopping, orders, delivery, and product information
- Provide friendly, concise, and helpful responses (2-3 sentences max)
- Be professional, warm, and customer-focused
- Answer questions about products, orders, delivery times, farmers, and discounts
- If you don't know something, suggest browsing the store or contacting customer support

Keep responses:
- Conversational and friendly
- Short and to the point
- Focused on helping the customer shop or solve their issue

Customer question: {message}

Please provide a helpful, friendly response:"""
        
        if context:
            prompt += f"\n\nContext: {context}"
        
        # Generate response (run in executor to avoid blocking the async event loop)
        import asyncio
        
        loop = asyncio.get_event_loop()
        
        # Retry logic for rate limiting (429 errors)
        max_retries = 2
        retry_delay = 2  # seconds
        
        # Helper function for executor (using standard google-generativeai API)
        def call_gemini():
            print(f"🤖 Calling Gemini API with prompt length: {len(prompt)} chars")
            result = model.generate_content(prompt)
            print(f"✅ Gemini API returned response: {result.text[:100] if hasattr(result, 'text') and result.text else 'No text'}")
            return result
        
        for attempt in range(max_retries + 1):
            try:
                print(f"🚀 Attempting to call Gemini API (attempt {attempt + 1}/{max_retries + 1})...")
                # Use standard API: model.generate_content()
                response = await loop.run_in_executor(None, call_gemini)
                print(f"✅ Gemini API call successful!")
                break  # Success, exit retry loop
            except Exception as e:
                error_str = str(e).lower()
                # Check for rate limit errors (429)
                if "429" in error_str or "resource exhausted" in error_str or "rate limit" in error_str:
                    if attempt < max_retries:
                        print(f"⚠️  Rate limit hit (429), retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries + 1})")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        print(f"❌ Rate limit exceeded after {max_retries + 1} attempts")
                        raise
                else:
                    # Other errors, don't retry
                    raise
        
        # Extract text from response (new API returns response.text directly)
        if hasattr(response, 'text') and response.text:
            print(f"📝 Extracted Gemini response text: {response.text[:100]}...")
            return response.text.strip()
        
        # Try alternative response formats
        if hasattr(response, 'candidates') and response.candidates:
            if len(response.candidates) > 0 and hasattr(response.candidates[0], 'content'):
                text = response.candidates[0].content.parts[0].text if hasattr(response.candidates[0].content, 'parts') else str(response.candidates[0].content)
                print(f"📝 Extracted Gemini response from candidates: {text[:100]}...")
                return text.strip()
        
        print(f"⚠️  Unexpected Gemini response structure: {type(response)}, attributes: {dir(response)}")
        # Fallback if structure is different
        return "Hello! I'm your Farm2Home assistant. How can I help you with your grocery shopping today?"
            
    except Exception as e:
        print(f"❌ Error generating Gemini response: {e}")
        import traceback
        traceback.print_exc()
        
        # Provide context-specific fallback
        message_lower = message.lower()
        if "name" in message_lower:
            return "I'm your Farm2Home assistant! I'm here to help you with your grocery shopping, orders, and any questions you have about our products."
        elif "purchase" in message_lower or "order" in message_lower:
            return "I can help you with your purchase history! Please check your order history in the 'My Orders' section, or I can help you browse products."
        elif "delivery" in message_lower:
            return "We typically deliver within 24-48 hours. You can track your orders in the 'My Orders' section."
        else:
            return "Hello! I'm your Farm2Home assistant. I can help you with product information, discounts, orders, and delivery. What would you like to know?"

# ==================== Main Chat Endpoint ====================

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chatbot endpoint that processes user messages and generates responses.
    
    Args:
        request: ChatRequest with user message
        
    Returns:
        ChatResponse with AI-generated reply and detected intent
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        message = request.message.strip()
        
        # Detect intent
        intent = detect_intent(message)
        print(f"🎯 Detected intent: '{intent}' for message: '{message}'")
        
        # Get customer data from request if provided
        # Use model_dump() to safely get all fields, including optional ones
        request_dict = request.model_dump() if hasattr(request, 'model_dump') else request.dict()
        customer_id = request_dict.get('customer_id')
        customer_data = request_dict.get('customer_data')
        
        # Debug logging (remove in production or use proper logging)
        if customer_data:
            total_orders = customer_data.get('total_orders', 0)
            category_preference = customer_data.get('category_preference', 'N/A')
            print(f"📊 Customer data received: {total_orders} orders, {category_preference} preference")
        else:
            print("⚠️  No customer data provided")
        
        # Handle different intents
        response_text = ""
        action_taken = None
        suggested_actions = []
        
        if intent == 'discount':
            # Extract product name, category, and price if mentioned
            product_match = re.search(r'(?:on|for|about)\s+([a-zA-Z\s]+)', message, re.IGNORECASE)
            product_name = product_match.group(1).strip() if product_match else None
            
            # Try to extract additional details
            price_match = re.search(r'₹?\s*(\d+(?:\.\d+)?)', message)
            base_price = float(price_match.group(1)) if price_match else None
            
            # Extract category from message
            categories = ['vegetables', 'fruits', 'grains', 'dairy', 'spices', 'pulses', 'oil', 'nuts']
            category = None
            for cat in categories:
                if cat in message.lower():
                    category = cat.capitalize()
                    break
            
            response_text = await suggest_discount(
                product_name=product_name,
                product_id=customer_id,  # Use customer_id as product_id placeholder
                category=category,
                base_price=base_price
            )
            action_taken = "discount_suggestion"
            suggested_actions = ["View Products", "Check Cart"]
            
        elif intent == 'churn':
            response_text = await predict_churn(
                customer_id=customer_id,
                customer_data=customer_data
            )
            action_taken = "churn_prediction"
            suggested_actions = ["Browse Products", "View Orders"]
            
        elif intent == 'recommendation':
            # Extract preferences if mentioned
            preference_match = re.search(r'(?:for|about|interested in)\s+([a-zA-Z\s]+)', message, re.IGNORECASE)
            preferences = preference_match.group(1).strip() if preference_match else None
            
            response_text = await recommend_products(
                user_preferences=preferences,
                customer_data=customer_data
            )
            action_taken = "product_recommendation"
            suggested_actions = ["View Products", "Browse Categories"]
            
        elif intent == 'cart':
            # Handle cart-related queries
            if customer_data:
                cart_items = customer_data.get('cart_items', [])
                cart_total_items = customer_data.get('cart_total_items', 0)
                cart_total_products = customer_data.get('cart_total_products', 0)
                cart_categories = customer_data.get('cart_categories', [])
                
                if cart_total_items > 0:
                    category_list = ', '.join(cart_categories[:3]) if cart_categories else 'various categories'
                    response_text = f"You have {cart_total_items} items in your cart from {cart_total_products} different products. Your cart includes items from: {category_list}. Would you like to proceed to checkout or continue shopping?"
                    if cart_total_products > 3:
                        response_text += f" You have products from {len(cart_categories)} different categories."
                else:
                    response_text = "Your cart is empty! Would you like to browse our products and add some items?"
                action_taken = "cart_info"
                suggested_actions = ["View Cart", "Browse Products", "Checkout"]
            else:
                # Use Gemini when customer data is not available
                print(f"💬 No customer data for cart query - using Gemini")
                context = "Customer is asking about their shopping cart, but cart data is not available. Provide a helpful response about how to view their cart."
                response_text = await generate_gemini_response(message, context)
                action_taken = "cart_info_gemini"
                suggested_actions = ["View Cart", "Browse Products"]
                
        elif intent == 'wishlist':
            # Handle wishlist-related queries
            if customer_data:
                wishlist_items = customer_data.get('wishlist_items', [])
                wishlist_total = customer_data.get('wishlist_total', 0)
                wishlist_preferred_category = customer_data.get('wishlist_preferred_category')
                
                if wishlist_total > 0:
                    category_text = f" Your wishlist mostly contains {wishlist_preferred_category.lower()} products." if wishlist_preferred_category else ""
                    response_text = f"You have {wishlist_total} items in your wishlist.{category_text} Would you like to view your wishlist or add some of these items to your cart?"
                    action_taken = "wishlist_info"
                    suggested_actions = ["View Wishlist", "Browse Products", "View Cart"]
                else:
                    response_text = "Your wishlist is empty! Would you like to browse our products and add some items to your wishlist?"
                    action_taken = "wishlist_info"
                    suggested_actions = ["Browse Products", "View Cart"]
            else:
                response_text = "I'd love to help you with your wishlist! However, I don't have access to your wishlist data right now. Please check your wishlist or browse our products."
                action_taken = "wishlist_info"
                suggested_actions = ["View Wishlist", "Browse Products"]
                
        elif intent == 'account':
            # Handle account-related queries
            if customer_data:
                name = customer_data.get('name', 'Customer')
                loyalty_points = customer_data.get('loyalty_points', 0)
                referral_code = customer_data.get('referral_code')
                account_created = customer_data.get('account_created')
                total_orders = customer_data.get('total_orders', 0)
                
                account_info_parts = []
                account_info_parts.append(f"Hello {name}!")
                if total_orders > 0:
                    account_info_parts.append(f"You've made {total_orders} orders with us.")
                if loyalty_points > 0:
                    account_info_parts.append(f"You have {loyalty_points} loyalty points.")
                if referral_code:
                    account_info_parts.append(f"Your referral code is {referral_code}.")
                if account_created:
                    account_info_parts.append(f"Member since {account_created[:10]}.")
                
                response_text = " ".join(account_info_parts) if account_info_parts else f"Hello {name}! How can I help you today?"
                action_taken = "account_info"
                suggested_actions = ["View Profile", "My Orders", "Browse Products"]
            else:
                response_text = "I'd love to help you with your account information! Please check your profile page for detailed account information."
                action_taken = "account_info"
                suggested_actions = ["View Profile", "My Orders"]
                
        elif intent == 'reviews':
            # Handle reviews/feedback queries
            if customer_data:
                reviews = customer_data.get('reviews', [])
                total_reviews = customer_data.get('total_reviews', 0)
                avg_rating_given = customer_data.get('avg_rating_given', 0)
                
                if total_reviews > 0:
                    response_text = f"You've given {total_reviews} reviews with an average rating of {avg_rating_given:.1f} stars. Thank you for your feedback! Would you like to see your reviews or browse products to review?"
                    action_taken = "reviews_info"
                    suggested_actions = ["View Feedback", "Browse Products", "My Orders"]
                else:
                    response_text = "You haven't left any reviews yet! After you receive an order, you can leave reviews to help other customers. Would you like to browse products or check your orders?"
                    action_taken = "reviews_info"
                    suggested_actions = ["My Orders", "Browse Products"]
            else:
                response_text = "I'd love to help you with your reviews! Please check your feedback page or order history to see your reviews."
                action_taken = "reviews_info"
                suggested_actions = ["View Feedback", "My Orders"]
                
        elif intent == 'purchase_history':
            # Handle purchase history queries with customer data
            print(f"📊 Purchase history intent detected")
            if customer_data:
                total_orders = customer_data.get('total_orders', 0)
                total_spend = customer_data.get('total_spend', 0)
                category_preference = customer_data.get('category_preference', 'various categories')
                avg_order_value = customer_data.get('avg_order_value', 0)
                last_purchase_date = customer_data.get('last_purchase_date', 'N/A')
                
                message_lower = message.lower()
                
                # Check for product-specific queries
                if 'which product' in message_lower or 'most purchased' in message_lower or 'most bought' in message_lower or ('most' in message_lower and 'product' in message_lower):
                    # Product-specific purchase query
                    response_text = f"Based on your purchase history, you've purchased the most products from the {category_preference} category. You've made {total_orders} orders with a total spend of ₹{total_spend:.2f}. Your favorite category is {category_preference}. Would you like to see more products in this category?"
                
                # Check for highest order value queries
                elif 'highest' in message_lower or 'most expensive' in message_lower or 'biggest' in message_lower or 'largest' in message_lower:
                    # Highest order value query
                    if avg_order_value > 0:
                        response_text = f"Based on your purchase history, your highest/average order value is ₹{avg_order_value:.2f}. You've made {total_orders} orders with a total spend of ₹{total_spend:.2f}. Your preferred category is {category_preference}. Would you like to see more products in your favorite category?"
                    else:
                        avg_value = (total_spend / total_orders) if total_orders > 0 else 0
                        response_text = f"You've made {total_orders} orders with a total spend of ₹{total_spend:.2f}. Your average order value is ₹{avg_value:.2f}. Your preferred category is {category_preference}. Would you like to browse more products?"
                elif 'total' in message_lower and ('spend' in message_lower or 'spent' in message_lower):
                    response_text = f"You've spent a total of ₹{total_spend:.2f} across {total_orders} orders. Your preferred category is {category_preference}. Would you like to see more products?"
                elif 'last purchase' in message_lower or 'last order' in message_lower:
                    response_text = f"Your last purchase was on {last_purchase_date}. You've made {total_orders} orders total, spending ₹{total_spend:.2f}. Your preferred category is {category_preference}. Would you like to browse more products?"
                elif 'order' in message_lower or 'purchase' in message_lower:
                    response_text = f"You've made {total_orders} orders with us, spending a total of ₹{total_spend:.2f}. Your favorite category is {category_preference}, and your average order value is ₹{avg_order_value:.2f}. Would you like to browse more products?"
                else:
                    response_text = f"Based on your purchase history, you've made {total_orders} orders with a total spend of ₹{total_spend:.2f}. Your preferred category is {category_preference}, and your average order value is ₹{avg_order_value:.2f}. Would you like to see more products in your preferred category?"
            else:
                # Use Gemini when customer data is not available
                print(f"💬 No customer data for purchase history - using Gemini")
                context = "Customer is asking about their purchase history or orders, but order data is not available. Provide a helpful response about how to view their order history."
                response_text = await generate_gemini_response(message, context)
                action_taken = "purchase_history_gemini"
            if not action_taken:
                action_taken = "purchase_history_response"
            suggested_actions = ["View Products", "My Orders", "Browse Categories"]
        
        elif intent == 'inventory':
            # Extract product name or category from message
            import re
            product_name = None
            product_id = None
            category = None
            message_lower = message.lower()
            
            # Try to extract product name from message
            # Look for patterns like "stock of X", "availability of X", "do you have X", "is X available"
            patterns = [
                r'(?:stock|availability)\s+(?:of|for)\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)',
                r'([a-zA-Z\s]+?)\s+(?:stock|availability|in stock)',
                r'do you have\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)',
                r'is\s+([a-zA-Z\s]+?)\s+(?:available|in stock)',
                r'have you got\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)',
                r'how many\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)',
                r'how much\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, message_lower, re.IGNORECASE)
                if match:
                    extracted = match.group(1).strip()
                    # Clean up common words
                    extracted = re.sub(r'\b(the|a|an|some|any|this|that)\b', '', extracted, flags=re.IGNORECASE).strip()
                    if extracted and len(extracted) > 1:
                        product_name = extracted
                        print(f"📦 Extracted product name: '{product_name}' from message: '{message}'")
                        break
            
            # If no product name extracted but message contains inventory keywords, try to extract any word after "is" or "have"
            if not product_name:
                # Try simpler pattern: "is X available" or "have X"
                # For "Is apple available in stock?" - extract "apple"
                # Handle "Is apple available in stock?" → extract "apple"
                simple_patterns = [
                    r'is\s+([a-z]+)\s+available\s+in\s+stock',  # "is apple available in stock"
                    r'is\s+([a-z]+)\s+in\s+stock',             # "is apple in stock"
                    r'is\s+([a-z]+)\s+available',              # "is apple available"
                    r'have\s+([a-z]+)',                        # "have apple"
                    r'([a-z]+)\s+available',                   # "apple available"
                    r'([a-z]+)\s+in\s+stock',                  # "apple in stock"
                    r'available\s+([a-z]+)',                   # "available apple"
                ]
                for pattern in simple_patterns:
                    match = re.search(pattern, message_lower)
                    if match:
                        extracted = match.group(1).strip()
                        # Skip common words and inventory keywords
                        skip_words = ['there', 'this', 'that', 'it', 'they', 'we', 'you', 'stock', 'available', 'inventory', 'in']
                        if extracted not in skip_words and len(extracted) > 2:
                            product_name = extracted
                            print(f"📦 Extracted product name (simple): '{product_name}' from message: '{message}'")
                            break
                
                # Final fallback: if message contains "is X available" and X is a single word, extract it
                if not product_name:
                    # Match "is X available" where X is a single word (handles "Is apple available in stock?")
                    fallback_match = re.search(r'is\s+([a-z]{3,})\s+(?:available|in\s+stock)', message_lower)
                    if fallback_match:
                        extracted = fallback_match.group(1).strip()
                        skip_words = ['there', 'this', 'that', 'it', 'they', 'we', 'you', 'stock', 'available', 'inventory', 'in', 'the']
                        if extracted not in skip_words:
                            product_name = extracted
                            print(f"📦 Extracted product name (fallback): '{product_name}' from message: '{message}'")
            
            # Check for category mentions
            categories = ['vegetables', 'fruits', 'grains', 'dairy', 'spices', 'pulses', 'oil', 'nuts']
            for cat in categories:
                if cat in message_lower:
                    category = cat.capitalize()
                    print(f"📦 Detected category: '{category}' from message: '{message}'")
                    break
            
            # Call inventory function
            print(f"🔍 Calling get_inventory_info with: product_name='{product_name}', product_id='{product_id}', category='{category}'")
            response_text = await get_inventory_info(product_name, product_id, category)
            print(f"✅ Inventory response: {response_text[:100]}...")
            action_taken = "inventory_check"
            suggested_actions = ["View Products", "Browse Categories", "Add to Cart"]
        
        else:
            # Use Gemini for general queries with customer context
            print(f"💬 Using Gemini for general query (intent: {intent})")
            context = None
            if customer_data:
                context_parts = []
                
                # Order history context
                total_orders = customer_data.get('total_orders', 0)
                if total_orders > 0:
                    context_parts.append(f"Customer has {total_orders} orders, last purchase {customer_data.get('days_since_last_order', 0)} days ago.")
                    category_pref = customer_data.get('category_preference')
                    if category_pref:
                        context_parts.append(f"Preferred category: {category_pref}.")
                
                # Cart context
                cart_total = customer_data.get('cart_total_items', 0)
                if cart_total > 0:
                    context_parts.append(f"Customer has {cart_total} items in cart from {customer_data.get('cart_total_products', 0)} products.")
                
                # Wishlist context
                wishlist_total = customer_data.get('wishlist_total', 0)
                if wishlist_total > 0:
                    context_parts.append(f"Customer has {wishlist_total} items in wishlist.")
                
                # Account context
                name = customer_data.get('name')
                loyalty_points = customer_data.get('loyalty_points', 0)
                if name:
                    context_parts.append(f"Customer name: {name}.")
                if loyalty_points > 0:
                    context_parts.append(f"Customer has {loyalty_points} loyalty points.")
                
                context = " ".join(context_parts) if context_parts else None
            
            response_text = await generate_gemini_response(message, context)
            action_taken = "gemini_response"
            suggested_actions = ["View Products", "My Orders", "Contact Support"]
    
        # Save conversation to database (non-blocking, don't wait for it)
        try:
            conn = sqlite3.connect(CHATBOT_DB_PATH, timeout=2.0)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chatbot_conversations 
                (customer_id, message, response, intent, action_taken)
                VALUES (?, ?, ?, ?, ?)
            """, (
                customer_id or "anonymous",
                message,
                response_text,
                intent,
                action_taken
            ))
            conn.commit()
            conn.close()
        except Exception as db_error:
            print(f"Warning: Failed to save conversation to database: {db_error}")
            # Don't fail the request if DB save fails
        
        return ChatResponse(
            response=response_text,
            intent=intent,
            action_taken=action_taken,
            suggested_actions=suggested_actions
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        # Return a helpful error response instead of crashing
        return ChatResponse(
            response="I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team for assistance.",
            intent="error",
            action_taken="error_handling",
            suggested_actions=["Try Again", "Contact Support"]
    )

# ==================== Health Check ====================

@app.get("/")
def root():
    """Root endpoint with API information"""
    # Very simple response - avoid any potential variable access issues
    return {
        "message": "Farm2Home Chatbot API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "/chat",
            "health": "/health",
            "conversations": "/conversations",
            "root": "/"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint - quick response, no blocking operations"""
    try:
        return {
            "status": "healthy",
            "gemini_configured": model is not None,
            "api_key_set": bool(GEMINI_API_KEY),
            "ml_service_url": ML_SERVICE_URL
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/conversations")
def get_conversations(customer_id: Optional[str] = None, limit: int = 50):
    """Get conversation history"""
    try:
        conn = sqlite3.connect(CHATBOT_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if customer_id:
            cursor.execute("""
                SELECT id, customer_id, message, response, intent, action_taken, timestamp
                FROM chatbot_conversations
                WHERE customer_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (customer_id, limit))
        else:
            cursor.execute("""
                SELECT id, customer_id, message, response, intent, action_taken, timestamp
                FROM chatbot_conversations
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        conversations = []
        for row in rows:
            conversations.append({
                "id": row["id"],
                "customer_id": row["customer_id"],
                "message": row["message"],
                "response": row["response"],
                "intent": row["intent"],
                "action_taken": row["action_taken"],
                "timestamp": row["timestamp"]
            })
        
        return conversations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch conversations: {str(e)}"
        )

# ==================== Integration Endpoints (Placeholders) ====================

@app.post("/suggest_discount")
async def suggest_discount_endpoint(product_name: Optional[str] = None):
    """
    Placeholder endpoint for discount suggestions.
    TODO: Integrate with /predict_dynamic_pricing from main app
    """
    return {
        "message": "Discount suggestion endpoint",
        "product": product_name,
        "note": "This endpoint will integrate with the dynamic pricing model"
    }

@app.post("/predict_churn")
async def predict_churn_endpoint(customer_id: Optional[str] = None):
    """
    Placeholder endpoint for churn predictions.
    TODO: Integrate with /predict_churn from main app
    """
    return {
        "message": "Churn prediction endpoint",
        "customer_id": customer_id,
        "note": "This endpoint will integrate with the churn prediction model"
    }

@app.post("/recommend_products")
async def recommend_products_endpoint(preferences: Optional[str] = None):
    """
    Placeholder endpoint for product recommendations.
    TODO: Integrate with customer purchase prediction model
    """
    return {
        "message": "Product recommendation endpoint",
        "preferences": preferences,
        "note": "This endpoint will integrate with the customer purchase prediction model"
    }

# ==================== Run Instructions ====================
"""
To run this chatbot API:

1. Install dependencies:
   pip install fastapi uvicorn google-generativeai

2. Set environment variable:
   export GEMINI_API_KEY='your-gemini-api-key'
   # Or on Windows:
   set GEMINI_API_KEY=your-gemini-api-key

3. Run the server:
   uvicorn chatbot_api:app --reload --port 8001

4. Test the endpoint:
   curl -X POST "http://localhost:8001/chat" \
        -H "Content-Type: application/json" \
        -d '{"message": "Can I get a discount on organic apples?"}'

Example Responses:
- Discount: "Based on our dynamic pricing model, I can suggest a discount for organic apples..."
- Churn: "Our churn prediction model can help identify at-risk customers..."
- Recommendation: "Based on your purchase history, I recommend checking out our fresh vegetables..."
- General: AI-generated response using Gemini
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

