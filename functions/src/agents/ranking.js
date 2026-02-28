/**
 * Ranking Agent
 * 
 * Responsibilities:
 * - Update global leaderboard
 * - Calculate cumulative scores
 * - Determine user rank
 * - Maintain ranking consistency
 * 
 * ADK Role: Data Processing Agent
 * A2A: Receives score updates from Orchestrator after exam evaluation
 */

const admin = require('firebase-admin');
const db = admin.firestore();

class RankingAgent {
  constructor() {
    this.name = 'RankingAgent';
    this.version = '1.0.0';
  }

  /**
   * Update a specific user's rank based on their total score
   * Called via A2A from the Orchestrator after exam evaluation
   * 
   * @param {string} userId - User ID to update
   */
  async updateUserRank(userId) {
    try {
      // Get all users ordered by total score
      const usersSnap = await db.collection('users')
        .orderBy('totalScore', 'desc')
        .get();

      let rank = 1;
      const batch = db.batch();
      let userRank = null;

      usersSnap.forEach((doc) => {
        const currentRank = rank;

        // Update rank for this user
        batch.update(doc.ref, { rank: currentRank });

        if (doc.id === userId) {
          userRank = currentRank;
        }

        rank++;
      });

      await batch.commit();

      return userRank;
    } catch (error) {
      console.error('Error updating user rank:', error);
      throw error;
    }
  }

  /**
   * Update the entire leaderboard
   * Called periodically or when score changes are detected
   */
  async updateLeaderboard() {
    try {
      const usersSnap = await db.collection('users')
        .orderBy('totalScore', 'desc')
        .get();

      const batch = db.batch();
      let rank = 1;

      usersSnap.forEach((doc) => {
        batch.update(doc.ref, { rank });
        rank++;
      });

      await batch.commit();

      console.log(`Leaderboard updated: ${rank - 1} users ranked`);
      return rank - 1;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  /**
   * Calculate cumulative score for a user across all modules
   * 
   * @param {string} userId - User ID
   * @returns {Object} Score breakdown
   */
  async calculateCumulativeScore(userId) {
    try {
      const progressSnap = await db.collection('users')
        .doc(userId)
        .collection('progress')
        .get();

      let totalScore = 0;
      let completedModules = 0;
      const moduleScores = {};

      progressSnap.forEach((doc) => {
        const data = doc.data();
        const score = data.examScore || 0;
        moduleScores[doc.id] = score;
        totalScore += score;

        if (score >= 6) {
          completedModules++;
        }
      });

      // Update user's total score
      await db.collection('users').doc(userId).update({
        totalScore,
        completedModuleCount: completedModules,
      });

      return {
        totalScore,
        completedModules,
        moduleScores,
      };
    } catch (error) {
      console.error('Error calculating cumulative score:', error);
      throw error;
    }
  }

  /**
   * Get top N users for the leaderboard
   * 
   * @param {number} limit - Number of top users to return
   * @returns {Object[]} Leaderboard entries
   */
  async getTopUsers(limit = 10) {
    try {
      const snap = await db.collection('users')
        .orderBy('totalScore', 'desc')
        .limit(limit)
        .get();

      const leaderboard = [];
      snap.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          userId: doc.id,
          displayName: data.displayName,
          totalScore: data.totalScore || 0,
          completedModules: data.completedModules?.length || 0,
          badges: data.badges?.length || 0,
          rank: data.rank,
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Error getting top users:', error);
      throw error;
    }
  }

  /**
   * Get a specific user's rank and surrounding users
   * 
   * @param {string} userId - User ID
   * @returns {Object} User's rank info and nearby rankings
   */
  async getUserRankInfo(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return null;

      const userData = userDoc.data();

      return {
        rank: userData.rank || null,
        totalScore: userData.totalScore || 0,
        completedModules: userData.completedModules?.length || 0,
        badges: userData.badges?.length || 0,
      };
    } catch (error) {
      console.error('Error getting user rank info:', error);
      throw error;
    }
  }
}

module.exports = { RankingAgent };
