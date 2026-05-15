# Architecture Overview

## System Design

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   (Next.js)     │     │   (Express)     │     │   (Prisma)      │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │   AI Engine     │
                        │   (OpenAI)      │
                        │                 │
                        └─────────────────┘
```

## Backend Architecture

```
backend/src/
├── config/          → Environment variables, DB connection
├── controllers/     → HTTP request handlers (thin layer)
├── middleware/      → Auth, validation, error handling
├── routes/          → Route definitions
├── services/        → Business logic (thick layer)
├── validators/      → Input validation rules
└── utils/           → Helpers (JWT, async handler)
```

## Design Principles

1. **Separation of Concerns**: Routes → Controllers → Services → Database
2. **Thin Controllers**: Controllers only handle req/res; logic lives in services
3. **Centralized Error Handling**: All errors flow through middleware
4. **Validation Layer**: Input is validated before reaching business logic
5. **Environment Config**: All secrets in .env, validated on startup

## Authentication Flow

```
Register/Login → Validate Input → Service Layer → Hash/Verify → Generate JWT → Response
                                                                      │
Protected Route → Extract Bearer Token → Verify JWT → Attach User → Continue
```

## Database Schema

See `database/prisma/schema.prisma` for full schema definition.

### Key Models:
- **User** - Authentication & identity
- **Profile** - Fitness details (goals, measurements)
- **WorkoutPlan** - Generated plans (rule-based or AI)
- **WorkoutLog** - Exercise tracking entries
