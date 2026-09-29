# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Health Check

#### `GET /api/health`
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Authentication

#### `POST /api/auth/register`
Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `email`: Valid email format, required
- `password`: Min 8 chars, must contain uppercase, lowercase, and number
- `firstName`: Required, max 50 chars
- `lastName`: Required, max 50 chars

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOi..."
  },
  "message": "Account created successfully."
}
```

**Error Response (409):**
```json
{
  "success": false,
  "error": {
    "message": "An account with this email already exists."
  }
}
```

---

#### `POST /api/auth/login`
Login with credentials.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOi..."
  },
  "message": "Login successful."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password."
  }
}
```

---

#### `GET /api/auth/me` 🔒
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "profile": null
    }
  }
}
```

---

### Workouts

#### `GET /api/workouts/stats/reps` 🔒
Aggregated rep counts and training volume, derived from the per-set reps logged
by the live session tracker. Counts completed sets from completed workout
sessions, plus manually created workout logs (session-generated logs are
excluded so nothing is counted twice).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalReps": 1840,
      "repsThisWeek": 216,
      "totalVolume": 47250,
      "volumeThisWeek": 5400,
      "totalSets": 212,
      "bestSetReps": 20,
      "perExercise": [
        {
          "name": "Barbell Bench Press",
          "muscleGroup": "chest",
          "totalReps": 240,
          "totalSets": 30,
          "totalVolume": 14400,
          "bestSetReps": 12,
          "lastPerformed": "2026-09-27T10:12:00.000Z"
        }
      ],
      "weekly": [
        { "weekStart": "2026-08-23T00:00:00.000Z", "label": "5w ago", "reps": 310, "volume": 8200 },
        { "weekStart": "2026-09-27T00:00:00.000Z", "label": "This Week", "reps": 216, "volume": 5400 }
      ]
    }
  }
}
```

Volume is `weight x reps` in kg, rounded. Sets logged without a weight
contribute reps but no volume.

---

## Error Format

All errors follow this structure:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "details": []  // Only for validation errors
  }
}
```

## Status Codes
| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Validation error |
| 401  | Unauthorized |
| 404  | Not found |
| 409  | Conflict (duplicate) |
| 429  | Rate limited |
| 500  | Server error |
