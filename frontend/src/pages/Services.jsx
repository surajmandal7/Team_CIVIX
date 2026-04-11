import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MapPin, List, LayoutGrid, Star, X, 
  SlidersHorizontal, ChevronDown, Sparkles, Zap, AlertTriangle, Map as MapIcon, Globe, Navigation
} from 'lucide-react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import ServiceCard from '../components/ServiceCard';
import SmartSearch from '../components/SmartSearch';
import { useVoiceSearch } from '../hooks/use-voice-search';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Mic, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FALLBACK_CATEGORIES = [
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
  {"id": "moving", "name": "Packers & Movers", "icon": "truck", "description": "Relocation, Packing"},
  {"id": "restaurant", "name": "Restaurants", "icon": "utensils-crossed", "description": "Dine-in, Takeaway, Delivery"},
  {"id": "cafe", "name": "Cafes", "icon": "coffee", "description": "Coffee, Tea, Snacks"},
  {"id": "grocery", "name": "Grocery", "icon": "shopping-cart", "description": "Daily needs, Fresh produce"},
  {"id": "medical", "name": "Medical", "icon": "stethoscope", "description": "Clinics, Pharmacy, Healthcare"},
  {"id": "gym", "name": "Gym & Fitness", "icon": "dumbbell", "description": "Gym, Yoga, Personal training"},
  {"id": "laundry", "name": "Laundry", "icon": "shirt", "description": "Dry cleaning, Ironing"},
  {"id": "auto", "name": "Auto Services", "icon": "car", "description": "Car service, Bike repair"},
  {"id": "travel", "name": "Travel", "icon": "plane", "description": "Tours, Cab booking"}
];

const FALLBACK_AREAS = [
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
];

const FALLBACK_SERVICES = [
  {
    "id": "1", "name": "Raju Plumbing Services", "category": "plumbing",
    "description": "Expert plumber with 15 years experience. Specializing in pipe repairs, leak fixing, bathroom fitting.",
    "price_range": "₹200 - ₹2000", "address": "Shop No. 5, Bistupur Market", "area": "Bistupur",
    "phone": "+91 9876543210", "images": ["https://images.unsplash.com/photo-1689204740620-6a89076a056d?w=800"],
    "rating": 4.5, "review_count": 23, "trust_score": 92, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "2", "name": "Quick Fix Plumbers", "category": "plumbing",
    "description": "24/7 emergency plumbing. Water heater repair, drainage cleaning, toilet repair.",
    "price_range": "₹300 - ₹3000", "address": "Sakchi Main Road", "area": "Sakchi",
    "phone": "+91 9876543211", "images": ["https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800"],
    "rating": 4.3, "review_count": 18, "trust_score": 85, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  },
  {
    "id": "3", "name": "Sharma Water Solutions", "category": "plumbing",
    "description": "Water tank cleaning, RO service, water purifier installation and repair.",
    "price_range": "₹500 - ₹5000", "address": "Kadma Industrial Area", "area": "Kadma",
    "phone": "+91 9876543212", "images": ["https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"],
    "rating": 4.6, "review_count": 31, "trust_score": 88, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1847, 22.7744]}
  },
  {
    "id": "4", "name": "Sharma Electricals", "category": "electrical",
    "description": "Certified electrician for all electrical works. Wiring, repairs, installation, and maintenance.",
    "price_range": "₹150 - ₹3000", "address": "Near Sakchi Bus Stand", "area": "Sakchi",
    "phone": "+91 9876543213", "images": ["https://images.unsplash.com/photo-1618228298959-0198d476d2ba?w=800"],
    "rating": 4.8, "review_count": 45, "trust_score": 95, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  },
  {
    "id": "5", "name": "PowerFix Electricians", "category": "electrical",
    "description": "Emergency electrical repair. Power outage solutions, short circuit repair, meter installation.",
    "price_range": "₹200 - ₹5000", "address": "Golmuri Chowk", "area": "Golmuri",
    "phone": "+91 9876543214", "images": ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800"],
    "rating": 4.4, "review_count": 28, "trust_score": 87, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}
  },
  {
    "id": "6", "name": "Smart Home Solutions", "category": "electrical",
    "description": "Home automation, smart switches, LED installation, CCTV, intercom systems.",
    "price_range": "₹1000 - ₹20000", "address": "Sonari Main Road", "area": "Sonari",
    "phone": "+91 9876543215", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    "rating": 4.7, "review_count": 22, "trust_score": 90, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}
  },
  {
    "id": "7", "name": "Cool AC Services", "category": "ac_repair",
    "description": "AC repair, installation, and annual maintenance. All brands serviced.",
    "price_range": "₹300 - ₹5000", "address": "Kadma Industrial Area", "area": "Kadma",
    "phone": "+91 9876543216", "images": ["https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800"],
    "rating": 4.2, "review_count": 18, "trust_score": 85, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1847, 22.7744]}
  },
  {
    "id": "8", "name": "Frost AC Repairs", "category": "ac_repair",
    "description": "Split AC, window AC, commercial AC repair. Same day service available.",
    "price_range": "₹400 - ₹8000", "address": "Telco Colony", "area": "Telco",
    "phone": "+91 9876543217", "images": ["https://images.unsplash.com/photo-1595757816291-ab4c1cba5fc2?w=800"],
    "rating": 4.5, "review_count": 35, "trust_score": 91, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}
  },
  {
    "id": "9", "name": "Sparkle Home Cleaning", "category": "cleaning",
    "description": "Professional home cleaning services. Deep cleaning, regular cleaning, sanitization.",
    "price_range": "₹500 - ₹3000", "address": "Sonari Main Road", "area": "Sonari",
    "phone": "+91 9876543218", "images": ["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800"],
    "rating": 4.6, "review_count": 32, "trust_score": 88, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}
  },
  {
    "id": "10", "name": "CleanPro Services", "category": "cleaning",
    "description": "Office cleaning, post-construction cleaning, carpet cleaning, kitchen deep clean.",
    "price_range": "₹800 - ₹10000", "address": "Adityapur Industrial Area", "area": "Adityapur",
    "phone": "+91 9876543219", "images": ["https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800"],
    "rating": 4.4, "review_count": 25, "trust_score": 84, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}
  },
  {
    "id": "11", "name": "Style Studio Salon", "category": "beauty",
    "description": "Premium salon for men and women. Haircuts, styling, facials, and spa services.",
    "price_range": "₹200 - ₹5000", "address": "Telco Colony Market", "area": "Telco",
    "phone": "+91 9876543220", "images": ["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"],
    "rating": 4.7, "review_count": 67, "trust_score": 94, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}
  },
  {
    "id": "12", "name": "Glow Beauty Parlour", "category": "beauty",
    "description": "Ladies beauty parlour. Threading, waxing, facial, mehndi, hair spa.",
    "price_range": "₹100 - ₹2000", "address": "Bistupur Main Road", "area": "Bistupur",
    "phone": "+91 9876543221", "images": ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"],
    "rating": 4.5, "review_count": 42, "trust_score": 89, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "13", "name": "Urban Cuts Barbershop", "category": "beauty",
    "description": "Modern barbershop for men. Haircuts, beard styling, head massage, hair color.",
    "price_range": "₹150 - ₹800", "address": "Sakchi Circle", "area": "Sakchi",
    "phone": "+91 9876543222", "images": ["https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800"],
    "rating": 4.6, "review_count": 55, "trust_score": 91, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  },
  {
    "id": "14", "name": "Mainland China", "category": "restaurant",
    "description": "Fine dining Chinese restaurant. Authentic Chinese cuisine, dim sum, noodles.",
    "price_range": "₹800 - ₹2000", "address": "P&M Mall, Bistupur", "area": "Bistupur",
    "phone": "+91 9876543223", "images": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"],
    "rating": 4.4, "review_count": 89, "trust_score": 93, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "15", "name": "Sagar Ratna", "category": "restaurant",
    "description": "Pure vegetarian South Indian restaurant. Dosa, idli, uttapam, thali.",
    "price_range": "₹200 - ₹600", "address": "Sakchi Main Road", "area": "Sakchi",
    "phone": "+91 9876543224", "images": ["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"],
    "rating": 4.5, "review_count": 112, "trust_score": 95, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  },
  {
    "id": "16", "name": "Biryani House", "category": "restaurant",
    "description": "Authentic Hyderabadi biryani. Chicken biryani, mutton biryani, kebabs.",
    "price_range": "₹250 - ₹800", "address": "Mango Market", "area": "Mango",
    "phone": "+91 9876543225", "images": ["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"],
    "rating": 4.6, "review_count": 156, "trust_score": 92, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}
  },
  {
    "id": "17", "name": "Pizza Hut", "category": "restaurant",
    "description": "International pizza chain. Pizzas, pasta, garlic bread, desserts.",
    "price_range": "₹300 - ₹1200", "address": "Bistupur Market", "area": "Bistupur",
    "phone": "+91 9876543226", "images": ["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"],
    "rating": 4.2, "review_count": 78, "trust_score": 90, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "18", "name": "Tandoor Tales", "category": "restaurant",
    "description": "North Indian cuisine. Butter chicken, dal makhani, naan, tandoori items.",
    "price_range": "₹400 - ₹1000", "address": "Golmuri Circle", "area": "Golmuri",
    "phone": "+91 9876543227", "images": ["https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800"],
    "rating": 4.5, "review_count": 65, "trust_score": 88, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}
  },
  {
    "id": "19", "name": "Cafe Coffee Day", "category": "cafe",
    "description": "Popular coffee chain. Espresso, cappuccino, snacks, sandwiches.",
    "price_range": "₹150 - ₹500", "address": "Bistupur High Street", "area": "Bistupur",
    "phone": "+91 9876543228", "images": ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800"],
    "rating": 4.3, "review_count": 95, "trust_score": 91, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "20", "name": "Chai Sutta Bar", "category": "cafe",
    "description": "Trendy chai cafe. Kulhad chai, maggi, sandwiches, shakes.",
    "price_range": "₹50 - ₹200", "address": "Near NIT Jamshedpur", "area": "Adityapur",
    "phone": "+91 9876543229", "images": ["https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800"],
    "rating": 4.4, "review_count": 142, "trust_score": 87, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}
  },
  {
    "id": "21", "name": "Big Bazaar", "category": "grocery",
    "description": "Hypermarket for all daily needs. Groceries, vegetables, household items.",
    "price_range": "₹100 - ₹10000", "address": "P&M Mall, Bistupur", "area": "Bistupur",
    "phone": "+91 9876543230", "images": ["https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800"],
    "rating": 4.1, "review_count": 85, "trust_score": 89, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "22", "name": "More Supermarket", "category": "grocery",
    "description": "Neighborhood supermarket. Fresh produce, dairy, packaged goods.",
    "price_range": "₹50 - ₹5000", "address": "Sonari Market", "area": "Sonari",
    "phone": "+91 9876543231", "images": ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"],
    "rating": 4.3, "review_count": 62, "trust_score": 86, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}
  },
  {
    "id": "23", "name": "Apollo Pharmacy", "category": "medical",
    "description": "24/7 pharmacy. Medicines, health products, first aid, home delivery.",
    "price_range": "₹50 - ₹5000", "address": "Bistupur Main Road", "area": "Bistupur",
    "phone": "+91 9876543232", "images": ["https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800"],
    "rating": 4.6, "review_count": 120, "trust_score": 96, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "24", "name": "City Clinic", "category": "medical",
    "description": "Multi-specialty clinic. General physician, pediatrician, lab tests.",
    "price_range": "₹200 - ₹2000", "address": "Sakchi Hospital Road", "area": "Sakchi",
    "phone": "+91 9876543233", "images": ["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800"],
    "rating": 4.4, "review_count": 88, "trust_score": 92, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  },
  {
    "id": "25", "name": "Gold's Gym", "category": "gym",
    "description": "Premium fitness center. Gym, cardio, personal training, group classes.",
    "price_range": "₹2000 - ₹8000/month", "address": "Telco Main Road", "area": "Telco",
    "phone": "+91 9876543234", "images": ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"],
    "rating": 4.5, "review_count": 72, "trust_score": 91, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2456, 22.7672]}
  },
  {
    "id": "26", "name": "Yoga Studio Jamshedpur", "category": "gym",
    "description": "Traditional yoga classes. Hatha yoga, meditation, pranayama.",
    "price_range": "₹500 - ₹2000/month", "address": "Sonari Colony", "area": "Sonari",
    "phone": "+91 9876543235", "images": ["https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800"],
    "rating": 4.7, "review_count": 45, "trust_score": 89, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2247, 22.7803]}
  },
  {
    "id": "27", "name": "Maruti Service Center", "category": "auto",
    "description": "Authorized Maruti service. Car repair, maintenance, denting, painting.",
    "price_range": "₹1000 - ₹50000", "address": "Adityapur Industrial Area", "area": "Adityapur",
    "phone": "+91 9876543236", "images": ["https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800"],
    "rating": 4.3, "review_count": 58, "trust_score": 90, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}
  },
  {
    "id": "28", "name": "Bike Care Center", "category": "auto",
    "description": "Two-wheeler service and repair. All brands. Puncture, servicing.",
    "price_range": "₹200 - ₹5000", "address": "Mango Chowk", "area": "Mango",
    "phone": "+91 9876543237", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    "rating": 4.4, "review_count": 82, "trust_score": 87, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}
  },
  {
    "id": "29", "name": "Verma Furniture Works", "category": "carpentry",
    "description": "Custom furniture, repairs, and woodwork. Quality craftsmanship.",
    "price_range": "₹1000 - ₹50000", "address": "Adityapur Industrial Area", "area": "Adityapur",
    "phone": "+91 9876543238", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    "rating": 4.4, "review_count": 28, "trust_score": 86, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1564, 22.7831]}
  },
  {
    "id": "30", "name": "Rainbow Painters", "category": "painting",
    "description": "Interior and exterior painting. Wall textures, waterproofing.",
    "price_range": "₹15/sqft - ₹50/sqft", "address": "Golmuri Chowk", "area": "Golmuri",
    "phone": "+91 9876543239", "images": ["https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"],
    "rating": 4.3, "review_count": 15, "trust_score": 82, "is_verified": false,
    "location": {"type": "Point", "coordinates": [86.1872, 22.7967]}
  },
  {
    "id": "31", "name": "Pest Free Solutions", "category": "pest_control",
    "description": "Complete pest control services. Termite treatment, cockroach control.",
    "price_range": "₹800 - ₹5000", "address": "Baridih Housing Colony", "area": "Baridih",
    "phone": "+91 9876543240", "images": ["https://images.unsplash.com/photo-1583842761829-4245d7894246?w=800"],
    "rating": 4.1, "review_count": 12, "trust_score": 78, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2156, 22.7939]}
  },
  {
    "id": "32", "name": "Quick Fix Appliances", "category": "appliance",
    "description": "Repair services for TV, fridge, washing machine, microwave.",
    "price_range": "₹300 - ₹3000", "address": "Mango Market", "area": "Mango",
    "phone": "+91 9876543241", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    "rating": 4.5, "review_count": 38, "trust_score": 90, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2206, 22.8242]}
  },
  {
    "id": "33", "name": "Excel Tutorials", "category": "tutor",
    "description": "Home tuition for classes 1-12. All subjects including JEE/NEET.",
    "price_range": "₹1500 - ₹5000/month", "address": "Jugsalai Main Road", "area": "Jugsalai",
    "phone": "+91 9876543242", "images": ["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"],
    "rating": 4.9, "review_count": 52, "trust_score": 97, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2036, 22.8078]}
  },
  {
    "id": "34", "name": "Shubham Caterers", "category": "catering",
    "description": "Catering for weddings, parties, and corporate events.",
    "price_range": "₹200 - ₹800/plate", "address": "Sitaramdera Market", "area": "Sitaramdera",
    "phone": "+91 9876543243", "images": ["https://images.unsplash.com/photo-1555244162-803834f70033?w=800"],
    "rating": 4.6, "review_count": 41, "trust_score": 91, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.1939, 22.7886]}
  },
  {
    "id": "35", "name": "Safe Move Packers", "category": "moving",
    "description": "Professional packers and movers. Local and intercity relocation.",
    "price_range": "₹3000 - ₹50000", "address": "Agrico Colony", "area": "Agrico",
    "phone": "+91 9876543244", "images": ["https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800"],
    "rating": 4.3, "review_count": 19, "trust_score": 84, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2142, 22.7731]}
  },
  {
    "id": "36", "name": "Wash & Fold", "category": "laundry",
    "description": "Professional laundry service. Wash, dry clean, ironing. Pickup available.",
    "price_range": "₹50 - ₹500/item", "address": "Bistupur Colony", "area": "Bistupur",
    "phone": "+91 9876543245", "images": ["https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800"],
    "rating": 4.4, "review_count": 35, "trust_score": 86, "is_verified": true,
    "location": {"type": "Point", "coordinates": [86.2029, 22.7857]}
  },
  {
    "id": "37", "name": "Jamshedpur Travels", "category": "travel",
    "description": "Car rental, taxi booking, tour packages. Airport transfers.",
    "price_range": "₹500 - ₹10000", "address": "Sakchi Bus Stand", "area": "Sakchi",
    "phone": "+91 9876543246", "images": ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800"],
    "rating": 4.2, "review_count": 48, "trust_score": 85, "is_verified": true, "is_emergency": true,
    "location": {"type": "Point", "coordinates": [86.2083, 22.7840]}
  }
];

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [areas, setAreas] = useState(FALLBACK_AREAS);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'map'
  const [searchRadiusUsed, setSearchRadiusUsed] = useState(0);
  const [mapCenter, setMapCenter] = useState([22.7857, 86.2029]); // Default Jamshedpur center
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get('emergency') === 'true');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [aiParsedIntent, setAiParsedIntent] = useState(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Map focus helper
  function MapFocus({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center, zoom || 13);
      }
    }, [center, map, zoom]);
    return null;
  }

  const { isListening, startVoiceSearch } = useVoiceSearch(async (transcript) => {
    setSearchQuery(transcript);
    setIsProcessingVoice(true);
    try {
      const response = await axios.post(`${API_URL}/api/search/intelligent`, {
        query: transcript,
        latitude: userLocation?.lat,
        longitude: userLocation?.lon,
        radius_km: 2.0 // Start with 2km, backend will expand
      });
      
      const { parsed_intent, is_urgent, services: searchResults, search_radius_used } = response.data;
      
      // Update filters based on AI parsing
      if (parsed_intent.service_category) setSelectedCategory(parsed_intent.service_category);
      if (is_urgent) setEmergencyOnly(true);
      
      setAiParsedIntent({ ...parsed_intent, is_urgent });
      setServices(searchResults || []);
      setTotal(searchResults?.length || 0);
      setSearchRadiusUsed(search_radius_used || 0);
    } catch (error) {
      console.error('Voice search processing error:', error);
      fetchServices();
    } finally {
      setIsProcessingVoice(false);
    }
  });

  useEffect(() => {
    // Fix Leaflet marker icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 22.7857, lon: 86.2029 }); // Jamshedpur center
        }
      );
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Sync state with searchParams
    const q = searchParams.get('search') || '';
    const cat = searchParams.get('category') || '';
    const area = searchParams.get('area') || '';
    const rating = searchParams.get('rating') || '';
    const emergency = searchParams.get('emergency') === 'true';
    
    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedArea(area);
    setMinRating(rating);
    setEmergencyOnly(emergency);
  }, [searchParams]);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, selectedArea, minRating, emergencyOnly, searchQuery, userLocation]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value === 'all' ? '' : value);
  };

  const handleAreaChange = (value) => {
    setSelectedArea(value === 'all' ? '' : value);
  };

  const handleRatingChange = (value) => {
    setMinRating(value === 'any' ? '' : value);
  };

  const fetchInitialData = async () => {
    try {
      const [catRes, areaRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/areas`)
      ]);
      if (catRes.data && catRes.data.length > 0) setCategories(catRes.data);
      if (areaRes.data && areaRes.data.length > 0) setAreas(areaRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      // Keep using FALLBACK_CATEGORIES and FALLBACK_AREAS
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      let response;
      if (searchQuery && !selectedCategory && !selectedArea && !minRating && !emergencyOnly) {
        response = await axios.post(`${API_URL}/api/search/intelligent`, {
          query: searchQuery,
          latitude: userLocation?.lat,
          longitude: userLocation?.lon,
          radius_km: 2.0
        }, config);
        
        const { parsed_intent, is_urgent, services: searchResults, search_radius_used } = response.data;
        setAiParsedIntent({ ...parsed_intent, is_urgent });
        setServices(searchResults || FALLBACK_SERVICES);
        setTotal(searchResults?.length || FALLBACK_SERVICES.length);
        setSearchRadiusUsed(search_radius_used || 0);
      } else {
        let url = `${API_URL}/api/services?limit=100&radius_km=2.0`;
        if (selectedCategory) url += `&category=${selectedCategory}`;
        if (selectedArea) url += `&area=${selectedArea}`;
        if (minRating) url += `&min_rating=${minRating}`;
        if (emergencyOnly) url += `&is_emergency=true`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (userLocation) {
          url += `&latitude=${userLocation.lat}&longitude=${userLocation.lon}`;
        }

        response = await axios.get(url, config);
        setServices(response.data.services || FALLBACK_SERVICES);
        setTotal(response.data.total || FALLBACK_SERVICES.length);
        setSearchRadiusUsed(response.data.search_radius_used || 0);
        setAiParsedIntent(null);
      }
      
      if (response.data.services?.length > 0) {
        const first = response.data.services[0];
        if (first.location) {
          setMapCenter([first.location.coordinates[1], first.location.coordinates[0]]);
        }
      } else if (userLocation) {
        setMapCenter([userLocation.lat, userLocation.lon]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      // Keep using FALLBACK_SERVICES but clear AI intent
      setAiParsedIntent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (serviceId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const service = services.find(s => s.id === serviceId);
    const isCurrentlyBookmarked = service?.is_bookmarked;

    try {
      const token = localStorage.getItem('civix_token');
      if (isCurrentlyBookmarked) {
        await axios.delete(`${API_URL}/api/bookmarks/${serviceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Removed from bookmarks');
      } else {
        await axios.post(`${API_URL}/api/bookmarks`, 
          { service_id: serviceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Added to bookmarks');
      }
      
      // Update local state
      setServices(services.map(s => 
        s.id === serviceId ? { ...s, is_bookmarked: !isCurrentlyBookmarked } : s
      ));
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchServices();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedArea('');
    setMinRating('');
    setEmergencyOnly(false);
    setAiParsedIntent(null);
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory || selectedArea || minRating || emergencyOnly || searchQuery;

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat?.name || id?.replace('_', ' ');
  };

  return (
    <div className="min-h-screen pt-20 pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                {selectedCategory ? getCategoryName(selectedCategory) : 'All Services'}
                {selectedArea && ` in ${selectedArea}`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{total} services available</span>
                {userLocation && (
                  <>
                    <span className="text-gray-300">•</span>
                    <MapPin className="w-4 h-4 text-[#E23744]" />
                    <span>Sorted by distance</span>
                  </>
                )}
              </p>
            </div>
            
            {/* AI Intent Display */}
            <AnimatePresence>
              {aiParsedIntent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    AI: <span className="font-medium capitalize">{aiParsedIntent.service_category?.replace('_', ' ')}</span>
                  </span>
                  {aiParsedIntent.is_urgent && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                      <Zap className="w-3 h-3" />
                      Urgent
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in Hinglish... e.g., 'bijli wala', 'nal theek karao'"
                className="pl-12 pr-12 h-12 rounded-xl text-base bg-gray-50/50 dark:bg-gray-900/50 focus:ring-2 focus:ring-[#E23744] transition-all"
                data-testid="services-search-input"
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                disabled={isListening || isProcessingVoice}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                  isListening 
                    ? 'bg-[#E23744] text-white shadow-lg' 
                    : 'text-gray-400 hover:text-[#E23744] hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {isProcessingVoice ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 px-4 rounded-xl"
                data-testid="toggle-filters-btn"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 w-5 h-5 rounded-full bg-[#E23744] text-white text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
              
              <Button
                type="submit"
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#E65100] text-white"
                data-testid="search-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Search
              </Button>
            </div>
          </form>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="rounded-xl" data-testid="category-filter">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => {
                            const val = cat.id || (typeof cat === 'string' ? cat : '');
                            if (!val) return null;
                            return (
                              <SelectItem key={val} value={val}>
                                {cat.name || val}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Area Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Area
                      </label>
                      <Select value={selectedArea || 'all'} onValueChange={handleAreaChange}>
                        <SelectTrigger className="rounded-xl" data-testid="area-filter">
                          <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Areas</SelectItem>
                          {areas.map(area => {
                            const val = area.name || (typeof area === 'string' ? area : '');
                            if (!val) return null;
                            return (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Rating
                      </label>
                      <Select value={minRating || 'any'} onValueChange={handleRatingChange}>
                        <SelectTrigger className="rounded-xl" data-testid="rating-filter">
                          <SelectValue placeholder="Any Rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Rating</SelectItem>
                          <SelectItem value="4.5">4.5+ Stars</SelectItem>
                          <SelectItem value="4">4+ Stars</SelectItem>
                          <SelectItem value="3.5">3.5+ Stars</SelectItem>
                          <SelectItem value="3">3+ Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Emergency Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Emergency Services
                      </label>
                      <Button
                        type="button"
                        variant={emergencyOnly ? 'default' : 'outline'}
                        onClick={() => setEmergencyOnly(!emergencyOnly)}
                        className={`w-full rounded-xl h-10 ${emergencyOnly ? 'bg-red-500 hover:bg-red-600' : ''}`}
                        data-testid="emergency-filter"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {emergencyOnly ? '24/7 Emergency Only' : 'Show All'}
                      </Button>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearFilters}
                        className="text-gray-500"
                        data-testid="clear-filters-btn"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory && (
              <span className="filter-chip active flex items-center gap-2">
                {getCategoryName(selectedCategory)}
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSelectedCategory('')} />
              </span>
            )}
            {selectedArea && (
              <span className="filter-chip active flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {selectedArea}
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSelectedArea('')} />
              </span>
            )}
            {minRating && (
              <span className="filter-chip active flex items-center gap-2">
                <Star className="w-4 h-4" />
                {minRating}+ Stars
                <X className="w-4 h-4 cursor-pointer" onClick={() => setMinRating('')} />
              </span>
            )}
            {emergencyOnly && (
              <span className="filter-chip active flex items-center gap-2 bg-red-500 border-red-500">
                <AlertTriangle className="w-4 h-4" />
                Emergency Only
                <X className="w-4 h-4 cursor-pointer" onClick={() => setEmergencyOnly(false)} />
              </span>
            )}
            {searchQuery && (
              <span className="filter-chip active flex items-center gap-2">
                <Search className="w-4 h-4" />
                "{searchQuery}"
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
          </div>
        )}

        {/* Dynamic Radius Expansion Alert */}
        <AnimatePresence>
          {searchRadiusUsed > 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                    Expanded Search Radius
                  </h4>
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    No results found within 2km. Automatically expanded search to {searchRadiusUsed}km to find the best services for you.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Services Content */}
        {loading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] rounded-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl relative z-10">
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapFocus center={mapCenter} />
              
              {userLocation && (
                <>
                  <Marker position={[userLocation.lat, userLocation.lon]}>
                    <Popup>You are here</Popup>
                  </Marker>
                  {searchRadiusUsed > 0 && (
                    <Circle 
                      center={[userLocation.lat, userLocation.lon]} 
                      radius={searchRadiusUsed * 1000} 
                      pathOptions={{ 
                        color: '#E23744', 
                        fillColor: '#E23744', 
                        fillOpacity: 0.1,
                        dashArray: '5, 10'
                      }} 
                    />
                  )}
                </>
              )}

              {services.map((service) => (
                service.location && (
                  <Marker 
                    key={service.id} 
                    position={[service.location.coordinates[1], service.location.coordinates[0]]}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[200px]">
                        <img 
                          src={service.images?.[0] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'} 
                          className="w-full h-24 object-cover rounded-lg mb-2"
                          alt={service.name}
                        />
                        <h4 className="font-bold text-gray-900">{service.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{service.category}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#E23744] font-bold text-sm">{service.price_range}</span>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() => {
                                const address = encodeURIComponent(`${service.address}, ${service.area}, Jamshedpur, Jharkhand, India`);
                                window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                              }}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Route
                            </Button>
                            <Button 
                              size="sm" 
                              className="h-7 text-[10px]"
                              onClick={() => navigate(`/services/${service.id}`)}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
        ) : services.length > 0 ? (
          <motion.div 
            layout
            className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
          >
            {services.map((service, index) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                index={index}
                isBookmarked={service.is_bookmarked}
                onBookmark={handleBookmark}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              No services found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your filters or search terms
            </p>
            <Button onClick={clearFilters} variant="outline" className="rounded-full">
              Clear All Filters
            </Button>
          </motion.div>
        )}
      </div>

      {/* View Toggle (Fixed at bottom) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-gray-900 dark:bg-gray-700 rounded-full p-1.5 flex shadow-xl border border-gray-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              viewMode === 'grid' 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="grid-view-btn"
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              viewMode === 'list' 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="list-view-btn"
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              viewMode === 'map' 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="map-view-btn"
          >
            <MapIcon className="w-4 h-4" />
            Map
          </button>
        </div>
      </div>
    </div>
  );
}
