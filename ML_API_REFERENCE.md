# Machine Learning API Reference

Quick reference for using the ML rapper cloning features via REST API.

## Authentication

All ML endpoints require authentication. Include session cookie from login.

## Endpoints

### 1. Style Transfer - Generate Lyrics in Rapper's Style

Generate lyrics matching a specific rapper's style and characteristics.

**Endpoint**: `POST /api/ml/style-transfer`

**Request Body**:
```json
{
  "rapperName": "Kendrick Lamar",
  "style": "technical",
  "bars": 16,
  "theme": "overcoming adversity",
  "opponentName": "Competitor",
  "prompt": "Write a battle verse"
}
```

**Parameters**:
- `rapperName` (required): Name of rapper to emulate
- `style` (required): One of: `technical`, `smooth`, `creative`, `aggressive`, `storyteller`
- `bars` (optional): Number of bars (1-32, default: 16)
- `theme` (optional): Theme or topic for the verse
- `opponentName` (optional): Name of opponent for battle context
- `prompt` (optional): Custom prompt override

**Response**:
```json
{
  "lyrics": "Multi-line rap verse...",
  "rapperName": "Kendrick Lamar",
  "style": "technical",
  "bars": 16,
  "profile": {
    "name": "Kendrick Lamar",
    "style": "technical",
    "characteristics": {
      "avgSyllablesPerBar": 14,
      "rhymeComplexity": 0.9,
      "flowVariation": 0.8,
      "wordplayFrequency": 0.8,
      "metaphorDensity": 0.9,
      "battleTactics": ["complex schemes", "wordplay", "multi-syllables"]
    }
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/ml/style-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "rapperName": "Eminem",
    "style": "technical",
    "bars": 16,
    "theme": "proving haters wrong"
  }'
```

---

### 2. Beat Alignment - Flow Modeling

Align lyrics to a beat with precise timing for each syllable.

**Endpoint**: `POST /api/ml/beat-alignment`

**Request Body**:
```json
{
  "lyrics": "Your rap verse\nLine by line\nWith proper breaks",
  "bpm": 90,
  "timeSignature": "4/4",
  "genre": "boom-bap"
}
```

**Parameters**:
- `lyrics` (required): Multi-line lyrics to align
- `bpm` (required): Beats per minute (60-200)
- `timeSignature` (optional): Time signature (default: "4/4")
- `genre` (optional): Genre (default: "hip-hop")

**Response**:
```json
{
  "flowModeling": {
    "syllableStress": [0.8, 0.5, 0.6, ...],
    "pausePoints": [12, 25, 38],
    "emphasisWords": ["rhyme", "word", "emphasis"],
    "timing": [
      {
        "syllable": "Your",
        "startTime": 0,
        "duration": 222
      },
      ...
    ]
  },
  "beatContext": {
    "bpm": 90,
    "timeSignature": "4/4",
    "genre": "boom-bap"
  },
  "totalDuration": 21333
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/ml/beat-alignment \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "Check the rhyme and flow\nWatch how I steal the show",
    "bpm": 95
  }'
```

---

### 3. Create Rapper Profile from Battle History

Analyze user's battles to create personalized rapper profile.

**Endpoint**: `POST /api/ml/create-profile`

**Request Body**: None (uses authenticated user)

**Response**:
```json
{
  "profile": {
    "name": "User_a1b2c3d4",
    "style": "technical",
    "characteristics": {
      "avgSyllablesPerBar": 13,
      "rhymeComplexity": 0.75,
      "flowVariation": 0.6,
      "wordplayFrequency": 0.7,
      "metaphorDensity": 0.5,
      "battleTactics": []
    }
  },
  "battlesAnalyzed": 8,
  "message": "Profile created from 8 battles"
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/ml/create-profile \
  -H "Cookie: session=your_session_cookie"
```

---

## Style Descriptions

### Technical
- **Characteristics**: Complex multi-syllable rhymes, intricate wordplay, precise flow
- **Examples**: Eminem, Tech N9ne, Black Thought
- **Syllables per bar**: ~14
- **Complexity**: Very High

### Smooth
- **Characteristics**: Effortless delivery, melodic cadence, smooth transitions
- **Examples**: Drake, J. Cole, Big Sean
- **Syllables per bar**: ~10
- **Complexity**: Moderate

### Creative
- **Characteristics**: Innovative metaphors, unique perspectives, experimental
- **Examples**: MF DOOM, Earl Sweatshirt, JPEGMAFIA
- **Syllables per bar**: ~12
- **Complexity**: High

### Aggressive
- **Characteristics**: Hard-hitting punchlines, confrontational, powerful delivery
- **Examples**: DMX, 50 Cent, Jadakiss
- **Syllables per bar**: ~12
- **Complexity**: Moderate-High

### Storyteller
- **Characteristics**: Vivid imagery, narrative structure, detailed scenes
- **Examples**: Nas, Slick Rick, Biggie
- **Syllables per bar**: ~12
- **Complexity**: Moderate

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid style. Must be: technical, smooth, creative, aggressive, or storyteller"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to generate styled lyrics"
}
```

---

## Rate Limits

- **Free Tier**: 10 ML requests per day
- **Premium**: 100 ML requests per day
- **Pro**: Unlimited ML requests

---

## Integration Example

### Complete Workflow: Generate and Align

```typescript
// 1. Generate styled lyrics
const styleResponse = await fetch('/api/ml/style-transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rapperName: 'Kendrick Lamar',
    style: 'technical',
    bars: 16,
    theme: 'perseverance'
  })
});

const { lyrics } = await styleResponse.json();

// 2. Align to beat
const alignResponse = await fetch('/api/ml/beat-alignment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lyrics,
    bpm: 90,
    genre: 'boom-bap'
  })
});

const { flowModeling } = await alignResponse.json();

// 3. Use timing data for audio synthesis
// flowModeling.timing contains precise syllable timestamps
```

---

## Best Practices

1. **Start Simple**: Use default parameters first, then customize
2. **Match BPM**: Align BPM with your instrumental track
3. **Theme Consistency**: Keep theme specific but not too narrow
4. **Profile First**: Create your profile before generating styled lyrics
5. **Iterate**: Generate multiple versions and pick the best

---

## Support

For issues or questions:
- Check the full documentation: `ML_FEATURES.md`
- Review the service implementation: `server/services/ml-rapper-cloning.ts`
- Open an issue on GitHub

---

**Note**: This is an educational platform. Use responsibly and respect artists' rights.
