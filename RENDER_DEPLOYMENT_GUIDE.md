# 🚀 Render Deployment Guide for Discord Roulette Bot

## ✅ Prerequisites Completed
- ✅ Code is ready for deployment
- ✅ package.json configured with Node.js 18.x
- ✅ Environment variables set up
- ✅ Canvas dependencies included

## 📋 Step-by-Step Deployment

### Step 1: Create Render Account
1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. **Sign up with GitHub** (recommended)
4. Connect your GitHub account

### Step 2: Push Code to GitHub (if not done)
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 3: Create Web Service on Render
1. On Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your repository: `discord-roulette-bot-main`
4. Click **"Connect"**

### Step 4: Configure Service Settings
```
Name: discord-roulette-bot
Region: Oregon (US West) or Frankfurt (Europe)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: node index.js
Instance Type: Free (for testing) or Starter ($7/month)
```

### Step 5: Add Environment Variables
Click **"Add Environment Variable"** and add:
```
Key: DISCORD_TOKEN
Value: YOUR_DISCORD_BOT_TOKEN_HERE
```
**Note**: Replace `YOUR_DISCORD_BOT_TOKEN_HERE` with your actual Discord bot token from your `.env` file.

### Step 6: Deploy
1. Click **"Create Web Service"**
2. Wait 2-5 minutes for deployment
3. Watch logs for success messages

## 🎯 Expected Success Logs
```
==> Cloning from GitHub...
==> Using Node version 18.x.x
==> Running 'npm install'
==> Canvas installed successfully
==> Running 'node index.js'
==> Bot ready! Connected to Discord
```

## 🔧 If Something Goes Wrong

### Build Fails?
- Check that your GitHub repo is public or Render has access
- Verify package.json syntax

### Canvas Issues?
- Render includes all canvas dependencies by default
- No additional setup needed

### Bot Won't Start?
- Check environment variables are set correctly
- Verify Discord token is valid
- Check logs for specific error messages

## 💡 Tips
- Use **Starter plan ($7/month)** for production
- **Free tier** is perfect for testing
- Render auto-deploys when you push to GitHub
- Monitor logs regularly

## 🆘 Need Help?
If you encounter issues:
1. Copy the error logs from Render
2. Share them for troubleshooting
3. Check Discord Developer Portal for token issues

---
**Your bot is ready for deployment! 🎉**
