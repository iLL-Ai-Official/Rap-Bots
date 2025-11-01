# Voice-Enabled Rap Battle Game

## Overview
This project is a real-time, voice-enabled rap battle application featuring immersive battles against AI opponents. It leverages advanced AI for speech recognition, rap generation, and text-to-speech to deliver an authentic and dynamic battle rap experience. Key features include a sophisticated scoring system, character selection with distinct voices, and monetization capabilities. The application aims to be a unique and engaging entertainment platform in the voice AI gaming market, providing a technically advanced rap battle simulation. The business vision includes significant market potential in the intersection of AI, gaming, and social entertainment.

## User Preferences
- Focus on functional implementation over extensive documentation
- Prioritize working features and error-free operation
- Use TypeScript for better type safety
- Implement responsive design for mobile and desktop
- Use authentic data from real API calls, no mock/placeholder data
- Include user's Replit referral link for new users signing up to Replit

## System Architecture
The application features a frontend built with React and Vite, styled with Tailwind CSS, and enhanced with Framer Motion for animations. The backend is an Express.js server in TypeScript, utilizing a PostgreSQL database.

**UI/UX Decisions:**
- Modern Single-Page Application (SPA) design.
- Responsive design for optimal viewing on various devices.
- AI-generated character avatars with advanced lip-sync using ARTalk.

**Technical Implementations & Feature Specifications:**
- **Real-time Voice Recording:** Instant transcription of user input.
- **AI-Powered Rap Generation:** Utilizes Groq's Llama model with advanced prompting for complex lyrical techniques, multi-syllabic rhymes, and battle tactics. Includes adjustable difficulty and complexity levels.
- **Profanity Filtering:** Ensures appropriate content.
- **Battle Scoring System:** Evaluates rhyme density (end, internal, multi-syllabic), flow quality (syllable count, rhythm), and creativity (wordplay, metaphors, originality).
- **Monetization Model:**
    - Subscription tiers (Free, Premium, Pro) managed via Stripe.
    - Credit-based system for battles, daily bonuses, and clone battles.
    - In-app purchases for credits via Stripe.
    - AI clone generation and battles: Users can generate AI clones based on their battle history, and others can battle these clones (spectator mode).
    - Tournament system with USDC entry fees and automated prize distribution on Arc L1 blockchain.
- **User API Management:** Secure storage and preference-based selection of personal API keys for OpenAI, Groq, and ElevenLabs, with automatic fallback to system keys.
- **Security:** Robust input validation, enhanced error handling, content moderation (Llama Guard 4), encrypted API key storage, and secure audio file handling.
- **PvP System:** Full player-vs-player battles with asynchronous turn-based gameplay, including invites, matchmaking, and round submissions.
- **Coin Flip Feature:** Determines turn order in battles with an animated 3D coin flip.
- **AI Face-Swap Profile Pictures:** Hugging Face integration for personalized rapper avatars.

**System Design Choices:**
- Clear separation between frontend and backend services.
- Data management handled by TanStack Query.
- Routing managed by Wouter.
- Arc blockchain integration for USDC payments, battle rewards, and tournament prize distribution, including voice-to-blockchain commands.
- ElevenLabs Sound Effects API for AI-generated crowd reactions and battle sounds.

## External Dependencies
- **Groq API**: Speech-to-text (Whisper), AI rap generation (Llama), PlayAI TTS models.
- **OpenAI API**: gpt-4o-mini-tts (2025) for authentic rapper voices.
- **ElevenLabs API**: Premium TTS with advanced features (speed control, breath patterns, Turbo models, pronunciation dictionaries), and Sound Effects API for AI-generated battle sounds.
- **Typecast.ai**: Fallback text-to-speech generation.
- **ARTalk**: Speech-driven 3D head animation and lip-sync.
- **Stripe**: Secure payment processing, subscription management, and credit purchases.
- **Replit Auth**: User authentication and management.
- **PostgreSQL**: Database for user, session, battle data, encrypted API keys, and monetization.
- **FFmpeg**: Audio and video processing.
- **Arc Blockchain (Circle's Arc L1)**: For USDC payments, battle rewards, and tournament prize distribution.
- **Hugging Face**: AI face-swap technology (felixrosberg/face-swap model) for profile pictures.