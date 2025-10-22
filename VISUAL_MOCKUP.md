# Character Card Visual Mockup

## Pokemon-Parody Style Trading Card

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ╔════════════════════════════════════╗  ┃
┃  ║                                    ║  ┃ 
┃  ║        🌟 MC AGGRESSIVE 🌟         ║  ┃
┃  ║         Aggressive Style           ║  ┃
┃  ║                                    ║  ┃
┃  ╠════════════════════════════════════╣  ┃
┃  ║                                    ║  ┃
┃  ║         ┌──────────────┐          ║  ┃
┃  ║         │              │          ║  ┃
┃  ║         │              │          ║  ┃
┃  ║         │  👤 USER     │          ║  ┃
┃  ║         │    IMAGE     │          ║  ┃
┃  ║         │              │          ║  ┃
┃  ║         │              │          ║  ┃
┃  ║         └──────────────┘          ║  ┃
┃  ║                                    ║  ┃
┃  ╠════════════════════════════════════╣  ┃
┃  ║     📊 STATS                       ║  ┃
┃  ║                                    ║  ┃
┃  ║     Flow ⚡............... 98      ║  ┃
┃  ║     Wordplay 💬........... 93      ║  ┃
┃  ║     Delivery 🎤........... 100     ║  ┃
┃  ║     Stage Presence 👑..... 96      ║  ┃
┃  ║                                    ║  ┃
┃  ╠════════════════════════════════════╣  ┃
┃  ║     ⚔️ SIGNATURE MOVES             ║  ┃
┃  ║                                    ║  ┃
┃  ║   🔥 Lyrical Assault    [85 DMG]  ║  ┃
┃  ║   Unleashes a barrage of           ║  ┃
┃  ║   devastating punchlines           ║  ┃
┃  ║                                    ║  ┃
┃  ║   💪 Battle Stance      [70 DMG]  ║  ┃
┃  ║   Intimidating presence that       ║  ┃
┃  ║   weakens opponents                ║  ┃
┃  ║                                    ║  ┃
┃  ╚════════════════════════════════════╝  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   Gradient: 🟨 Yellow → 🟥 Red → 🟪 Purple
```

## Color Scheme

### Border Gradient (Outer to Inner)
```
🟨 #FACC15 (Yellow-400)  ← Outer border
↓
🟧 #FB923C (Orange-400)
↓
🟥 #EF4444 (Red-500)
↓
🟪 #A855F7 (Purple-500)  ← Inner border
```

### Card Background
```
⬛ #000000 (Black) with 80% opacity
   Creates dark background for content
```

### Text Colors
```
🟡 #FACC15 (Yellow-400)  - Headers & Names
⚪ #F3F4F6 (Gray-100)    - Main text
🔵 #9CA3AF (Gray-400)    - Secondary text
🔴 #EF4444 (Red-400)     - Power numbers
```

## Rap Style Variations

### 1. Aggressive Style
```
Color: Red-dominant gradient
Icon: 🔥
Attacks: 
  - Lyrical Assault (85 DMG)
  - Battle Stance (70 DMG)
Stats: High Delivery, High Flow
```

### 2. Smooth Style  
```
Color: Blue-purple gradient
Icon: 🌊
Attacks:
  - Silk Flow (75 DMG)
  - Clever Comeback (80 DMG)
Stats: High Wordplay, Balanced
```

### 3. Technical Style
```
Color: Purple-blue gradient
Icon: 🧠
Attacks:
  - Multi-Syllabic Strike (90 DMG)
  - Flow Switch (75 DMG)
Stats: High Wordplay, High Flow
```

### 4. Balanced Style
```
Color: Mixed gradient
Icon: ⚖️
Attacks:
  - Mic Check (70 DMG)
  - Stage Presence (65 DMG)
Stats: Balanced across all
```

## Bio-Based Signature Attacks

### Street/Underground Keywords
```
🏙️ Street Cipher (95 DMG)
"Underground battle experience that devastates opponents"
```

### Freestyle/Improv Keywords
```
🎤 Freestyle Fury (88 DMG)
"Improvised bars that adapt to any situation"
```

### Wordplay/Clever Keywords
```
💭 Double Entendre (92 DMG)
"Layers of meaning that leave opponents confused"
```

### Default Signature
```
🌟 Signature Flow (80 DMG)
"Unique style that defines this rapper"
```

## Stats Calculation Formula

```javascript
Base Stats:        55-65 (varies by category)
Experience Bonus:  +2 per battle (max +30)
Win Rate Bonus:    (win% - 50) / 2

Final Formula:
stat = clamp(
  base + (battles * 2) + ((winRate - 50) / 2),
  40,  // minimum
  100  // maximum
)

Example (15 battles, 67% win rate):
  base = 60
  experience = 15 * 2 = 30
  winRate = (67 - 50) / 2 = 8.5
  total = 60 + 30 + 8.5 = 98.5 (capped at 100)
```

## UI Layout (React)

```jsx
<Card className="pokemon-card">
  {/* Header */}
  <CardHeader className="card-header gradient-border">
    <h3 className="card-name">{userName}</h3>
    <p className="card-style">{rapStyle} Style</p>
  </CardHeader>

  {/* Image */}
  <CardContent className="card-image-section">
    <img src={profileImage} className="card-image" />
  </CardContent>

  {/* Stats */}
  <CardContent className="card-stats">
    <h4>STATS</h4>
    <StatBar label="Flow" value={stats.flow} icon="⚡" />
    <StatBar label="Wordplay" value={stats.wordplay} icon="💬" />
    <StatBar label="Delivery" value={stats.delivery} icon="🎤" />
    <StatBar label="Presence" value={stats.stage_presence} icon="👑" />
  </CardContent>

  {/* Attacks */}
  <CardContent className="card-attacks">
    <h4>SIGNATURE MOVES</h4>
    {attacks.map(attack => (
      <AttackBox
        name={attack.name}
        power={attack.power}
        description={attack.description}
        type={attack.type}
      />
    ))}
  </CardContent>
</Card>
```

## Responsive Design

### Desktop (>768px)
```
Card Width:  400px
Card Height: 600px (aspect ratio 2:3)
Font Size:   Base 14px
Image Size:  300x300px
```

### Tablet (>640px, <768px)
```
Card Width:  320px
Card Height: 480px
Font Size:   Base 12px
Image Size:  240x240px
```

### Mobile (<640px)
```
Card Width:  280px
Card Height: 420px
Font Size:   Base 11px
Image Size:  200x200px
```

## Animation Ideas (Future)

### Card Flip Animation
```css
.card {
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.card:hover {
  transform: rotateY(180deg);
}
```

### Holographic Effect
```css
.card::before {
  content: "";
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255,255,255,0.1) 50%,
    transparent 60%
  );
  animation: holographic 3s infinite;
}
```

### Stat Bar Animation
```css
.stat-bar {
  width: 0;
  animation: fillBar 1s ease-out forwards;
}

@keyframes fillBar {
  to { width: calc(var(--stat-value) * 1%); }
}
```

## Accessibility

### ARIA Labels
```html
<div role="img" aria-label="Character card for {userName}">
  <div aria-label="Stats">
    <div aria-label="Flow: {flowStat} out of 100">
    <div aria-label="Wordplay: {wordplayStat} out of 100">
    ...
  </div>
  <div aria-label="Signature moves">
    <div aria-label="{attackName}, {power} damage: {description}">
    ...
  </div>
</div>
```

### Keyboard Navigation
```
Tab     - Navigate between cards
Enter   - Select/flip card
Space   - Generate new card
Escape  - Close card detail view
```

## Print-Ready Version

### Dimensions
```
Physical Card:    2.5" x 3.5" (63.5mm x 88.9mm)
Print DPI:        300 DPI
Image Size:       750px x 1050px
Bleed:            0.125" (3.175mm) all sides
Safe Zone:        0.25" (6.35mm) from edge
```

### Color Mode
```
Screen: RGB
Print:  CMYK conversion needed
Color Profile: sRGB IEC61966-2.1
```

## File Format Specifications

### Card Images
```
Format:    PNG-24 (with alpha)
Color:     RGB, 8-bit per channel
Size:      ~100-200 KB per card
Optimize:  Use pngquant for compression
```

### Profile Images
```
Format:    JPEG or PNG
Max Size:  2MB
Recommended: 512x512px minimum
Aspect:    1:1 (square)
```

---

## Usage Example

```typescript
// Generate card
const card = await characterCardGenerator.generateCharacterCard(
  "user-123",
  "MC Flow",
  imageBuffer,
  "A technical rapper from the underground scene",
  "technical",
  { totalBattles: 25, totalWins: 18 }
);

// Result
{
  cardUrl: "/api/character-cards/user-123_1234567890.png",
  cardData: {
    name: "MC Flow",
    rapStyle: "technical",
    bio: "A technical rapper from the underground scene",
    attacks: [
      { name: "Multi-Syllabic Strike", power: 90, ... },
      { name: "Flow Switch", power: 75, ... },
      { name: "Street Cipher", power: 95, ... }
    ],
    stats: {
      flow: 96,
      wordplay: 98,
      delivery: 92,
      stage_presence: 90
    }
  }
}
```

This visual mockup demonstrates the complete design system for the Pokemon-style character cards! 🎨✨
