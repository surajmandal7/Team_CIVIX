from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import bcrypt
import jwt
import base64
import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from groq import Groq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Groq client for Llama 3.3 (ultra-fast inference)
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "fallback_secret_key")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, 
        "email": email, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60), 
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=7), 
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Create the main app
app = FastAPI(title="CIVIX API", description="AI-Powered Hyperlocal Services Platform for Jamshedpur")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "user"

class ServiceCreate(BaseModel):
    name: str
    category: str
    description: str
    price_range: str
    address: str
    area: str
    phone: str
    images: List[str] = []
    working_hours: str = "9:00 AM - 6:00 PM"
    is_emergency: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tags: List[str] = []

class ServiceResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    price_range: str
    address: str
    area: str
    phone: str
    images: List[str]
    working_hours: str
    is_emergency: bool
    rating: float = 0.0
    review_count: int = 0
    trust_score: float = 0.0
    is_verified: bool = False
    vouches: int = 0
    distance_km: Optional[float] = None
    created_at: str

class ReviewCreate(BaseModel):
    service_id: str
    rating: int
    comment: str

class ReviewResponse(BaseModel):
    id: str
    service_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: str
    is_suspicious: bool = False

class IntelligentSearchRequest(BaseModel):
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 2.0

class IntelligentSearchResponse(BaseModel):
    original_query: str
    parsed_intent: dict
    is_urgent: bool
    services: List[dict]
    search_radius_used: float
    total_results: int

class WhatsAppOnboardingRequest(BaseModel):
    raw_text: str

class BookmarkCreate(BaseModel):
    service_id: str

class VouchRequest(BaseModel):
    service_id: str

# ========== INTELLIGENCE LAYER (AI-Driven) ==========

async def parse_intent_with_llama(query: str) -> dict:
    """
    Use Llama 3.3 via Groq for ultra-fast semantic intent parsing.
    Understands Hinglish, slang, and regional dialects.
    """
    try:
        system_prompt = """You are CIVIX AI, an expert at understanding service requests in Indian cities.
        Your job is to parse user queries (which may be in Hinglish, Hindi, or English with local slang) and extract:
        
        1. service_category: One of [plumbing, electrical, cleaning, beauty, ac_repair, carpentry, painting, pest_control, appliance, tutor, catering, moving, restaurant, cafe, grocery, medical, gym, salon, laundry, repair, auto, travel]
        2. search_terms: Clean English keywords for search
        3. is_urgent: true if user seems distressed or needs immediate help (words like "emergency", "urgent", "jaldi", "turant", "abhi", "help", "problem")
        4. area: Extract area/location if mentioned
        5. specific_service: More specific service type if mentioned
        
        Common Hinglish translations:
        - "bijli band hai" = electrical power outage
        - "nal se paani" = plumbing water issue
        - "AC theek" = AC repair
        - "khana order" = food/restaurant
        - "chai/coffee" = cafe
        - "kapde dhulai" = laundry
        - "gaadi theek" = auto repair
        - "doctor/dawai" = medical
        
        Respond ONLY in valid JSON format like:
        {"service_category": "electrical", "search_terms": "power outage electrician", "is_urgent": true, "area": null, "specific_service": "power restoration"}
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this search query: {query}"}
            ],
            temperature=0.1,
            max_tokens=500
        )
        
        import json
        result_text = response.choices[0].message.content.strip()
        # Clean up response if it has markdown code blocks
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"Llama intent parsing error: {e}")
        return {
            "service_category": None,
            "search_terms": query,
            "is_urgent": False,
            "area": None,
            "specific_service": None
        }

async def extract_business_from_whatsapp(raw_text: str) -> dict:
    """
    Zero-Friction Onboarding: AI-powered extraction that turns a messy 
    WhatsApp business ad into a structured database listing.
    """
    try:
        system_prompt = """You are an AI that extracts business information from informal WhatsApp/social media posts.
        Extract and structure the following from the raw text:
        
        1. name: Business name
        2. phone: Phone number (format: +91 XXXXX XXXXX)
        3. category: One of [plumbing, electrical, cleaning, beauty, ac_repair, carpentry, painting, pest_control, appliance, tutor, catering, moving, restaurant, cafe, grocery, medical, gym, salon, laundry, repair, auto, travel]
        4. services: List of services offered
        5. address: Address if mentioned
        6. area: Area/locality
        7. price_range: Price range if mentioned
        8. working_hours: Working hours if mentioned
        9. is_emergency: true if they mention 24/7 or emergency service
        
        Respond ONLY in valid JSON format.
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract business info from: {raw_text}"}
            ],
            temperature=0.1,
            max_tokens=800
        )
        
        import json
        result_text = response.choices[0].message.content.strip()
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"WhatsApp extraction error: {e}")
        return {"error": str(e)}

# ========== DISCOVERY LAYER (Geospatial) ==========

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula."""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def search_with_dynamic_radius(
    query_params: dict,
    user_lat: Optional[float],
    user_lon: Optional[float],
    initial_radius: float = 2.0
) -> tuple:
    """
    Dynamic Radius Expansion: If no results within initial radius,
    automatically expand to 5km, then 10km.
    """
    # First try without geospatial to ensure we get results
    services = await db.services.find(query_params, {"_id": 0}).limit(50).to_list(50)
    
    # Calculate distances if coordinates provided
    if user_lat and user_lon and services:
        for service in services:
            if service.get("location"):
                coords = service["location"]["coordinates"]
                service["distance_km"] = round(calculate_distance(
                    user_lat, user_lon, coords[1], coords[0]
                ), 2)
            else:
                service["distance_km"] = 999
        # Sort by distance
        services.sort(key=lambda x: x.get("distance_km", 999))
    
    return services, initial_radius

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user_data.name, "role": "user", "token": access_token}

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    email = user_data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user.get("role", "user"), "token": access_token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# Categories (expanded)
CATEGORIES = [
    {"id": "plumbing", "name": "Plumbing", "icon": "droplets", "description": "Plumber, Water tank, Pipeline", "color": "from-blue-500 to-blue-600"},
    {"id": "electrical", "name": "Electrical", "icon": "zap", "description": "Electrician, Wiring, Appliance repair", "color": "from-yellow-500 to-orange-500"},
    {"id": "cleaning", "name": "Cleaning", "icon": "sparkles", "description": "Home cleaning, Deep cleaning", "color": "from-cyan-500 to-teal-500"},
    {"id": "beauty", "name": "Beauty", "icon": "scissors", "description": "Salon, Spa, Grooming", "color": "from-pink-500 to-rose-500"},
    {"id": "ac_repair", "name": "AC Repair", "icon": "fan", "description": "AC service, Installation", "color": "from-sky-500 to-blue-500"},
    {"id": "carpentry", "name": "Carpentry", "icon": "hammer", "description": "Furniture, Woodwork", "color": "from-amber-600 to-orange-600"},
    {"id": "painting", "name": "Painting", "icon": "paintbrush", "description": "Home painting, Wall art", "color": "from-purple-500 to-indigo-500"},
    {"id": "pest_control", "name": "Pest Control", "icon": "bug", "description": "Pest removal, Fumigation", "color": "from-green-600 to-emerald-600"},
    {"id": "appliance", "name": "Appliance Repair", "icon": "wrench", "description": "TV, Fridge, Washing machine", "color": "from-gray-600 to-gray-700"},
    {"id": "tutor", "name": "Tutoring", "icon": "graduation-cap", "description": "Home tuition, Coaching", "color": "from-indigo-500 to-purple-500"},
    {"id": "catering", "name": "Catering", "icon": "utensils", "description": "Event catering, Tiffin service", "color": "from-red-500 to-orange-500"},
    {"id": "moving", "name": "Packers & Movers", "icon": "truck", "description": "Relocation, Packing", "color": "from-emerald-500 to-green-600"},
    {"id": "restaurant", "name": "Restaurants", "icon": "utensils-crossed", "description": "Dine-in, Takeaway, Delivery", "color": "from-red-600 to-rose-600"},
    {"id": "cafe", "name": "Cafes", "icon": "coffee", "description": "Coffee, Tea, Snacks", "color": "from-amber-700 to-yellow-600"},
    {"id": "grocery", "name": "Grocery", "icon": "shopping-cart", "description": "Daily needs, Fresh produce", "color": "from-green-500 to-lime-500"},
    {"id": "medical", "name": "Medical", "icon": "stethoscope", "description": "Clinics, Pharmacy, Healthcare", "color": "from-red-500 to-pink-500"},
    {"id": "gym", "name": "Gym & Fitness", "icon": "dumbbell", "description": "Gym, Yoga, Personal training", "color": "from-slate-600 to-gray-700"},
    {"id": "laundry", "name": "Laundry", "icon": "shirt", "description": "Dry cleaning, Ironing", "color": "from-blue-400 to-cyan-500"},
    {"id": "auto", "name": "Auto Services", "icon": "car", "description": "Car service, Bike repair", "color": "from-zinc-600 to-slate-700"},
    {"id": "travel", "name": "Travel", "icon": "plane", "description": "Tours, Cab booking", "color": "from-sky-600 to-blue-700"}
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ========== INTELLIGENT SEARCH API ==========

@api_router.post("/search/intelligent", response_model=IntelligentSearchResponse)
async def intelligent_search(request: IntelligentSearchRequest):
    """
    AI-powered intelligent search with:
    - Semantic intent parsing (Llama 3.3 via Groq)
    - Urgency detection
    - Dynamic radius expansion
    - Proximity ranking
    """
    # Step 1: Parse intent with Llama 3.3
    parsed = await parse_intent_with_llama(request.query)
    
    # Step 2: Build query
    query_params = {}
    if parsed.get("service_category"):
        query_params["category"] = parsed["service_category"]
    
    search_terms = parsed.get("search_terms", request.query)
    if search_terms:
        query_params["$or"] = [
            {"name": {"$regex": search_terms, "$options": "i"}},
            {"description": {"$regex": search_terms, "$options": "i"}},
            {"tags": {"$in": [search_terms.lower()]}}
        ]
    
    if parsed.get("area"):
        query_params["area"] = {"$regex": parsed["area"], "$options": "i"}
    
    # Prioritize emergency services if urgent
    if parsed.get("is_urgent"):
        query_params["is_emergency"] = True
    
    # Step 3: Search with dynamic radius
    services, radius_used = await search_with_dynamic_radius(
        query_params,
        request.latitude,
        request.longitude,
        request.radius_km
    )
    
    # If no results with filters, broaden search progressively
    if not services:
        # Try just category
        if parsed.get("service_category"):
            simple_query = {"category": parsed["service_category"]}
            services = await db.services.find(simple_query, {"_id": 0}).limit(50).to_list(50)
            
            # Calculate distances
            if request.latitude and request.longitude and services:
                for service in services:
                    if service.get("location"):
                        coords = service["location"]["coordinates"]
                        service["distance_km"] = round(calculate_distance(
                            request.latitude, request.longitude, coords[1], coords[0]
                        ), 2)
                    else:
                        service["distance_km"] = 999
                services.sort(key=lambda x: x.get("distance_km", 999))
    
    # Still no results? Get all services
    if not services:
        services = await db.services.find({}, {"_id": 0}).limit(50).to_list(50)
    
    return IntelligentSearchResponse(
        original_query=request.query,
        parsed_intent=parsed,
        is_urgent=parsed.get("is_urgent", False),
        services=services,
        search_radius_used=radius_used,
        total_results=len(services)
    )

# WhatsApp Onboarding API
@api_router.post("/onboard/whatsapp")
async def onboard_from_whatsapp(request: WhatsAppOnboardingRequest, req: Request):
    """
    Zero-Friction Onboarding: Convert WhatsApp business ad to structured listing.
    """
    extracted = await extract_business_from_whatsapp(request.raw_text)
    
    if "error" in extracted:
        raise HTTPException(status_code=400, detail=extracted["error"])
    
    # Create a draft service listing
    service_doc = {
        "id": str(uuid.uuid4()),
        "name": extracted.get("name", "Unknown Business"),
        "category": extracted.get("category", "repair"),
        "description": ", ".join(extracted.get("services", ["General services"])),
        "price_range": extracted.get("price_range", "Contact for pricing"),
        "address": extracted.get("address", ""),
        "area": extracted.get("area", "Jamshedpur"),
        "phone": extracted.get("phone", ""),
        "images": ["https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800"],
        "working_hours": extracted.get("working_hours", "9:00 AM - 6:00 PM"),
        "is_emergency": extracted.get("is_emergency", False),
        "rating": 0.0,
        "review_count": 0,
        "trust_score": 50.0,  # New listings start at 50
        "is_verified": False,
        "vouches": 0,
        "status": "pending_claim",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return {
        "extracted_data": extracted,
        "draft_listing": service_doc,
        "message": "Business extracted successfully. Awaiting owner claim."
    }

# Services Routes (enhanced)
@api_router.get("/services")
async def get_services(
    request: Request,
    category: Optional[str] = None,
    area: Optional[str] = None,
    min_rating: Optional[float] = None,
    is_emergency: Optional[bool] = None,
    search: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 50.0,
    skip: int = 0,
    limit: int = 100
):
    query = {}
    if category:
        query["category"] = category
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if is_emergency is not None:
        query["is_emergency"] = is_emergency
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    # Get services
    services = await db.services.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Check for user bookmarks if authenticated
    bookmarked_ids = set()
    try:
        user = await get_current_user(request)
        if user:
            bookmarks = await db.bookmarks.find({"user_id": user["_id"]}).to_list(100)
            bookmarked_ids = {b["service_id"] for b in bookmarks}
    except:
        pass

    # Calculate distances if coordinates provided and set bookmark status
    for service in services:
        service["is_bookmarked"] = service["id"] in bookmarked_ids
        if latitude and longitude and service.get("location"):
            coords = service["location"]["coordinates"]
            service["distance_km"] = round(calculate_distance(
                latitude, longitude, coords[1], coords[0]
            ), 2)
            
    # Sort by distance if coordinates provided
    if latitude and longitude:
        services.sort(key=lambda x: x.get("distance_km", 999))
    
    total = await db.services.count_documents(query)
    return {"services": services, "total": total}

@api_router.get("/services/{service_id}")
async def get_service(service_id: str, request: Request):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if bookmarked if user is authenticated
    is_bookmarked = False
    try:
        user = await get_current_user(request)
        if user:
            bookmark = await db.bookmarks.find_one({
                "user_id": user["_id"],
                "service_id": service_id
            })
            is_bookmarked = bookmark is not None
    except:
        pass
        
    service["is_bookmarked"] = is_bookmarked
    return service

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(service_data: ServiceCreate, request: Request):
    user = await get_current_user(request)
    
    service_doc = service_data.model_dump()
    service_doc["id"] = str(uuid.uuid4())
    service_doc["rating"] = 0.0
    service_doc["review_count"] = 0
    service_doc["trust_score"] = 50.0
    service_doc["is_verified"] = False
    service_doc["vouches"] = 0
    service_doc["owner_id"] = user["_id"]
    service_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Add geospatial location if provided
    if service_data.latitude and service_data.longitude:
        service_doc["location"] = {
            "type": "Point",
            "coordinates": [service_data.longitude, service_data.latitude]
        }
    
    await db.services.insert_one(service_doc)
    service_doc.pop("_id", None)
    return service_doc

# Vouch API (community-driven trust)
@api_router.post("/services/{service_id}/vouch")
async def vouch_for_service(service_id: str, request: Request):
    """Community vouching system for trust building."""
    user = await get_current_user(request)
    
    # Check if already vouched
    existing = await db.vouches.find_one({
        "service_id": service_id,
        "user_id": user["_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already vouched for this service")
    
    # Add vouch
    await db.vouches.insert_one({
        "id": str(uuid.uuid4()),
        "service_id": service_id,
        "user_id": user["_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update service vouch count and trust score
    vouch_count = await db.vouches.count_documents({"service_id": service_id})
    
    # Trust score increases with vouches
    trust_boost = min(vouch_count * 2, 20)  # Max 20 points from vouches
    
    await db.services.update_one(
        {"id": service_id},
        {"$set": {"vouches": vouch_count}, "$inc": {"trust_score": 2}}
    )
    
    return {"message": "Vouch added successfully", "total_vouches": vouch_count}

# Reviews Routes
@api_router.get("/services/{service_id}/reviews")
async def get_reviews(service_id: str):
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).to_list(100)
    return reviews

@api_router.post("/services/{service_id}/reviews")
async def create_review(service_id: str, review_data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "service_id": service_id,
        "user_id": user["_id"],
        "user_name": user["name"],
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_suspicious": False
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update service rating
    all_reviews = await db.reviews.find({"service_id": service_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    # Calculate trust score
    trust_score = await calculate_trust_score(service_id, all_reviews)
    
    await db.services.update_one(
        {"id": service_id},
        {"$set": {
            "rating": round(avg_rating, 1),
            "review_count": len(all_reviews),
            "trust_score": trust_score
        }}
    )
    
    review_doc.pop("_id", None)
    return review_doc

async def calculate_trust_score(service_id: str, reviews: list) -> float:
    if not reviews:
        return 50.0
    
    base_score = 50.0
    review_count = len(reviews)
    
    # More reviews = higher trust
    if review_count >= 20:
        base_score += 25
    elif review_count >= 10:
        base_score += 15
    elif review_count >= 5:
        base_score += 10
    
    # Good ratings boost
    avg_rating = sum(r["rating"] for r in reviews) / review_count
    if avg_rating >= 4.5:
        base_score += 15
    elif avg_rating >= 4.0:
        base_score += 10
    elif avg_rating >= 3.5:
        base_score += 5
    
    # Check for suspicious patterns
    ratings = [r["rating"] for r in reviews]
    comments = [r["comment"].lower() for r in reviews]
    
    # All same ratings is suspicious
    if len(set(ratings)) == 1 and len(ratings) > 3:
        base_score -= 10
    
    # Duplicate comments
    if len(comments) != len(set(comments)):
        base_score -= 15
    
    return max(min(base_score, 100), 0)

# Bookmarks Routes
@api_router.get("/bookmarks")
async def get_bookmarks(request: Request):
    user = await get_current_user(request)
    bookmarks = await db.bookmarks.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    
    service_ids = [b["service_id"] for b in bookmarks]
    services = await db.services.find({"id": {"$in": service_ids}}, {"_id": 0}).to_list(100)
    return services

@api_router.post("/bookmarks")
async def add_bookmark(bookmark_data: BookmarkCreate, request: Request):
    user = await get_current_user(request)
    
    existing = await db.bookmarks.find_one({
        "user_id": user["_id"],
        "service_id": bookmark_data.service_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already bookmarked")
    
    await db.bookmarks.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "service_id": bookmark_data.service_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Bookmarked successfully"}

@api_router.delete("/bookmarks/{service_id}")
async def remove_bookmark(service_id: str, request: Request):
    user = await get_current_user(request)
    await db.bookmarks.delete_one({"user_id": user["_id"], "service_id": service_id})
    return {"message": "Bookmark removed"}

# AI Routes (kept for backward compatibility)
@api_router.post("/ai/voice-search")
async def voice_search(request_data: dict):
    """Process Hinglish/dialect voice search queries using Llama 3.3"""
    query = request_data.get("query", "")
    parsed = await parse_intent_with_llama(query)
    return parsed

@api_router.post("/ai/snap-to-fix")
async def snap_to_fix(request_data: dict):
    """Analyze image to detect issues and suggest services"""
    try:
        # api_key = os.environ.get("EMERGENT_LLM_KEY")
        # if not api_key:
        #     raise HTTPException(status_code=500, detail="AI service not configured")
        
        # chat = LlmChat(
        #     api_key=api_key,
        #     session_id=f"snap-to-fix-{uuid.uuid4()}",
        #     system_message=\"\"\"You are an expert home repair analyst for CIVIX platform.
        #     Analyze images of home issues and provide:
        #     1. issue_detected: What's the problem
        #     2. service_category: One of [plumbing, electrical, cleaning, beauty, ac_repair, carpentry, painting, pest_control, appliance, tutor, catering, moving, restaurant, cafe, grocery, medical, gym, salon, laundry, repair, auto, travel]
        #     3. urgency: "high", "medium", or "low"
        #     4. estimated_cost: Approximate cost range in INR
        #     5. recommended_action: What should be done
            
        #     Respond ONLY in valid JSON format.\"\"\"
        # )
        # chat.with_model("openai", "gpt-5.2")
        
        # image_base64 = request_data.get("image_base64", "")
        # description = request_data.get("description", "")
        
        # message = UserMessage(
        #     text=f"Analyze this image for home repair issues. Additional context: {description}",
        #     file_contents=[ImageContent(image_base64)]
        # )
        # response = await chat.send_message(message)
        
        # import json
        # try:
        #     result = json.loads(response)
        # except json.JSONDecodeError:
        #     result = {
        #         "issue_detected": "Unable to analyze image",
        #         "service_category": None,
        #         "urgency": "medium",
        #         "estimated_cost": "Contact service provider",
        #         "recommended_action": "Please contact a professional for assessment"
        #     }
        
        result = {
            "issue_detected": "AI integration disabled for local run",
            "service_category": None,
            "urgency": "medium",
            "estimated_cost": "N/A",
            "recommended_action": "Please contact a professional for assessment"
        }
        return result
    except Exception as e:
        logger.error(f"Snap to fix error: {e}")
        return {
            "issue_detected": "Analysis failed",
            "service_category": None,
            "urgency": "medium",
            "estimated_cost": "N/A",
            "recommended_action": str(e)
        }

@api_router.get("/ai/trust-score/{service_id}")
async def get_trust_score_details(service_id: str):
    """Get detailed AI trust score analysis"""
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).to_list(100)
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    analysis = {
        "overall_score": service.get("trust_score", 50),
        "total_reviews": len(reviews),
        "verified_reviews": 0,
        "suspicious_count": 0,
        "vouches": service.get("vouches", 0),
        "factors": []
    }
    
    if len(reviews) > 0:
        ratings = [r["rating"] for r in reviews]
        comments = [r["comment"].lower() for r in reviews]
        
        # Check patterns
        if len(ratings) > 3 and len(set(ratings)) == 1:
            analysis["factors"].append("All reviews have same rating (unusual pattern)")
            analysis["suspicious_count"] += 1
        
        if len(comments) != len(set(comments)):
            analysis["factors"].append("Duplicate review comments detected")
            analysis["suspicious_count"] += 1
        
        if len(reviews) < 3:
            analysis["factors"].append("Very few reviews to establish trust")
        
        avg_rating = sum(ratings) / len(ratings)
        if avg_rating >= 4.5:
            analysis["factors"].append("Excellent average rating")
        elif avg_rating >= 4.0:
            analysis["factors"].append("Good average rating")
    else:
        analysis["factors"].append("No reviews yet - trust score is baseline")
    
    if service.get("vouches", 0) > 0:
        analysis["factors"].append(f"{service['vouches']} community vouches")
    
    if service.get("is_verified"):
        analysis["factors"].append("Business is verified")
    
    return analysis

# Emergency Services
@api_router.get("/emergency-services")
async def get_emergency_services(
    area: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
):
    """Get emergency services nearby"""
    query = {"is_emergency": True}
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    
    services = await db.services.find(query, {"_id": 0}).sort("rating", -1).limit(20).to_list(20)
    
    # Calculate distances if coordinates provided
    if latitude and longitude:
        for service in services:
            if service.get("location"):
                coords = service["location"]["coordinates"]
                service["distance_km"] = round(calculate_distance(
                    latitude, longitude, coords[1], coords[0]
                ), 2)
        services.sort(key=lambda x: x.get("distance_km", 999))
    
    return services

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    
    bookmarks_count = await db.bookmarks.count_documents({"user_id": user["_id"]})
    reviews_count = await db.reviews.count_documents({"user_id": user["_id"]})
    vouches_count = await db.vouches.count_documents({"user_id": user["_id"]})
    
    # Get recommended services based on user's bookmarks
    bookmarks = await db.bookmarks.find({"user_id": user["_id"]}).to_list(10)
    if bookmarks:
        # Get categories from bookmarked services
        bookmark_ids = [b["service_id"] for b in bookmarks]
        bookmarked_services = await db.services.find({"id": {"$in": bookmark_ids}}).to_list(10)
        categories = list(set(s.get("category") for s in bookmarked_services if s.get("category")))
        
        # Recommend similar services
        if categories:
            recommendations = await db.services.find(
                {"category": {"$in": categories}, "id": {"$nin": bookmark_ids}},
                {"_id": 0}
            ).limit(6).to_list(6)
        else:
            recommendations = await db.services.find({}, {"_id": 0}).limit(6).to_list(6)
    else:
        recommendations = await db.services.find({}, {"_id": 0}).limit(6).to_list(6)
    
    return {
        "bookmarks_count": bookmarks_count,
        "reviews_count": reviews_count,
        "vouches_count": vouches_count,
        "recommendations": recommendations
    }

# Stats endpoint
@api_router.get("/stats")
async def get_platform_stats():
    """Get platform-wide statistics"""
    total_services = await db.services.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    total_users = await db.users.count_documents({})
    emergency_services = await db.services.count_documents({"is_emergency": True})
    verified_services = await db.services.count_documents({"is_verified": True})
    
    # Category distribution
    category_counts = {}
    for cat in CATEGORIES:
        count = await db.services.count_documents({"category": cat["id"]})
        if count > 0:
            category_counts[cat["id"]] = count
    
    return {
        "total_services": total_services,
        "total_reviews": total_reviews,
        "total_users": total_users,
        "emergency_services": emergency_services,
        "verified_services": verified_services,
        "categories": category_counts
    }

# Areas in Jamshedpur (expanded with coordinates)
JAMSHEDPUR_AREAS = [
    {"name": "Bistupur", "lat": 22.7857, "lon": 86.2029},
    {"name": "Sakchi", "lat": 22.7840, "lon": 86.2083},
    {"name": "Kadma", "lat": 22.7744, "lon": 86.1847},
    {"name": "Sonari", "lat": 22.7803, "lon": 86.2247},
    {"name": "Telco", "lat": 22.7672, "lon": 86.2456},
    {"name": "Adityapur", "lat": 22.7831, "lon": 86.1564},
    {"name": "Golmuri", "lat": 22.7967, "lon": 86.1872},
    {"name": "Baridih", "lat": 22.7939, "lon": 86.2156},
    {"name": "Mango", "lat": 22.8242, "lon": 86.2206},
    {"name": "Jugsalai", "lat": 22.8078, "lon": 86.2036},
    {"name": "Sitaramdera", "lat": 22.7886, "lon": 86.1939},
    {"name": "Agrico", "lat": 22.7731, "lon": 86.2142},
    {"name": "Bhalubasa", "lat": 22.8014, "lon": 86.1847},
    {"name": "Parsudih", "lat": 22.7614, "lon": 86.2367},
    {"name": "Dimna", "lat": 22.7567, "lon": 86.2739},
    {"name": "Gamharia", "lat": 22.7578, "lon": 86.1250},
    {"name": "Burmamines", "lat": 22.8103, "lon": 86.2289},
    {"name": "Azadnagar", "lat": 22.7897, "lon": 86.2478},
    {"name": "Chhota Govindpur", "lat": 22.7628, "lon": 86.2014},
    {"name": "Vijay Nagar", "lat": 22.7917, "lon": 86.1697}
]

@api_router.get("/areas")
async def get_areas():
    return JAMSHEDPUR_AREAS

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CIVIX API - AI-Powered Hyperlocal Services Platform for Jamshedpur"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "city": "Jamshedpur", "ai": "Llama 3.3 via Groq"}

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration
origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
# For credentials support, we cannot use "*"
if "*" in origins:
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Ensure common origins are present
for o in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if o not in origins:
        origins.append(o)
        
if os.environ.get("FRONTEND_URL") and os.environ.get("FRONTEND_URL") not in origins:
    origins.append(os.environ.get("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Comprehensive seed data
async def seed_database():
    # Check if services exist
    count = await db.services.count_documents({})
    if count > 10:  # Already has data
        return
    
    # Clear and reseed
    await db.services.delete_many({})
    
    # Comprehensive services for Jamshedpur
    sample_services = [
        # PLUMBING (5 services)
        {
            "id": str(uuid.uuid4()), "name": "Raju Plumbing Services", "category": "plumbing",
            "description": "Expert plumber with 15 years experience. Specializing in pipe repairs, leak fixing, bathroom fitting, water tank installation.",
            "price_range": "₹200 - ₹2000", "address": "Shop No. 5, Bistupur Market", "area": "Bistupur",
            "phone": "+91 9876543210", "images": ["https://images.unsplash.com/photo-1689204740620-6a89076a056d?w=800"],
            "working_hours": "8:00 AM - 8:00 PM", "is_emergency": True, "rating": 4.5, "review_count": 23,
            "trust_score": 92, "is_verified": True, "vouches": 15, "tags": ["plumber", "leak", "pipe", "nal"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Quick Fix Plumbers", "category": "plumbing",
            "description": "24/7 emergency plumbing. Water heater repair, drainage cleaning, toilet repair.",
            "price_range": "₹300 - ₹3000", "address": "Sakchi Main Road", "area": "Sakchi",
            "phone": "+91 9876543211", "images": ["https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800"],
            "working_hours": "24/7", "is_emergency": True, "rating": 4.3, "review_count": 18,
            "trust_score": 85, "is_verified": True, "vouches": 8, "tags": ["plumber", "emergency", "drainage"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Sharma Water Solutions", "category": "plumbing",
            "description": "Water tank cleaning, RO service, water purifier installation and repair.",
            "price_range": "₹500 - ₹5000", "address": "Kadma Industrial Area", "area": "Kadma",
            "phone": "+91 9876543212", "images": ["https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"],
            "working_hours": "9:00 AM - 6:00 PM", "is_emergency": False, "rating": 4.6, "review_count": 31,
            "trust_score": 88, "is_verified": True, "vouches": 12, "tags": ["water", "tank", "RO", "purifier"],
            "location": {"type": "Point", "coordinates": [86.1847, 22.7744]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # ELECTRICAL (5 services)
        {
            "id": str(uuid.uuid4()), "name": "Sharma Electricals", "category": "electrical",
            "description": "Certified electrician for all electrical works. Wiring, repairs, installation, and maintenance. MCB, inverter, fan installation.",
            "price_range": "₹150 - ₹3000", "address": "Near Sakchi Bus Stand", "area": "Sakchi",
            "phone": "+91 9876543213", "images": ["https://images.unsplash.com/photo-1618228298959-0198d476d2ba?w=800"],
            "working_hours": "9:00 AM - 7:00 PM", "is_emergency": True, "rating": 4.8, "review_count": 45,
            "trust_score": 95, "is_verified": True, "vouches": 28, "tags": ["electrician", "wiring", "bijli", "fan"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "PowerFix Electricians", "category": "electrical",
            "description": "Emergency electrical repair. Power outage solutions, short circuit repair, meter installation.",
            "price_range": "₹200 - ₹5000", "address": "Golmuri Chowk", "area": "Golmuri",
            "phone": "+91 9876543214", "images": ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800"],
            "working_hours": "24/7", "is_emergency": True, "rating": 4.4, "review_count": 28,
            "trust_score": 87, "is_verified": True, "vouches": 15, "tags": ["electrician", "power", "emergency", "short circuit"],
            "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Smart Home Solutions", "category": "electrical",
            "description": "Home automation, smart switches, LED installation, CCTV, intercom systems.",
            "price_range": "₹1000 - ₹20000", "address": "Sonari Main Road", "area": "Sonari",
            "phone": "+91 9876543215", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "10:00 AM - 8:00 PM", "is_emergency": False, "rating": 4.7, "review_count": 22,
            "trust_score": 90, "is_verified": True, "vouches": 18, "tags": ["smart home", "automation", "CCTV", "LED"],
            "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # AC REPAIR (4 services)
        {
            "id": str(uuid.uuid4()), "name": "Cool AC Services", "category": "ac_repair",
            "description": "AC repair, installation, and annual maintenance. All brands serviced. Gas refilling, compressor repair.",
            "price_range": "₹300 - ₹5000", "address": "Kadma Industrial Area", "area": "Kadma",
            "phone": "+91 9876543216", "images": ["https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800"],
            "working_hours": "9:00 AM - 6:00 PM", "is_emergency": False, "rating": 4.2, "review_count": 18,
            "trust_score": 85, "is_verified": True, "vouches": 10, "tags": ["AC", "air conditioner", "cooling", "gas filling"],
            "location": {"type": "Point", "coordinates": [86.1847, 22.7744]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Frost AC Repairs", "category": "ac_repair",
            "description": "Split AC, window AC, commercial AC repair. Same day service available.",
            "price_range": "₹400 - ₹8000", "address": "Telco Colony", "area": "Telco",
            "phone": "+91 9876543217", "images": ["https://images.unsplash.com/photo-1631545806609-46677b91a4a9?w=800"],
            "working_hours": "8:00 AM - 9:00 PM", "is_emergency": True, "rating": 4.5, "review_count": 35,
            "trust_score": 91, "is_verified": True, "vouches": 22, "tags": ["AC repair", "split AC", "window AC"],
            "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # CLEANING (4 services)
        {
            "id": str(uuid.uuid4()), "name": "Sparkle Home Cleaning", "category": "cleaning",
            "description": "Professional home cleaning services. Deep cleaning, regular cleaning, sanitization, sofa cleaning.",
            "price_range": "₹500 - ₹3000", "address": "Sonari Main Road", "area": "Sonari",
            "phone": "+91 9876543218", "images": ["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800"],
            "working_hours": "7:00 AM - 5:00 PM", "is_emergency": False, "rating": 4.6, "review_count": 32,
            "trust_score": 88, "is_verified": True, "vouches": 14, "tags": ["cleaning", "deep clean", "sanitization", "safai"],
            "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "CleanPro Services", "category": "cleaning",
            "description": "Office cleaning, post-construction cleaning, carpet cleaning, kitchen deep clean.",
            "price_range": "₹800 - ₹10000", "address": "Adityapur Industrial Area", "area": "Adityapur",
            "phone": "+91 9876543219", "images": ["https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800"],
            "working_hours": "6:00 AM - 8:00 PM", "is_emergency": False, "rating": 4.4, "review_count": 25,
            "trust_score": 84, "is_verified": True, "vouches": 9, "tags": ["office cleaning", "commercial", "carpet"],
            "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # BEAUTY & SALON (5 services)
        {
            "id": str(uuid.uuid4()), "name": "Style Studio Salon", "category": "beauty",
            "description": "Premium salon for men and women. Haircuts, styling, facials, spa services, bridal makeup.",
            "price_range": "₹200 - ₹5000", "address": "Telco Colony Market", "area": "Telco",
            "phone": "+91 9876543220", "images": ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"],
            "working_hours": "10:00 AM - 9:00 PM", "is_emergency": False, "rating": 4.7, "review_count": 67,
            "trust_score": 94, "is_verified": True, "vouches": 35, "tags": ["salon", "haircut", "facial", "makeup", "parlour"],
            "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Glow Beauty Parlour", "category": "beauty",
            "description": "Ladies beauty parlour. Threading, waxing, facial, mehndi, hair spa.",
            "price_range": "₹100 - ₹2000", "address": "Bistupur Main Road", "area": "Bistupur",
            "phone": "+91 9876543221", "images": ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"],
            "working_hours": "10:00 AM - 8:00 PM", "is_emergency": False, "rating": 4.5, "review_count": 42,
            "trust_score": 89, "is_verified": True, "vouches": 20, "tags": ["parlour", "beauty", "facial", "waxing", "mehndi"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Urban Cuts Barbershop", "category": "beauty",
            "description": "Modern barbershop for men. Haircuts, beard styling, head massage, hair color.",
            "price_range": "₹150 - ₹800", "address": "Sakchi Circle", "area": "Sakchi",
            "phone": "+91 9876543222", "images": ["https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800"],
            "working_hours": "9:00 AM - 9:00 PM", "is_emergency": False, "rating": 4.6, "review_count": 55,
            "trust_score": 91, "is_verified": True, "vouches": 28, "tags": ["barber", "haircut", "men", "beard", "nai"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # RESTAURANTS (8 services)
        {
            "id": str(uuid.uuid4()), "name": "Mainland China", "category": "restaurant",
            "description": "Fine dining Chinese restaurant. Authentic Chinese cuisine, dim sum, noodles, Manchurian.",
            "price_range": "₹800 - ₹2000", "address": "P&M Mall, Bistupur", "area": "Bistupur",
            "phone": "+91 9876543223", "images": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"],
            "working_hours": "12:00 PM - 11:00 PM", "is_emergency": False, "rating": 4.4, "review_count": 89,
            "trust_score": 93, "is_verified": True, "vouches": 45, "tags": ["restaurant", "chinese", "fine dining", "khana"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Sagar Ratna", "category": "restaurant",
            "description": "Pure vegetarian South Indian restaurant. Dosa, idli, uttapam, thali.",
            "price_range": "₹200 - ₹600", "address": "Sakchi Main Road", "area": "Sakchi",
            "phone": "+91 9876543224", "images": ["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"],
            "working_hours": "8:00 AM - 10:00 PM", "is_emergency": False, "rating": 4.5, "review_count": 112,
            "trust_score": 95, "is_verified": True, "vouches": 52, "tags": ["restaurant", "south indian", "vegetarian", "dosa"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Biryani House", "category": "restaurant",
            "description": "Authentic Hyderabadi biryani. Chicken biryani, mutton biryani, kebabs.",
            "price_range": "₹250 - ₹800", "address": "Mango Market", "area": "Mango",
            "phone": "+91 9876543225", "images": ["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"],
            "working_hours": "11:00 AM - 11:00 PM", "is_emergency": False, "rating": 4.6, "review_count": 156,
            "trust_score": 92, "is_verified": True, "vouches": 68, "tags": ["biryani", "restaurant", "non-veg", "chicken"],
            "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Pizza Hut", "category": "restaurant",
            "description": "International pizza chain. Pizzas, pasta, garlic bread, desserts.",
            "price_range": "₹300 - ₹1200", "address": "Bistupur Market", "area": "Bistupur",
            "phone": "+91 9876543226", "images": ["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"],
            "working_hours": "11:00 AM - 11:00 PM", "is_emergency": False, "rating": 4.2, "review_count": 78,
            "trust_score": 90, "is_verified": True, "vouches": 32, "tags": ["pizza", "restaurant", "fast food", "italian"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Tandoor Tales", "category": "restaurant",
            "description": "North Indian cuisine. Butter chicken, dal makhani, naan, tandoori items.",
            "price_range": "₹400 - ₹1000", "address": "Golmuri Circle", "area": "Golmuri",
            "phone": "+91 9876543227", "images": ["https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800"],
            "working_hours": "12:00 PM - 10:30 PM", "is_emergency": False, "rating": 4.5, "review_count": 65,
            "trust_score": 88, "is_verified": True, "vouches": 28, "tags": ["north indian", "tandoor", "butter chicken", "restaurant"],
            "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # CAFES (5 services)
        {
            "id": str(uuid.uuid4()), "name": "Cafe Coffee Day", "category": "cafe",
            "description": "Popular coffee chain. Espresso, cappuccino, snacks, sandwiches.",
            "price_range": "₹150 - ₹500", "address": "Bistupur High Street", "area": "Bistupur",
            "phone": "+91 9876543228", "images": ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800"],
            "working_hours": "9:00 AM - 11:00 PM", "is_emergency": False, "rating": 4.3, "review_count": 95,
            "trust_score": 91, "is_verified": True, "vouches": 40, "tags": ["cafe", "coffee", "chai", "snacks"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Chai Sutta Bar", "category": "cafe",
            "description": "Trendy chai cafe. Kulhad chai, maggi, sandwiches, shakes.",
            "price_range": "₹50 - ₹200", "address": "Near NIT Jamshedpur", "area": "Adityapur",
            "phone": "+91 9876543229", "images": ["https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800"],
            "working_hours": "10:00 AM - 12:00 AM", "is_emergency": False, "rating": 4.4, "review_count": 142,
            "trust_score": 87, "is_verified": True, "vouches": 55, "tags": ["chai", "tea", "cafe", "maggi"],
            "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # GROCERY (4 services)
        {
            "id": str(uuid.uuid4()), "name": "Big Bazaar", "category": "grocery",
            "description": "Hypermarket for all daily needs. Groceries, vegetables, fruits, household items.",
            "price_range": "₹100 - ₹10000", "address": "P&M Mall, Bistupur", "area": "Bistupur",
            "phone": "+91 9876543230", "images": ["https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800"],
            "working_hours": "10:00 AM - 9:30 PM", "is_emergency": False, "rating": 4.1, "review_count": 85,
            "trust_score": 89, "is_verified": True, "vouches": 35, "tags": ["grocery", "supermarket", "vegetables", "kirana"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "More Supermarket", "category": "grocery",
            "description": "Neighborhood supermarket. Fresh produce, dairy, packaged goods.",
            "price_range": "₹50 - ₹5000", "address": "Sonari Market", "area": "Sonari",
            "phone": "+91 9876543231", "images": ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"],
            "working_hours": "8:00 AM - 10:00 PM", "is_emergency": False, "rating": 4.3, "review_count": 62,
            "trust_score": 86, "is_verified": True, "vouches": 22, "tags": ["grocery", "supermarket", "dairy", "fresh"],
            "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # MEDICAL (4 services)
        {
            "id": str(uuid.uuid4()), "name": "Apollo Pharmacy", "category": "medical",
            "description": "24/7 pharmacy. Medicines, health products, first aid, home delivery available.",
            "price_range": "₹50 - ₹5000", "address": "Bistupur Main Road", "area": "Bistupur",
            "phone": "+91 9876543232", "images": ["https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800"],
            "working_hours": "24/7", "is_emergency": True, "rating": 4.6, "review_count": 120,
            "trust_score": 96, "is_verified": True, "vouches": 58, "tags": ["pharmacy", "medicine", "dawai", "medical"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "City Clinic", "category": "medical",
            "description": "Multi-specialty clinic. General physician, pediatrician, gynecologist. Lab tests available.",
            "price_range": "₹200 - ₹2000", "address": "Sakchi Hospital Road", "area": "Sakchi",
            "phone": "+91 9876543233", "images": ["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800"],
            "working_hours": "8:00 AM - 9:00 PM", "is_emergency": True, "rating": 4.4, "review_count": 88,
            "trust_score": 92, "is_verified": True, "vouches": 42, "tags": ["clinic", "doctor", "medical", "hospital"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # GYM & FITNESS (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Gold's Gym", "category": "gym",
            "description": "Premium fitness center. Gym, cardio, personal training, group classes.",
            "price_range": "₹2000 - ₹8000/month", "address": "Telco Main Road", "area": "Telco",
            "phone": "+91 9876543234", "images": ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"],
            "working_hours": "5:00 AM - 10:00 PM", "is_emergency": False, "rating": 4.5, "review_count": 72,
            "trust_score": 91, "is_verified": True, "vouches": 35, "tags": ["gym", "fitness", "workout", "exercise"],
            "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Yoga Studio Jamshedpur", "category": "gym",
            "description": "Traditional yoga classes. Hatha yoga, meditation, pranayama. All age groups.",
            "price_range": "₹500 - ₹2000/month", "address": "Sonari Colony", "area": "Sonari",
            "phone": "+91 9876543235", "images": ["https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800"],
            "working_hours": "5:30 AM - 8:00 PM", "is_emergency": False, "rating": 4.7, "review_count": 45,
            "trust_score": 89, "is_verified": True, "vouches": 22, "tags": ["yoga", "meditation", "fitness", "wellness"],
            "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # AUTO SERVICES (4 services)
        {
            "id": str(uuid.uuid4()), "name": "Maruti Service Center", "category": "auto",
            "description": "Authorized Maruti service. Car repair, maintenance, denting, painting.",
            "price_range": "₹1000 - ₹50000", "address": "Adityapur Industrial Area", "area": "Adityapur",
            "phone": "+91 9876543236", "images": ["https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800"],
            "working_hours": "9:00 AM - 6:00 PM", "is_emergency": False, "rating": 4.3, "review_count": 58,
            "trust_score": 90, "is_verified": True, "vouches": 28, "tags": ["car", "service", "repair", "gaadi"],
            "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()), "name": "Bike Care Center", "category": "auto",
            "description": "Two-wheeler service and repair. All brands. Puncture, servicing, spare parts.",
            "price_range": "₹200 - ₹5000", "address": "Mango Chowk", "area": "Mango",
            "phone": "+91 9876543237", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "8:00 AM - 8:00 PM", "is_emergency": True, "rating": 4.4, "review_count": 82,
            "trust_score": 87, "is_verified": True, "vouches": 38, "tags": ["bike", "motorcycle", "repair", "puncture"],
            "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # CARPENTRY (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Verma Furniture Works", "category": "carpentry",
            "description": "Custom furniture, repairs, and woodwork. Quality craftsmanship guaranteed.",
            "price_range": "₹1000 - ₹50000", "address": "Adityapur Industrial Area", "area": "Adityapur",
            "phone": "+91 9876543238", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "9:00 AM - 6:00 PM", "is_emergency": False, "rating": 4.4, "review_count": 28,
            "trust_score": 86, "is_verified": True, "vouches": 12, "tags": ["carpenter", "furniture", "woodwork", "mistri"],
            "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # PAINTING (2 services)
        {
            "id": str(uuid.uuid4()), "name": "Rainbow Painters", "category": "painting",
            "description": "Interior and exterior painting. Wall textures, waterproofing, and decorative painting.",
            "price_range": "₹15/sqft - ₹50/sqft", "address": "Golmuri Chowk", "area": "Golmuri",
            "phone": "+91 9876543239", "images": ["https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"],
            "working_hours": "8:00 AM - 6:00 PM", "is_emergency": False, "rating": 4.3, "review_count": 15,
            "trust_score": 82, "is_verified": False, "vouches": 6, "tags": ["painter", "painting", "wall", "color"],
            "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # PEST CONTROL (2 services)
        {
            "id": str(uuid.uuid4()), "name": "Pest Free Solutions", "category": "pest_control",
            "description": "Complete pest control services. Termite treatment, cockroach control, bed bugs removal.",
            "price_range": "₹800 - ₹5000", "address": "Baridih Housing Colony", "area": "Baridih",
            "phone": "+91 9876543240", "images": ["https://images.unsplash.com/photo-1632935190508-26c63ca1ce0f?w=800"],
            "working_hours": "9:00 AM - 5:00 PM", "is_emergency": False, "rating": 4.1, "review_count": 12,
            "trust_score": 78, "is_verified": True, "vouches": 5, "tags": ["pest control", "termite", "cockroach"],
            "location": {"type": "Point", "coordinates": [86.2156, 22.7939]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # APPLIANCE REPAIR (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Quick Fix Appliances", "category": "appliance",
            "description": "Repair services for TV, fridge, washing machine, microwave, and other home appliances.",
            "price_range": "₹300 - ₹3000", "address": "Mango Market", "area": "Mango",
            "phone": "+91 9876543241", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "10:00 AM - 7:00 PM", "is_emergency": True, "rating": 4.5, "review_count": 38,
            "trust_score": 90, "is_verified": True, "vouches": 18, "tags": ["appliance", "TV", "fridge", "washing machine"],
            "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # TUTORING (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Excel Tutorials", "category": "tutor",
            "description": "Home tuition for classes 1-12. All subjects including JEE/NEET preparation.",
            "price_range": "₹1500 - ₹5000/month", "address": "Jugsalai Main Road", "area": "Jugsalai",
            "phone": "+91 9876543242", "images": ["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"],
            "working_hours": "4:00 PM - 9:00 PM", "is_emergency": False, "rating": 4.9, "review_count": 52,
            "trust_score": 97, "is_verified": True, "vouches": 28, "tags": ["tutor", "tuition", "coaching", "padhai"],
            "location": {"type": "Point", "coordinates": [86.2036, 22.8078]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # CATERING (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Shubham Caterers", "category": "catering",
            "description": "Catering for weddings, parties, and corporate events. Veg and non-veg options available.",
            "price_range": "₹200 - ₹800/plate", "address": "Sitaramdera Market", "area": "Sitaramdera",
            "phone": "+91 9876543243", "images": ["https://images.unsplash.com/photo-1555244162-803834f70033?w=800"],
            "working_hours": "8:00 AM - 10:00 PM", "is_emergency": False, "rating": 4.6, "review_count": 41,
            "trust_score": 91, "is_verified": True, "vouches": 22, "tags": ["catering", "wedding", "party", "food"],
            "location": {"type": "Point", "coordinates": [86.1939, 22.7886]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # PACKERS & MOVERS (2 services)
        {
            "id": str(uuid.uuid4()), "name": "Safe Move Packers", "category": "moving",
            "description": "Professional packers and movers. Local and intercity relocation services.",
            "price_range": "₹3000 - ₹50000", "address": "Agrico Colony", "area": "Agrico",
            "phone": "+91 9876543244", "images": ["https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800"],
            "working_hours": "6:00 AM - 8:00 PM", "is_emergency": False, "rating": 4.3, "review_count": 19,
            "trust_score": 84, "is_verified": True, "vouches": 8, "tags": ["packers", "movers", "relocation", "shifting"],
            "location": {"type": "Point", "coordinates": [86.2142, 22.7731]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # LAUNDRY (3 services)
        {
            "id": str(uuid.uuid4()), "name": "Wash & Fold", "category": "laundry",
            "description": "Professional laundry service. Wash, dry clean, ironing. Pickup and delivery.",
            "price_range": "₹50 - ₹500/item", "address": "Bistupur Colony", "area": "Bistupur",
            "phone": "+91 9876543245", "images": ["https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800"],
            "working_hours": "8:00 AM - 8:00 PM", "is_emergency": False, "rating": 4.4, "review_count": 35,
            "trust_score": 86, "is_verified": True, "vouches": 15, "tags": ["laundry", "dry clean", "ironing", "kapde"],
            "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}, "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        # TRAVEL (2 services)
        {
            "id": str(uuid.uuid4()), "name": "Jamshedpur Travels", "category": "travel",
            "description": "Car rental, taxi booking, tour packages. Airport transfers, outstation trips.",
            "price_range": "₹500 - ₹10000", "address": "Sakchi Bus Stand", "area": "Sakchi",
            "phone": "+91 9876543246", "images": ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800"],
            "working_hours": "24/7", "is_emergency": True, "rating": 4.2, "review_count": 48,
            "trust_score": 85, "is_verified": True, "vouches": 20, "tags": ["travel", "taxi", "cab", "tour"],
            "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}, "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.services.insert_many(sample_services)
    
    # Create geospatial index
    await db.services.create_index([("location", "2dsphere")])
    
    logger.info(f"Database seeded with {len(sample_services)} services")

# Admin seeding
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@civix.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user created")
    
    # Write test credentials
    memory_dir = ROOT_DIR.parent / "memory"
    os.makedirs(memory_dir, exist_ok=True)
    with open(memory_dir / "test_credentials.md", "w") as f:
        f.write(f"""# CIVIX Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User
- Register a new user via /api/auth/register

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## AI Endpoints
- POST /api/search/intelligent (Llama 3.3 via Groq)
- POST /api/onboard/whatsapp
- POST /api/ai/voice-search
- POST /api/ai/snap-to-fix
- GET /api/ai/trust-score/{{service_id}}
""")

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.services.create_index("category")
    await db.services.create_index("area")
    await db.services.create_index([("location", "2dsphere")])
    await db.reviews.create_index("service_id")
    await db.bookmarks.create_index([("user_id", 1), ("service_id", 1)])
    await db.vouches.create_index([("user_id", 1), ("service_id", 1)])
    await seed_admin()
    await seed_database()
    logger.info("CIVIX API started successfully with Llama 3.3 (Groq) and geospatial features")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
