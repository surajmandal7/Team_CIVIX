from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import base64

# AI Integration imports
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
app = FastAPI(title="CIVIX API", description="Hyperlocal Services Platform for Jamshedpur")

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

class VoiceSearchRequest(BaseModel):
    query: str

class SnapToFixRequest(BaseModel):
    image_base64: str
    description: Optional[str] = ""

class BookmarkCreate(BaseModel):
    service_id: str

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

# Categories
CATEGORIES = [
    {"id": "plumbing", "name": "Plumbing", "icon": "droplets", "description": "Plumber, Water tank, Pipeline"},
    {"id": "electrical", "name": "Electrical", "icon": "zap", "description": "Electrician, Wiring, Appliance repair"},
    {"id": "cleaning", "name": "Cleaning", "icon": "sparkles", "description": "Home cleaning, Deep cleaning"},
    {"id": "beauty", "name": "Beauty", "icon": "scissors", "description": "Salon, Spa, Grooming"},
    {"id": "ac_repair", "name": "AC Repair", "icon": "fan", "description": "AC service, Installation"},
    {"id": "carpentry", "name": "Carpentry", "icon": "hammer", "description": "Furniture, Woodwork"},
    {"id": "painting", "name": "Painting", "icon": "paintbrush", "description": "Home painting, Wall art"},
    {"id": "pest_control", "name": "Pest Control", "icon": "bug", "description": "Pest removal, Fumigation"},
    {"id": "appliance", "name": "Appliance Repair", "icon": "wrench", "description": "TV, Fridge, Washing machine"},
    {"id": "tutor", "name": "Tutoring", "icon": "graduation-cap", "description": "Home tuition, Coaching"},
    {"id": "catering", "name": "Catering", "icon": "utensils", "description": "Event catering, Tiffin service"},
    {"id": "moving", "name": "Packers & Movers", "icon": "truck", "description": "Relocation, Packing"}
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# Services Routes
@api_router.get("/services")
async def get_services(
    category: Optional[str] = None,
    area: Optional[str] = None,
    min_rating: Optional[float] = None,
    is_emergency: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
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
            {"category": {"$regex": search, "$options": "i"}}
        ]
    
    services = await db.services.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.services.count_documents(query)
    return {"services": services, "total": total}

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(service_data: ServiceCreate, request: Request):
    user = await get_current_user(request)
    
    service_doc = service_data.model_dump()
    service_doc["id"] = str(uuid.uuid4())
    service_doc["rating"] = 0.0
    service_doc["review_count"] = 0
    service_doc["trust_score"] = 75.0
    service_doc["is_verified"] = False
    service_doc["owner_id"] = user["_id"]
    service_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.services.insert_one(service_doc)
    service_doc.pop("_id", None)
    return service_doc

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
        return 75.0
    
    base_score = 75.0
    review_count = len(reviews)
    
    # More reviews = higher trust
    if review_count >= 10:
        base_score += 10
    elif review_count >= 5:
        base_score += 5
    
    # Check for suspicious patterns
    suspicious_count = 0
    ratings = [r["rating"] for r in reviews]
    
    # All 5-star reviews is suspicious
    if len(ratings) > 3 and all(r == 5 for r in ratings):
        suspicious_count += 1
        base_score -= 10
    
    # Check for duplicate comments
    comments = [r["comment"].lower() for r in reviews]
    if len(comments) != len(set(comments)):
        suspicious_count += 1
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

# AI Routes
@api_router.post("/ai/voice-search")
async def voice_search(request_data: VoiceSearchRequest):
    """Process Hinglish/dialect voice search queries"""
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"voice-search-{uuid.uuid4()}",
            system_message="""You are a search query interpreter for CIVIX, a hyperlocal services platform in Jamshedpur, India.
            Your job is to understand Hinglish (Hindi-English mix) and regional dialect queries and extract:
            1. service_category: One of [plumbing, electrical, cleaning, beauty, ac_repair, carpentry, painting, pest_control, appliance, tutor, catering, moving]
            2. search_terms: Key search terms in English
            3. urgency: "emergency" or "normal"
            4. area: If mentioned, extract the area name
            
            Respond ONLY in valid JSON format like:
            {"service_category": "plumbing", "search_terms": "pipe leak repair", "urgency": "normal", "area": null}
            
            Examples of Hinglish queries:
            - "Bhaiya koi electrician hai kya paas mein?" -> electrical work needed
            - "AC theek karana hai" -> AC repair needed
            - "Nal se paani aa raha hai" -> plumbing leak
            - "Ghar ki safai karwani hai" -> cleaning service"""
        )
        chat.with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"Interpret this search query: {request_data.query}")
        response = await chat.send_message(message)
        
        # Parse the response
        import json
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {
                "service_category": None,
                "search_terms": request_data.query,
                "urgency": "normal",
                "area": None
            }
        
        return result
    except Exception as e:
        logger.error(f"Voice search error: {e}")
        return {
            "service_category": None,
            "search_terms": request_data.query,
            "urgency": "normal",
            "area": None
        }

@api_router.post("/ai/snap-to-fix")
async def snap_to_fix(request_data: SnapToFixRequest):
    """Analyze image to detect issues and suggest services"""
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"snap-to-fix-{uuid.uuid4()}",
            system_message="""You are an expert home repair analyst for CIVIX platform.
            Analyze images of home issues and provide:
            1. issue_detected: What's the problem
            2. service_category: One of [plumbing, electrical, cleaning, beauty, ac_repair, carpentry, painting, pest_control, appliance, tutor, catering, moving]
            3. urgency: "high", "medium", or "low"
            4. estimated_cost: Approximate cost range in INR
            5. recommended_action: What should be done
            
            Respond ONLY in valid JSON format."""
        )
        chat.with_model("openai", "gpt-5.2")
        
        # Create message with image
        message = UserMessage(
            text=f"Analyze this image for home repair issues. Additional context: {request_data.description}",
            file_contents=[ImageContent(request_data.image_base64)]
        )
        response = await chat.send_message(message)
        
        import json
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {
                "issue_detected": "Unable to analyze image",
                "service_category": None,
                "urgency": "medium",
                "estimated_cost": "Contact service provider",
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
        "overall_score": service.get("trust_score", 75),
        "total_reviews": len(reviews),
        "verified_reviews": 0,
        "suspicious_count": 0,
        "factors": []
    }
    
    if len(reviews) > 0:
        ratings = [r["rating"] for r in reviews]
        comments = [r["comment"].lower() for r in reviews]
        
        # Check patterns
        if len(ratings) > 3 and all(r == 5 for r in ratings):
            analysis["factors"].append("All reviews are 5-star (unusual pattern)")
            analysis["suspicious_count"] += 1
        
        if len(comments) != len(set(comments)):
            analysis["factors"].append("Duplicate review comments detected")
            analysis["suspicious_count"] += 1
        
        if len(reviews) < 3:
            analysis["factors"].append("Very few reviews to establish trust")
    else:
        analysis["factors"].append("No reviews yet - trust score is baseline")
    
    return analysis

# Emergency Services
@api_router.get("/emergency-services")
async def get_emergency_services(area: Optional[str] = None):
    """Get emergency services nearby"""
    query = {"is_emergency": True}
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    
    services = await db.services.find(query, {"_id": 0}).sort("rating", -1).limit(10).to_list(10)
    return services

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    
    bookmarks_count = await db.bookmarks.count_documents({"user_id": user["_id"]})
    reviews_count = await db.reviews.count_documents({"user_id": user["_id"]})
    
    return {
        "bookmarks_count": bookmarks_count,
        "reviews_count": reviews_count,
        "recommendations": []
    }

# Areas in Jamshedpur
JAMSHEDPUR_AREAS = [
    "Bistupur", "Sakchi", "Kadma", "Sonari", "Telco", 
    "Adityapur", "Golmuri", "Baridih", "Mango", "Jugsalai",
    "Sitaramdera", "Agrico", "Bhalubasa", "Parsudih", "Dimna"
]

@api_router.get("/areas")
async def get_areas():
    return JAMSHEDPUR_AREAS

# Seed Data
async def seed_database():
    # Check if services exist
    count = await db.services.count_documents({})
    if count > 0:
        return
    
    # Sample services for Jamshedpur
    sample_services = [
        {
            "id": str(uuid.uuid4()),
            "name": "Raju Plumbing Services",
            "category": "plumbing",
            "description": "Expert plumber with 15 years experience. Specializing in pipe repairs, leak fixing, bathroom fitting.",
            "price_range": "₹200 - ₹2000",
            "address": "Shop No. 5, Bistupur Market",
            "area": "Bistupur",
            "phone": "+91 9876543210",
            "images": ["https://images.unsplash.com/photo-1689204740620-6a89076a056d?w=800"],
            "working_hours": "8:00 AM - 8:00 PM",
            "is_emergency": True,
            "rating": 4.5,
            "review_count": 23,
            "trust_score": 92,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sharma Electricals",
            "category": "electrical",
            "description": "Certified electrician for all electrical works. Wiring, repairs, installation, and maintenance.",
            "price_range": "₹150 - ₹3000",
            "address": "Near Sakchi Bus Stand",
            "area": "Sakchi",
            "phone": "+91 9876543211",
            "images": ["https://images.unsplash.com/photo-1618228298959-0198d476d2ba?w=800"],
            "working_hours": "9:00 AM - 7:00 PM",
            "is_emergency": True,
            "rating": 4.8,
            "review_count": 45,
            "trust_score": 95,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cool AC Services",
            "category": "ac_repair",
            "description": "AC repair, installation, and annual maintenance. All brands serviced.",
            "price_range": "₹300 - ₹5000",
            "address": "Kadma Industrial Area",
            "area": "Kadma",
            "phone": "+91 9876543212",
            "images": ["https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800"],
            "working_hours": "9:00 AM - 6:00 PM",
            "is_emergency": False,
            "rating": 4.2,
            "review_count": 18,
            "trust_score": 85,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sparkle Home Cleaning",
            "category": "cleaning",
            "description": "Professional home cleaning services. Deep cleaning, regular cleaning, and sanitization.",
            "price_range": "₹500 - ₹3000",
            "address": "Sonari Main Road",
            "area": "Sonari",
            "phone": "+91 9876543213",
            "images": ["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800"],
            "working_hours": "7:00 AM - 5:00 PM",
            "is_emergency": False,
            "rating": 4.6,
            "review_count": 32,
            "trust_score": 88,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Style Studio Salon",
            "category": "beauty",
            "description": "Premium salon for men and women. Haircuts, styling, facials, and spa services.",
            "price_range": "₹200 - ₹5000",
            "address": "Telco Colony Market",
            "area": "Telco",
            "phone": "+91 9876543214",
            "images": ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"],
            "working_hours": "10:00 AM - 9:00 PM",
            "is_emergency": False,
            "rating": 4.7,
            "review_count": 67,
            "trust_score": 94,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Verma Furniture Works",
            "category": "carpentry",
            "description": "Custom furniture, repairs, and woodwork. Quality craftsmanship guaranteed.",
            "price_range": "₹1000 - ₹50000",
            "address": "Adityapur Industrial Area",
            "area": "Adityapur",
            "phone": "+91 9876543215",
            "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "9:00 AM - 6:00 PM",
            "is_emergency": False,
            "rating": 4.4,
            "review_count": 28,
            "trust_score": 86,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Rainbow Painters",
            "category": "painting",
            "description": "Interior and exterior painting. Wall textures, waterproofing, and decorative painting.",
            "price_range": "₹15/sqft - ₹50/sqft",
            "address": "Golmuri Chowk",
            "area": "Golmuri",
            "phone": "+91 9876543216",
            "images": ["https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"],
            "working_hours": "8:00 AM - 6:00 PM",
            "is_emergency": False,
            "rating": 4.3,
            "review_count": 15,
            "trust_score": 82,
            "is_verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pest Free Solutions",
            "category": "pest_control",
            "description": "Complete pest control services. Termite treatment, cockroach control, bed bugs removal.",
            "price_range": "₹800 - ₹5000",
            "address": "Baridih Housing Colony",
            "area": "Baridih",
            "phone": "+91 9876543217",
            "images": ["https://images.unsplash.com/photo-1632935190508-26c63ca1ce0f?w=800"],
            "working_hours": "9:00 AM - 5:00 PM",
            "is_emergency": False,
            "rating": 4.1,
            "review_count": 12,
            "trust_score": 78,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Quick Fix Appliances",
            "category": "appliance",
            "description": "Repair services for TV, fridge, washing machine, microwave, and other home appliances.",
            "price_range": "₹300 - ₹3000",
            "address": "Mango Market",
            "area": "Mango",
            "phone": "+91 9876543218",
            "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
            "working_hours": "10:00 AM - 7:00 PM",
            "is_emergency": True,
            "rating": 4.5,
            "review_count": 38,
            "trust_score": 90,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Excel Tutorials",
            "category": "tutor",
            "description": "Home tuition for classes 1-12. All subjects including JEE/NEET preparation.",
            "price_range": "₹1500 - ₹5000/month",
            "address": "Jugsalai Main Road",
            "area": "Jugsalai",
            "phone": "+91 9876543219",
            "images": ["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"],
            "working_hours": "4:00 PM - 9:00 PM",
            "is_emergency": False,
            "rating": 4.9,
            "review_count": 52,
            "trust_score": 97,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Shubham Caterers",
            "category": "catering",
            "description": "Catering for weddings, parties, and corporate events. Veg and non-veg options available.",
            "price_range": "₹200 - ₹800/plate",
            "address": "Sitaramdera Market",
            "area": "Sitaramdera",
            "phone": "+91 9876543220",
            "images": ["https://images.unsplash.com/photo-1555244162-803834f70033?w=800"],
            "working_hours": "8:00 AM - 10:00 PM",
            "is_emergency": False,
            "rating": 4.6,
            "review_count": 41,
            "trust_score": 91,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Safe Move Packers",
            "category": "moving",
            "description": "Professional packers and movers. Local and intercity relocation services.",
            "price_range": "₹3000 - ₹50000",
            "address": "Agrico Colony",
            "area": "Agrico",
            "phone": "+91 9876543221",
            "images": ["https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800"],
            "working_hours": "6:00 AM - 8:00 PM",
            "is_emergency": False,
            "rating": 4.3,
            "review_count": 19,
            "trust_score": 84,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.services.insert_many(sample_services)
    logger.info("Database seeded with sample services")

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
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
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
""")

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CIVIX API - Hyperlocal Services Platform for Jamshedpur"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "city": "Jamshedpur"}

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.services.create_index("category")
    await db.services.create_index("area")
    await db.reviews.create_index("service_id")
    await db.bookmarks.create_index([("user_id", 1), ("service_id", 1)])
    await seed_admin()
    await seed_database()
    logger.info("CIVIX API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
