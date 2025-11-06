# 📘 API Endpoints Documentation

This document describes all REST API endpoints for the **Chat AI App** backend.  
Each section lists available routes, their purpose, authentication requirements, request/response formats, and example usage.

**Base URL:** `http://localhost:4000` (development)

---

## 1. 🔐 Authentication

### [POST] /api/auth/register

**Description:**  
Register a new user account. Creates a new user with hashed password and returns a JWT authentication token valid for 7 days.

**Auth required:** No

**Request headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "string - User's full name (required)",
  "email": "string - Valid email address (required, unique)",
  "password": "string - Minimum 8 characters (required)"
}
```

**Success response:**
* **Code:** 201 Created
* **Content:**
```json
{
  "user": {
    "id": "b1bcc2f9-3011-412e-8422-fb4841a72e44",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "avatarUrl": null,
    "createdAt": "2025-11-05T09:27:50.466Z",
    "updatedAt": "2025-11-05T09:27:50.466Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error responses:**

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Name is required"}`
  * **Cause:** Name field is missing or empty

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Valid email is required"}`
  * **Cause:** Email is missing or has invalid format

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Password must be at least 8 characters long"}`
  * **Cause:** Password is too short (less than 8 characters)

* **Code:** 409 Conflict
  * **Content:** `{"error": "Email already exists"}`
  * **Cause:** An account with this email already exists

* **Code:** 500 Internal Server Error
  * **Content:** `{"error": "Registration failed"}`
  * **Cause:** Unexpected server error during registration

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

**Example PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name": "John Doe", "email": "john.doe@example.com", "password": "SecurePass123"}'
```

---

### [POST] /api/auth/login

**Description:**  
Authenticate an existing user with email and password. Returns user information and a JWT token valid for 7 days.

**Auth required:** No

**Request headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "email": "string - User's email address (required)",
  "password": "string - User's password (required)"
}
```

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
{
  "user": {
    "id": "b1bcc2f9-3011-412e-8422-fb4841a72e44",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "avatarUrl": null,
    "createdAt": "2025-11-05T09:27:50.466Z",
    "updatedAt": "2025-11-05T09:27:50.466Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error responses:**

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Email and password are required"}`
  * **Cause:** Email or password field is missing

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Invalid credentials"}`
  * **Cause:** Email not found or password is incorrect (same message for security)

* **Code:** 500 Internal Server Error
  * **Content:** `{"error": "Login failed"}`
  * **Cause:** Unexpected server error during login

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

**Example PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "john.doe@example.com", "password": "SecurePass123"}'
```

---

### [GET] /api/auth/me

**Description:**  
Get the currently authenticated user's information. Requires a valid JWT token in the Authorization header.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Request body:**  
_None_

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
{
  "user": {
    "id": "b1bcc2f9-3011-412e-8422-fb4841a72e44",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "avatarUrl": null,
    "createdAt": "2025-11-05T09:27:50.466Z",
    "updatedAt": "2025-11-05T09:27:50.466Z"
  }
}
```

**Error responses:**

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "No token provided"}`
  * **Cause:** Authorization header is missing

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Invalid token format. Use: Bearer <token>"}`
  * **Cause:** Authorization header doesn't start with "Bearer "

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Invalid token"}`
  * **Cause:** Token is expired, malformed, or signed with wrong secret

* **Code:** 404 Not Found
  * **Content:** `{"error": "User not found"}`
  * **Cause:** User ID from token doesn't exist in database

**Example curl:**
```bash
# Replace YOUR_TOKEN with actual token from login/register
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example PowerShell:**
```powershell
# Replace YOUR_TOKEN with actual token from login/register
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/me" `
  -Method GET `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"}
```

**Complete workflow example:**
```bash
# 1. Register and capture token
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com", "password": "MyPassword123"}')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Use token to access protected route
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. 👤 Users

### [GET] /api/users/:id

**Description:**  
Fetch a specific user by their unique ID. Returns public profile information for any user in the system.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Request parameters:**
```
:id - UUID of the user (required)
```

**Request body:**  
_None_

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
{
  "id": "c5b91f8a-2c3e-4a6f-9a9d-4323e1c0a9b4",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "avatarUrl": null,
  "createdAt": "2025-11-06T10:45:21.123Z",
  "updatedAt": "2025-11-06T10:45:21.123Z"
}
```

**Error responses:**

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Unauthorized"}`
  * **Cause:** Missing or invalid authentication token

* **Code:** 404 Not Found
  * **Content:** `{"error": "User not found"}`
  * **Cause:** No user exists with the provided ID

**Example curl:**
```bash
curl -X GET http://localhost:4000/api/users/c5b91f8a-2c3e-4a6f-9a9d-4323e1c0a9b4 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/users/c5b91f8a-2c3e-4a6f-9a9d-4323e1c0a9b4" `
  -Method GET `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"}
```

---

### [PUT] /api/users/me

**Description:**  
Update the authenticated user's profile information. Currently supports updating the user's display name. Other fields (email, password) require separate endpoints for security reasons.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "string - New display name (required)"
}
```

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
{
  "id": "c5b91f8a-2c3e-4a6f-9a9d-4323e1c0a9b4",
  "name": "New Name",
  "email": "alice@example.com",
  "avatarUrl": null,
  "updatedAt": "2025-11-06T10:50:30.000Z"
}
```

**Error responses:**

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Name is required"}`
  * **Cause:** Name field is missing or empty

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Unauthorized"}`
  * **Cause:** Missing or invalid authentication token

* **Code:** 500 Internal Server Error
  * **Content:** `{"error": "Profile update failed"}`
  * **Cause:** Database error during update operation

**Example curl:**
```bash
curl -X PUT http://localhost:4000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}'
```

**Example PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/users/me" `
  -Method PUT `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"} `
  -Body '{"name": "Alice Updated"}'
```

---

### [GET] /api/users/search

**Description:**  
Search for users by name or email using a query string. The search is case-insensitive and matches partial queries against both the name and email fields. Useful for finding users to start conversations with.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Query parameters:**
```
q - Search string (required, minimum 1 character)
```

**Request body:**  
_None_

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
[
  {
    "id": "c5b91f8a-2c3e-4a6f-9a9d-4323e1c0a9b4",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "avatarUrl": null
  },
  {
    "id": "d2c4eac9-f48d-47c3-89f5-5e36b6a8f2c9",
    "name": "Alicia Stone",
    "email": "alicia@example.com",
    "avatarUrl": null
  }
]
```

**Note:** Returns an empty array `[]` if no users match the search query.

**Error responses:**

* **Code:** 400 Bad Request
  * **Content:** `{"error": "Query parameter q is required"}`
  * **Cause:** Missing or empty `q` query parameter

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Unauthorized"}`
  * **Cause:** Missing or invalid authentication token

**Example curl:**
```bash
curl -X GET "http://localhost:4000/api/users/search?q=alice" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/users/search?q=alice" `
  -Method GET `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"}
```

**Advanced search examples:**
```bash
# Search by partial name
curl -X GET "http://localhost:4000/api/users/search?q=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by email domain
curl -X GET "http://localhost:4000/api/users/search?q=@example.com" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search with URL-encoded special characters
curl -X GET "http://localhost:4000/api/users/search?q=alice%20johnson" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### [GET] /api/users

**Description:**  
Retrieve a list of all registered users in the system. Optionally exclude the currently authenticated user from the results using the `excludeMe` query parameter. Useful for displaying user directories or selecting conversation participants.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
```

**Query parameters:**
```
excludeMe - Boolean flag to exclude current user (optional)
            Values: "true" or "false" (default: "false")
```

**Request body:**  
_None_

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
[
  {
    "id": "d2c4eac9-f48d-47c3-89f5-5e36b6a8f2c9",
    "name": "Bob Williams",
    "email": "bob@example.com",
    "avatarUrl": null
  },
  {
    "id": "e8b28bb4-1234-47ab-90a5-ccdf01c66f23",
    "name": "Charlie Davis",
    "email": "charlie@example.com",
    "avatarUrl": null
  }
]
```

**Note:** Returns an empty array `[]` if no users exist (or if only the authenticated user exists when `excludeMe=true`).

**Error responses:**

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Unauthorized"}`
  * **Cause:** Missing or invalid authentication token

* **Code:** 500 Internal Server Error
  * **Content:** `{"error": "Failed to retrieve users"}`
  * **Cause:** Database connection error or query failure

**Example curl:**
```bash
# Get all users
curl -X GET "http://localhost:4000/api/users" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all users except yourself
curl -X GET "http://localhost:4000/api/users?excludeMe=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example PowerShell:**
```powershell
# Get all users
Invoke-RestMethod -Uri "http://localhost:4000/api/users" `
  -Method GET `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"}

# Get all users except yourself
Invoke-RestMethod -Uri "http://localhost:4000/api/users?excludeMe=true" `
  -Method GET `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"}
```

---

### [POST] /api/users/me/avatar

**Description:**  
Upload or update the authenticated user's profile avatar image. Accepts JPEG and PNG image files. The file is stored on the server (or cloud storage), and the avatar URL is saved to the user's profile. Replaces any existing avatar.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request body:**
```
Form data field name: avatar
File type: image/jpeg or image/png
Maximum file size: Depends on server configuration (typically 5MB)
```

**Success response:**
* **Code:** 200 OK
* **Content:**
```json
{
  "message": "Avatar uploaded successfully",
  "avatarUrl": "https://cdn.example.com/uploads/avatars/c5b91f8a.jpg"
}
```

**Error responses:**

* **Code:** 400 Bad Request
  * **Content:** `{"error": "No file uploaded"}`
  * **Cause:** Request doesn't contain a file in the `avatar` field

* **Code:** 415 Unsupported Media Type
  * **Content:** `{"error": "Only JPEG and PNG formats are allowed"}`
  * **Cause:** Uploaded file is not a JPEG or PNG image

* **Code:** 401 Unauthorized
  * **Content:** `{"error": "Unauthorized"}`
  * **Cause:** Missing or invalid authentication token

* **Code:** 413 Payload Too Large
  * **Content:** `{"error": "File size exceeds maximum allowed size"}`
  * **Cause:** Uploaded file is too large (exceeds server limits)

* **Code:** 500 Internal Server Error
  * **Content:** `{"error": "Avatar upload failed"}`
  * **Cause:** File system error, cloud storage error, or database update failure

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/users/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@/path/to/avatar.png"
```

**Example PowerShell:**
```powershell
$filePath = "C:\path\to\avatar.png"
$uri = "http://localhost:4000/api/users/me/avatar"
$headers = @{Authorization = "Bearer YOUR_TOKEN"}

# PowerShell method 1: Using Invoke-RestMethod
Invoke-RestMethod -Uri $uri `
  -Method POST `
  -Headers $headers `
  -InFile $filePath `
  -ContentType "multipart/form-data"

# PowerShell method 2: Using multipart form
$form = @{
    avatar = Get-Item -Path $filePath
}
Invoke-RestMethod -Uri $uri `
  -Method POST `
  -Headers $headers `
  -Form $form
```

**Complete workflow example:**
```bash
# 1. Login to get token
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "AlicePass123"}')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Upload avatar
curl -X POST http://localhost:4000/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@./profile-picture.jpg"

# 3. Verify avatar was updated
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

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
curl http://localhost:4000/api/health

# Response:
{
  "status": "ok",
  "uptime": 12345,
  "database": "connected",
  "timestamp": "2025-11-03T12:00:00Z"
}
```

---

## 📝 General Notes

### Authentication
- All authenticated endpoints require a JWT token in the `Authorization` header
- Format: `Authorization: Bearer <token>`
- Tokens expire after 7 days
- Tokens are returned on successful registration and login

### Data Formats
- All timestamps are in ISO 8601 format (UTC)
- All request/response bodies use JSON format
- Email addresses are stored and compared in lowercase

### Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Password hashes are never exposed in API responses
- Invalid credentials return generic "Invalid credentials" message (prevents user enumeration)

---

## 🔐 Common Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid input data"
}
```
**Common causes:**
- Missing required fields
- Invalid data format
- Password too short
- Invalid email format

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```
**Common causes:**
- Missing Authorization header
- Expired JWT token
- Invalid token signature
- Malformed token

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```
**Common causes:**
- Valid token but insufficient permissions
- Attempting to access another user's resources

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource does not exist"
}
```
**Common causes:**
- Invalid user ID
- Resource deleted
- Incorrect endpoint URL

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Resource already exists"
}
```
**Common causes:**
- Duplicate email during registration
- Unique constraint violation

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```
**Common causes:**
- Database connection issues
- Unhandled exceptions
- Server configuration problems

---

## 🧪 Testing

### Quick Test Commands

**Test registration:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "TestPass123"}'
```

**Test login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123"}'
```

**Test protected route:**
```bash
# Replace TOKEN with actual token from login response
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

**Test health check:**
```bash
curl http://localhost:4000/api/health
```

For comprehensive testing, see `/docs/api_testing.md`.

---

**Maintained by:** chat-ai-app team  
**Last updated:** November 5, 2025  
**Status:** 
- ✅ Authentication endpoints - Complete
- 🚧 Other endpoints - Work in Progress