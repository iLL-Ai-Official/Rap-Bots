# ElevenLabs Sound Effects Integration

## Overview
RapBots now uses **ElevenLabs AI Sound Effects API** to generate realistic crowd reactions and battle sounds. This replaces basic fallback audio with authentic, AI-generated sound effects.

## Features

### 🎵 Available Sound Effects

| Sound Type | Description | Duration | Use Case |
|------------|-------------|----------|----------|
| `boxing-bell` | Sharp metallic ring, round start signal | 2s | Round start/end |
| `crowd-mild` | Polite applause, scattered claps | 2s | Basic approval |
| `crowd-medium` | Energetic concert cheering | 3s | Good performance |
| `crowd-wild` | Thunderous stadium roar | 4s | Amazing bars |
| `crowd-boo` | Disapproval and jeering | 3s | Bad performance |
| `crowd-gasp` | Shocked audience reaction | 1.5s | Surprise moments |
| `air-horn` | Celebratory blast | 2s | Victory |
| `victory-fanfare` | Triumphant trumpet | 3s | Tournament wins |

## How It Works

### 1. **Intelligent Caching**
- Sounds are generated once and cached in memory
- Subsequent requests use cached audio (instant playback)
- Cache persists for the entire server session

### 2. **Automatic Fallback**
- If ElevenLabs API is unavailable, falls back to Web Audio API
- Seamless degradation - battles continue without interruption
- No user-facing errors

### 3. **Smart Sound Mapping**
```typescript
// Old filename requests automatically map to new sound types
'/api/sfx/boxing-bell.mp3' → 'boxing-bell'
'/api/sfx/crowd-reaction.mp3' → 'crowd-medium'
'/api/sfx/air-horn.mp3' → 'air-horn'
```

## API Endpoints

### GET `/api/sfx/:soundType`
Retrieve an AI-generated sound effect.

**Example:**
```bash
curl http://localhost:5000/api/sfx/crowd-wild
# Returns MP3 audio data
```

**Parameters:**
- `soundType` - One of: `boxing-bell`, `crowd-mild`, `crowd-medium`, `crowd-wild`, `crowd-boo`, `crowd-gasp`, `air-horn`, `victory-fanfare`

**Response:**
- Content-Type: `audio/mpeg`
- Cache-Control: `public, max-age=86400` (24 hours)
- Body: MP3 audio buffer

### POST `/api/sfx/initialize` (Protected)
Pre-generate all battle sounds for faster initial playback.

**Example:**
```bash
curl -X POST http://localhost:5000/api/sfx/initialize \
  -H "Cookie: connect.sid=..." 
```

**Response:**
```json
{
  "message": "Battle sounds pre-generated successfully",
  "cached": 9,
  "sounds": ["boxing-bell", "crowd-mild", ...],
  "totalSize": "2.45 MB"
}
```

## Frontend Integration

The `useSFXManager` hook automatically uses these endpoints:

```typescript
const { playRoundStartBell, playCrowdReaction } = useSFXManager();

// Play boxing bell (uses /api/sfx/boxing-bell internally)
playRoundStartBell();

// Play crowd reaction (uses /api/sfx/crowd-wild internally)
playCrowdReaction('wild');
```

## Sound Effect Prompts

The AI generates sounds based on detailed text descriptions with emotional tags:

```typescript
// Crowd wild example
"Thunderous crowd roar at stadium, explosive celebration, 
 wild cheering and screaming [extreme, intense]"

// Boxing bell example  
"Boxing bell ringing, sharp metallic ring signaling round start 
 [loud, clear]"
```

## Configuration

### Environment Variables
```bash
ELEVENLABS_API_KEY=sk_xxx  # Required for AI sound generation
```

### Service Class
```typescript
import { getElevenLabsSFXService } from './services/elevenlabs-sfx';

const sfxService = getElevenLabsSFXService();
await sfxService.getSound('crowd-wild');
```

## Performance

- **First request:** ~2-5 seconds (AI generation)
- **Cached requests:** <10ms (memory cache)
- **Cache size:** ~2-4 MB total (9 sounds)
- **Generation cost:** 25-100 characters per sound

## Error Handling

```typescript
try {
  const audio = await sfxService.getSound('boxing-bell');
  res.send(audio);
} catch (error) {
  // Falls back to Web Audio API
  console.log('Using fallback sound generation');
}
```

## Testing

Test the integration:

```bash
# 1. Test sound generation
curl http://localhost:5000/api/sfx/boxing-bell > test.mp3
mpg123 test.mp3

# 2. Pre-generate all sounds (requires auth)
curl -X POST http://localhost:5000/api/sfx/initialize

# 3. Check cache stats (via service)
sfxService.getCacheStats()
# { count: 9, keys: [...], totalSize: 2450000 }
```

## Pricing

ElevenLabs Sound Effects pricing:
- **Automatic duration:** 100 characters per generation
- **Set duration:** 25 characters per second
- **Free tier:** 10,000 characters/month
- **Example:** 9 sounds × 100 chars = 900 characters (~1% of free tier)

## Benefits vs Fallback Audio

| Feature | ElevenLabs AI | Web Audio Fallback |
|---------|---------------|-------------------|
| Realism | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Variety | ⭐⭐⭐⭐⭐ | ⭐ |
| Customization | ⭐⭐⭐⭐⭐ | ⭐ |
| Latency | ⭐⭐⭐⭐ (cached) | ⭐⭐⭐⭐⭐ |
| Quality | Professional | Basic |

## Future Enhancements

Potential additions:
- 🎤 Custom user-uploaded crowd reactions
- 🎵 Dynamic sound generation based on battle intensity
- 🔊 3D spatial audio positioning
- 📢 Announcer voice intros (using ElevenLabs TTS)
- 🎺 Tournament entrance music

## Troubleshooting

**"Sound effects service not available"**
- Check ELEVENLABS_API_KEY is set
- Verify API key is valid: https://elevenlabs.io/app/settings/api-keys

**Slow first playback**
- Call `/api/sfx/initialize` after login to pre-generate sounds
- Sounds are cached after first generation

**Audio not playing**
- Check browser console for CORS errors
- Ensure user has enabled audio (AudioAutoplayGate)
- Verify Content-Type is `audio/mpeg`

## License

ElevenLabs sound effects are:
- ✅ Royalty-free for commercial use
- ✅ Can be used in games, YouTube, apps
- ❌ Cannot resell the tool itself
- ❌ Free tier requires attribution (paid plans don't)

See: https://elevenlabs.io/terms
