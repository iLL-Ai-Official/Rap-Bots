# Machine Learning Rapper Cloning - Quick Start

This guide helps you get started with the ML rapper cloning features in Rap Bots.

## 🎯 What Can You Do?

1. **Generate Lyrics** in specific rapper styles (Technical, Smooth, Creative, Aggressive, Storyteller)
2. **Align Lyrics to Beats** with precise syllable timing
3. **Create Rapper Profiles** from your battle history
4. **Clone Voice & Style** using advanced ML models

## 🚀 Quick Start

### 1. Generate a Verse

```bash
curl -X POST http://localhost:5000/api/ml/style-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "rapperName": "Kendrick Lamar",
    "style": "technical",
    "bars": 16,
    "theme": "perseverance"
  }'
```

### 2. Align to Beat

```bash
curl -X POST http://localhost:5000/api/ml/beat-alignment \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "Your verse here\nLine by line",
    "bpm": 90
  }'
```

### 3. Create Your Profile

```bash
curl -X POST http://localhost:5000/api/ml/create-profile
```

## 📚 Documentation

- **[ML_FEATURES.md](ML_FEATURES.md)** - Complete technical documentation
- **[ML_API_REFERENCE.md](ML_API_REFERENCE.md)** - API reference with all endpoints
- **[ML_USAGE_EXAMPLES.md](ML_USAGE_EXAMPLES.md)** - Real-world usage examples

## 🎨 Rapper Styles

| Style | Characteristics | Examples |
|-------|----------------|----------|
| **Technical** | Complex rhymes, intricate wordplay | Eminem, Tech N9ne |
| **Smooth** | Effortless flow, melodic | Drake, J. Cole |
| **Creative** | Innovative metaphors, experimental | MF DOOM, Earl Sweatshirt |
| **Aggressive** | Hard-hitting punchlines | DMX, 50 Cent |
| **Storyteller** | Vivid imagery, narrative | Nas, Slick Rick |

## 🔧 Configuration

Set up environment variables:

```bash
# Required for lyric generation
GROQ_API_KEY=your_groq_key

# TTS providers (at least one)
TYPECAST_API_KEY=your_typecast_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## 🛡️ Security & Ethics

- ✅ Rate limiting on all endpoints
- ✅ Input validation
- ✅ User authentication required
- ⚠️ **Educational use only** - respect artist rights

## 💡 Key Features

1. **Voice Cloning**
   - Multiple TTS providers (Typecast, ElevenLabs, Groq)
   - Emotion and style controls
   - Real-time synthesis

2. **Style Transfer**
   - LLaMA 3.1 70B via Groq API
   - Custom rapper profiles
   - Theme-based generation

3. **Beat Alignment**
   - Syllable-level timing
   - Stress pattern modeling
   - Pause point detection

4. **Flow Modeling**
   - BPM-based synchronization
   - Emphasis word identification
   - Natural speech patterns

## 📊 Performance

- **Style Transfer**: ~3-5 seconds for 16 bars
- **Beat Alignment**: ~100-200ms
- **Profile Creation**: ~1-2 seconds

## 🧪 Testing

Run the test suite:

```bash
npm run test:ml
```

Or use the test script:

```bash
npx tsx test_ml_features.ts
```

## 🤝 Contributing

To add new features:

1. Add rapper profiles in `server/services/ml-rapper-cloning.ts`
2. Extend API endpoints in `server/routes.ts`
3. Update documentation
4. Test thoroughly

## 📖 Architecture

```
ML Rapper Cloning Service
├── Voice Synthesis (TTS)
│   ├── Typecast AI
│   ├── ElevenLabs
│   └── Groq TTS
├── Style Transfer (LLM)
│   └── Groq LLaMA 3.1
├── Beat Alignment
│   └── Flow Modeling Engine
└── Profile Creation
    └── Battle History Analyzer
```

## 🎓 Learning Resources

- **Research Papers**: See `ML_FEATURES.md`
- **API Examples**: See `ML_USAGE_EXAMPLES.md`
- **Code**: `server/services/ml-rapper-cloning.ts`

## ⚡ Quick Tips

1. Start with **smooth** style for easier learning
2. Use **90 BPM** for classic boom-bap feel
3. Create your profile after 5-10 battles
4. Experiment with different themes
5. Adjust BPM to match your beats

## 🐛 Troubleshooting

**Problem**: Rate limit errors  
**Solution**: Upgrade subscription or wait for reset

**Problem**: Style generation fails  
**Solution**: Check GROQ_API_KEY is set

**Problem**: Beat alignment issues  
**Solution**: Ensure lyrics are properly formatted (one line per verse line)

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This folder
- **API Reference**: `ML_API_REFERENCE.md`

---

**Ready to clone some rappers? Start with the examples in `ML_USAGE_EXAMPLES.md`!**
