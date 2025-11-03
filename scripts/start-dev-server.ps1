# PowerShell helper to start the Rap-Bots server in development with sane defaults.
# WARNING: This script sets reasonable development defaults for environment variables.
# Do NOT use this script in production.

param(
  [int]$Port = 5000
)

Write-Host "Starting Rap-Bots dev server (PowerShell) on port $Port..."

# Set sane defaults if not already provided in environment
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/rapbots_dev' }
if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = 'dev-session-secret' }
if (-not $env:REPLIT_DOMAINS) { $env:REPLIT_DOMAINS = 'localhost' }
if (-not $env:REPL_ID) { $env:REPL_ID = 'dev' }
if (-not $env:GROQ_API_KEY) { $env:GROQ_API_KEY = '' }
if (-not $env:OPENAI_API_KEY) { $env:OPENAI_API_KEY = '' }
if (-not $env:STRIPE_SECRET_KEY) { $env:STRIPE_SECRET_KEY = '' }
if (-not $env:PORT) { $env:PORT = $Port }

Write-Host "Environment summary:" -ForegroundColor Cyan
Write-Host "  NODE_ENV=development"
Write-Host "  PORT=$($env:PORT)"
Write-Host "  DATABASE_URL=$($env:DATABASE_URL)"
Write-Host "  REPLIT_DOMAINS=$($env:REPLIT_DOMAINS)"
Write-Host "(Sensitive keys are shown as present/empty only.)"

# Run the server using npx tsx so we don't rely on a global tsx binary
try {
  $env:NODE_ENV = 'development'
  Write-Host "Launching server... (Ctrl-C to stop)" -ForegroundColor Green
  npx tsx server/index.ts
} catch {
  Write-Host "Failed to start server:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}
