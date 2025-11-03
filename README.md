# Rap Bots

Welcome to the Rap Bots project! This is a full-stack AI-powered rap battle platform where users can create, train, and battle with AI-generated rappers. The application features real-time battles, voice synthesis, tournament systems, and advanced ML capabilities.

## Demo Link
[Live Demo](https://rap-bots.replit.app/) (Replit deployment)

## Architecture Overview
The architecture of Rap Bots is designed to be modular and scalable. It consists of the following components:
- **Frontend**: React-based user interface with real-time battle interactions
- **Backend**: Node.js/Express server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: Integration with OpenAI, Groq, ElevenLabs, and custom ML models
- **Authentication**: Replit OIDC with local auth fallback

## Quick Start
To get started with the Rap Bots project, follow these steps:
1. Clone the repository:
   ```bash
   git clone https://github.com/MIHAchoppa/Rap-Bots.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Rap-Bots
   ```
3. Install the necessary dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

## Feature Highlights
- **AI Rap Battles**: Real-time battles against AI opponents with voice synthesis
- **Clone System**: Create and train custom AI rappers using fine-tuning
- **Tournament System**: Competitive leaderboards and tournaments
- **Voice Synthesis**: Multiple TTS providers (ElevenLabs, custom ML models)
- **Character Cards**: AI-generated visual representations of rappers
- **Real-time Scoring**: Live battle scoring with rhyme analysis
- **Mobile Support**: Android app with full feature parity

We hope you enjoy using Rap Bots!

## Running without Replit (local or non-Replit production)

If you don't want to use Replit's OIDC integration you can run the server with a local authentication fallback. The repo will prefer Replit OIDC when `REPLIT_DOMAINS` is present, otherwise it uses a simple `passport-local` JSON login for development.

Quick steps (development):

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server using the provided helper (cross-platform Node helper):
   ```bash
   node ./scripts/start-dev-server.js
   ```

   The helper sets development defaults for the following env vars if they are not present:
   - DATABASE_URL (default: postgres://postgres:postgres@127.0.0.1:5432/rapbots_dev)
   - SESSION_SECRET
   - REPLIT_DOMAINS (not set for local auth)
   - AUTH_PROVIDER (set to `local` to force local auth)

3. Login (JSON POST) when running in local auth mode:
   ```http
   POST /api/login
   Content-Type: application/json

   { "username": "alice", "password": "ignored" }
   ```

   The server will create/upsert a minimal user and set a session cookie. Use the session cookie for subsequent authenticated requests.

Security note
- The local auth fallback is intentionally minimal and intended for development or controlled environments. Do NOT use it as-is in production. Replace it with a secure auth provider (OAuth, SAML, or a proper username/password flow with hashed passwords) before deploying publicly.

If you want me to add production-ready local auth (bcrypt-hashed passwords, user management endpoints), say the word and I will implement it next.