const express = require("express");

// DB
const db = require("../db");
const pool = db.pool;

// ✅ AUTH – RÄTT PATH (DETTA VAR BUGGEN)
const auth = require("../auth");
const authMiddleware = auth.authMiddleware;
const optionalAuth = auth.optionalAuth;

// XP services
const xp = require("../xp");
const awardXpDirect = xp.awardXpDirect;
const XP_REWARDS = xp.XP_REWARDS;

// Block helpers
const block = require("../block");
const getBlockedUserIds = block.getBlockedUserIds;

const router = express.Router();

/* ===========================
   GET VIDEOS (LIST)
=========================== */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, search, sort = "recent", limit = 20, offset = 0 } = req.query;
    const userId = req.userId || null;

    const blockedUserIds = await getBlockedUserIds(userId);

    let query = `
      SELECT v.*, u.display_name AS author_name, u.avatar_url AS author_avatar
      FROM videos v
      JOIN users u ON v.author_id = u.id
      WHERE v.is_flagged = false
    `;

    const params = [];
    let i = 1;

    if (blockedUserIds.length > 0) {
      query += ` AND v.author_id != ALL($${i})`;
      params.push(blockedUserIds);
      i++;
    }

    if (category && category !== "all") {
      query += ` AND v.category = $${i}`;
      params.push(category);
      i++;
    }

    if (search) {
      query += ` AND (v.title ILIKE $${i} OR v.description ILIKE $${i})`;
      params.push(`%${search}%`);
      i++;
    }

    query += sort === "popular"
      ? " ORDER BY v.likes_count DESC, v.created_at DESC"
      : " ORDER BY v.created_at DESC";

    query += ` LIMIT $${i} OFFSET $${i + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get videos error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   GET FEED
=========================== */
router.get("/feed", optionalAuth, async (req, res) => {
  try {
    const userId = req.userId || null;
    const blockedUserIds = await getBlockedUserIds(userId);

    const filter = blockedUserIds.length > 0
      ? "AND v.author_id != ALL($1)"
      : "";

    const params = blockedUserIds.length > 0 ? [blockedUserIds] : [];

    const result = await pool.query(`
      SELECT v.*, u.display_name AS author_name, u.avatar_url AS author_avatar
      FROM videos v
      JOIN users u ON v.author_id = u.id
      WHERE v.is_flagged = false ${filter}
      ORDER BY v.created_at DESC
      LIMIT 20
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   CREATE VIDEO
=========================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      tags = [],
      videoUrl,
      thumbnailUrl,
      duration,
      commentsEnabled = true
    } = req.body;

    if (!title || !category || !duration) {
      return res.status(400).json({
        error: "Title, category, and duration are required"
      });
    }

    const result = await pool.query(`
      INSERT INTO videos
        (author_id, title, description, category, tags, video_url, thumbnail_url, duration, comments_enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      req.userId,
      title,
      description,
      category,
      tags,
      videoUrl,
      thumbnailUrl,
      duration,
      commentsEnabled
    ]);

    const xpResult = await awardXpDirect(
      req.userId,
      XP_REWARDS.video_upload,
      "video_upload"
    );

    res.status(201).json({
      ...result.rows[0],
      xpAwarded: xpResult?.xpAwarded || 0
    });
  } catch (err) {
    console.error("Create video error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
