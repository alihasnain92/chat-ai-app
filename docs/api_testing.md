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
---
## Conversation Endpoints

Base URL: `http://localhost:4000/api/conversations`

**Prerequisites:** You'll need authentication tokens for testing. Use tokens from seed data or register/login users first.

---

## Setup: Get Tokens for Testing

First, login as different users to get their tokens:

```bash
# Login as Alice
ALICE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Alice Token: $ALICE_TOKEN"

# Login as Bob
BOB_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_TOKEN=$(echo $BOB_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Bob Token: $BOB_TOKEN"

# Login as Carol
CAROL_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "carol@example.com", "password": "password123"}')
CAROL_TOKEN=$(echo $CAROL_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Carol Token: $CAROL_TOKEN"
```

---

## 1. Create 1-on-1 Conversation (Alice and Bob)

**Endpoint:** `POST /api/conversations`

```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "participantIds": ["bob-user-id"],
    "isGroup": false
  }'
```

**Manual version (replace tokens and IDs):**
```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE" \
  -d '{
    "participantIds": ["clxxx...bob-id"],
    "isGroup": false
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "conv_123...",
  "isGroup": false,
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T...",
  "participants": [
    {
      "userId": "alice-id",
      "user": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com"
      }
    },
    {
      "userId": "bob-id",
      "user": {
        "id": "bob-id",
        "name": "Bob",
        "email": "bob@example.com"
      }
    }
  ]
}
```

---

## 2. Create Group Conversation (Alice, Bob, Carol)

**Endpoint:** `POST /api/conversations`

```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "participantIds": ["bob-user-id", "carol-user-id"],
    "isGroup": true,
    "name": "Team Chat"
  }'
```

**Manual version:**
```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE" \
  -d '{
    "participantIds": ["clxxx...bob-id", "clxxx...carol-id"],
    "isGroup": true,
    "name": "Team Chat"
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "conv_456...",
  "name": "Team Chat",
  "isGroup": true,
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T...",
  "participants": [
    {
      "userId": "alice-id",
      "user": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com"
      }
    },
    {
      "userId": "bob-id",
      "user": {
        "id": "bob-id",
        "name": "Bob",
        "email": "bob@example.com"
      }
    },
    {
      "userId": "carol-id",
      "user": {
        "id": "carol-id",
        "name": "Carol",
        "email": "carol@example.com"
      }
    }
  ]
}
```

---

## 3. Get All Conversations for Alice

**Endpoint:** `GET /api/conversations`

```bash
curl -X GET http://localhost:4000/api/conversations \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Manual version:**
```bash
curl -X GET http://localhost:4000/api/conversations \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "conversations": [
    {
      "id": "conv_123...",
      "name": null,
      "isGroup": false,
      "createdAt": "2025-11-08T...",
      "updatedAt": "2025-11-08T...",
      "participants": [
        {
          "userId": "alice-id",
          "user": {
            "id": "alice-id",
            "name": "Alice",
            "email": "alice@example.com"
          }
        },
        {
          "userId": "bob-id",
          "user": {
            "id": "bob-id",
            "name": "Bob",
            "email": "bob@example.com"
          }
        }
      ],
      "lastMessage": null
    },
    {
      "id": "conv_456...",
      "name": "Team Chat",
      "isGroup": true,
      "createdAt": "2025-11-08T...",
      "updatedAt": "2025-11-08T...",
      "participants": [...],
      "lastMessage": null
    }
  ]
}
```

---

## 4. Get Specific Conversation by ID

**Endpoint:** `GET /api/conversations/:id`

```bash
# Save conversation ID from previous response
CONVERSATION_ID="conv_123..."

curl -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Manual version:**
```bash
curl -X GET http://localhost:4000/api/conversations/clxxx...conversation-id \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "id": "conv_123...",
  "name": null,
  "isGroup": false,
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T...",
  "participants": [
    {
      "userId": "alice-id",
      "user": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com"
      }
    },
    {
      "userId": "bob-id",
      "user": {
        "id": "bob-id",
        "name": "Bob",
        "email": "bob@example.com"
      }
    }
  ],
  "messages": []
}
```

---

## 5. Add Participant to Group

**Endpoint:** `POST /api/conversations/:id/participants`

**Note:** Only works for group conversations.

```bash
# Use the group conversation ID from test #2
GROUP_CONVERSATION_ID="conv_456..."

curl -X POST http://localhost:4000/api/conversations/$GROUP_CONVERSATION_ID/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "userId": "dave-user-id"
  }'
```

**Manual version:**
```bash
curl -X POST http://localhost:4000/api/conversations/clxxx...group-conv-id/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE" \
  -d '{
    "userId": "clxxx...dave-id"
  }'
```

**Expected Response:** `200 OK`
```json
{
  "id": "conv_456...",
  "name": "Team Chat",
  "isGroup": true,
  "participants": [
    {
      "userId": "alice-id",
      "user": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com"
      }
    },
    {
      "userId": "bob-id",
      "user": {
        "id": "bob-id",
        "name": "Bob",
        "email": "bob@example.com"
      }
    },
    {
      "userId": "carol-id",
      "user": {
        "id": "carol-id",
        "name": "Carol",
        "email": "carol@example.com"
      }
    },
    {
      "userId": "dave-id",
      "user": {
        "id": "dave-id",
        "name": "Dave",
        "email": "dave@example.com"
      }
    }
  ]
}
```

---

## 6. Remove Participant from Group

**Endpoint:** `DELETE /api/conversations/:id/participants`

**Note:** Only works for group conversations. The userId should be sent in the request body.

```bash
curl -X DELETE http://localhost:4000/api/conversations/$GROUP_CONVERSATION_ID/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "userId": "carol-user-id"
  }'
```

**Manual version:**
```bash
curl -X DELETE http://localhost:4000/api/conversations/clxxx...group-conv-id/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ALICE_TOKEN_HERE" \
  -d '{
    "userId": "clxxx...carol-id"
  }'
```

**Expected Response:** `200 OK`
```json
{
  "conversation": {
    "id": "conv_456...",
    "name": "Team Chat",
    "isGroup": true,
    "participants": [
      {
        "userId": "alice-id",
        "user": {
          "id": "alice-id",
          "name": "Alice",
          "email": "alice@example.com"
        }
      },
      {
        "userId": "bob-id",
        "user": {
          "id": "bob-id",
          "name": "Bob",
          "email": "bob@example.com"
        }
      },
      {
        "userId": "dave-id",
        "user": {
          "id": "dave-id",
          "name": "Dave",
          "email": "dave@example.com"
        }
      }
    ]
  }
}
```

---

## Complete Test Script

Save this as `test-conversations.sh`:

```bash
#!/bin/bash

echo "=== Setting up test users ==="
echo ""

# Register or Login as Alice
echo "Setting up Alice..."
ALICE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "password123"}')

if echo $ALICE_RESPONSE | grep -q "error"; then
  echo "Alice already exists, logging in..."
  ALICE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "alice@example.com", "password": "password123"}')
fi

ALICE_TOKEN=$(echo $ALICE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ALICE_ID=$(echo $ALICE_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Alice ID: $ALICE_ID"
echo ""

# Register or Login as Bob
echo "Setting up Bob..."
BOB_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com", "password": "password123"}')

if echo $BOB_RESPONSE | grep -q "error"; then
  echo "Bob already exists, logging in..."
  BOB_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "bob@example.com", "password": "password123"}')
fi

BOB_TOKEN=$(echo $BOB_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
BOB_ID=$(echo $BOB_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Bob ID: $BOB_ID"
echo ""

# Register or Login as Carol
echo "Setting up Carol..."
CAROL_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Carol", "email": "carol@example.com", "password": "password123"}')

if echo $CAROL_RESPONSE | grep -q "error"; then
  echo "Carol already exists, logging in..."
  CAROL_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "carol@example.com", "password": "password123"}')
fi

CAROL_TOKEN=$(echo $CAROL_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
CAROL_ID=$(echo $CAROL_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Carol ID: $CAROL_ID"
echo ""

echo "=== Test 1: Create 1-on-1 conversation (Alice and Bob) ==="
ONE_ON_ONE=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
echo $ONE_ON_ONE | jq .
ONE_ON_ONE_ID=$(echo $ONE_ON_ONE | jq -r '.conversation.id')
echo "1-on-1 Conversation ID: $ONE_ON_ONE_ID"
echo ""

echo "=== Test 2: Create group conversation (Alice, Bob, Carol) ==="
GROUP=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\", \"$CAROL_ID\"], \"isGroup\": true, \"name\": \"Team Chat\"}")
echo $GROUP | jq .
GROUP_ID=$(echo $GROUP | jq -r '.conversation.id')
echo "Group Conversation ID: $GROUP_ID"
echo ""

echo "=== Test 3: Get all conversations for Alice ==="
curl -s -X GET http://localhost:4000/api/conversations \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
echo ""

echo "=== Test 4: Get specific conversation by ID ==="
curl -s -X GET http://localhost:4000/api/conversations/$ONE_ON_ONE_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
echo ""

echo "=== Test 5: Add participant to group (add Dave if exists) ==="
# Register or Login as Dave
DAVE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Dave", "email": "dave@example.com", "password": "password123"}')

if echo $DAVE_RESPONSE | grep -q "error"; then
  echo "Dave already exists, logging in..."
  DAVE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "dave@example.com", "password": "password123"}')
fi

DAVE_ID=$(echo $DAVE_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)

if [ -n "$DAVE_ID" ]; then
  curl -s -X POST http://localhost:4000/api/conversations/$GROUP_ID/participants \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "{\"userId\": \"$DAVE_ID\"}" | jq .
else
  echo "Error setting up Dave user."
fi
echo ""

echo "=== Test 6: Remove participant from group (remove Carol) ==="
curl -s -X DELETE http://localhost:4000/api/conversations/$GROUP_ID/participants/$CAROL_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
echo ""

echo "=== Test complete! ==="
```

**To run the script:**
```bash
chmod +x test-conversations.sh
./test-conversations.sh
```

**Note:** This script requires `jq` for JSON formatting. Install it with:
- Ubuntu/Debian: `sudo apt-get install jq`
- macOS: `brew install jq`

---

## Windows PowerShell Test Script

Save this as `test-conversations.ps1`:

```powershell
Write-Host "=== Setting up test users ===" -ForegroundColor Cyan
Write-Host ""

# Register or Login as Alice
Write-Host "Setting up Alice..." -ForegroundColor Yellow
try {
  $aliceLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Alice", "email": "alice@example.com", "password": "password123"}'
  Write-Host "Alice registered successfully" -ForegroundColor Green
} catch {
  Write-Host "Alice already exists, logging in..." -ForegroundColor Yellow
  $aliceLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email": "alice@example.com", "password": "password123"}'
}
$aliceToken = $aliceLogin.token
$aliceId = $aliceLogin.user.id
Write-Host "Alice ID: $aliceId" -ForegroundColor Green
Write-Host ""

# Register or Login as Bob
Write-Host "Setting up Bob..." -ForegroundColor Yellow
try {
  $bobLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Bob", "email": "bob@example.com", "password": "password123"}'
  Write-Host "Bob registered successfully" -ForegroundColor Green
} catch {
  Write-Host "Bob already exists, logging in..." -ForegroundColor Yellow
  $bobLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email": "bob@example.com", "password": "password123"}'
}
$bobToken = $bobLogin.token
$bobId = $bobLogin.user.id
Write-Host "Bob ID: $bobId" -ForegroundColor Green
Write-Host ""

# Register or Login as Carol
Write-Host "Setting up Carol..." -ForegroundColor Yellow
try {
  $carolLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Carol", "email": "carol@example.com", "password": "password123"}'
  Write-Host "Carol registered successfully" -ForegroundColor Green
} catch {
  Write-Host "Carol already exists, logging in..." -ForegroundColor Yellow
  $carolLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email": "carol@example.com", "password": "password123"}'
}
$carolToken = $carolLogin.token
$carolId = $carolLogin.user.id
Write-Host "Carol ID: $carolId" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 1: Create 1-on-1 conversation (Alice and Bob) ===" -ForegroundColor Cyan
$oneOnOne = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body "{`"participantIds`": [`"$bobId`"], `"isGroup`": false}"
$oneOnOne | ConvertTo-Json -Depth 10
$oneOnOneId = $oneOnOne.conversation.id
Write-Host "1-on-1 Conversation ID: $oneOnOneId" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 2: Create group conversation (Alice, Bob, Carol) ===" -ForegroundColor Cyan
$group = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body "{`"participantIds`": [`"$bobId`", `"$carolId`"], `"isGroup`": true, `"name`": `"Team Chat`"}"
$group | ConvertTo-Json -Depth 10
$groupId = $group.conversation.id
Write-Host "Group Conversation ID: $groupId" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 3: Get all conversations for Alice ===" -ForegroundColor Cyan
$allConversations = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations" `
  -Method GET `
  -Headers @{Authorization = "Bearer $aliceToken"}
$allConversations | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "=== Test 4: Get specific conversation by ID ===" -ForegroundColor Cyan
$specificConv = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$oneOnOneId" `
  -Method GET `
  -Headers @{Authorization = "Bearer $aliceToken"}
$specificConv | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "=== Test 5: Add participant to group ===" -ForegroundColor Cyan
# Register or Login as Dave
try {
  $daveLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"name": "Dave", "email": "dave@example.com", "password": "password123"}'
  Write-Host "Dave registered successfully" -ForegroundColor Green
} catch {
  Write-Host "Dave already exists, logging in..." -ForegroundColor Yellow
  $daveLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email": "dave@example.com", "password": "password123"}'
}
$daveId = $daveLogin.user.id

try {
  $addParticipant = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$groupId/participants" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $aliceToken"} `
    -Body "{`"userId`": `"$daveId`"}"
  $addParticipant | ConvertTo-Json -Depth 10
} catch {
  Write-Host "Error adding participant: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test 6: Remove participant from group (remove Carol) ===" -ForegroundColor Cyan
try {
  $removeParticipant = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$groupId/participants" `
    -Method DELETE `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $aliceToken"} `
    -Body "{`"userId`": `"$carolId`"}"
  $removeParticipant | ConvertTo-Json -Depth 10
} catch {
  Write-Host "Error removing participant: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test complete! ===" -ForegroundColor Green
```

**To run the PowerShell script:**
```powershell
.\test-conversations.ps1
```

---

## Error Scenarios

### 1. Create Conversation Without Auth (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "participantIds": ["some-id"],
    "isGroup": false
  }'
```

**Expected Response:** `401 Unauthorized`

---

### 2. Create Conversation with Non-existent Participant (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "participantIds": ["non-existent-user-id"],
    "isGroup": false
  }'
```

**Expected Response:** `404 Not Found` or `400 Bad Request`

---

### 3. Add Participant to 1-on-1 Conversation (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations/$ONE_ON_ONE_ID/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "userId": "carol-user-id"
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Cannot add participants to 1-on-1 conversations"
}
```

---

### 4. Access Conversation User is Not Part Of (Should Fail)

```bash
# Login as Dave
DAVE_TOKEN="..."

# Try to access Alice and Bob's conversation
curl -X GET http://localhost:4000/api/conversations/$ONE_ON_ONE_ID \
  -H "Authorization: Bearer $DAVE_TOKEN"
```

**Expected Response:** `403 Forbidden`

---

## Troubleshooting

### Common Issues

1. **"User not found" errors**
   - Ensure your seed data has created the users
   - Run: `npm run seed` or check your database

2. **Token extraction fails in scripts**
   - Tokens might be in different JSON structure
   - Use `echo $RESPONSE` to see full response
   - Adjust grep/parsing commands accordingly

3. **Cannot find conversation IDs**
   - Use Test #3 to list all conversations
   - Copy IDs from the response

4. **Participant already exists**
   - Normal if running tests multiple times
   - Delete conversations and recreate

5. **jq not found (bash script)**
   - Install jq: `sudo apt-get install jq` (Ubuntu) or `brew install jq` (macOS)
   - Or remove `| jq .` from commands to see raw JSON
---
---
## Message Endpoints

Base URL: `http://localhost:4000/api`

**Prerequisites:** You'll need:
1. Authentication tokens from logged-in users
2. Valid conversation IDs (from conversation tests or database)

---

## Setup: Get Tokens and Conversation ID

```bash
# Login as Alice
ALICE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ALICE_ID=$(echo $ALICE_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Alice Token: $ALICE_TOKEN"

# Login as Bob
BOB_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_TOKEN=$(echo $BOB_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
BOB_ID=$(echo $BOB_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Bob Token: $BOB_TOKEN"

# Create a test conversation
CONV_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONVERSATION_ID=$(echo $CONV_RESPONSE | grep -o '"id":"[^"]*' | grep -o 'cl[^"]*' | head -1)
echo "Conversation ID: $CONVERSATION_ID"
```

---

## 1. Send Message to Conversation

**Endpoint:** `POST /api/conversations/:conversationId/messages`

### Basic text message
```bash
curl -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Hello! This is my first message."
  }'
```

**Manual version (replace tokens and IDs):**
```bash
curl -X POST http://localhost:4000/api/conversations/clxxx...conversation-id/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "Hello! This is my first message."
  }'
```

**Expected Response:** `201 Created`
```json
{
  "message": {
    "id": "12345",
    "conversationId": "conv_123...",
    "senderId": "alice-id",
    "content": "Hello! This is my first message.",
    "attachments": null,
    "status": "sent",
    "statusTimestamps": {
      "sent": "2025-11-08T..."
    },
    "createdAt": "2025-11-08T...",
    "editedAt": null,
    "sender": {
      "id": "alice-id",
      "name": "Alice",
      "email": "alice@example.com",
      "avatarUrl": null
    }
  }
}
```

### Message with attachments
```bash
curl -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Check out this image!",
    "attachments": [
      {
        "type": "image",
        "url": "https://example.com/image.jpg",
        "name": "photo.jpg",
        "size": 102400
      }
    ]
  }'
```

### Send multiple messages for testing pagination
```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "{\"content\": \"Test message number $i\"}"
  echo "Sent message $i"
  sleep 0.3
done
```

---

## 2. Get Messages from Conversation (No Pagination)

**Endpoint:** `GET /api/conversations/:conversationId/messages`

### Get latest messages (default limit: 50)
```bash
curl -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Manual version:**
```bash
curl -X GET http://localhost:4000/api/conversations/clxxx...conversation-id/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "12345",
      "conversationId": "conv_123...",
      "senderId": "alice-id",
      "content": "Test message number 10",
      "attachments": null,
      "status": "sent",
      "statusTimestamps": {
        "sent": "2025-11-08T..."
      },
      "createdAt": "2025-11-08T...",
      "editedAt": null,
      "sender": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com",
        "avatarUrl": null
      }
    },
    {
      "id": "12344",
      "conversationId": "conv_123...",
      "senderId": "alice-id",
      "content": "Test message number 9",
      "attachments": null,
      "status": "sent",
      "statusTimestamps": {
        "sent": "2025-11-08T..."
      },
      "createdAt": "2025-11-08T...",
      "editedAt": null,
      "sender": {
        "id": "alice-id",
        "name": "Alice",
        "email": "alice@example.com",
        "avatarUrl": null
      }
    }
  ],
  "nextCursor": "12340",
  "hasMore": true
}
```

### Get messages with custom limit
```bash
curl -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?limit=5" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Manual version:**
```bash
curl -X GET "http://localhost:4000/api/conversations/clxxx...conversation-id/messages?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 3. Get Messages with Cursor-Based Pagination

**Endpoint:** `GET /api/conversations/:conversationId/messages?cursor=MESSAGE_ID&limit=N`

### Step 1: Get first page of messages
```bash
RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?limit=5" \
  -H "Authorization: Bearer $ALICE_TOKEN")

echo "First page:"
echo "$RESPONSE" | jq '.'

# Extract nextCursor for pagination
NEXT_CURSOR=$(echo "$RESPONSE" | jq -r '.nextCursor')
echo "Next cursor: $NEXT_CURSOR"
```

### Step 2: Get second page using cursor
```bash
if [ "$NEXT_CURSOR" != "null" ]; then
  curl -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?cursor=$NEXT_CURSOR&limit=5" \
    -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'
fi
```

**Manual version:**
```bash
# Replace with your cursor value from first response
curl -X GET "http://localhost:4000/api/conversations/clxxx...conversation-id/messages?cursor=12345&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Complete pagination loop
```bash
CURSOR=""
PAGE=1

while true; do
  echo "=== Page $PAGE ==="
  
  if [ -z "$CURSOR" ]; then
    RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?limit=5" \
      -H "Authorization: Bearer $ALICE_TOKEN")
  else
    RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?cursor=$CURSOR&limit=5" \
      -H "Authorization: Bearer $ALICE_TOKEN")
  fi
  
  echo "$RESPONSE" | jq '.messages[] | {id, content}'
  
  HAS_MORE=$(echo "$RESPONSE" | jq -r '.hasMore')
  CURSOR=$(echo "$RESPONSE" | jq -r '.nextCursor')
  
  if [ "$HAS_MORE" != "true" ]; then
    echo "No more messages."
    break
  fi
  
  PAGE=$((PAGE + 1))
  sleep 0.5
done
```

---

## 4. Update a Message

**Endpoint:** `PUT /api/messages/:id`

### Step 1: Send a message to update
```bash
MESSAGE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Original message content"}')

MESSAGE_ID=$(echo "$MESSAGE_RESPONSE" | jq -r '.message.id')
echo "Created message ID: $MESSAGE_ID"
```

### Step 2: Update the message
```bash
curl -X PUT http://localhost:4000/api/messages/$MESSAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Updated message content - this has been edited!"
  }'
```

**Manual version:**
```bash
curl -X PUT http://localhost:4000/api/messages/12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "Updated message content - this has been edited!"
  }'
```

**Expected Response:** `200 OK`
```json
{
  "message": {
    "id": "12345",
    "conversationId": "conv_123...",
    "senderId": "alice-id",
    "content": "Updated message content - this has been edited!",
    "attachments": null,
    "status": "sent",
    "statusTimestamps": {
      "sent": "2025-11-08T..."
    },
    "createdAt": "2025-11-08T10:00:00.000Z",
    "editedAt": "2025-11-08T10:05:00.000Z",
    "sender": {
      "id": "alice-id",
      "name": "Alice",
      "email": "alice@example.com",
      "avatarUrl": null
    }
  }
}
```

### Step 3: Verify the update
```bash
curl -s -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq ".messages[] | select(.id == \"$MESSAGE_ID\")"
```

---

## 5. Delete a Message

**Endpoint:** `DELETE /api/messages/:id`

### Step 1: Send a message to delete
```bash
DELETE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "This message will be deleted"}')

DELETE_MESSAGE_ID=$(echo "$DELETE_RESPONSE" | jq -r '.message.id')
echo "Created message ID to delete: $DELETE_MESSAGE_ID"
```

### Step 2: Delete the message
```bash
curl -X DELETE http://localhost:4000/api/messages/$DELETE_MESSAGE_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Manual version:**
```bash
curl -X DELETE http://localhost:4000/api/messages/12345 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "success": true
}
```

### Step 3: Verify deletion (content should be "[deleted]")
```bash
curl -s -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq ".messages[] | select(.id == \"$DELETE_MESSAGE_ID\")"
```

**Expected to see:**
```json
{
  "id": "12345",
  "content": "[deleted]",
  "editedAt": "2025-11-08T10:10:00.000Z",
  ...
}
```

---

## Complete Test Script

Save this as `test-messages.sh`:

```bash
#!/bin/bash

echo "=== Setting up test users and conversation ==="
echo ""

# Login as Alice
echo "Logging in as Alice..."
ALICE_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ALICE_ID=$(echo $ALICE_RESPONSE | jq -r '.user.id')
echo "Alice ID: $ALICE_ID"
echo ""

# Login as Bob
echo "Logging in as Bob..."
BOB_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_TOKEN=$(echo $BOB_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
BOB_ID=$(echo $BOB_RESPONSE | jq -r '.user.id')
echo "Bob ID: $BOB_ID"
echo ""

# Create a conversation
echo "Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONVERSATION_ID=$(echo $CONV_RESPONSE | jq -r '.conversation.id')
echo "Conversation ID: $CONVERSATION_ID"
echo ""

echo "=== Test 1: Send messages ==="
for i in {1..5}; do
  curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "{\"content\": \"Test message $i\"}" | jq '.message.id, .message.content'
  sleep 0.3
done
echo ""

echo "=== Test 2: Get messages (first page) ==="
RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?limit=3" \
  -H "Authorization: Bearer $ALICE_TOKEN")
echo "$RESPONSE" | jq '{messageCount: (.messages | length), hasMore, nextCursor}'
echo ""

echo "=== Test 3: Get messages (second page with cursor) ==="
CURSOR=$(echo "$RESPONSE" | jq -r '.nextCursor')
if [ "$CURSOR" != "null" ]; then
  curl -s -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?cursor=$CURSOR&limit=3" \
    -H "Authorization: Bearer $ALICE_TOKEN" | jq '{messageCount: (.messages | length), hasMore, nextCursor}'
else
  echo "No more messages to paginate"
fi
echo ""

echo "=== Test 4: Create and update a message ==="
MSG=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Original content"}')
MSG_ID=$(echo "$MSG" | jq -r '.message.id')
echo "Created message: $MSG_ID"
echo ""

sleep 1

echo "Updating message..."
curl -s -X PUT http://localhost:4000/api/messages/$MSG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Updated content"}' | jq '.message | {id, content, editedAt}'
echo ""

echo "=== Test 5: Create and delete a message ==="
DEL_MSG=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "To be deleted"}')
DEL_MSG_ID=$(echo "$DEL_MSG" | jq -r '.message.id')
echo "Created message: $DEL_MSG_ID"
echo ""

sleep 1

echo "Deleting message..."
curl -s -X DELETE http://localhost:4000/api/messages/$DEL_MSG_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'
echo ""

echo "Verifying deletion (content should be '[deleted]')..."
curl -s -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq ".messages[] | select(.id == \"$DEL_MSG_ID\") | {id, content, editedAt}"
echo ""

echo "=== Test 6: Bob sends a reply ==="
curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"content": "Hi Alice! This is Bob replying."}' | jq '.message | {id, content, sender: .sender.name}'
echo ""

echo "=== All tests completed! ==="
```

**To run the script:**
```bash
chmod +x test-messages.sh
./test-messages.sh
```

---

## Windows PowerShell Test Script

Save this as `test-messages.ps1`:

```powershell
Write-Host "=== Setting up test users and conversation ===" -ForegroundColor Cyan
Write-Host ""

# Login as Alice
Write-Host "Logging in as Alice..." -ForegroundColor Yellow
$aliceLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "alice@example.com", "password": "password123"}'
$aliceToken = $aliceLogin.token
$aliceId = $aliceLogin.user.id
Write-Host "Alice ID: $aliceId" -ForegroundColor Green
Write-Host ""

# Login as Bob
Write-Host "Logging in as Bob..." -ForegroundColor Yellow
$bobLogin = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "bob@example.com", "password": "password123"}'
$bobToken = $bobLogin.token
$bobId = $bobLogin.user.id
Write-Host "Bob ID: $bobId" -ForegroundColor Green
Write-Host ""

# Create a conversation
Write-Host "Creating conversation..." -ForegroundColor Yellow
$conv = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body "{`"participantIds`": [`"$bobId`"], `"isGroup`": false}"
$conversationId = $conv.conversation.id
Write-Host "Conversation ID: $conversationId" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 1: Send messages ===" -ForegroundColor Cyan
1..5 | ForEach-Object {
  $msg = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $aliceToken"} `
    -Body "{`"content`": `"Test message $_`"}"
  Write-Host "Sent: $($msg.message.id) - $($msg.message.content)" -ForegroundColor Green
  Start-Sleep -Milliseconds 300
}
Write-Host ""

Write-Host "=== Test 2: Get messages (first page) ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages?limit=3" `
  -Method GET `
  -Headers @{Authorization = "Bearer $aliceToken"}
Write-Host "Message count: $($response.messages.Count)" -ForegroundColor Green
Write-Host "Has more: $($response.hasMore)" -ForegroundColor Green
Write-Host "Next cursor: $($response.nextCursor)" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 3: Get messages (second page with cursor) ===" -ForegroundColor Cyan
if ($response.nextCursor) {
  $page2 = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages?cursor=$($response.nextCursor)&limit=3" `
    -Method GET `
    -Headers @{Authorization = "Bearer $aliceToken"}
  Write-Host "Message count: $($page2.messages.Count)" -ForegroundColor Green
  Write-Host "Has more: $($page2.hasMore)" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== Test 4: Create and update a message ===" -ForegroundColor Cyan
$msg = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body '{"content": "Original content"}'
$msgId = $msg.message.id
Write-Host "Created message: $msgId" -ForegroundColor Green

Start-Sleep -Seconds 1

$updated = Invoke-RestMethod -Uri "http://localhost:4000/api/messages/$msgId" `
  -Method PUT `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body '{"content": "Updated content"}'
Write-Host "Updated: $($updated.message.content)" -ForegroundColor Green
Write-Host "Edited at: $($updated.message.editedAt)" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== Test 5: Create and delete a message ===" -ForegroundColor Cyan
$delMsg = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $aliceToken"} `
  -Body '{"content": "To be deleted"}'
$delMsgId = $delMsg.message.id
Write-Host "Created message: $delMsgId" -ForegroundColor Green

Start-Sleep -Seconds 1

$deleteResult = Invoke-RestMethod -Uri "http://localhost:4000/api/messages/$delMsgId" `
  -Method DELETE `
  -Headers @{Authorization = "Bearer $aliceToken"}
Write-Host "Delete success: $($deleteResult.success)" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test 6: Bob sends a reply ===" -ForegroundColor Cyan
$bobMsg = Invoke-RestMethod -Uri "http://localhost:4000/api/conversations/$conversationId/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $bobToken"} `
  -Body '{"content": "Hi Alice! This is Bob replying."}'
Write-Host "Bob's message: $($bobMsg.message.content)" -ForegroundColor Green
Write-Host "Sender: $($bobMsg.message.sender.name)" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== All tests completed! ===" -ForegroundColor Green
```

**To run the PowerShell script:**
```powershell
.\test-messages.ps1
```

---

## Error Scenarios

### 1. Send Message Without Authentication (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello"}'
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": "No token provided"
}
```

---

### 2. Send Empty Message (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": ""}'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "content is required and cannot be empty"
}
```

---

### 3. Send Message to Non-existent Conversation (Should Fail)

```bash
curl -X POST http://localhost:4000/api/conversations/00000000-0000-0000-0000-000000000000/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Hello"}'
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "User is not a participant in this conversation"
}
```

---

### 4. Update Someone Else's Message (Should Fail)

```bash
# Alice creates a message
MSG_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Alice message"}')
MSG_ID=$(echo "$MSG_RESPONSE" | jq -r '.message.id')

# Bob tries to update Alice's message
curl -X PUT http://localhost:4000/api/messages/$MSG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"content": "Bob trying to edit"}'
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "User is not authorized to update this message"
}
```

---

### 5. Delete Someone Else's Message (Should Fail)

```bash
# Alice creates a message
MSG_RESPONSE=$(curl -s -X POST http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Alice message"}')
MSG_ID=$(echo "$MSG_RESPONSE" | jq -r '.message.id')

# Bob tries to delete Alice's message
curl -X DELETE http://localhost:4000/api/messages/$MSG_ID \
  -H "Authorization: Bearer $BOB_TOKEN"
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "User is not authorized to delete this message"
}
```

---

### 6. Get Messages from Conversation User is Not In (Should Fail)

```bash
# Login as Carol (not in the Alice-Bob conversation)
CAROL_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "carol@example.com", "password": "password123"}')
CAROL_TOKEN=$(echo $CAROL_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Carol tries to access Alice-Bob conversation
curl -X GET http://localhost:4000/api/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $CAROL_TOKEN"
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "User is not a participant in this conversation"
}
```

---

### 7. Invalid Pagination Limit (Should Fail)

```bash
curl -X GET "http://localhost:4000/api/conversations/$CONVERSATION_ID/messages?limit=0" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "limit must be a positive number"
}
```

---

## Troubleshooting

### Common Issues

1. **"User is not a participant" errors**
   - Ensure you're using a token for a user who's actually in the conversation
   - Verify conversation ID is correct
   - Check that the conversation exists

2. **Message IDs not working**
   - Message IDs are BigInt (numbers), not UUIDs
   - Don't add quotes around message IDs in URLs
   - Example: `/api/messages/12345` not `/api/messages/"12345"`

3. **Pagination cursor errors**
   - Cursor should be a message ID (string representation of BigInt)
   - Ensure you're extracting it correctly from the `nextCursor` field
   - If `nextCursor` is `null`, there are no more messages

4. **editedAt is null**
   - Only updated/deleted messages have `editedAt` timestamp
   - Original messages will have `editedAt: null`

5. **Deleted messages still appear**
   - This is expected behavior (soft delete)
   - Content changes to `"[deleted]"`
   - Message record remains for conversation history

6. **jq not found (bash script)**
   - Install jq: `sudo apt-get install jq` (Ubuntu) or `brew install jq` (macOS)
   - Or remove `| jq .` from commands to see raw JSON

---

## Notes

- Messages are ordered by `createdAt DESC` (newest first)
- Cursor-based pagination uses message IDs
- Soft delete keeps message records but changes content to `"[deleted]"`
- `editedAt` timestamp indicates when a message was last modified
- Message IDs are BigInt (auto-increment), not UUIDs
- Both sender and recipient can see all messages in a conversation
- Only the message sender can update or delete their own messages
- Attachments are stored as JSON arrays

---

## Integration Test Examples

### Test Full Conversation Flow

```bash
#!/bin/bash

echo "=== Full Conversation Flow Test ==="
echo ""

# 1. Two users login
echo "Step 1: Users login..."
ALICE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE | jq -r '.token')
ALICE_ID=$(echo $ALICE | jq -r '.user.id')

BOB=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_TOKEN=$(echo $BOB | jq -r '.token')
BOB_ID=$(echo $BOB | jq -r '.user.id')
echo "✓ Alice and Bob logged in"
echo ""

# 2. Create conversation
echo "Step 2: Alice creates conversation with Bob..."
CONV=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONV_ID=$(echo $CONV | jq -r '.conversation.id')
echo "✓ Conversation created: $CONV_ID"
echo ""

# 3. Alice sends first message
echo "Step 3: Alice sends first message..."
MSG1=$(curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Hi Bob! How are you?"}')
MSG1_ID=$(echo $MSG1 | jq -r '.message.id')
echo "✓ Message sent: $MSG1_ID"
echo ""

# 4. Bob reads messages
echo "Step 4: Bob reads messages..."
MESSAGES=$(curl -s -X GET http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $BOB_TOKEN")
echo "✓ Bob sees $(echo $MESSAGES | jq '.messages | length') message(s)"
echo ""

# 5. Bob replies
echo "Step 5: Bob replies..."
MSG2=$(curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"content": "Hi Alice! I am doing great, thanks!"}')
MSG2_ID=$(echo $MSG2 | jq -r '.message.id')
echo "✓ Bob replied: $MSG2_ID"
echo ""

# 6. Alice edits her message
echo "Step 6: Alice edits her first message..."
EDIT=$(curl -s -X PUT http://localhost:4000/api/messages/$MSG1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Hi Bob! How are you doing today?"}')
echo "✓ Message edited, editedAt: $(echo $EDIT | jq -r '.message.editedAt')"
echo ""

# 7. Both users see updated conversation
echo "Step 7: Both users read the conversation..."
ALICE_VIEW=$(curl -s -X GET http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN")
echo "✓ Alice sees $(echo $ALICE_VIEW | jq '.messages | length') message(s)"

BOB_VIEW=$(curl -s -X GET http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $BOB_TOKEN")
echo "✓ Bob sees $(echo $BOB_VIEW | jq '.messages | length') message(s)"
echo ""

# 8. Display final conversation
echo "Step 8: Final conversation view..."
echo "$ALICE_VIEW" | jq '.messages[] | {sender: .sender.name, content, edited: (.editedAt != null)}'
echo ""

echo "=== Test Complete! ==="
```

---

### Test Message Attachments

```bash
#!/bin/bash

echo "=== Testing Message Attachments ==="
echo ""

# Setup
ALICE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE | jq -r '.token')
ALICE_ID=$(echo $ALICE | jq -r '.user.id')

BOB=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_ID=$(echo $BOB | jq -r '.user.id')

CONV=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONV_ID=$(echo $CONV | jq -r '.conversation.id')

# Test 1: Single image attachment
echo "Test 1: Single image attachment..."
curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Check out this photo!",
    "attachments": [
      {
        "type": "image",
        "url": "https://example.com/photo.jpg",
        "name": "vacation.jpg",
        "size": 204800
      }
    ]
  }' | jq '.message | {content, attachments}'
echo ""

# Test 2: Multiple attachments
echo "Test 2: Multiple attachments..."
curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Here are the documents we discussed",
    "attachments": [
      {
        "type": "document",
        "url": "https://example.com/report.pdf",
        "name": "Q4_Report.pdf",
        "size": 1048576
      },
      {
        "type": "document",
        "url": "https://example.com/data.xlsx",
        "name": "data.xlsx",
        "size": 524288
      }
    ]
  }' | jq '.message | {content, attachmentCount: (.attachments | length)}'
echo ""

# Test 3: Video attachment
echo "Test 3: Video attachment..."
curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "content": "Check out this video",
    "attachments": [
      {
        "type": "video",
        "url": "https://example.com/video.mp4",
        "name": "demo.mp4",
        "size": 10485760,
        "duration": 120,
        "thumbnail": "https://example.com/thumb.jpg"
      }
    ]
  }' | jq '.message | {content, attachments}'
echo ""

echo "=== Attachment Tests Complete! ==="
```

---

### Test Pagination with Many Messages

```bash
#!/bin/bash

echo "=== Testing Pagination with Many Messages ==="
echo ""

# Setup
ALICE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE | jq -r '.token')
ALICE_ID=$(echo $ALICE | jq -r '.user.id')

BOB=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_ID=$(echo $BOB | jq -r '.user.id')

CONV=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONV_ID=$(echo $CONV | jq -r '.conversation.id')

# Send 25 messages
echo "Sending 25 messages..."
for i in {1..25}; do
  curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "{\"content\": \"Message number $i\"}" > /dev/null
  echo -n "."
done
echo ""
echo "✓ 25 messages sent"
echo ""

# Paginate through all messages
echo "Paginating through messages (10 per page)..."
CURSOR=""
PAGE=1
TOTAL_FETCHED=0

while true; do
  if [ -z "$CURSOR" ]; then
    RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONV_ID/messages?limit=10" \
      -H "Authorization: Bearer $ALICE_TOKEN")
  else
    RESPONSE=$(curl -s -X GET "http://localhost:4000/api/conversations/$CONV_ID/messages?cursor=$CURSOR&limit=10" \
      -H "Authorization: Bearer $ALICE_TOKEN")
  fi
  
  COUNT=$(echo $RESPONSE | jq '.messages | length')
  HAS_MORE=$(echo $RESPONSE | jq -r '.hasMore')
  CURSOR=$(echo $RESPONSE | jq -r '.nextCursor')
  TOTAL_FETCHED=$((TOTAL_FETCHED + COUNT))
  
  echo "Page $PAGE: Fetched $COUNT messages (Total: $TOTAL_FETCHED, Has more: $HAS_MORE)"
  
  if [ "$HAS_MORE" != "true" ]; then
    break
  fi
  
  PAGE=$((PAGE + 1))
done

echo ""
echo "✓ Fetched all $TOTAL_FETCHED messages in $PAGE page(s)"
echo ""

echo "=== Pagination Test Complete! ==="
```

---

### Test Edit and Delete Scenarios

```bash
#!/bin/bash

echo "=== Testing Edit and Delete Scenarios ==="
echo ""

# Setup
ALICE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE | jq -r '.token')
ALICE_ID=$(echo $ALICE | jq -r '.user.id')

BOB=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_TOKEN=$(echo $BOB | jq -r '.token')
BOB_ID=$(echo $BOB | jq -r '.user.id')

CONV=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONV_ID=$(echo $CONV | jq -r '.conversation.id')

# Scenario 1: Edit message multiple times
echo "Scenario 1: Edit message multiple times..."
MSG=$(curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Original message"}')
MSG_ID=$(echo $MSG | jq -r '.message.id')
echo "Created: $(echo $MSG | jq -r '.message.content')"

sleep 1
curl -s -X PUT http://localhost:4000/api/messages/$MSG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "First edit"}' | jq '.message | {content, editedAt}'

sleep 1
curl -s -X PUT http://localhost:4000/api/messages/$MSG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Second edit"}' | jq '.message | {content, editedAt}'
echo ""

# Scenario 2: Delete after editing
echo "Scenario 2: Delete after editing..."
MSG2=$(curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Will be edited then deleted"}')
MSG2_ID=$(echo $MSG2 | jq -r '.message.id')

curl -s -X PUT http://localhost:4000/api/messages/$MSG2_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"content": "Edited version"}' > /dev/null

curl -s -X DELETE http://localhost:4000/api/messages/$MSG2_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'
echo ""

# Scenario 3: Verify deleted message content
echo "Scenario 3: Verify deleted message..."
curl -s -X GET http://localhost:4000/api/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq ".messages[] | select(.id == \"$MSG2_ID\") | {id, content, editedAt}"
echo ""

echo "=== Edit/Delete Test Complete! ==="
```

---

## Performance Testing

### Measure Message Send Latency

```bash
#!/bin/bash

echo "=== Message Send Performance Test ==="
echo ""

# Setup
ALICE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')
ALICE_TOKEN=$(echo $ALICE | jq -r '.token')
ALICE_ID=$(echo $ALICE | jq -r '.user.id')

BOB=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}')
BOB_ID=$(echo $BOB | jq -r '.user.id')

CONV=$(curl -s -X POST http://localhost:4000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d "{\"participantIds\": [\"$BOB_ID\"], \"isGroup\": false}")
CONV_ID=$(echo $CONV | jq -r '.conversation.id')

# Send 10 messages and measure time
echo "Sending 10 messages and measuring latency..."
TOTAL_TIME=0

for i in {1..10}; do
  START=$(date +%s%N)
  
  curl -s -X POST http://localhost:4000/api/conversations/$CONV_ID/messages \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "{\"content\": \"Performance test message $i\"}" > /dev/null
  
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  TOTAL_TIME=$((TOTAL_TIME + DURATION))
  
  echo "Message $i: ${DURATION}ms"
done

AVERAGE=$((TOTAL_TIME / 10))
echo ""
echo "Average latency: ${AVERAGE}ms"
echo "Total time: ${TOTAL_TIME}ms"
echo ""

echo "=== Performance Test Complete! ==="
```

---

## Quick Reference

### Message Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/conversations/:id/messages` | Send a message | ✓ |
| GET | `/api/conversations/:id/messages` | Get messages with pagination | ✓ |
| PUT | `/api/messages/:id` | Update a message | ✓ (owner only) |
| DELETE | `/api/messages/:id` | Delete a message | ✓ (owner only) |

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `cursor` | string | Message ID for pagination | none |
| `limit` | number | Number of messages to return | 50 |

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (not participant/owner) |
| 404 | Not Found |
| 500 | Server Error |

---

## Additional Resources

- **Authentication**: See [Authentication Endpoints](#authentication-endpoints) section
- **Conversations**: See [Conversation Endpoints](#conversation-endpoints) section
- **WebSocket**: For real-time messaging, check WebSocket documentation (if available)
- **API Reference**: Full API documentation at `/docs/api`

---