
# Copilot Instructions for Rap‑Bots (2025)

This guide enables AI coding agents to be productive in the Rap-Bots monorepo. It summarizes architecture, conventions, and critical workflows, with actionable, project-specific guidance.

## 1. Architecture Overview

- **Monorepo**: Contains three main parts:
  - **Frontend**: React (Vite) in `client/` (see `client/src/pages/` for routes, `client/src/components/` for UI)
  - **Backend**: Express + Drizzle ORM in `server/` (API routes in `server/routes.ts`, services in `server/services/`)
  - **Android Wrapper**: WebView app in `android/` (see `android/app/` and `MainActivity.kt`)
- **API**: All endpoints are under `server/routes.ts`. Each feature has a sub-router (e.g., user, battle, clone). API and static assets are served on the same port.
- **Database**: PostgreSQL via Drizzle ORM. Migrations: `npm run db:push`.
- **AI/Voice**: Integrates OpenAI, Groq, and ElevenLabs (see `server/services/elevenlabs-tts.ts`). Voice cloning is a TODO; see `cloneVoice()` placeholder.
- **Battle Video**: `/api/musetalk/battle/:battleId/:roundId` is a stub (video generation not implemented).

## 2. Key Conventions & Patterns

- **Naming**: PascalCase for React components, camelCase for JS/TS utilities, snake_case for DB tables.
- **Env Vars**: Use `.env` in repo root. Required: `DATABASE_URL`, `SESSION_SECRET`. Optional: `OPENAI_API_KEY`, `GROQ_API_KEY`, etc.
- **Error Handling**: All Express routes use a global error handler returning `{ message }` JSON. Use `next(err)` to trigger.
- **Logging**: Use `log` helper in `server/vite.ts` for concise JSON-style logs.
- **Forms/Validation**: Use `react-hook-form` and `zod` in frontend forms.
- **Testing**: `npm test` is a placeholder. Android: `./gradlew connectedAndroidTest`.
- **Type Checking**: Use `npm run check` (must pass before production build).

## 3. Developer Workflows

| Task                    | Command                                                    | Notes                                    |
|-------------------------|------------------------------------------------------------|------------------------------------------|
| Start dev server        | `npm run dev`                                              | Vite + Express, hot reload, port 5000    |
| Build production assets | `npm run build`                                            | Bundles Vite + server with esbuild       |
| Run DB migrations      | `npm run db:push`                                          | Pushes Drizzle schema to DB              |
| Type check             | `npm run check`                                            | Must pass for CI/production              |
| Test Android           | `./gradlew connectedAndroidTest` (in `android/`)           | Requires device/emulator                 |
| Build Android AAB      | `./gradlew bundleRelease -PRAPBOTS_APP_URL=<url>`          | Uses `keystore.properties`               |

## 4. Integration Points & Cross-Component Patterns

- **API/Frontend**: Frontend uses React Query to call `/api/*` endpoints (see `client/src/pages/clone-manager.tsx` for example usage).
- **Voice/AI**: ElevenLabs, OpenAI, Groq keys are read from env. See `server/services/` for integration logic.
- **Android/Web**: Android app loads web UI via `BuildConfig.APP_URL` (set in Gradle).
- **Battle Video**: Video generation is not implemented; endpoints return stub responses.

## 5. Extending the Project

- **Add API Endpoint**: Create a router in `server/routes.ts`, register with `app.use('/api/...', router)`, add service in `server/services/`.
- **Add React Page/Component**: Place in `client/src/pages/` or `client/src/components/`, import and add route in `client/src/App.tsx`.
- **Add Android Screen**: Create Activity/Fragment, register in `AndroidManifest.xml`.

## 6. Known Gaps & TODOs (as of Oct 2025)

- **Settings Page**: Many features are placeholders (Profanity Filter, Difficulty, Audio Quality, etc.).
- **Battle Video**: Not implemented; `/api/musetalk/battle/:battleId/:roundId` returns stub.
- **Voice Cloning**: `cloneVoice()` in `server/services/elevenlabs-tts.ts` is a TODO.
- **Error Reporting**: Error boundaries exist, but no production error reporting service.
- **Testing**: Type checks must pass; Android/web require device testing before release.

## 7. Quick Tips

- Search for `registerRoutes` to see route wiring.
- Check `server/services/elevenlabs-tts.ts` for voice logic.
- Use `npm run db:push` after DB schema changes.
- Remove or hide unfinished features before production.

For unclear or incomplete sections, ask for clarification or more details from the user.
