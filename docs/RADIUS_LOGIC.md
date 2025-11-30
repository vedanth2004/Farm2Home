# Radius Logic for Customers, Farmers, and CR Agents

## Overview

Farm2Home previously used distance-based constraints, but these have been **REMOVED** to allow unrestricted registration and product visibility. The only remaining distance constraint is for agent delivery assignment (30km).

## Status: Geographic Restrictions Removed

**As of the latest update, the following radius constraints have been removed:**

1. ❌ **CR Operational Radius** (50km) - REMOVED: CRs can now register anywhere
2. ❌ **Farmer to CR Distance** (50km) - REMOVED: Farmers can register without CR requirement
3. ❌ **Customer to Farmer Visibility** (50km) - REMOVED: Customers can see all farmers' products

## Remaining Radius Constants

Defined in `frontend/lib/geocoding-distance.ts`:

```typescript
const AGENT_DELIVERY_RADIUS_KM = 30; // Agents deliver within 30km (kept for delivery efficiency)

// REMOVED CONSTANTS:
// const CR_OPERATIONAL_RADIUS_KM = 50;
// const FARMER_TO_CR_MAX_DISTANCE_KM = 50;
// const CUSTOMER_TO_FARMER_MAX_DISTANCE_KM = 50;
```

---

## 1. CR (Community Representative) Registration

### **REMOVED: No Distance Restrictions**

**Previous behavior:** CRs had to be at least 50km apart.  
**Current behavior:** CRs can register anywhere, no distance restrictions.

### Logic:
- **During CR Registration:** 
  - ✅ CRs can register at any location
  - ✅ No checks for nearby existing CRs
  - ✅ Function: `checkCRRegistrationDistance()` now always returns `canRegister: true`

**Implementation:**
```typescript
// No distance restrictions - CRs can register anywhere
return {
  canRegister: true,
  location,
};
```

---

## 2. Farmer Registration

### **REMOVED: No CR Distance Requirement**

**Previous behavior:** Farmers had to be within 50km of an approved CR.  
**Current behavior:** Farmers can register anywhere, CR assignment is optional.

### Logic:
- **During Farmer Registration:**
  - ✅ Farmers can register without any CR requirement
  - ✅ System optionally assigns nearest CR if available (not required)
  - ✅ Registration is **never blocked** due to missing CR
  - ✅ Function: `findNearestCRForFarmer()` now finds nearest CR without distance restriction

**Implementation:**
```typescript
// Farmers can register regardless of CR availability
// CR assignment is optional - if found, assign it; if not, continue registration
if (nearestCR.crFound) {
  // Optional: Assign CR if available
} else {
  // Continue registration without CR assignment
}
```

---

## 3. Customer Product Visibility

### **REMOVED: No Distance Filtering**

**Previous behavior:** Customers only saw farmers within 50km.  
**Current behavior:** Customers can see products from all farmers.

### Logic:
- **Product Discovery:**
  - ✅ All customers can see all farmers' products
  - ✅ No distance-based filtering
  - ✅ Function: `filterFarmersByDistance()` now returns all approved farmers

**Implementation:**
```typescript
// No distance filtering - return all approved farmers
return farmers.map((farmer) => farmer.id);
```

---

## 4. Agent (Pickup Agent) Delivery Radius

### **30 KM Delivery Radius**

**Purpose:** Pickup agents can only be assigned to orders within their delivery range.

### Logic:
- **Order Assignment:**
  - When assigning pickup agents for COD orders
  - Only agents within 30km of customer location are considered
  - Function: `findNearestAgentForDelivery()`

**Implementation:**
```typescript
// Agents deliver within 30km of their location
if (distance <= AGENT_DELIVERY_RADIUS_KM) {
  // Agent can be assigned to this order
}
```

**Why 30km (smaller than others)?**
- Shorter distance ensures faster delivery
- More frequent trips manageable by agents
- Better customer experience (faster deliveries)
- Agents can complete more orders in a day

---

## Distance Calculation: Haversine Formula

All distances use the **Haversine formula** for great-circle distance:

```typescript
d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat₁) × cos(lat₂) × sin²(Δlon/2)))

where R = 6371 km (Earth's radius)
```

**Implementation:** `calculateHaversineDistance()`

This accounts for Earth's curvature and gives accurate distance calculations.

---

## Geographic Data Sources

1. **Primary:** OpenCage Geocoding API
   - Converts pincodes → coordinates (lat/lon)
   
2. **Fallback:** Nominatim (OpenStreetMap)
   - Free alternative if OpenCage key not available

3. **Database Cache:**
   - Addresses store coordinates (lat/lon) to avoid repeated API calls
   - Function: `updateAddressCoordinates()`

---

## Radius Logic Summary

| Relationship | Distance | Status | Purpose |
|-------------|----------|--------|---------|
| **CR ↔ CR** | ~~≥ 50km~~ | ❌ **REMOVED** | ~~Prevent territory overlap~~ |
| **Farmer → CR** | ~~≤ 50km~~ | ❌ **REMOVED** | ~~Ensure farmer supervision~~ |
| **Customer → Farmer** | ~~≤ 50km~~ | ❌ **REMOVED** | ~~Product visibility range~~ |
| **Customer → Agent** | ≤ 30km | ✅ **ACTIVE** | Delivery assignment range |

---

## Key Functions Reference

- `checkCRRegistrationDistance()` - Validates CR registration (50km spacing)
- `findNearestCRForFarmer()` - Finds CR for farmer registration (50km max)
- `filterFarmersByDistance()` - Filters visible farmers for customers (50km)
- `findNearestAgentForDelivery()` - Assigns pickup agent (30km max)
- `calculateHaversineDistance()` - Core distance calculation

---

## Business Logic Flow

1. **CR Registration** → Check if 50km from existing CRs ✅
2. **Farmer Registration** → Find CR within 50km ✅
3. **Customer Browse Products** → Show farmers within 50km ✅
4. **Order Placement** → Assign agent within 30km ✅

All validations happen automatically during registration and order processing.

