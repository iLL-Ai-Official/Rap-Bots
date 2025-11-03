#!/usr/bin/env bash
# POSIX helper to start the Rap-Bots server in development with sane defaults.
# WARNING: Not for production use.

PORT=${PORT:-5000}
export DATABASE_URL=${DATABASE_URL:-"postgres://postgres:postgres@127.0.0.1:5432/rapbots_dev"}
export SESSION_SECRET=${SESSION_SECRET:-"dev-session-secret"}
export REPLIT_DOMAINS=${REPLIT_DOMAINS:-"localhost"}
export REPL_ID=${REPL_ID:-"dev"}
export GROQ_API_KEY=${GROQ_API_KEY:-""}
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-""}
export NODE_ENV=development

echo "Starting Rap-Bots dev server on port $PORT"
echo "  DATABASE_URL=$DATABASE_URL"

echo "Launching server... (Ctrl-C to stop)"
# Use npx tsx to avoid requiring a global tsx
npx tsx server/index.ts
