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
/contexts         - React contexts (AuthContext, VideosContext, LanguageContext)
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
6. **Toolbox** - Save and organize favorite videos
7. **Multi-language** - 6 languages with RTL support for Arabic
8. **AI Features** - Tag suggestions and description generation (requires API)
9. **Category System** - 10 fixed categories with filtering, tappable chips on VideoCard/VideoPlayerScreen

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
The app runs in offline-first mode using sample data and local storage.

### Full Stack (Production)
1. Start backend: `node server/index.js`
2. Start frontend: `npm run dev`
Backend requires DATABASE_URL environment variable.

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

## Environment Variables
- DATABASE_URL - PostgreSQL connection string
- SESSION_SECRET - JWT secret key
- OPENAI_API_KEY - For AI features (optional)

## Design Guidelines
- iOS 26 Liquid Glass UI style
- Feather icons from @expo/vector-icons
- Clean minimal design with white background
- 5-tab bottom navigation with center FAB for upload
- Safe area insets handled by helper components
