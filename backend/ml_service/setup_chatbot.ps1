# Farm2Home Chatbot API - Setup Script for Windows PowerShell
# Usage: .\setup_chatbot.ps1

Write-Host "=== Farm2Home Chatbot API Setup ===" -ForegroundColor Cyan

# Step 1: Install Dependencies
Write-Host "`n1. Installing dependencies..." -ForegroundColor Yellow
try {
    pip install -r requirements_chatbot.txt
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error installing dependencies: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Set API Key
Write-Host "`n2. Setting up API key..." -ForegroundColor Yellow
$apiKey = Read-Host "Enter your GEMINI_API_KEY (leave blank to skip)"
if ($apiKey) {
    $env:GEMINI_API_KEY = $apiKey
    Write-Host "✅ API key set for current session" -ForegroundColor Green
    Write-Host "⚠️  Note: This API key is set for this PowerShell session only." -ForegroundColor Yellow
    Write-Host "   To make it permanent, add to your PowerShell profile or use environment variables." -ForegroundColor Yellow
} else {
    Write-Host "⚠️  GEMINI_API_KEY not set. You can set it later using `$env:GEMINI_API_KEY='your-key'`" -ForegroundColor Yellow
}

# Step 3: Verify Setup
Write-Host "`n3. Verifying setup..." -ForegroundColor Yellow
if ($env:GEMINI_API_KEY) {
    Write-Host "✅ API key is set: $($env:GEMINI_API_KEY.Substring(0, 10))..." -ForegroundColor Green
} else {
    Write-Host "❌ API key not set" -ForegroundColor Red
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "`nTo start the server, run:" -ForegroundColor Yellow
Write-Host "  uvicorn chatbot_api:app --reload --port 8001" -ForegroundColor White
Write-Host "`nTo test the API, run:" -ForegroundColor Yellow
Write-Host "  .\test_chatbot.ps1" -ForegroundColor White

