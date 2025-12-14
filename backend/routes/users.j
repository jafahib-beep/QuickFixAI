const express = require("express");

// ✅ Correct DB import
const db = require("../db");
const pool = db.pool;

// ✅ Correct auth import (from routes/auth.js)
const {
  authMiddleware,
  optionalAuth
} = require("./auth");

// Block helpers
const { isBlocked } = require("./block");

const router = express.Router();

/* ---------------- GET USER PROFILE ---------------- */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, display_name, bio, avatar_url, expertise_categories,
             followers_count, following_count, created_at, blocked_user_ids
      FROM users WHERE id = $1
    `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (
      req.userId &&
      Array.isArray(user.blocked_user_ids) &&
      user.blocked_user_ids.includes(req.userId)
    ) {
      return res.status(403).json({ error: "User not available" });
    }

    let isFollowing = false;
    let userIsBlocked = false;

    if (req.userId) {
      const [followResult, blockedCheck] = await Promise.all([
        pool.query(
          "SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2",
          [req.userId, req.params.id]
        ),
        isBlocked(req.userId, req.params.id)
      ]);

      isFollowing = followResult.rows.length > 0;
      userIsBlocked = blockedCheck;
    }

    res.json({
      id: user.id,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      expertiseCategories: user.expertise_categories,
      followersCount: user.followers_count,
      followingCount: user.following_count,
      isFollowing,
      isBlocked: userIsBlocked,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET USER VIDEOS ---------------- */
router.get("/:id/videos", optionalAuth, async (req, res) => {
  try {
    if (req.userId) {
      const userBlockedTarget = await isBlocked(req.userId, req.params.id);
      if (userBlockedTarget) return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT v.*, u.display_name AS author_name, u.avatar_url AS author_avatar
      FROM videos v
      JOIN users u ON v.author_id = u.id
      WHERE v.author_id = $1 AND v.is_flagged = false
      ORDER BY v.created_at DESC
    `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get user videos error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- FOLLOW / UNFOLLOW ---------------- */
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const existing = await pool.query(
      "SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.userId, req.params.id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
        [req.userId, req.params.id]
      );
      return res.json({ following: false });
    }

    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)",
      [req.userId, req.params.id]
    );

    res.json({ following: true });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
