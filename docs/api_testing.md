# API Testing Documentation

## Authentication Endpoints

Base URL: `http://localhost:4000/api/auth`

---

## 1. Registration - Valid Data

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response:** `201 Created`
```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "createdAt": "..."
  },
  "token": "eyJhbGc..."
}
```

---

## 2. Registration - Duplicate Email (Should Fail)

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "john.doe@example.com",
    "password": "AnotherPass123"
  }'
```

**Expected Response:** `400 Bad Request` or `409 Conflict`
```json
{
  "error": "Email already exists"
}
```

---

## 3. Registration - Weak Password (Should Fail)

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Smith",
    "email": "bob.smith@example.com",
    "password": "123"
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Password must be at least 8 characters long"
}
```

---

## 4. Login - Correct Credentials

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response:** `200 OK`
```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "createdAt": "..."
  },
  "token": "eyJhbGc..."
}
```

---

## 5. Login - Wrong Password (Should Fail)

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "WrongPassword123"
  }'
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Invalid credentials"
}
```

---

## 6. Get Me - With Valid Token

**Endpoint:** `GET /api/auth/me`

**Note:** Replace `YOUR_TOKEN_HERE` with the actual token received from login/registration.

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "createdAt": "..."
  }
}
```

---

## 7. Get Me - Without Token (Should Fail)

**Endpoint:** `GET /api/auth/me`

```bash
curl -X GET http://localhost:4000/api/auth/me
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": "No token provided"
}
```

---

## 8. Get Me - Invalid Token (Should Fail)

**Endpoint:** `GET /api/auth/me`

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Invalid token"
}
```

---

## Testing Workflow

### Complete Test Sequence

1. **Register a new user** (Test #1)
2. **Try to register with same email** (Test #2 - should fail)
3. **Try to register with weak password** (Test #3 - should fail)
4. **Login with correct credentials** (Test #4)
5. **Copy the token from login response**
6. **Try to login with wrong password** (Test #5 - should fail)
7. **Access protected route with token** (Test #6)
8. **Access protected route without token** (Test #7 - should fail)

### Quick Test Script

Save this as `test-auth.sh`:

```bash
#!/bin/bash

echo "=== Test 1: Register new user ==="
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "TestPass123"}'
echo -e "\n"

echo "=== Test 2: Duplicate email ==="
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User 2", "email": "test@example.com", "password": "TestPass456"}'
echo -e "\n"

echo "=== Test 3: Weak password ==="
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User 3", "email": "test3@example.com", "password": "123"}'
echo -e "\n"

echo "=== Test 4: Login correct credentials ==="
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123"}')
echo $RESPONSE
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "\n"

echo "=== Test 5: Login wrong password ==="
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "WrongPass123"}'
echo -e "\n"

echo "=== Test 6: Get me with token ==="
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "=== Test 7: Get me without token ==="
curl -X GET http://localhost:4000/api/auth/me
echo -e "\n"
```

**To run the script:**
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## Windows PowerShell Test Script

Save this as `test-auth.ps1`:

```powershell
Write-Host "=== Test 1: Register new user ===" -ForegroundColor Green
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name": "Test User", "email": "test@example.com", "password": "TestPass123"}' | ConvertTo-Json
Write-Host "`n"

Write-Host "=== Test 2: Duplicate email ===" -ForegroundColor Green
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Test User 2", "email": "test@example.com", "password": "TestPass456"}' | ConvertTo-Json
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host "`n"

Write-Host "=== Test 3: Weak password ===" -ForegroundColor Green
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Test User 3", "email": "test3@example.com", "password": "123"}' | ConvertTo-Json
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host "`n"

Write-Host "=== Test 4: Login correct credentials ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "test@example.com", "password": "TestPass123"}'
$loginResponse | ConvertTo-Json
$token = $loginResponse.token
Write-Host "`n"

Write-Host "=== Test 5: Login wrong password ===" -ForegroundColor Green
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email": "test@example.com", "password": "WrongPass123"}' | ConvertTo-Json
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host "`n"

Write-Host "=== Test 6: Get me with token ===" -ForegroundColor Green
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/me" `
  -Method GET `
  -Headers @{Authorization = "Bearer $token"} | ConvertTo-Json
Write-Host "`n"

Write-Host "=== Test 7: Get me without token ===" -ForegroundColor Green
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/me" `
    -Method GET | ConvertTo-Json
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host "`n"
```

**To run the PowerShell script:**
```powershell
.\test-auth.ps1
```

---

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure server is running: `npm run dev`
   - Check server is on port 4000 (as shown in your console)

2. **500 Internal Server Error**
   - Check server logs
   - Verify database connection
   - Ensure all migrations ran

3. **Token Issues**
   - Verify JWT_SECRET is set in `.env`
   - Check token format: `Bearer <token>`

4. **Database Errors**
   - Run migrations: `npx prisma migrate dev`
   - Check Prisma schema is correct