# QuickFix Design Guidelines

## Authentication Architecture

**Auth Required** - The app includes user accounts, sign-in, profile system, social features (followers/following, comments), and video uploads.

**Implementation:**
- **Primary Auth:** Email/password with social login options (Google Sign-In, Apple Sign-In)
- **Screens Required:**
  - Login screen with "Welcome back" title
  - Registration screen with display name, email, password fields
  - Forgot password flow
  - Three-slide onboarding (shown only on first launch after registration)
- **Account Management:**
  - Settings > Account section with change password and delete account (double confirmation required)
  - Logout with confirmation alert
  - Privacy policy and terms of service links (placeholder URLs)

## Navigation Architecture

**Tab Navigation** (5 tabs with center action button)

Tab structure:
1. **Home** - Main feed (house icon)
2. **Search** - Advanced search (search icon)
3. **Upload** - Center FAB (plus icon, elevated with shadow)
4. **Toolbox** - Saved videos (bookmark icon)
5. **Profile** - User profile (person icon)

All tabs use a stack navigator for deep navigation. Modal screens (video player, upload flow) presented outside tab context.

## Screen Specifications

### 1. Login/Registration Screens
- **Layout:** Stack-only, full-screen forms
- **Header:** None (custom title text inline)
- **Form Elements:**
  - Centered logo/app name at top
  - Input fields with labels
  - Primary action button (full-width)
  - Social login buttons (full-width, stacked)
  - Footer links (Forgot password, Sign up)
- **Safe Area:** Top: insets.top + 60, Bottom: insets.bottom + 24

### 2. Onboarding (3 Slides)
- **Layout:** Horizontal swiper with pagination dots
- **Content per slide:**
  - Large centered illustration area (240x240)
  - Title text (24pt, bold)
  - Body text (16pt, regular, max 2 lines)
  - "Get started" button on final slide only
- **Safe Area:** Full screen with bottom button: insets.bottom + 24

### 3. Home Feed
- **Header:** Custom transparent with app wordmark logo (left) and language selector icon (right)
- **Layout:** Vertical scrollable list with three sections
  - Section headers: "Recommended", "New", "Popular" (18pt, semibold)
  - Video cards in vertical list
- **Video Card Components:**
  - 16:9 thumbnail with duration badge (bottom-right)
  - Title (2 lines max, 16pt medium)
  - Creator row: small avatar (32px) + name (14pt)
  - Tag chips (horizontal scroll, 12pt)
  - Spacing: 16px between cards
- **Safe Area:** Top: headerHeight + 16, Bottom: tabBarHeight + 16

### 4. Search Screen
- **Header:** Search bar integrated in navigation header (not transparent)
- **Layout:** Scrollable list
  - Search results in same card format as Home
  - Filter chips below search bar: category filters (horizontal scroll)
  - Empty state: "No results found" with suggestion text
- **Safe Area:** Top: 16, Bottom: tabBarHeight + 16

### 5. Video Player (Full-Screen Modal)
- **Layout:** Non-scrollable, gesture-based
- **Header:** Transparent with back button (left), report button (right)
- **Content Layers:**
  - Background: Video (full screen)
  - Bottom overlay gradient (black gradient fade)
  - Bottom content: Title, author info, tags, description
  - Right side buttons (vertical stack): Like, Save, Share, Comments
- **Interactions:**
  - Tap center: play/pause
  - Tap once: show/hide UI elements
  - Swipe down: dismiss modal
- **Safe Area:** Top: insets.top + 16, Bottom: insets.bottom + 80

### 6. Upload Flow (Modal)
- **Header:** Standard navigation with "Cancel" (left), "Upload" title, "Publish" (right, disabled until valid)
- **Layout:** Scrollable form
  - Video preview card (16:9, centered)
  - Text input: Title (60 char max)
  - Text area: Description (300 char max, optional)
  - Category picker (dropdown/modal selector)
  - Tag input with AI suggestions (chips)
  - Toggle: "Allow comments"
- **Submit:** "Publish" button in header (enabled when title + category filled)
- **Safe Area:** Top: 16, Bottom: insets.bottom + 24

### 7. Toolbox (Saved Videos)
- **Header:** Standard with "Toolbox" title
- **Layout:** Vertical scrollable list
  - Same video card format as Home feed
  - Empty state: "No saved videos yet" with icon
- **Safe Area:** Top: 16, Bottom: tabBarHeight + 16

### 8. Profile Screen
- **Header:** Transparent with settings icon (right)
- **Layout:** Scrollable
  - Profile header section (centered):
    - Avatar (120px circle, editable)
    - Display name (24pt, semibold)
    - Bio (14pt, gray, 150 char max)
    - Expertise tags (chips, horizontal scroll)
    - Followers/Following counts (horizontal)
    - Edit Profile button (if own profile)
  - Tab selector: "Uploads" / "Saved"
  - Video grid (2 columns)
- **Safe Area:** Top: headerHeight + 16, Bottom: tabBarHeight + 16

### 9. Settings Screen
- **Header:** Standard with "Settings" title
- **Layout:** Scrollable grouped list
  - Language selector (shows current, opens modal picker)
  - Account section: Change password, Delete account
  - Notifications toggles
  - Privacy section
  - Logout button (destructive style)
- **Safe Area:** Top: 16, Bottom: tabBarHeight + 16

## Design System

### Color Palette
- **Primary:** #1A1A1A (dark text, buttons)
- **Secondary:** #666666 (secondary text)
- **Background:** #FFFFFF (main background)
- **Surface:** #F8F8F8 (card backgrounds)
- **Accent:** #0066FF (links, active states)
- **Border:** #E5E5E5 (subtle dividers)
- **Error:** #FF3B30 (destructive actions)
- **Success:** #34C759 (confirmations)
- **Overlay:** rgba(0,0,0,0.6) (video player overlay)

### Typography
- **Titles (Large):** 28pt, Bold
- **Titles (Standard):** 24pt, Semibold
- **Section Headers:** 18pt, Semibold
- **Body:** 16pt, Regular
- **Secondary:** 14pt, Regular
- **Caption:** 12pt, Regular
- **System Font:** San Francisco (iOS default)

### Spacing
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- xxl: 32px
- xxxl: 48px

### Component Specifications

**Video Card:**
- Corner radius: 12px
- Shadow: None (flat design)
- Thumbnail aspect ratio: 16:9
- Card padding: 0 (content padding: 12px)

**Buttons (Primary):**
- Height: 52px
- Corner radius: 12px
- Font: 16pt Semibold
- Background: #1A1A1A
- Text: #FFFFFF
- Press state: opacity 0.8
- Disabled: opacity 0.4

**Buttons (Secondary):**
- Height: 52px
- Corner radius: 12px
- Font: 16pt Semibold
- Background: #F8F8F8
- Text: #1A1A1A
- Border: 1px #E5E5E5
- Press state: background #EFEFEF

**Floating Action Button (Upload):**
- Size: 56x56px circle
- Background: #1A1A1A
- Icon: White plus, 24pt
- Shadow: offset(0,2), opacity 0.10, radius 2
- Press state: scale 0.95

**Input Fields:**
- Height: 52px
- Corner radius: 12px
- Background: #F8F8F8
- Border: 1px #E5E5E5
- Focus border: 2px #0066FF
- Font: 16pt Regular
- Placeholder: #999999

**Tag Chips:**
- Height: 28px
- Padding: 8px 12px
- Corner radius: 14px
- Background: #F0F0F0
- Text: 12pt Medium, #333333
- Press state: background #E5E5E5

**Avatar:**
- Sizes: 32px (small), 48px (medium), 120px (large)
- Circle shape
- Border: 1px #E5E5E5
- Default: Initials on gray background

### Multilingual & RTL Support
- **Language Selector:** Modal picker with checkmark on current
- **RTL Languages:** Arabic automatically flips layout
- **RTL Adjustments:**
  - Navigation buttons flip sides
  - Text alignment: right
  - Icons remain logical (arrows flip)
- **Hot Switching:** No app restart, instant UI update

### Interaction Design
- **All touchables:** Opacity feedback (0.7) on press
- **Floating buttons:** Subtle shadow + scale animation
- **List items:** No visual feedback (standard iOS behavior)
- **Swipe gestures:** Video player dismiss (swipe down), card navigation (horizontal in feed)
- **Pull to refresh:** Standard iOS rubber band on feed screens
- **Video autoplay:** Muted by default, tap to unmute

### Accessibility
- **Minimum touch target:** 44x44pt (iOS HIG)
- **Color contrast:** WCAG AA (4.5:1 for text)
- **Dynamic type:** Support iOS text sizing
- **VoiceOver labels:** All interactive elements
- **Video captions:** Display if available in video metadata

### Critical Assets
1. **App Icon:** Modern, minimal wrench or fix-it tool symbol
2. **Onboarding Illustrations (3):**
   - Slide 1: Play button with clock icon (quick videos concept)
   - Slide 2: Bookmark with checkmark (toolbox concept)
   - Slide 3: Upload arrow with community people (sharing concept)
3. **Empty State Illustrations:**
   - No saved videos: Empty toolbox icon
   - No search results: Magnifying glass with "X"
4. **Default Avatars (5 presets):** Minimalist geometric user silhouettes in muted colors

### Icons
- Use **Feather icons** from @expo/vector-icons exclusively
- Icon size: 24pt (default), 20pt (small), 28pt (large)
- No emojis anywhere in the app