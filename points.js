// Points System for Discord Bot Games
const fs = require('fs').promises;
const path = require('path');

const POINTS_FILE = path.join(__dirname, 'points.json');
const ABILITY_COST = 3; // Cost for using roulette abilities
const WIN_REWARD = 1; // Points awarded for winning a game

class PointsManager {
  constructor() {
    this.data = {};
    this.initialized = false;
    this.loadData();
  }

  async loadData() {
    try {
      const fileContent = await fs.readFile(POINTS_FILE, 'utf8');
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty data
      this.data = {};
      await this.saveData();
    }
    this.initialized = true;
  }

  async saveData() {
    try {
      await fs.writeFile(POINTS_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving points data:', error);
    }
  }

  // Initialize user if they don't exist
  async ensureInitialized() {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async initializeUser(userId) {
    await this.ensureInitialized();
    if (!this.data[userId]) {
      this.data[userId] = {
        points: 0,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0.0
        }
      };
    }
  }

  // Get user points
  async getPoints(userId) {
    await this.initializeUser(userId);
    return this.data[userId].points;
  }

  // Get user stats
  async getStats(userId) {
    await this.initializeUser(userId);
    return this.data[userId].stats;
  }

  // Add points to user
  async addPoints(userId, amount) {
    await this.initializeUser(userId);
    this.data[userId].points += amount;
    await this.saveData();
    return this.data[userId].points;
  }

  // Remove points from user
  async removePoints(userId, amount) {
    await this.initializeUser(userId);
    this.data[userId].points = Math.max(0, this.data[userId].points - amount);
    await this.saveData();
    return this.data[userId].points;
  }

  // Check if user has enough points
  async hasEnoughPoints(userId, amount) {
    const points = await this.getPoints(userId);
    return points >= amount;
  }

  // Award points for winning a game
  async awardWin(userId) {
    await this.initializeUser(userId);
    this.data[userId].points += WIN_REWARD;
    this.data[userId].stats.gamesPlayed += 1;
    this.data[userId].stats.wins += 1;
    this.updateWinRate(userId);
    await this.saveData();
    return this.data[userId].points;
  }

  // Record a loss
  async recordLoss(userId) {
    await this.initializeUser(userId);
    this.data[userId].stats.gamesPlayed += 1;
    this.data[userId].stats.losses += 1;
    this.updateWinRate(userId);
    await this.saveData();
  }

  // Update win rate
  updateWinRate(userId) {
    const stats = this.data[userId].stats;
    if (stats.gamesPlayed > 0) {
      stats.winRate = Math.round((stats.wins / stats.gamesPlayed) * 100 * 100) / 100;
    }
  }

  // Use ability (deduct points)
  async useAbility(userId) {
    if (!(await this.hasEnoughPoints(userId, ABILITY_COST))) {
      return false;
    }
    await this.removePoints(userId, ABILITY_COST);
    return true;
  }

  // Get leaderboard
  getLeaderboard(limit = 10) {
    const users = Object.entries(this.data)
      .map(([userId, userData]) => ({
        userId,
        points: userData.points,
        stats: userData.stats
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return users;
  }

  // Get all user data
  getAllData() {
    return this.data;
  }

  // Set points for a user (admin function)
  async setPoints(userId, amount) {
    await this.initializeUser(userId);
    this.data[userId].points = Math.max(0, amount);
    await this.saveData();
    return this.data[userId].points;
  }
}

// Create singleton instance
const pointsManager = new PointsManager();

module.exports = {
  pointsManager,
  ABILITY_COST,
  WIN_REWARD
};
