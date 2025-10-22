# Rap Bot Cloning System

## Overview
The Cloning System allows users to create AI clones of themselves that match their rap battle skill level. Users can then battle against their own clone to practice and improve.

## Features

### 1. Clone Generation
- **Automatic Analysis**: The system analyzes a user's past battle history (up to 10 recent battles)
- **Skill Metrics**: Calculates average scores for:
  - Overall Skill Level (0-100)
  - Rhyme Density
  - Flow Quality
  - Creativity
- **Style Detection**: Determines the user's battle style (technical, smooth, creative, or balanced)

### 2. Clone Battles
- **Adaptive AI**: The clone's AI difficulty automatically adjusts to match the user's skill level
- **Fair Competition**: Clone battles provide a balanced challenge based on your own abilities
- **Practice Mode**: Perfect for practicing without worrying about unbalanced matchups

### 3. Clone Management
- **View Stats**: See your clone's detailed performance metrics
- **Update Clone**: Regenerate your clone as you improve to keep it current
- **One-Click Battle**: Jump straight into a battle with your clone from the Clone Manager page

## How to Use

### Creating Your Clone
1. Navigate to the **Clone Manager** page from the home dashboard
2. Click **"Generate My Clone"**
3. The system will analyze your battle history and create a clone matching your skill level
4. If you have no battles yet, a default clone will be created

### Battling Your Clone
**Option 1: From Clone Manager**
1. Go to Clone Manager page
2. Click **"Battle Your Clone"**
3. You'll be taken directly to the battle arena

**Option 2: From Character Selection**
1. Start a new battle
2. Your clone will appear at the top of the character selection screen
3. Select your clone to battle against it

### Updating Your Clone
As you improve your skills through more battles, update your clone to keep pace:
1. Go to Clone Manager page
2. Click **"Update Clone"**
3. Your clone will be regenerated based on your recent performance

## Technical Details

### Database Schema
The `userClones` table stores:
- Clone name
- Skill level (0-100)
- Average rhyme density, flow quality, and creativity
- Number of battles analyzed
- Battle style
- Voice ID for TTS
- Active status

### API Endpoints
- `GET /api/user/clone` - Fetch user's clone
- `POST /api/user/clone/generate` - Generate or update clone
- `GET /api/clone/:cloneId` - Fetch clone by ID

### Clone Difficulty Mapping
- Skill < 40: Easy
- Skill 40-64: Normal
- Skill 65-84: Hard
- Skill ≥ 85: Nightmare

## Database Migration

After pulling this code, run the database migration:
```bash
npm run db:push
```

This will create the `userClones` table in your database.

## Future Enhancements
- Custom clone names and avatars
- Clone vs Clone battles (battle another user's clone)
- Clone training mode (adjust specific skills)
- Clone history and statistics tracking
- Share your clone with friends
