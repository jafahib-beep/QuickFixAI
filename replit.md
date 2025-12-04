# QuickFix - Mobile Video Troubleshooting App

## Overview
QuickFix is a mobile-first video troubleshooting app for 30-60 second fix-it videos. Built with Expo/React Native for cross-platform compatibility with iOS, Android, and web.

## Current State
- **Frontend**: Complete MVP with all screens, multi-language support (English, Swedish, Arabic with RTL, German, French, Russian), and all core features
- **Backend**: Express server with PostgreSQL database (requires separate deployment for production)
- **Mode**: Frontend operates in offline-first mode with local storage fallback when backend is unavailable

## Project Structure

### Frontend (Expo/React Native)
```
/screens          - All app screens (Home, Search, Upload, Toolbox, Profile, etc.)
/components       - Reusable UI components
/contexts         - React contexts (AuthContext, VideosContext, CommunityContext, LanguageContext)
/navigation       - React Navigation setup
/constants        - Theme, colors, spacing
/hooks            - Custom hooks
/utils            - API client, storage, sample data
/locales          - i18n translation files
```

### Backend (Express/PostgreSQL)
```
/server
  /routes         - API routes (auth, videos, users, toolbox, notifications, ai)
  /middleware     - JWT auth middleware
  db.js           - Database connection and schema
  index.js        - Express server entry point
```

## Key Features
1. **User Authentication** - Register, login, profile management with local fallback, proper auth gate (requires login to access main app)
2. **Video Upload** - Pick or record videos up to 60 seconds with category/tags
3. **Video Feed** - Home feed with recommended, new, and popular sections
4. **Search** - Text search with category filtering
5. **Social Features** - Like, comment, save, share videos
6. **Toolbox** - Save and organize favorite videos and AI guides
7. **Multi-language** - 6 languages with RTL support for Arabic
8. **AI Features** - Tag suggestions, description generation, and visual step-by-step guides with AI-generated images
9. **Category System** - 10 fixed categories with filtering, tappable chips on VideoCard/VideoPlayerScreen
10. **AI Visual Guides** - Generate step-by-step troubleshooting guides with AI-created images from search queries
11. **Community** - Post problems, share images, comment, and help each other solve fix-it issues

## Category System
- **Fixed Categories**: Kitchen, Bathroom, Cleaning, Laundry, Electronics, Car & Motor, Tools & DIY, Plumbing, Emergency, Other
- **Category Filter**: Horizontal scrollable chips on Home screen for filtering videos
- **Tappable Navigation**: Category chips and hashtag tags on VideoCard and VideoPlayerScreen navigate to filtered views
- **Category Routes**: CategoryFeed (filter by category), TagFeed (filter by tag)
- **Config File**: constants/categories.ts with i18n label keys and Feather icons

## Running the App

### Frontend Only (Development)
```bash
npm run dev
```
The app runs in offline-first mode using sample data and local storage. When the API is unavailable, the app gracefully falls back to sample data without showing error screens.

### Full Stack (Production)
1. Start backend: `node server/index.js`
2. Start frontend: `npm run dev`
Backend requires DATABASE_URL environment variable.

### Mobile Testing (Expo Go)
- Scan QR code from Replit's URL bar menu to test on physical device
- API URL is configured via `app.config.js` using REPLIT_DEV_DOMAIN
- App uses console.log instead of console.error for API fallbacks to avoid red error overlays on mobile

## API Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/videos - Get video feed
- GET /api/videos/feed - Get categorized feed
- POST /api/videos - Upload video
- POST /api/videos/:id/like - Toggle like
- POST /api/videos/:id/save - Toggle save
- GET /api/videos/:id/comments - Get comments
- POST /api/videos/:id/comments - Add comment
- GET /api/toolbox - Get saved videos
- POST /api/ai/suggest-tags - AI tag suggestions
- POST /api/ai/generate-description - AI description generation
- POST /api/ai/generate-guide - Generate visual step-by-step guide with AI images
- POST /api/ai/ask-ai - Conversational AI responses: {question, language} -> {answer}
- GET /api/community/posts - Get community posts
- POST /api/community/posts - Create new community post
- GET /api/community/posts/:id/comments - Get post comments
- POST /api/community/posts/:id/comments - Add comment to post
- PUT /api/community/posts/:id/solution - Mark comment as solution

## Database Schema
- users - User accounts with profile info
- videos - Video metadata with category, tags, likes count
- video_likes - Like relationships
- video_saves - Saved video relationships
- toolbox_folders - Folder organization
- comments - Video comments
- follows - User follow relationships
- notifications - User notifications
- video_reports - Content reporting
- community_posts - Community help posts with title, description, category, status (open/answered/solved)
- community_comments - Comments on community posts with solution marking

## Environment Variables
- DATABASE_URL - PostgreSQL connection string
- SESSION_SECRET - JWT secret key
- OPENAI_API_KEY - For AI features (optional)

## Recent Changes (Dec 2024)
- **AI-First Search Experience**: Redesigned Search screen with problem-solving focus
  - Prominent AI entry area with "What do you want to fix today?" prompt
  - Multiline text input for describing problems in natural language
  - "Ask AI" button inside input container for quick access
  - Keyboard return key submits the query (returnKeyType="search")
  - Category filter chips for narrowing search scope
  - "Find Solution" button with loading state ("Searching...") triggers video search + AI guide + conversational AI
  - Combined results view: Recommended QuickFix video + Other videos + AI Quick Guide
  - "No videos yet" message shown when no matching videos exist, with AI guide fallback
- **AI Conversational Responses**: New `/ask-ai` endpoint for natural language troubleshooting
  - Uses GPT-4o-mini for helpful, detailed responses
  - Supports all 6 languages (responds in user's selected language)
  - SearchScreen shows real AI response in "AI snabbguide" card instead of generic fallback steps
  - Fallback: If AI returns generic content (like "Search for tutorials"), shows conversational answer instead
  - Demo login fallback: When API unavailable, creates demo user for testing
- **AI Visual Guides**: Generate step-by-step troubleshooting guides with AI-generated images
  - Generates 3-5 actionable steps using GPT-4o-mini
  - Creates illustrative images for key steps using DALL-E 3
  - Guides can be saved to Toolbox for later reference
  - Multi-language support for guide generation
  - Fallback to text-only guides when API unavailable
- **Toolbox Tabs**: Added tabs to switch between saved videos and saved AI guides
- **TikTok-Style Video Player**: New SwipeVideoPlayerScreen with vertical FlatList for immersive full-screen video swiping
  - Tapping any video card opens SwipeVideoPlayer instead of single VideoPlayer
  - Vertical swipe navigation between videos with paging enabled
  - Videos auto-pause when swiped away, play when active
  - Full-screen overlays for title/author/category/tags at bottom
  - Action buttons (like, save, share) on right side
  - All feed screens (Home, Category, Tag, Search, Toolbox) navigate to SwipeVideoPlayer
- **Video Package Update**: Replaced deprecated expo-av with modern expo-video for video playback
- **VideoCard Touch Fix**: Made entire VideoCard tappable via onPress prop (screens pass onPress to VideoCard, not wrap in Pressable)
- **Error Handling**: Changed console.error to console.log for expected API fallbacks to prevent red overlays in Expo Go
- **Community Feature**: Added complete Community tab for users to post problems and help each other
  - CommunityScreen with post feed, status indicators (open/answered/solved), and create post button
  - CommunityPostDetailScreen with full post view, comments section, and comment input
  - CreatePostScreen modal with title, description, category selection, optional image URL
  - CommunityContext with sample data fallback pattern like VideosContext
  - Backend API routes for posts, comments, and solution marking
  - Full i18n support with 30+ new translation keys across all 6 languages
  - 6-tab bottom navigation: Home, Search, Upload (FAB), Community, Toolbox, Profile

## Design Guidelines
- Modern dark theme with blue accent (#0A84FF) - respects system color scheme
- iOS 26 Liquid Glass UI inspired styling
- Feather icons from @expo/vector-icons
- Dark backgrounds (#0D0D0D root, #1A1A1A cards, #252525 secondary)
- Polished UI with refined shadows, modern card designs, and pill-shaped chips
- 6-tab bottom navigation with center FAB for upload (Home, Search, Upload, Community, Toolbox, Profile)
- Safe area insets handled by helper components
- See design_guidelines.md for complete style guide
