# Farm2Home Backend Services Startup Script
# This script starts both ML Service and Chatbot API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Farm2Home Backend Services Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  Virtual environment not found. Using system Python." -ForegroundColor Yellow
    Write-Host "   Consider creating one: python -m venv venv" -ForegroundColor Yellow
}

# Check for .env file
if (Test-Path ".env") {
    Write-Host "✅ Found .env file" -ForegroundColor Green
    # Load .env file
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "⚠️  No .env file found. GEMINI_API_KEY must be set manually." -ForegroundColor Yellow
}

# Check if GEMINI_API_KEY is set
if (-not $env:GEMINI_API_KEY) {
    Write-Host ""
    Write-Host "⚠️  GEMINI_API_KEY not set!" -ForegroundColor Red
    Write-Host "   Chatbot API requires GEMINI_API_KEY to run." -ForegroundColor Yellow
    Write-Host "   Set it with: `$env:GEMINI_API_KEY='your-api-key'" -ForegroundColor Yellow
    Write-Host "   Or create .env file with: GEMINI_API_KEY=your-api-key" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start ML Service in new window
Write-Host "🚀 Starting ML Service on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD'; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; Write-Host 'ML Service (Port 8000)' -ForegroundColor Green; Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Yellow; uvicorn app:app --reload --port 8000"
) -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Chatbot API in new window
Write-Host "🚀 Starting Chatbot API on port 8001..." -ForegroundColor Cyan
$chatbotCommand = @"
cd '$PWD'
if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }
if (Test-Path '.env') {
    Get-Content .env | ForEach-Object {
        if (`$_ -match '^([^#][^=]+)=(.*)$') {
            `$name = `$matches[1].Trim()
            `$value = `$matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable(`$name, `$value, "Process")
        }
    }
}
Write-Host 'Chatbot API (Port 8001)' -ForegroundColor Green
Write-Host 'API Docs: http://localhost:8001/docs' -ForegroundColor Yellow
uvicorn chatbot_api:app --reload --port 8001
"@

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $chatbotCommand
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 ML Service:" -ForegroundColor Yellow
Write-Host "   URL: http://localhost:8000" -ForegroundColor White
Write-Host "   Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Health: http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "🤖 Chatbot API:" -ForegroundColor Yellow
Write-Host "   URL: http://localhost:8001" -ForegroundColor White
Write-Host "   Docs: http://localhost:8001/docs" -ForegroundColor White
Write-Host "   Health: http://localhost:8001/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

