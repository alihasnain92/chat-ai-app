# 📘 API Endpoints Documentation

This document describes all REST API endpoints for the **Chat AI App** backend.  
Each section lists available routes, their purpose, authentication requirements, request/response formats, and example usage.

---

## 1. 🔐 Authentication

### [POST] /api/auth/register
**Description:** TODO  
**Auth required:** No  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [POST] /api/auth/login
**Description:** TODO  
**Auth required:** No  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [GET] /api/auth/me
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 2. 👤 Users

### [GET] /api/users/:id
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [PUT] /api/users/:id
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 3. 💬 Conversations

### [GET] /api/conversations
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [POST] /api/conversations
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [GET] /api/conversations/:id
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 4. 📨 Messages

### [GET] /api/messages/:conversationId
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [POST] /api/messages
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [PATCH] /api/messages/:id/read
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 5. ❤️ Reactions

### [POST] /api/reactions
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [DELETE] /api/reactions/:id
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 6. 🤖 AI Features

### [POST] /api/ai/suggestions
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

### [POST] /api/ai/summarize
**Description:** TODO  
**Auth required:** Yes  
**Request body:**  
**Response:**  
**Status codes:**  
**Example:**  

---

## 7. 🩺 Health Check

### [GET] /api/health
**Description:**  
Returns basic system and database status for uptime monitoring.

**Auth required:** No  

**Request body:**  
_None_

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "database": "connected",
  "timestamp": "2025-11-03T12:00:00Z"
}
```

**Status codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Database connection failed

**Example:**
```bash
curl http://localhost:3000/api/health

# Response:
{
  "status": "ok",
  "uptime": 12345,
  "database": "connected",
  "timestamp": "2025-11-03T12:00:00Z"
}
```

---

## 📝 Notes

- All authenticated endpoints require a JWT token in the `Authorization` header: `Bearer <token>`
- All timestamps are in ISO 8601 format (UTC)
- All request/response bodies use JSON format
- Base URL: `http://localhost:3000` (development)

---

## 🔐 Common Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource does not exist"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

**Maintained by:** chat-ai-app team  
**Last updated:** November 2025  
**Status:** 🚧 Work in Progress - Most endpoints marked as TODO