import { Platform } from "react-native";

const tintColorLight = "#0066FF";
const tintColorDark = "#0A84FF";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#666666",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    link: "#0066FF",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F8F8",
    backgroundSecondary: "#F0F0F0",
    backgroundTertiary: "#E5E5E5",
    border: "#E5E5E5",
    error: "#FF3B30",
    success: "#34C759",
    overlay: "rgba(0,0,0,0.6)",
    placeholder: "#999999",
    cardBackground: "#FFFFFF",
    cardBorder: "#E8E8E8",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#A0A0A0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: tintColorDark,
    link: "#0A84FF",
    backgroundRoot: "#0D0D0D",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#252525",
    backgroundTertiary: "#333333",
    border: "#2A2A2A",
    error: "#FF453A",
    success: "#30D158",
    overlay: "rgba(0,0,0,0.85)",
    placeholder: "#555555",
    cardBackground: "#1A1A1A",
    cardBorder: "#2A2A2A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 52,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
  link: {
    fontSize: 16,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
