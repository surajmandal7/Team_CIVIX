# CIVIX - Hyperlocal Services Platform PRD

## Project Overview
CIVIX is an AI-powered urban infrastructure platform for hyperlocal service discovery in Tier 2/3 Indian cities, starting with Jamshedpur.

## Original Problem Statement
Build a visually stunning, modern, and highly interactive full-stack web application called "CIVIX" — a next-generation hyperlocal services, business discovery, and city intelligence platform for Tier 2/3 cities in India.

## User Personas
1. **Service Seekers**: Residents looking for local services (plumbers, electricians, restaurants, etc.)
2. **Service Providers**: Local businesses wanting to be discovered
3. **Emergency Users**: People needing immediate 24/7 services

## Technology Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB with 2dsphere geospatial indexing
- **AI**: 
  - Llama 3.3 via Groq (ultra-fast Hinglish parsing)
  - OpenAI GPT-5.2 via Emergent (Snap-to-Fix image analysis)
- **Auth**: JWT-based custom authentication

## What's Been Implemented (April 2026)

### Intelligence Layer (AI-Driven)
- **Semantic Intent Parsing**: Llama 3.3 via Groq for Hinglish/slang understanding
  - "bijli band hai" → Electrical category with urgency
  - "biryani khaana hai" → Restaurant category
- **Urgency Detection**: Automatically flags searches as urgent based on distress keywords
- **Zero-Friction Onboarding**: WhatsApp business ad to structured listing extraction

### Discovery Layer (Geospatial)
- **Dynamic Radius Expansion**: 2km → 5km → 10km to ensure no empty results
- **Proximity Ranking**: MongoDB 2dsphere indexing for distance-based sorting
- **Trust Indicators**: Verification system with community vouches

### Core Features
- Landing page with animated gradient background, AI-powered search
- 37 services across 20 categories (plumbing, electrical, restaurants, cafes, grocery, medical, gym, etc.)
- Service cards with trust scores, vouches, distance, verified badges
- Category/Area/Rating filters
- Emergency mode FAB
- Dark/Light mode toggle
- User authentication, dashboard, bookmarks

### Backend APIs
- `/api/search/intelligent` - AI-powered Hinglish search
- `/api/onboard/whatsapp` - WhatsApp business extraction
- `/api/services` - CRUD with geospatial filtering
- `/api/services/{id}/vouch` - Community vouching
- `/api/ai/trust-score/{id}` - Trust analysis
- `/api/stats` - Platform statistics

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core service discovery with 37 services
- [x] AI-powered Hinglish search
- [x] Geospatial proximity ranking
- [x] Trust scores and vouches

### P1 (High Priority)
- [ ] WhatsApp booking integration
- [ ] Real-time "Open Now" detection
- [ ] Push notifications

### P2 (Medium Priority)
- [ ] Service provider dashboard
- [ ] Payment integration for premium listings
- [ ] Service heatmap visualization

## Next Tasks
1. Add WhatsApp booking integration for service providers
2. Implement "Open Now" detection based on working hours
3. Add service provider registration and dashboard
4. Integrate Google Maps for visual location display
