# AI Fitness Trainer

A production-ready SaaS application for AI-powered personalized workout plans, progress tracking, and coaching.

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI API
- **Auth**: JWT-based authentication

## Project Structure

```
├── frontend/        → Next.js application
├── backend/         → Express REST API
├── database/        → Prisma schema & migrations
├── ai-engine/       → AI prompts and services
└── docs/            → Architecture documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

```bash
# Install backend dependencies
cd backend && npm install

# Set up environment variables
cp backend/.env.example backend/.env

# Run database migrations
cd database && npx prisma migrate dev

# Start backend server
cd backend && npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

## Environment Variables

See `backend/.env.example` for required configuration.

## API Documentation

See `docs/api.md` for full REST API documentation.
