# QuickFix - Mobile Video Troubleshooting App

## Overview
QuickFix is a mobile-first video troubleshooting application designed for 30-60 second fix-it videos. It aims to empower users to share and discover solutions for common household and technical problems through short-form video content. The app supports cross-platform compatibility across iOS, Android, and web using Expo/React Native, offering a comprehensive solution for visual troubleshooting, community support, and AI-powered assistance. Its key capabilities include user authentication, video upload, a TikTok-style video feed, search functionality, social interactions, a personal toolbox for saving content, multi-language support, and advanced AI features for content generation and visual guidance. The project's ambition is to create a go-to platform for quick and effective problem-solving through user-generated and AI-enhanced video guides.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development and for you to ask before making major changes. Do not make changes to files in the `locales` folder unless explicitly instructed.

## System Architecture

### UI/UX Decisions
The application features a modern dark theme with a blue accent (#0A84FF), respecting system color schemes. It draws inspiration from iOS 26 Liquid Glass UI styling, utilizing Feather icons. The design incorporates dark backgrounds (#0D0D0D for root, #1A1A1A for cards, #252525 for secondary elements), polished UI with refined shadows, modern card designs, and pill-shaped chips. A 5-tab bottom navigation (Home, LiveAssist, Upload (FAB), Community, Profile) is implemented, with a central Floating Action Button (FAB) for video uploads. AI Chat functionality is merged into LiveAssist screen with a segmented control toggle (Analysis | AI Chat). Safe area insets are handled by helper components.

**Recent UI Polish (Dec 2024):**
- Tab bar: Icon size 24px, label size 12px for improved visibility
- HomeScreen: 4xl (48px) section spacing for visual breathing room
- ProfileScreen: Centered stats row, polished XP card with 8px progress bar
- SettingsScreen: New "Legal" section with Community Guidelines, Terms of Service, Privacy Policy; "About" section with version info
- LiveAssist: Interactive tappable checklist for steps with visual completion feedback (checkmarks, strikethrough, "All done!" badge)
- AIChatScreen: Polished message bubbles with 80% max width, BorderRadius.xl, improved line height (24px), larger avatars (32px)
- CategoryFilter: Compact chip styling with Spacing.xs gap, 13px font size
- VideoCard: Refined content padding and title letterSpacing (-0.2)
- LiveAssistScreen: Enhanced result cards with BorderRadius.xl for more polished appearance

**Test Release Prep (Dec 2024):**
- New app icon: Wrench with lightning bolt on dark blue gradient background with electric blue symbol
- Splash screen: Updated to dark theme (#0D0D0D background)
- Android adaptive icon: Background color set to #0D0D0D
- PrivacyTermsScreen: Dedicated legal screen with Privacy Policy, Terms of Service, and Community Guidelines
- AI Disclaimer: Important notice that AI suggestions are informational only and not professional advice
- Settings navigation: Legal section items now navigate to PrivacyTermsScreen instead of showing alerts

**Navigation Consolidation (Dec 2024):**
- Removed AI Chat tab from navigation (merged into LiveAssist with segmented control toggle)
- Removed Toolbox tab from navigation (saved items accessible via Profile -> Saved tab)
- LiveAssist screen now has Analysis | AI Chat mode toggle in header
- AIChatView component extracted for reuse within LiveAssist
- FollowerListScreen added for viewing/managing followers and following lists
- ProfileScreen followers/following counters are now clickable and navigate to FollowerListScreen

### Technical Implementations
The frontend is built with Expo/React Native, supporting multi-language (English, Swedish, Arabic with RTL, German, French, Spanish). The backend is an Express server with a PostgreSQL database. Development runs in a full-stack mode where `npm run dev` concurrently starts both the Express server (port 5000) and Expo frontend (port 8081). Metro is configured to proxy `/api/*` requests from the web to the backend. Mobile/Expo Go clients use direct backend URLs. Platform-specific URL handling is managed by `utils/api.ts`. The Community feed now uses real database entries only (no mock/sample data fallback).

### Feature Specifications
- **User Authentication**: Register, login, and profile management with an authentication gate.
- **Video Management**: Upload videos (up to 60 seconds) with category/tagging, and a TikTok-style immersive video feed with vertical swiping.
- **Search & Discovery**: Text search with category filtering.
- **Social Features**: Liking, commenting, saving, and sharing videos.
- **Toolbox**: Organize saved videos and AI-generated guides.
- **Category System**: 10 fixed categories (e.g., Kitchen, Bathroom) with filtering chips and tappable tags for navigation.
- **AI Integration** (connected to real OpenAI backend):
    - **AI Chat**: Multi-turn conversational AI with GPT-4o-mini (text) and GPT-4o (vision) for image analysis. Supports sending photos and videos for context. Calls POST /api/ai/chat.
    - **LiveAssist**: Dedicated visual troubleshooting with AI-generated step-by-step guides, including risk assessment and visual overlays highlighting problem areas. Interactive tappable checklist for steps. Calls POST /api/ai/liveassist.
    - **Content Generation**: AI-powered tag suggestions, description generation, and visual step-by-step guides with DALL-E 3 images.
- **Community**: A dedicated tab for users to post problems, share images, comment, and mark solutions. Uses real database entries only (no mock/sample data).
- **Notifications**: Comment notification system with 30-second polling. Bell icon with unread badge in Profile header. NotificationsScreen for viewing/managing notifications.
- **Video Library**: Comprehensive video library with 25+ videos including:
    - 5 real YouTube tutorial videos (plumbing, electrical, bathroom, DIY)
    - 20+ dummy QuickFix videos across all categories
    - YouTube videos open in external YouTube app/browser
    - Category filtering and sorting (Trending, Newest, Most Viewed)
    - "All Videos" link from HomeScreen's Recommended section
    - YouTube badge on tutorial videos with distinct red styling
- **Subscription System (LiveAssist Permission)**: Stripe-powered paid subscription for premium LiveAssist features:
    - **Pricing**: 39 SEK/month with 5-day free trial
    - **Free tier limits**: 2 image analyses per day, no video upload for AI
    - **Premium benefits**: Unlimited image analyses, video upload support, full AI responses
    - **Backend**: `backend/subscription.js` for usage tracking and limit enforcement
    - **Routes**: `/api/subscriptions/*` for status, checkout, trial, cancel, reactivate
    - **Stripe integration**: `stripe-replit-sync` for webhook handling and data sync
    - **Frontend**: `SubscriptionContext` for state management, `UpgradeModal` for upsell
    - **Settings integration**: Subscription section in SettingsScreen with plan status and cancel option
    - **Image usage tracking**: `image_usage` table with daily reset, enforced in AI routes
    - **Seed script**: `backend/seed-products.js` to create Stripe product and price
- **XP System**: Full gamification with 5 levels, real-time notifications, and duplicate prevention. Users earn XP for:
    - Daily login: +10 XP (once per day, tracked in xp_daily_login table)
    - Community post creation: +20 XP per post
    - Community comment: +10 XP (first comment per post only, tracked in xp_comment_post_tracking table)
    - Post marked as solved: +50 XP (awarded to the comment author who provided the solution)
    - Video upload: +30 XP per video
    - AI Chat messages: +5 XP per message
    - LiveAssist scans: +10 XP per scan
    - Video watches: +3 XP per video (5-minute cooldown per video to prevent farming)
    - Level thresholds: L1 (0-99 XP), L2 (100-249 XP), L3 (250-499 XP), L4 (500-999 XP), L5 (1000+ XP)
    - **Frontend components**: XpToast (green pill notification showing "+X XP Reason"), LevelUpModal (celebration modal on level-up)
    - **Backend service**: backend/services/xp.js with duplicate prevention and XP helpers
    - **API responses include XP data**: xpAwarded, totalXp, level, leveledUp fields in relevant endpoints

### System Design Choices
The project utilizes `start-dev.js` to manage concurrent execution of frontend and backend. `metro.config.js` includes `http-proxy-middleware` for API proxying. `utils/api.ts` handles platform-specific API client configurations. The backend's structure includes `routes`, `middleware`, and `db.js` for database interaction. The database schema includes tables for users, videos, likes, saves, comments, community posts, and notifications. Error handling prioritizes `console.log` for expected API fallbacks to prevent disruptive red overlays in Expo Go. The `expo-video` package is used for video playback.

## External Dependencies
- **Database**: PostgreSQL
- **AI Services**: OpenAI API (GPT-4o-mini, GPT-4o, DALL-E 3)
- **Payment Processing**: Stripe (subscriptions, checkout)
- **Authentication**: JWT (for session management)
- **Frontend Framework**: Expo/React Native
- **Backend Framework**: Express.js
- **UI Icons**: Feather icons (`@expo/vector-icons`)
- **Proxy**: `http-proxy-middleware` (for Metro config)
```