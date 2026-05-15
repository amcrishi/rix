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
