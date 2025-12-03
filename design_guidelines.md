# QuickFix Design Guidelines

## Design Philosophy
Modern dark theme with blue accent, inspired by TikTok/Instagram Reels but with a distinct QuickFix identity for troubleshooting videos.

## Color Palette

### Dark Theme (Primary)
- **Background Root:** #0D0D0D (deepest black)
- **Background Default:** #1A1A1A (card backgrounds)
- **Background Secondary:** #252525 (elevated surfaces)
- **Background Tertiary:** #333333 (chips, badges)
- **Text Primary:** #FFFFFF
- **Text Secondary:** #A0A0A0
- **Accent/Link:** #0A84FF (iOS blue)
- **Error:** #FF453A
- **Success:** #30D158
- **Border:** #2A2A2A

### Light Theme (Fallback)
- **Background Root:** #FFFFFF
- **Background Default:** #F8F8F8
- **Accent/Link:** #0066FF

## Typography

- **H1:** 32pt, Bold, letter-spacing -0.5
- **H2:** 24pt, Semibold, letter-spacing -0.3
- **H3:** 20pt, Semibold, letter-spacing -0.2
- **H4:** 17pt, Semibold, letter-spacing -0.1
- **Body:** 16pt, Regular
- **Small:** 14pt, Regular
- **Caption:** 12pt, Medium, letter-spacing 0.2

## Spacing System
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px
- 3xl: 32px
- 4xl: 40px
- 5xl: 48px

## Border Radius
- xs: 8px (badges, small chips)
- sm: 12px (inputs, buttons)
- md: 16px (cards, containers)
- lg: 20px
- xl: 24px
- full: 9999px (pills, avatars)

## Component Specifications

### Video Card
- Corner radius: 16px (md)
- Background: cardBackground (dark: #1A1A1A)
- Thumbnail: 16:9 aspect ratio with gradient overlay
- Play icon: 52px circle with frosted glass effect
- Duration badge: bottom-right, small border radius
- Content padding: 16px
- Author avatar: 26px circle with accent color background
- Tags: small chips with category colors

### Category Chips
- Height: auto with sm padding
- Border radius: full (pill shape)
- Active state: accent blue background, white text
- Inactive state: backgroundSecondary, regular text
- Icon + label with xs gap

### Search Bar
- Height: 48px
- Border radius: md (16px)
- Background: backgroundSecondary
- Clear button: circular with backgroundTertiary

### Settings Rows
- Icon container: 36px rounded square
- Divider: starts after icon container
- Section headers: uppercase caption with secondary color

### Empty States
- Icon container: 80px circle
- Icon: 40px, secondary color or accent
- Title: h4 weight
- Hint: body text, secondary color, centered

### Buttons
- Primary: accent blue background, white text
- Height: 52px
- Border radius: md (16px)
- Press feedback: opacity 0.85, subtle scale

### Inputs
- Height: 52px
- Border radius: md (16px)
- Background: backgroundSecondary
- Border: 1px border color
- Focus: accent blue border

## Navigation

### Tab Bar
- 5 tabs with center FAB for upload
- Active tab: accent blue icon
- Inactive tab: secondary color icon
- Background: dark with subtle blur

### Headers
- Transparent on main screens
- Standard solid header on detail screens
- Custom header on Home with logo

## Interaction Patterns

### Touch Feedback
- Opacity: 0.85-0.95 on press
- Scale: 0.97-0.99 on press for cards
- Transition: subtle spring animation

### Loading States
- ActivityIndicator with accent blue color
- Skeleton placeholders for content
- Pull-to-refresh with accent tint

## Safe Area Guidelines
- All screens handle safe area insets
- Tab bar height considered for bottom padding
- Header height considered for top padding
- Keyboard avoidance for forms

## Icons
- Feather icons exclusively
- Default size: 20px
- Small: 14-16px
- Large: 24-28px
- Empty state icons: 32-40px

## Category Colors
Each category has a distinct color for visual identification:
- Kitchen: Orange
- Bathroom: Cyan
- Cleaning: Green
- Laundry: Purple
- Electronics: Yellow
- Car & Motor: Red
- Tools & DIY: Brown
- Plumbing: Blue
- Emergency: Red (alert)
- Other: Gray

## Accessibility
- Minimum touch target: 44x44pt
- Color contrast: WCAG AA compliant
- Dynamic type support
- VoiceOver labels on all interactive elements
