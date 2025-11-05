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