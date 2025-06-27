# 🧩 Quiz Games Setup Guide

## 📋 Overview
The quiz system includes 9 different games with image-based questions. Each game has its own category and question set.

## 🎮 Available Games

### 1. **🏃 اسرع (Speed Game)**
- Questions about fast things (cars, rockets, lightning, etc.)
- Example answers: سرعة، سريع، أسرع، speed

### 2. **🕌 دين (Religion Game)**
- Questions about Islamic/religious topics
- Example answers: مسجد، قرآن، كعبة، صلاة

### 3. **🏳️ اعلام (Flags Game)**
- Questions about country flags
- Example answers: السعودية، مصر، الإمارات

### 4. **👤 شخصية (Personalities Game)**
- Questions about famous people
- Example answers: محمد صلاح، رونالدو، ميسي

### 5. **🔤 ترجم (Translation Game)**
- Questions about translating words/objects
- Example answers: كتاب/book، سيارة/car، بيت/house

### 6. **🏛️ عواصم (Capitals Game)**
- Questions about world capitals
- Example answers: الرياض، القاهرة، دبي

### 7. **🎭 تمويه (Camouflage Game)**
- Questions about hidden/camouflaged animals
- Example answers: نمر، فراشة، حرباء

### 8. **🔤 رتب (Word Arrangement Game)**
- Questions about arranging scrambled letters
- Example answers: مدرسة، مستشفى، مطعم

### 9. **🏷️ براند (Brands Game)**
- Questions about company logos/brands
- Example answers: أبل، سامسونج، نايك

## 🖼️ How to Add Real Images

### Step 1: Upload Images
1. Upload your images to **Imgur** (recommended) or any image hosting service
2. Get the direct image URL (should end with .jpg, .png, etc.)
3. Make sure the images are publicly accessible

### Step 2: Update Quiz Data
Edit the file `games/quiz.js` and replace the example URLs:

```javascript
// Example for flags game
'اعلام': {
  name: 'لعبة الأعلام',
  questions: [
    {
      image: 'https://i.imgur.com/YOUR_REAL_IMAGE1.jpg', // Replace this
      answers: ['السعودية', 'المملكة العربية السعودية', 'سعودية', 'saudi arabia']
    },
    {
      image: 'https://i.imgur.com/YOUR_REAL_IMAGE2.jpg', // Replace this
      answers: ['مصر', 'جمهورية مصر العربية', 'مصرية', 'egypt']
    }
    // Add more questions...
  ]
}
```

### Step 3: Add More Questions
You can add as many questions as you want to each game:

```javascript
{
  image: 'https://i.imgur.com/NEW_IMAGE.jpg',
  answers: ['answer1', 'answer2', 'alternative_answer', 'english_answer']
}
```

## 🎯 Game Mechanics

### Who Can Start Games:
- **Admins** (users with Administrator permission)
- **Users with specific roles** (defined in config.json)

### Who Can Answer:
- **Everyone** in the channel can try to answer

### Game Flow:
1. Authorized user types command (e.g., `-اعلام`)
2. Bot sends random image from that category
3. Players have **15 seconds** to answer
4. First correct answer wins **1 point**
5. If no one answers correctly, bot shows all correct answers

### Answer Matching:
- Case-insensitive matching
- Automatic trimming of spaces
- Multiple correct answers supported per question

## 🔧 Configuration

### Adding New Role IDs:
Edit `config.json` to add role IDs that can start games:

```json
{
  "allowedRoleIds": [
    "1343402511742009364",
    "1379302045814751272",
    "YOUR_NEW_ROLE_ID"
  ]
}
```

### Changing Game Timeout:
Edit `games/quiz.js` to change the 15-second timeout:

```javascript
const GAME_TIMEOUT = 15000; // Change to desired milliseconds
```

## 📝 Example Commands

```
-اسرع     # Start speed game
-دين      # Start religion game  
-اعلام    # Start flags game
-شخصية   # Start personalities game
-ترجم     # Start translation game
-عواصم    # Start capitals game
-تمويه    # Start camouflage game
-رتب      # Start word arrangement game
-براند    # Start brands game
```

## 🏆 Points System Integration

- Winners get **1 point** added to their account
- Points are tracked in the main points system
- Winners are announced with their new point total
- Integrates with leaderboard and stats commands

## 🛠️ Troubleshooting

### Images Not Loading:
- Make sure image URLs are direct links (end with .jpg, .png, etc.)
- Test URLs in browser to ensure they're accessible
- Use reliable hosting services like Imgur

### Game Not Starting:
- Check if user has required permissions
- Verify role IDs in config.json are correct
- Make sure there's no active game in the channel

### Answers Not Working:
- Check answer spelling in the questions array
- Remember answers are case-insensitive
- Add multiple variations of the same answer

## 📊 Adding Statistics

The quiz games automatically integrate with the existing points system, so:
- Wins are tracked in player statistics
- Points are added to player accounts
- Games count toward total games played
- Win rates are calculated automatically

## 🎨 Customization Ideas

### Add More Categories:
- Animals (حيوانات)
- Food (طعام)  
- Movies (أفلام)
- Sports (رياضة)

### Enhance Difficulty:
- Add time-based scoring (faster = more points)
- Create difficulty levels
- Add bonus questions

### Visual Improvements:
- Add category-specific emojis
- Create custom embed colors per game
- Add progress indicators
