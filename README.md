# TrackAll — Universal Delivery Tracker for India

Track all your deliveries from Delhivery, BlueDart, DTDC, Ekart, India Post and more — all in one place.

## Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Leaflet maps
- **Backend**: Node.js + Express + TypeScript + Socket.io
- **Database**: PostgreSQL + Redis
- **Auth**: JWT + Phone OTP
- **Containerization**: Docker + Docker Compose

## Quick Start

```bash
# 1. Start infrastructure
docker compose up postgres redis -d

# 2. Backend
cd backend && cp .env.example .env && npm install && npm run dev

# 3. Frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Visit http://localhost:3000 — use OTP `123456` in dev mode.

## Features
- 12+ courier partners (Delhivery, BlueDart, DTDC, Ekart, India Post, XpressBees…)
- Real-time WebSocket updates
- Interactive Leaflet map of India
- Phone OTP authentication
- Push/SMS/WhatsApp notifications
- Dark mode UI

## Structure
```
frontend/   # Next.js app
backend/    # Express API
database/   # PostgreSQL schema
```