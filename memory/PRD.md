# CIVIX - Hyperlocal Services Platform PRD

## Project Overview
CIVIX is an AI-powered urban infrastructure platform for hyperlocal service discovery in Tier 2/3 Indian cities, starting with Jamshedpur.

## Original Problem Statement
Build a visually stunning, modern, and highly interactive full-stack web application called "CIVIX" — a next-generation hyperlocal services, business discovery, and city intelligence platform for Tier 2/3 cities in India.

## User Personas
1. **Service Seekers**: Residents looking for local services (plumbers, electricians, etc.)
2. **Service Providers**: Local businesses wanting to be discovered
3. **Emergency Users**: People needing immediate 24/7 services

## Technology Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 (via Emergent Integration)
- **Auth**: JWT-based custom authentication

## What's Been Implemented (April 2026)

### Core Features
- Landing page with 3D hero background, smart search, categories, featured services
- Service listing page with filters (category, area, rating, emergency)
- Service detail page with trust scores, reviews, booking CTA
- User authentication (register, login, logout)
- User dashboard with stats and bookmarks
- Bookmarks/favorites functionality
- Emergency FAB with quick access to emergency services
- Dark/Light mode toggle
- AI-powered voice search (Hinglish support)
- AI-powered Snap-to-Fix (image analysis)
- AI Trust Score system (fake review detection)

### Backend APIs
- Authentication: /api/auth/register, login, logout, me
- Services: /api/services (CRUD), /api/categories, /api/areas
- Reviews: /api/services/{id}/reviews
- Bookmarks: /api/bookmarks
- AI: /api/ai/voice-search, snap-to-fix, trust-score
- Emergency: /api/emergency-services
- Dashboard: /api/dashboard/stats

### Database Collections
- users (with password hash, role)
- services (12 seed services for Jamshedpur)
- reviews
- bookmarks

## Prioritized Backlog

### P0 (Critical)
- [x] Core service discovery flow
- [x] User authentication
- [x] Service detail with booking CTA

### P1 (High Priority)
- [x] AI voice search
- [x] AI trust scores
- [ ] WhatsApp integration for bookings
- [ ] Payment integration (for premium listings)

### P2 (Medium Priority)
- [x] Snap-to-Fix image analysis
- [ ] Real-time service availability ("Open Now")
- [ ] Notification system
- [ ] Service provider dashboard

### P3 (Nice to Have)
- [ ] Service heatmap visualization
- [ ] Colony intelligence (neighbor recommendations)
- [ ] Predictive demand engine
- [ ] Local economy impact tracker

## Next Tasks
1. Add real-time WhatsApp booking integration
2. Implement "Open Now" detection based on working hours
3. Add service provider registration and dashboard
4. Integrate Google Maps for location-based search
5. Add push notifications for booking updates
