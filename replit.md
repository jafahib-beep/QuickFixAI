# QuickFix - Mobile Video Troubleshooting App

## Overview
QuickFix is a mobile-first video troubleshooting app for 30-60 second fix-it videos. Built with Expo/React Native for cross-platform compatibility with iOS, Android, and web.

## Current State
- **Frontend**: Complete MVP with all screens, multi-language support (English, Swedish, Arabic with RTL, German, French, Russian), and all core features
- **Backend**: Express server with PostgreSQL database, running alongside frontend via Metro proxy
- **Mode**: Full-stack mode with backend API accessible through Metro proxy
- **AI Chat**: Fully functional with GPT-4o-mini for text responses and GPT-4o for image analysis

## Architecture

### Development Mode (Full Stack)
- Run `npm run dev` to start both backend and frontend automatically
- **Backend**: Express server on port 5000
- **Frontend**: Expo/Metro on port 8081
- **API Routing**: Metro config proxies `/api/*` requests from web to backend on localhost:5000
- Web clients use relative URLs (`/api`) which go through the Metro proxy
- Mobile/Expo Go clients use direct backend URLs

### Key Files
- `start-dev.js` - Starts both backend and Expo servers concurrently
- `metro.config.js` - Custom Metro config with API proxy middleware (http-proxy-middleware)
- `utils/api.ts` - API client with platform-specific URL handling
- `server/index.js` - Express backend entry point

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT secret for authentication
- `OPENAI_API_KEY` - Required for AI chat, tag suggestions, description generation, visual guides

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

### Development (Full Stack)
Just press the **Run** button or run:
```bash
npm run dev
```
This automatically starts **both**:
- Express backend server on port 5000
- Expo frontend on port 8081

The `npm run dev` command runs `start-dev.js` which uses Node's child_process to spawn both servers concurrently.

### Backend Only
```bash
node server/index.js
```

### Frontend Only (Expo)
```bash
npx expo start
```
When running without the backend, the app operates in offline-first mode using sample data and local storage.

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
- POST /api/ai/ask-ai - Single-turn AI responses: {question, language} -> {answer}
- POST /api/ai/chat - Multi-turn chat with vision: {messages, language, imageBase64?, videoFileName?} -> {answer}
- POST /api/ai/liveassist - Instant visual troubleshooting: {imageBase64, language} -> {success, analysis: {summary, possibleIssue, steps[], safetyNote}}
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
- **LiveAssist Dedicated Tab**: Promoted LiveAssist to its own main tab in bottom navigation
  - New "LiveAssist" tab with lightning bolt icon between AI Chat and Upload
  - Dedicated LiveAssistScreen with prominent camera and gallery buttons
  - Welcome screen with feature bullets explaining AI-powered visual diagnosis
  - Structured result display with cards for: What I See, Likely Issue, Steps to Fix, Safety Note
  - "Scan Another Problem" button to reset and take new photo
  - Full i18n support with liveAssist.* translations in all 6 languages
  - Files: screens/LiveAssistScreen.tsx, navigation/LiveAssistStackNavigator.tsx
- **LiveAssist in AI Chat**: LiveAssist button also remains accessible in AI Chat screen
  - Prominent blue "LiveAssist" button with lightning bolt icon in AI Chat input area
  - Tap button → camera opens → photo sent to GPT-4o vision → AI returns structured diagnosis
  - Backend POST /api/ai/liveassist with structured response format
  - Response includes: summary (what AI sees), possible issue, numbered steps to fix, safety note
  - Loading state with "Analyzing your photo..." indicator
- **Smart Question Flow**: AI chat now behaves like a real technician
  - AI asks 1-2 targeted follow-up questions before giving solutions
  - Questions help diagnose the exact problem (location, symptoms, faucet type, tools available)
  - Only provides step-by-step solutions after gathering enough context
  - Can request photos when visual diagnosis would help
  - Example flow: "leaky faucet" → AI asks where leak is → user describes → AI asks faucet type → user answers → AI gives numbered repair steps
  - System prompt updated in server/routes/ai.js with conversational technician personality
- **Health Check Integration**: AI Chat screen now checks backend availability on mount
  - GET /api/health endpoint for connection status
  - Offline banner with retry button when backend is unavailable
  - Banner auto-clears when chat messages succeed
  - checkAIServiceHealth() function in utils/api.ts
- **AI Chat Always Visible**: Removed service availability fallback - chat UI is always displayed
  - Users can type and send messages immediately
  - If backend is unavailable, shows friendly error message in chat
  - No more "Coming Soon" blocking screen
  - Backend `/api/ai/chat` improved with better error handling and logging
- **AI Chat Interface**: Replaced Search screen with full-featured AI chat interface (AIChatScreen)
  - Real-time chat UI with scrollable message list (user and AI messages)
  - Text input with send button and attachment buttons
  - Image picker: Select from gallery to send photos for AI analysis (OpenAI Vision)
  - Video picker: Upload videos (AI asks follow-up questions about video content)
  - Image preview before sending with remove button
  - Welcome screen with suggested queries ("My faucet is dripping", etc.)
  - Loading states with "QuickFix AI is thinking..." indicator
  - Conversation history maintained during session
  - Tab navigation updated: "AI Chat" with message-circle icon
- **AI Chat Backend**: New `/api/ai/chat` endpoint for conversational AI
  - Accepts messages array for conversation history
  - Supports imageBase64 for vision analysis (uses GPT-4o with vision)
  - Supports videoFileName for video context (asks user to describe video)
  - Responds in user's selected language (6 languages supported)
  - Uses GPT-4o-mini for text, GPT-4o for image analysis
- **i18n Chat Translations**: Added chat.* translations in all 6 languages
  - title, placeholder, welcomeTitle, welcomeSubtitle, suggestions, thinking, sentImage, sentVideo, errors
- **Previous AI Features** (still available):
  - POST /api/ai/ask-ai - Single-turn conversational AI responses
  - POST /api/ai/suggest-tags - AI tag suggestions for uploads
  - POST /api/ai/generate-description - AI description generation
  - POST /api/ai/generate-guide - Visual step-by-step guides with DALL-E images
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
  - 7-tab bottom navigation: Home, AI Chat, LiveAssist, Upload (FAB), Community, Toolbox, Profile

## Design Guidelines
- Modern dark theme with blue accent (#0A84FF) - respects system color scheme
- iOS 26 Liquid Glass UI inspired styling
- Feather icons from @expo/vector-icons
- Dark backgrounds (#0D0D0D root, #1A1A1A cards, #252525 secondary)
- Polished UI with refined shadows, modern card designs, and pill-shaped chips
- 7-tab bottom navigation with center FAB for upload (Home, AI Chat, LiveAssist, Upload, Community, Toolbox, Profile)
- Safe area insets handled by helper components
- See design_guidelines.md for complete style guide
