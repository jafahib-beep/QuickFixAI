const { pool } = require('../db');

// XP amounts for different actions
const XP_REWARDS = {
  ai_chat_message: 5,
  liveassist_scan: 10,
  video_watch: 3
};

// Level thresholds (cumulative XP required)
const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 99 },
  { level: 2, minXp: 100, maxXp: 249 },
  { level: 3, minXp: 250, maxXp: 499 },
  { level: 4, minXp: 500, maxXp: 999 },
  { level: 5, minXp: 1000, maxXp: Infinity }
];

/**
 * Calculate level from XP
 * @param {number} xp - Current XP amount
 * @returns {number} - Level (1-5)
 */
function calculateLevelFromXp(xp) {
  if (typeof xp !== 'number' || xp < 0) {
    return 1;
  }
  
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.minXp && xp <= threshold.maxXp) {
      return threshold.level;
    }
  }
  
  return 5; // Max level
}

/**
 * Get XP required for next level
 * @param {number} currentLevel - Current level
 * @returns {number} - XP required for next level (or current max if at max level)
 */
function getNextLevelXp(currentLevel) {
  if (currentLevel >= 5) {
    return LEVEL_THRESHOLDS[4].minXp; // At max level, return max level threshold
  }
  
  const nextLevelIndex = LEVEL_THRESHOLDS.findIndex(t => t.level === currentLevel + 1);
  if (nextLevelIndex >= 0) {
    return LEVEL_THRESHOLDS[nextLevelIndex].minXp;
  }
  
  return 1000; // Fallback
}

/**
 * Get XP required for current level (for progress calculation)
 * @param {number} currentLevel - Current level
 * @returns {number} - XP required for current level
 */
function getCurrentLevelXp(currentLevel) {
  const levelIndex = LEVEL_THRESHOLDS.findIndex(t => t.level === currentLevel);
  if (levelIndex >= 0) {
    return LEVEL_THRESHOLDS[levelIndex].minXp;
  }
  return 0;
}

/**
 * Award XP to a user for completing an action
 * @param {string} userId - User ID
 * @param {string} actionType - Type of action (ai_chat_message, liveassist_scan, video_watch)
 * @returns {Promise<{success: boolean, xp?: number, level?: number, xpAwarded?: number, error?: string}>}
 */
async function awardXp(userId, actionType) {
  if (!userId) {
    console.log('[XP] No userId provided, skipping XP award');
    return { success: false, error: 'No userId provided' };
  }
  
  const xpAmount = XP_REWARDS[actionType];
  if (!xpAmount) {
    console.log(`[XP] Unknown action type: ${actionType}`);
    return { success: false, error: `Unknown action type: ${actionType}` };
  }
  
  try {
    // Get current user XP
    const userResult = await pool.query(
      'SELECT xp, level FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`[XP] User not found: ${userId}`);
      return { success: false, error: 'User not found' };
    }
    
    const currentXp = userResult.rows[0].xp || 0;
    const newXp = currentXp + xpAmount;
    const newLevel = calculateLevelFromXp(newXp);
    
    // Update user XP and level
    await pool.query(
      'UPDATE users SET xp = $1, level = $2, updated_at = NOW() WHERE id = $3',
      [newXp, newLevel, userId]
    );
    
    console.log(`[XP] Awarded ${xpAmount} XP to user ${userId} for ${actionType}. New total: ${newXp}, Level: ${newLevel}`);
    
    return {
      success: true,
      xp: newXp,
      level: newLevel,
      xpAwarded: xpAmount
    };
  } catch (error) {
    console.error('[XP] Error awarding XP:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  XP_REWARDS,
  LEVEL_THRESHOLDS,
  calculateLevelFromXp,
  getNextLevelXp,
  getCurrentLevelXp,
  awardXp
};
