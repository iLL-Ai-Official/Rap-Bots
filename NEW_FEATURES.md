# Rap-Bots Enhancement Features

This document outlines the new features added to the Rap-Bots application.

## 🎭 MyShell AI Voice Cloning

### Overview
Integrated MyShell AI's advanced voice cloning technology for more realistic and customizable AI opponent voices.

### Features
- **Voice Cloning**: Clone voices from audio samples for unique character voices
- **Character-Specific Voices**: Each AI character has a optimized voice profile
- **Speed Control**: Adjustable voice speed multiplier (0.5x - 2.0x)
- **High Quality**: MP3 output for optimal quality and file size

### Implementation
- **File**: `server/services/myshell-tts.ts`
- **Integration**: Fully integrated with `user-tts-manager.ts`
- **API Key Support**: User and system-level API keys

### Usage
```typescript
// Example: Generate TTS with voice cloning
const myshellService = createMyShellTTS(apiKey, true);
const result = await myshellService.generateTTS(
  text, 
  characterId, 
  { voiceStyle: 'aggressive', speedMultiplier: 1.2 }
);
```

### API Endpoints
- `PUT /api/user/api-keys` - Update MyShell API key
- `POST /api/user/test-api-key` - Test MyShell API key (service: 'myshell')

### Environment Variables
```bash
MYSHELL_API_KEY=your_myshell_api_key_here
```

---

## 🧠 ML-Powered Analysis (Groq)

### Overview
Enhanced the Groq integration with machine learning capabilities for deep lyric analysis and battle prediction.

### Features

#### 1. ML Lyric Analysis
- Complexity scoring (0-100)
- Style detection (aggressive, smooth, technical, etc.)
- Strength identification
- Weakness detection
- Specific improvement suggestions

#### 2. ML Battle Prediction
- Winner prediction (user/ai/close)
- Confidence scoring
- Key factor analysis

#### 3. ML Rhyme Generation
- Context-aware rhyme suggestions
- Perfect rhyme matching
- Battle-appropriate vocabulary

### Implementation
- **File**: `server/services/groq.ts` (enhanced)
- **Methods**:
  - `analyzeLyricsWithML(lyrics)`
  - `predictBattleOutcome(userLyrics, aiLyrics)`
  - `generateMLRhymes(seedWord, count)`

### API Endpoints
- `POST /api/ml-analyze-lyrics` - Deep ML analysis of lyrics
- `POST /api/ml-predict-battle` - Predict battle outcome
- `POST /api/ml-generate-rhymes` - Generate contextual rhymes

### Usage Example
```javascript
// ML Lyric Analysis
const response = await fetch('/api/ml-analyze-lyrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: "Your rap lyrics here..." })
});

const analysis = await response.json();
// Returns: { complexity, style, strengths[], weaknesses[], suggestions[] }
```

---

## 🎮 Random Match Battles

### Overview
Intelligent matchmaking system that pairs users with AI opponents based on skill level and preferences.

### Features
- **Skill-Based Matching**: Algorithm considers user win rate and average scores
- **6 AI Opponents**: Easy to nightmare difficulty levels
- **Preference Support**: Filter by difficulty or specific characters
- **Fair Matches**: Weighted random selection for balanced gameplay

### AI Opponents
1. **MC Razor** (Easy) - Female rapper, playful and sharp
2. **MC Venom** (Normal) - Male rapper, intense and powerful
3. **MC Silk** (Normal) - Male rapper, smooth and controlled
4. **CYPHER-9000** (Hard) - Robot rapper, deep and robotic
5. **MC Inferno** (Hard) - Male rapper, aggressive style
6. **Phoenix** (Nightmare) - Female rapper, elite level

### Implementation
- **File**: `server/services/matchmaking.ts`
- **Class**: `MatchmakingService`

### API Endpoint
```
POST /api/battles/random-match
Body: {
  difficulty?: 'easy' | 'normal' | 'hard' | 'nightmare',
  preferredCharacters?: ['razor', 'venom', 'silk', ...]
}

Response: {
  battle: { id, ... },
  match: {
    opponentName: "MC Venom",
    opponentId: "venom",
    difficulty: "normal"
  }
}
```

### Usage Example
```javascript
// Request a random match
const response = await fetch('/api/battles/random-match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    difficulty: 'normal',
    preferredCharacters: ['venom', 'silk']
  })
});

const { battle, match } = await response.json();
// Battle is created and ready to start
```

---

## ⚡ Real-Time Analysis System

### Overview
Fast, cached analysis system providing instant feedback on rap lyrics with optional ML insights.

### Features
- **Instant Analysis**: Fast scoring with 1-minute cache
- **Component Breakdown**: Rhyme density, flow quality, creativity
- **Live Feedback**: Context-aware feedback messages
- **Improvement Suggestions**: Specific actionable advice
- **ML Enhancement**: Optional deep ML analysis
- **Batch Processing**: Analyze multiple verses at once
- **Verse Comparison**: Compare two verses and determine winner

### Implementation
- **File**: `server/services/realtime-analysis.ts`
- **Class**: `RealtimeAnalysisService`

### API Endpoints

#### Real-Time Analysis
```
POST /api/realtime-analyze
Body: {
  text: "Your rap lyrics...",
  includeML?: boolean,
  isFinalScore?: boolean,
  battleId?: string
}

Response: {
  score: 85,
  rhymeDensity: 82,
  flowQuality: 88,
  creativity: 85,
  feedback: ["🔥 Exceptional rhyme complexity!", ...],
  improvements: ["Add internal rhymes...", ...],
  mlInsights?: { complexity, style, strengths, ... },
  timestamp: 1234567890
}
```

#### Compare Verses
```
POST /api/compare-verses
Body: {
  verse1: "First verse...",
  verse2: "Second verse...",
  includeML?: boolean
}

Response: {
  verse1Analysis: { score, rhymeDensity, ... },
  verse2Analysis: { score, rhymeDensity, ... },
  winner: 'verse1' | 'verse2' | 'tie',
  margin: 8,
  reasoning: [
    "Winner has superior rhyme complexity",
    "Winner demonstrates better flow control"
  ]
}
```

#### Batch Analysis
```
POST /api/batch-analyze
Body: {
  verses: ["Verse 1...", "Verse 2...", ...]
}

Response: {
  results: [analysis1, analysis2, ...],
  count: 3
}
```

### Usage Example
```javascript
// Real-time analysis with ML
const response = await fetch('/api/realtime-analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    text: lyrics,
    includeML: true,
    isFinalScore: false
  })
});

const analysis = await response.json();
console.log(`Score: ${analysis.score}/100`);
console.log('Feedback:', analysis.feedback);
console.log('Suggestions:', analysis.improvements);

if (analysis.mlInsights) {
  console.log('ML Analysis:', analysis.mlInsights);
}
```

---

## 🔧 Database Schema Updates

### User Schema
Added new field for MyShell API key:
```typescript
myshellApiKey: varchar("myshell_api_key")
preferredTtsService: varchar("preferred_tts_service").default("myshell")
```

### Migration Required
If running on existing database, add the new column:
```sql
ALTER TABLE users ADD COLUMN myshell_api_key VARCHAR;
ALTER TABLE users ALTER COLUMN preferred_tts_service SET DEFAULT 'myshell';
```

---

## 🚀 Getting Started

### Installation
```bash
# Install dependencies (if not already installed)
npm install

# Set environment variables
export MYSHELL_API_KEY=your_key_here
export GROQ_API_KEY=your_key_here

# Run migrations (if needed)
npm run db:push

# Start development server
npm run dev
```

### Testing
```bash
# Test the new features
node test_new_features.js

# Or with the full test suite (when available)
npm test
```

---

## 📊 Performance Improvements

### Voice Cloning
- MyShell AI provides fast TTS generation
- Cached instances for repeated requests
- Fallback to other TTS services if unavailable

### ML Analysis
- Groq's 120B model for deep insights
- Intelligent caching for repeated analysis
- Fallback to basic analysis on errors

### Real-Time Analysis
- 1-minute cache for instant responses
- Batch processing for efficiency
- Optional ML for deeper analysis

---

## 🔐 Security Considerations

### API Key Management
- User API keys are stored securely
- System-level fallback keys
- Test endpoints for key validation

### Input Validation
- All user input is validated
- SQL injection protection
- XSS prevention
- Content moderation support

---

## 📝 API Summary

### New Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/battles/random-match` | POST | Start random match battle |
| `/api/ml-analyze-lyrics` | POST | ML-powered lyric analysis |
| `/api/ml-predict-battle` | POST | ML battle prediction |
| `/api/ml-generate-rhymes` | POST | ML rhyme generation |
| `/api/realtime-analyze` | POST | Fast real-time analysis |
| `/api/compare-verses` | POST | Compare two verses |
| `/api/batch-analyze` | POST | Batch verse analysis |

### Updated Endpoints
| Endpoint | Changes |
|----------|---------|
| `/api/user/api-keys` | Added `myshellApiKey` field |
| `/api/user/test-api-key` | Added 'myshell' service support |
| `/api/analyze-lyrics` | Now uses real-time analysis service |

---

## 🐛 Troubleshooting

### MyShell AI Issues
- Verify API key is valid
- Check API rate limits
- Ensure audio format is supported (MP3)

### ML Analysis Issues
- Groq API key required
- Check request timeouts
- Review error logs for specific issues

### Random Match Issues
- Ensure user has battles remaining
- Check subscription status
- Verify character IDs are valid

---

## 📚 Additional Resources

- [MyShell AI Documentation](https://myshell.ai/docs)
- [Groq API Documentation](https://groq.com/docs)
- [Rap-Bots Main README](./README.md)

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Voice cloning from user recordings
- [ ] Advanced ML training for personalized opponents
- [ ] Real-time ML feedback during battles
- [ ] PvP matchmaking (user vs user)
- [ ] Tournament system with random seeding
- [ ] Voice effect customization
- [ ] ML-powered lyric generation assistance

---

## 👥 Contributing

To contribute to these features:
1. Review the code in `server/services/`
2. Check existing tests in `test_*.js`
3. Follow TypeScript best practices
4. Add tests for new functionality
5. Update this documentation

---

## 📄 License

Same as main Rap-Bots project.
