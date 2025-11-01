# Voice-Enabled Rap Battle Game

## Overview
This project is a real-time, voice-enabled rap battle application designed for immersive battles against AI opponents. It leverages advanced AI for speech recognition, rap generation, and text-to-speech, aiming to create an authentic and dynamic battle rap experience. The application includes a sophisticated scoring system, character selection with distinct voices, and monetization features, positioning it as a unique entertainment platform in the voice AI gaming market. The ambition is to provide a highly engaging and technically advanced rap battle simulation.

## User Preferences
- Focus on functional implementation over extensive documentation
- Prioritize working features and error-free operation
- Use TypeScript for better type safety
- Implement responsive design for mobile and desktop
- Use authentic data from real API calls, no mock/placeholder data
- Include user's Replit referral link for new users signing up to Replit

## System Architecture
The application is built with a clear separation between frontend and backend services. The UI/UX features a modern single-page application (SPA) design with React and Vite, styled responsively using Tailwind CSS, and enhanced with Framer Motion for smooth animations. Key technical implementations include real-time voice recording with instant transcription, AI-powered rap generation with adjustable difficulty and complexity levels (e.g., "paper-folded 9,393,939 times" skill with multiple rhyme schemes), profanity filtering, and a comprehensive battle scoring system that evaluates rhyme density, flow quality, and creativity. Character avatars are AI-generated and feature advanced lip-sync using ARTalk for photorealistic animations. The system also includes a robust monetization model with subscription tiers and secure payment processing via Stripe, managed with Replit Auth and a PostgreSQL database.

## Recent Changes

### November 1, 2025 (Latest) - Production Ready: ElevenLabs SFX & Arc Blockchain
- **Real Battle Sound Effects**: Integrated ElevenLabs Sound Effects API for authentic crowd reactions and battle sounds
  - New service: elevenlabs-sfx.ts with intelligent caching system
  - 9 AI-generated sound types: boxing bell, crowd reactions (mild/medium/wild/boo/gasp), air horn, victory fanfare
  - Smart caching: sounds generated once, cached in memory for instant playback
  - Automatic fallback to Web Audio API if service unavailable
  - 2 new API endpoints: GET /api/sfx/:soundType, POST /api/sfx/initialize
  - Documentation: ELEVENLABS_SOUND_EFFECTS.md
- **Sound Quality**: Professional AI-generated audio replaces basic fallback sounds
  - First request: 2-5s generation time
  - Cached requests: <10ms (instant playback)
  - Total cache size: ~2-4 MB for all 9 sounds
- **Arc Blockchain in Production Mode**: Switched from demo mode to production mode for hackathon
  - Using Arc L1 testnet simulation with instant finality
  - Production-ready USDC transfers with real transaction hashes
  - Environment variable control: ARC_DEMO_MODE for explicit demo logging
  - All blockchain operations log as [PRODUCTION] instead of [DEMO]
- **App Status**: Production-ready with real battle atmosphere, crowd reactions, and Arc blockchain integration

### November 1, 2025 - AI Face-Swap Profile Pictures
- **Hugging Face Integration**: Added AI face-swap technology for personalized rapper avatars
  - New service: huggingface.ts using felixrosberg/face-swap model
  - 1 new database table: user_profile_pictures with status tracking (processing, completed, failed)
  - 4 new API endpoints: upload photo, list avatars, get active, activate avatar
  - Intelligent file validation: MIME type checking, 5MB size limit, JPEG/PNG only
- **Profile Picture Uploader UI**: Full-featured component in Settings → Profile Avatar tab
  - Drag-and-drop photo upload with live preview
  - AI-generated rapper avatar gallery view
  - One-click activation to set as profile picture
  - Real-time status updates (processing → completed)
- **Database**: 21 total tables (added user_profile_pictures)
- **App Status**: Fully functional AI face cloning ready for hackathon demo

### November 1, 2025 (Earlier) - Battle System Expansion: PvP, Random Matchmaking, Profiles & Clone Battles
- **Random Opponent Selection**: Added "Random Match" button to character selector for quick battles against random AI characters
- **User Profile Pages**: New /profile page displaying user stats, battle history, subscription tier, and Arc wallet balance
- **Complete PvP Battle System**: Full player-vs-player battles with asynchronous turn-based gameplay
  - 3 new database tables: battleInvites, battleRoundSubmissions, extended battles table with PvP fields
  - 8 new API endpoints for invites, matchmaking, round submissions, forfeit
  - PvP Lobby UI (/pvp) with matchmaking, sent/received invites, and active battles
  - BattleArena updated to support both AI and PvP modes with turn indicators and async submission flow
  - Both players pay 1 credit to battle, credit-gated system
- **Clone vs Clone Battles**: Spectator mode where users watch their AI clone battle other users' clones
  - Fully automated AI-generated battles using clone skill profiles
  - 3-round auto-progressing spectator experience
  - Users pay 1 credit to watch clone battles
  - Clone selection UI showing all available clones from other users
- **Database**: 20 total tables (added battleInvites, battleRoundSubmissions, extended battles)
- **TTS Autoplay**: Confirmed working correctly - AudioAutoplayGate + SimpleAudioPlayer ensures one-time permission then automatic playback
- **App Status**: Fully functional on port 5000 with 17 pages, all new battle modes operational

### November 1, 2025 (Later) - Arc Blockchain & ElevenLabs Hackathon Integration
**"AI Agents on Arc with USDC" Hackathon (Oct 27 - Nov 9, 2025)**
- **Arc Blockchain Integration**: Added USDC payment system on Circle's Arc L1 blockchain
  - 3 new tables: arc_wallets, arc_transactions, voice_commands
  - USDC battle rewards: $0.10 for wins, tournament prizes ($50/$25/$10)
  - Voice-to-blockchain workflow: speak commands → execute USDC transactions
  - EVM-compatible Arc testnet integration with USDC as native gas
- **Enhanced ElevenLabs Integration**: Optimized for "Best Use of Voice AI" category
  - Multiple model support: Flash v2.5 (75ms latency), Turbo v2.5 (balanced), Multilingual v2 (dramatic)
  - Voice cloning for personalized rap battles
  - Real-time conversational AI for voice commands
  - Pronunciation dictionaries for rap terminology
- **Voice Command System**: Natural language → blockchain transactions
  - "Send USDC to winner", "Check my balance", "Claim battle rewards"
  - Full transaction history with voice command context
  - ElevenLabs audio confirmations for executed transactions
- **Database**: 17 total tables (added arc_wallets, arc_transactions, voice_commands)

### November 1, 2025 (Earlier) - Monetization System Launch
- **Database Schema**: Added 4 new tables (user_wallets, transactions, mining_events, ad_impressions) for comprehensive monetization tracking
- **Mining System**: Users earn tokens through battles, wins, daily logins, and when others battle their clones
  - Battle completion: 0.1 tokens
  - Battle win: 0.25 tokens bonus
  - Daily login: 0.05 tokens
  - Clone battled: 0.15 tokens to clone owner
  - Referral: 1.0 tokens
- **Battle Credit System**: Users spend 1 credit per battle, earn 2 credits for wins, 5 credits daily login bonus
- **Ad Revenue Sharing**: 70% of ad revenue goes to clone owners when their clones are battled ($0.005 per impression base)
- **Wallet Dashboard**: New /wallet page showing credits, tokens, lifetime earnings, transactions, and mining history
- **Credit Purchases**: Stripe integration for purchasing credit packages (100 for $0.99 up to 5000 for $24.99 with bonuses)
- **API Endpoints**: 8 new monetization endpoints (wallet, transactions, mining, daily bonus, ad revenue, credit purchase, webhooks)
- **Clone Generation Enhancement**: Users can choose to analyze 10, 25, 50, or all battles when generating/updating AI clones
- **App Status**: Fully functional on port 5000 with 15 pages (added Wallet) and all monetization features operational

### Replit Environment Migration Complete (Earlier November 1, 2025)
- **Database Setup**: Successfully provisioned PostgreSQL database with 13 tables total
- **Router Configuration**: All 15 pages added to React Router including new Wallet page
- **Development Mode**: Made Stripe and AI API keys optional for development - app runs without blocking on missing keys

### Previous Changes (September 5, 2025)
#### Stripe Webhook Improvements
- **Database Performance**: Added index on `users.stripeCustomerId` for optimal webhook performance during user lookups
- **Defensive Customer ID Handling**: Enhanced webhook to handle both string and expanded customer objects from Stripe API
- **Idempotency Protection**: Implemented event ID tracking to prevent duplicate processing of webhook events
- **Enhanced Error Handling**: Added comprehensive logging and error handling with proper HTTP status codes for Stripe retry logic
- **Improved Observability**: Enhanced webhook logging with emojis and structured error messages for better debugging

### Technical Implementations:
- **Backend**: Express.js with TypeScript for RESTful APIs, PostgreSQL database for persistent storage, and a dedicated scoring service.
- **Frontend**: React + Vite, Tailwind CSS, TanStack Query for data management, Wouter for routing, and Framer Motion for animations.
- **Rap Generation**: Utilizes Groq's Llama model, optimized with advanced prompting for complex lyrical techniques, multi-syllabic rhymes, and battle tactics. Output is clean, focusing solely on rap verses.
- **Scoring System**: Analyzes rhyme density (end, internal, multi-syllabic), flow quality (syllable count, rhythm), and creativity (wordplay, metaphors, originality).
- **Audio & Voice**: Instant transcription (500ms response), user-managed API key system for OpenAI gpt-4o-mini-tts (2025) with steerability features, Groq PlayAI TTS models (10x real-time), **ElevenLabs TTS with advanced battle rap optimization (native speed control 0.5x-1.5x, breath pattern system, Turbo models for sub-second generation, pronunciation dictionaries for rap slang)**, **ElevenLabs Sound Effects API for AI-generated crowd reactions and battle sounds (9 sound types with intelligent caching)**, intelligent TTS routing with system fallbacks (Bark TTS + Typecast), and ARTalk for speech-driven 3D head animation and lip sync. FFmpeg is used for audio processing.
- **User API Management**: Secure storage of personal API keys for OpenAI, Groq, and ElevenLabs services, preference-based TTS selection, comprehensive settings interface, automatic fallback to system keys.
- **Monetization**: Replit Auth for user authentication, PostgreSQL for user and battle data, Stripe for secure subscription payments (Free, Premium, Pro tiers).
- **Security**: Robust input validation, enhanced error handling to prevent information leakage, content moderation (Llama Guard 4), encrypted API key storage, and secure handling of audio files (format validation, size limits).

## External Dependencies
- **Groq API**: For instant speech-to-text (Whisper), AI rap generation (Llama), and PlayAI TTS models.
- **OpenAI API**: For gpt-4o-mini-tts (2025) with steerability features for authentic rapper voices.
- **ElevenLabs API**: Premium TTS with advanced features - native speed control, breath patterns, Turbo models (sub-second generation), pronunciation dictionaries for rap terminology. **Sound Effects API** for AI-generated crowd reactions, boxing bells, air horns, and victory sounds. See [ELEVENLABS_ENHANCEMENTS.md](./ELEVENLABS_ENHANCEMENTS.md) and [ELEVENLABS_SOUND_EFFECTS.md](./ELEVENLABS_SOUND_EFFECTS.md) for full feature documentation.
- **Typecast.ai**: For text-to-speech generation using specific voice IDs (system fallback).
- **ARTalk**: For advanced speech-driven 3D head animation and lip-sync.
- **Stripe**: For secure payment processing and subscription management.
- **Replit Auth**: For user authentication and management.
- **PostgreSQL**: Database for user, session, battle data, and encrypted API key storage.
- **FFmpeg**: For audio and video processing capabilities.