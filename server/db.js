const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        bio VARCHAR(150),
        avatar_url TEXT,
        expertise_categories TEXT[] DEFAULT '{}',
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(60) NOT NULL,
        description VARCHAR(300),
        category VARCHAR(50) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        video_url TEXT,
        thumbnail_url TEXT,
        duration INTEGER NOT NULL CHECK (duration <= 60),
        likes_count INTEGER DEFAULT 0,
        comments_enabled BOOLEAN DEFAULT true,
        is_flagged BOOLEAN DEFAULT false,
        search_text TSVECTOR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      );

      CREATE TABLE IF NOT EXISTS video_saves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        folder_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      );

      CREATE TABLE IF NOT EXISTS toolbox_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        related_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_videos_author ON videos(author_id);
      CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
      CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_video_likes_video ON video_likes(video_id);
      CREATE INDEX IF NOT EXISTS idx_video_saves_user ON video_saves(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_videos_search ON videos USING gin(search_text);
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
