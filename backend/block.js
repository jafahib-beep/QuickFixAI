const express = require("express");

// ✅ Correct DB import (same level logic as other routes)
const { pool } = require("./db");

// ✅ Correct auth import
const { authMiddleware } = require("./auth");

const router = express.Router();

/* ---------------- BLOCK USER ---------------- */
router.post("/block", authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const targetExists = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [targetUserId]
    );

    if (targetExists.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = await pool.query(
      "SELECT blocked_user_ids FROM users WHERE id = $1",
      [req.userId]
    );

    const blockedUserIds = currentUser.rows[0]?.blocked_user_ids || [];

    if (blockedUserIds.includes(targetUserId)) {
      return res.json({ status: "ok", message: "User already blocked" });
    }

    await pool.query(
      `UPDATE users
       SET blocked_user_ids = array_append(blocked_user_ids, $1),
           updated_at = NOW()
       WHERE id = $2`,
      [targetUserId, req.userId]
    );

    await pool.query(
      `DELETE FROM follows
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [req.userId, targetUserId]
    );

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UNBLOCK USER ---------------- */
router.post("/unblock", authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }

    await pool.query(
      `UPDATE users
       SET blocked_user_ids = array_remove(blocked_user_ids, $1),
           updated_at = NOW()
       WHERE id = $2`,
      [targetUserId, req.userId]
    );

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- HELPERS ---------------- */
async function isBlocked(userId, targetUserId) {
  if (!userId || !targetUserId) return false;

  try {
    const result = await pool.query(
      "SELECT $2 = ANY(blocked_user_ids) AS is_blocked FROM users WHERE id = $1",
      [userId, targetUserId]
    );
    return result.rows[0]?.is_blocked || false;
  } catch (error) {
    console.error("isBlocked error:", error);
    return false;
  }
}

async function getBlockedUserIds(userId) {
  if (!userId) return [];

  try {
    const [blockedByUser, blockedByOthers] = await Promise.all([
      pool.query("SELECT blocked_user_ids FROM users WHERE id = $1", [userId]),
      pool.query("SELECT id FROM users WHERE $1 = ANY(blocked_user_ids)", [userId])
    ]);

    return [
      ...new Set([
        ...(blockedByUser.rows[0]?.blocked_user_ids || []),
        ...blockedByOthers.rows.map(r => r.id)
      ])
    ];
  } catch (error) {
    console.error("getBlockedUserIds error:", error);
    return [];
  }
}

module.exports = {
  router,
  isBlocked,
  getBlockedUserIds
};
