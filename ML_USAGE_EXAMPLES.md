# ML Features Usage Examples

Real-world examples demonstrating how to use the machine learning rapper cloning features.

## Example 1: Generate Verse in Kendrick Lamar's Style

Generate a technically complex verse with social commentary:

```bash
curl -X POST http://localhost:5000/api/ml/style-transfer \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{
    "rapperName": "Kendrick Lamar",
    "style": "technical",
    "bars": 16,
    "theme": "social justice and inequality",
    "prompt": "Write a conscious rap verse"
  }'
```

**Expected Response**:
```json
{
  "lyrics": "Multi-line verse with complex rhyme schemes...",
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

---

## Example 2: Align Lyrics to 90 BPM Beat

Take generated lyrics and align them to a boom-bap beat:

```bash
curl -X POST http://localhost:5000/api/ml/beat-alignment \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{
    "lyrics": "Your generated verse\nLine by line\nProperly formatted",
    "bpm": 90,
    "timeSignature": "4/4",
    "genre": "boom-bap"
  }'
```

**Expected Response**:
```json
{
  "flowModeling": {
    "syllableStress": [0.8, 0.5, 0.6, ...],
    "pausePoints": [12, 25, 38],
    "emphasisWords": ["verse", "line", "formatted"],
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

---

## Example 3: Create Your Rapper Profile from Battle History

Analyze your battle performance to create a personalized profile:

```bash
curl -X POST http://localhost:5000/api/ml/create-profile \
  -H "Cookie: session=YOUR_SESSION"
```

**Expected Response (with battles)**:
```json
{
  "profile": {
    "name": "User_abc12345",
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

**Expected Response (new user)**:
```json
{
  "profile": {
    "name": "User_abc12345",
    "style": "smooth",
    "characteristics": {
      "avgSyllablesPerBar": 12,
      "rhymeComplexity": 0.5,
      "flowVariation": 0.5,
      "wordplayFrequency": 0.5,
      "metaphorDensity": 0.5,
      "battleTactics": []
    }
  },
  "battlesAnalyzed": 0,
  "message": "Default profile created. Battle more to develop your unique style!"
}
```

---

## Example 4: Complete Workflow (Browser/JavaScript)

Full workflow: generate, align, and display:

```javascript
// Step 1: Generate styled lyrics
async function generateVerse() {
  const response = await fetch('/api/ml/style-transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      rapperName: 'Drake',
      style: 'smooth',
      bars: 16,
      theme: 'success and perseverance'
    })
  });
  
  const data = await response.json();
  console.log('Generated lyrics:', data.lyrics);
  return data.lyrics;
}

// Step 2: Align to beat
async function alignToBeat(lyrics) {
  const response = await fetch('/api/ml/beat-alignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      lyrics,
      bpm: 85,
      genre: 'trap'
    })
  });
  
  const data = await response.json();
  console.log('Flow modeling:', data.flowModeling);
  return data;
}

// Step 3: Display with timing
function displayLyricsWithTiming(flowModeling) {
  const container = document.getElementById('lyrics-display');
  
  flowModeling.timing.forEach((item, index) => {
    const syllableEl = document.createElement('span');
    syllableEl.textContent = item.syllable;
    syllableEl.className = 'syllable';
    
    // Apply stress-based styling
    const stress = flowModeling.syllableStress[index];
    syllableEl.style.fontWeight = stress > 0.7 ? 'bold' : 'normal';
    
    // Highlight emphasis words
    if (flowModeling.emphasisWords.includes(item.syllable)) {
      syllableEl.style.color = '#ff6b6b';
    }
    
    // Add to container
    container.appendChild(syllableEl);
    
    // Add space or line break at pause points
    if (flowModeling.pausePoints.includes(index)) {
      container.appendChild(document.createElement('br'));
    }
  });
}

// Run the complete workflow
async function runMLWorkflow() {
  try {
    const lyrics = await generateVerse();
    const alignment = await alignToBeat(lyrics);
    displayLyricsWithTiming(alignment.flowModeling);
  } catch (error) {
    console.error('ML workflow failed:', error);
  }
}
```

---

## Example 5: Style Comparison

Generate verses in different styles to compare:

```javascript
const styles = ['technical', 'smooth', 'creative', 'aggressive', 'storyteller'];

async function compareStyles(theme) {
  const results = [];
  
  for (const style of styles) {
    const response = await fetch('/api/ml/style-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        rapperName: `${style.charAt(0).toUpperCase() + style.slice(1)} MC`,
        style,
        bars: 8,
        theme
      })
    });
    
    const data = await response.json();
    results.push({
      style,
      lyrics: data.lyrics,
      profile: data.profile
    });
  }
  
  return results;
}

// Usage
compareStyles('overcoming obstacles').then(results => {
  results.forEach(({ style, lyrics, profile }) => {
    console.log(`\n${style.toUpperCase()} STYLE:`);
    console.log(`Syllables/bar: ${profile.characteristics.avgSyllablesPerBar}`);
    console.log(`Complexity: ${profile.characteristics.rhymeComplexity}`);
    console.log(`\n${lyrics}\n`);
  });
});
```

---

## Example 6: Battle Preparation

Create a custom opponent and generate attack verses:

```javascript
async function prepareBattle(opponentName) {
  // Step 1: Create your profile
  const profileResponse = await fetch('/api/ml/create-profile', {
    method: 'POST',
    credentials: 'include'
  });
  const { profile } = await profileResponse.json();
  
  console.log('Your style:', profile.style);
  console.log('Your strengths:', {
    rhymeComplexity: profile.characteristics.rhymeComplexity,
    wordplay: profile.characteristics.wordplayFrequency
  });
  
  // Step 2: Generate battle verse targeting opponent
  const verseResponse = await fetch('/api/ml/style-transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      rapperName: profile.name,
      style: profile.style,
      bars: 16,
      theme: 'proving superiority',
      opponentName,
      prompt: 'Write an aggressive battle verse'
    })
  });
  
  const { lyrics } = await verseResponse.json();
  
  // Step 3: Align to battle beat (typically 90-100 BPM)
  const alignResponse = await fetch('/api/ml/beat-alignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      lyrics,
      bpm: 95,
      genre: 'battle-rap'
    })
  });
  
  const { flowModeling, totalDuration } = await alignResponse.json();
  
  return {
    lyrics,
    timing: flowModeling.timing,
    duration: totalDuration / 1000, // Convert to seconds
    emphasisWords: flowModeling.emphasisWords
  };
}

// Usage
prepareBattle('MC Challenger').then(battle => {
  console.log('Battle verse ready!');
  console.log(`Duration: ${battle.duration}s`);
  console.log(`Emphasis on: ${battle.emphasisWords.join(', ')}`);
  console.log(`\n${battle.lyrics}\n`);
});
```

---

## Example 7: Real-Time Performance Metrics

Track ML service performance:

```javascript
async function benchmarkMLService() {
  const metrics = {
    styleTransfer: [],
    beatAlignment: [],
    profileCreation: []
  };
  
  // Test style transfer performance
  console.log('Testing style transfer...');
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await fetch('/api/ml/style-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        rapperName: 'Test MC',
        style: 'smooth',
        bars: 16
      })
    });
    metrics.styleTransfer.push(Date.now() - start);
  }
  
  // Test beat alignment performance
  console.log('Testing beat alignment...');
  const testLyrics = 'Test verse\nWith multiple lines\nFor alignment';
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await fetch('/api/ml/beat-alignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        lyrics: testLyrics,
        bpm: 90
      })
    });
    metrics.beatAlignment.push(Date.now() - start);
  }
  
  // Calculate averages
  const avg = arr => arr.reduce((a, b) => a + b) / arr.length;
  
  console.log('Performance Metrics:');
  console.log(`- Style Transfer: ${avg(metrics.styleTransfer).toFixed(0)}ms`);
  console.log(`- Beat Alignment: ${avg(metrics.beatAlignment).toFixed(0)}ms`);
}
```

---

## Error Handling

Always handle errors gracefully:

```javascript
async function safeMLRequest(endpoint, body) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific errors
      if (response.status === 403 && error.upgrade) {
        console.log('Rate limit reached. Upgrade required.');
        // Show upgrade modal
        return null;
      }
      
      if (response.status === 400) {
        console.error('Invalid input:', error.message);
        // Show validation error
        return null;
      }
      
      throw new Error(error.message || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('ML request failed:', error);
    // Show user-friendly error message
    return null;
  }
}
```

---

## Next Steps

1. **Experiment**: Try different style combinations
2. **Optimize**: Adjust BPM to match your beats
3. **Integrate**: Build these features into your UI
4. **Extend**: Create custom rapper profiles
5. **Share**: Use the API to build collaborative features

For more details, see:
- `ML_FEATURES.md` - Technical documentation
- `ML_API_REFERENCE.md` - Complete API reference
- `server/services/ml-rapper-cloning.ts` - Implementation details
