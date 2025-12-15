const express = require("express");

// DB (correct path)
const db = require("../db");
const pool = db.pool;

// Auth (safe import)
const auth = require("./auth");
const authMiddleware = auth.authMiddleware;
const optionalAuth = auth.optionalAuth;

// XP services
const xp = require("../xp");
const awardXp = xp.awardXp;
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

    const blockedUserIds = await getBlockedUserIds(req.userId);

    let query = `
      SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
             EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
             EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved
      FROM videos v
      JOIN users u ON v.author_id = u.id
      WHERE v.is_flagged = false
    `;

    const params = [req.userId || null];
    let paramIndex = 2;

    if (blockedUserIds.length > 0) {
      query += ` AND v.author_id != ALL($${paramIndex})`;
      params.push(blockedUserIds);
      paramIndex++;
    }

    if (category && category !== "all") {
      query += ` AND v.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        v.title ILIKE $${paramIndex} OR
        v.description ILIKE $${paramIndex} OR
        $${paramIndex + 1} = ANY(v.tags)
      )`;
      params.push(`%${search}%`, search.toLowerCase());
      paramIndex += 2;
    }

    if (sort === "popular") {
      query += " ORDER BY v.likes_count DESC, v.created_at DESC";
    } else {
      query += " ORDER BY v.created_at DESC";
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json(
      result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        tags: row.tags,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        likesCount: row.likes_count,
        commentsEnabled: row.comments_enabled,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        isLiked: row.is_liked,
        isSaved: row.is_saved,
        createdAt: row.created_at
      }))
    );
  } catch (error) {
    console.error("Get videos error:", error);
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

    const blockedFilter = blockedUserIds.length > 0
      ? "AND v.author_id != ALL($2)"
      : "";
    const queryParams = blockedUserIds.length > 0
      ? [userId, blockedUserIds]
      : [userId];

    const [recommended, recent, popular] = await Promise.all([
      pool.query(`
        SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
               EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
               EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved
        FROM videos v
        JOIN users u ON v.author_id = u.id
        WHERE v.is_flagged = false ${blockedFilter}
        ORDER BY v.likes_count DESC, v.created_at DESC
        LIMIT 10
      `, queryParams),
      pool.query(`
        SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
               EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
               EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved
        FROM videos v
        JOIN users u ON v.author_id = u.id
        WHERE v.is_flagged = false ${blockedFilter}
        ORDER BY v.created_at DESC
        LIMIT 10
      `, queryParams),
      pool.query(`
        SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
               EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
               EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved
        FROM videos v
        JOIN users u ON v.author_id = u.id
        WHERE v.is_flagged = false AND v.created_at > NOW() - INTERVAL '30 days' ${blockedFilter}
        ORDER BY v.likes_count DESC
        LIMIT 10
      `, queryParams)
    ]);

    const format = rows => rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      tags: r.tags,
      videoUrl: r.video_url,
      thumbnailUrl: r.thumbnail_url,
      duration: r.duration,
      likesCount: r.likes_count,
      commentsEnabled: r.comments_enabled,
      authorId: r.author_id,
      authorName: r.author_name,
      authorAvatar: r.author_avatar,
      isLiked: r.is_liked,
      isSaved: r.is_saved,
      createdAt: r.created_at
    }));

    res.json({
      recommended: format(recommended.rows),
      new: format(recent.rows),
      popular: format(popular.rows)
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   CREATE VIDEO
=========================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, tags, videoUrl, thumbnailUrl, duration, commentsEnabled = true } = req.body;

    if (!title || !category || !duration) {
      return res.status(400).json({ error: "Title, category, and duration are required" });
    }

    const result = await pool.query(`
      INSERT INTO videos (author_id, title, description, category, tags, video_url, thumbnail_url, duration, comments_enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [req.userId, title, description, category, tags || [], videoUrl, thumbnailUrl, duration, commentsEnabled]);

    const xpResult = await awardXpDirect(req.userId, XP_REWARDS.video_upload, "video_upload");

    res.status(201).json({
      ...result.rows[0],
      xpAwarded: xpResult.success ? xpResult.xpAwarded : 0
    });
  } catch (error) {
    console.error("Create video error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
