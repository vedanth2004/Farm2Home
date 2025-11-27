# Farm2Home Chatbot API - PowerShell Test Script
# Usage: .\test_chatbot.ps1

Write-Host "=== Farm2Home Chatbot API Tests ===" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method GET
    Write-Host "Status: $($health.status)" -ForegroundColor Green
    Write-Host "Gemini Configured: $($health.gemini_configured)" -ForegroundColor Green
    Write-Host "API Key Set: $($health.api_key_set)" -ForegroundColor $(if ($health.api_key_set) { "Green" } else { "Red" })
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Chat - Discount Query
Write-Host "`n2. Testing Chat - Discount Query..." -ForegroundColor Yellow
try {
    $body = @{
        message = "Can I get a discount on organic apples?"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8001/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Response: $($response.response)" -ForegroundColor Green
    Write-Host "Intent: $($response.intent)" -ForegroundColor Cyan
    Write-Host "Action: $($response.action_taken)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 3: Chat - Churn Query
Write-Host "`n3. Testing Chat - Churn Query..." -ForegroundColor Yellow
try {
    $body = @{
        message = "What is my churn risk?"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8001/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Response: $($response.response)" -ForegroundColor Green
    Write-Host "Intent: $($response.intent)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 4: Chat - General Query
Write-Host "`n4. Testing Chat - General Query..." -ForegroundColor Yellow
try {
    $body = @{
        message = "What are your delivery times?"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8001/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Response: $($response.response)" -ForegroundColor Green
    Write-Host "Intent: $($response.intent)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== Tests Complete ===" -ForegroundColor Cyan

