# Character Card Generation Feature

## Overview
This feature allows users to generate Pokemon-parody style character cards based on their profile information and battle performance.

## How It Works

### 1. User Profile Enhancement
Users can now:
- Add a bio describing their rap journey
- Select a rap style (Aggressive, Smooth, Technical, or Balanced)
- Upload a profile image

### 2. Character Card Generation
The system generates a Pokemon-style trading card with:
- **User's Image**: Displayed prominently in the card
- **Stats**: Based on battle performance
  - Flow: Rhythm and delivery quality
  - Wordplay: Lyrical creativity
  - Delivery: Performance strength
  - Stage Presence: Overall charisma

- **Signature Attacks**: Generated based on rap style and bio
  - Aggressive style: "Lyrical Assault", "Battle Stance"
  - Smooth style: "Silk Flow", "Clever Comeback"
  - Technical style: "Multi-Syllabic Strike", "Flow Switch"
  - Plus a unique signature attack based on bio keywords

### 3. Attack Power Calculation
Attack power is determined by:
- Base rap style (70-90 power)
- Battle performance (total wins/battles)
- Bio keywords (street, freestyle, wordplay, etc.)

### 4. Stats Calculation
Stats scale with:
- Total battles (experience bonus)
- Win rate (performance bonus)
- Range: 40-100 per stat

## Usage

### Accessing Your Profile
1. Log in to the application
2. Click "View Profile" on the Home page
3. Or navigate to `/profile`

### Updating Profile
1. Click "Edit Profile" on your profile page
2. Update your bio and rap style
3. Upload a profile image (optional)
4. Click "Save Changes"

### Generating a Character Card
1. Go to your profile page
2. Ensure you have:
   - A profile image (required)
   - A bio (helps generate better attacks)
   - Selected a rap style
3. Click "Generate Character Card"
4. Wait a few seconds for generation
5. Your card will appear with all stats and attacks

### Viewing Other Profiles
Navigate to `/profile/:userId` to view any user's profile and character card.

## Technical Details

### Database Schema
New fields added to `users` table:
- `bio`: TEXT - User's biography
- `rapStyle`: VARCHAR - Selected rap style
- `characterCardUrl`: VARCHAR - URL to generated card image
- `characterCardData`: JSONB - Card metadata (attacks, stats)

### API Endpoints

#### GET /api/profile/:userId
Get public profile information for any user.

Response:
```json
{
  "id": "user-id",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "/api/profile-images/...",
  "bio": "A skilled rapper from the underground scene",
  "rapStyle": "aggressive",
  "totalBattles": 25,
  "totalWins": 18,
  "characterCardUrl": "/api/character-cards/...",
  "characterCardData": {
    "name": "John Doe",
    "rapStyle": "aggressive",
    "bio": "...",
    "attacks": [...],
    "stats": {...}
  }
}
```

#### PUT /api/profile
Update own profile (requires authentication).

Request (multipart/form-data):
- `bio`: string
- `rapStyle`: string
- `profileImage`: file (optional)

#### POST /api/generate-character-card
Generate a character card (requires authentication).

Request (multipart/form-data):
- `image`: file (optional, uses profile image if not provided)

Response:
```json
{
  "cardUrl": "/api/character-cards/card_user-id_timestamp.png",
  "cardData": {
    "name": "John Doe",
    "rapStyle": "aggressive",
    "bio": "...",
    "attacks": [
      {
        "name": "Lyrical Assault",
        "power": 85,
        "description": "Unleashes a barrage of devastating punchlines",
        "type": "lyrical"
      }
    ],
    "stats": {
      "flow": 75,
      "wordplay": 70,
      "delivery": 80,
      "stage_presence": 72
    }
  }
}
```

## Future Enhancements

### Hugging Face Integration
The current implementation saves the user's image directly. Future versions can use Hugging Face's Stable Diffusion Inpainting model to:
- Apply artistic effects to the image
- Add Pokemon-style borders and effects
- Create more dynamic card designs

To enable HF integration:
1. Set `HUGGINGFACE_API_KEY` environment variable
2. The service will automatically use the inpainting model
3. Cards will have enhanced visual effects

### Credits System
Future implementation can require credits to generate cards:
- Initial card: Free
- Regeneration: Costs credits
- Premium users: Unlimited regenerations

## Notes
- Character cards are stored in `temp_cards/` directory
- Profile images are stored in `temp_profiles/` directory
- Both directories are gitignored
- Cards persist until server restart (future: use cloud storage)
