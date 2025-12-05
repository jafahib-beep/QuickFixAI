import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");
const GRID_SPACING = Spacing.sm;
const GRID_COLUMNS = 2;
const CARD_WIDTH = (width - Spacing.xl * 2 - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useAuth();
  const { getVideosByAuthor, getSavedVideos } = useVideos();

  const [activeTab, setActiveTab] = useState<"uploads" | "saved">("uploads");
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [user?.id]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const uploads = await getVideosByAuthor(user.id);
        setUserVideos(uploads ?? []);
      }
      const saved = await getSavedVideos();
      setSavedVideos(saved ?? []);
    } catch (error) {
      console.log("Error loading videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayVideos = activeTab === "uploads" ? userVideos : savedVideos;

  const handleVideoPress = (video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  };

  const renderVideoGrid = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyGrid}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      );
    }

    if (!displayVideos || displayVideos.length === 0) {
      return (
        <View style={styles.emptyGrid}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather 
              name={activeTab === "uploads" ? "video" : "bookmark"} 
              size={32} 
              color={theme.textSecondary} 
            />
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            {activeTab === "uploads" ? t("profile.noUploads") : t("toolbox.empty")}
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {displayVideos.map((video) => (
          <Pressable
            key={video.id}
            onPress={() => handleVideoPress(video)}
            style={({ pressed }) => [
              styles.gridItem,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <View style={[styles.gridThumbnail, { backgroundColor: theme.backgroundSecondary }]}>
              <LinearGradient
                colors={isDark 
                  ? ['rgba(10,132,255,0.1)', 'rgba(10,132,255,0.02)']
                  : ['rgba(0,102,255,0.08)', 'rgba(0,102,255,0.02)']
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.playBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Feather name="play" size={16} color="#FFFFFF" />
              </View>
            </View>
            <ThemedText type="small" numberOfLines={2} style={styles.gridTitle}>
              {video.title}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <Pressable
          onPress={() => navigation.navigate("EditProfile")}
          style={({ pressed }) => [
            styles.avatarContainer,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.link }]}>
              <ThemedText type="h1" style={{ color: '#FFFFFF' }}>
                {user?.displayName?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="edit-2" size={12} color={theme.text} />
          </View>
        </Pressable>

        <ThemedText type="h2" style={styles.displayName}>
          {user?.displayName || "User"}
        </ThemedText>

        {user?.bio ? (
          <ThemedText type="body" style={[styles.bio, { color: theme.textSecondary }]}>
            {user.bio}
          </ThemedText>
        ) : null}

        {user?.expertiseCategories && user.expertiseCategories.length > 0 ? (
          <View style={styles.expertiseContainer}>
            {user.expertiseCategories.map((item: string, index: number) => (
              <View
                key={index}
                style={[styles.expertiseTag, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="small" style={{ fontWeight: '500' }}>{item}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: '700' }}>{user?.followersCount || 0}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.followers")}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: '700' }}>{user?.followingCount || 0}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.following")}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: '700' }}>{userVideos.length}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.uploads")}
            </ThemedText>
          </View>
        </View>

        {/* XP / Level Section */}
        <View style={[styles.xpSection, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.xpHeader}>
            <View style={styles.xpLevelBadge}>
              <Feather name="award" size={18} color={theme.link} />
              <ThemedText type="h3" style={[styles.xpLevelText, { color: theme.link }]}>
                {t("xp.level")} {user?.level || 1}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {user?.xp || 0} / {user?.nextLevelXp || 100} {t("xp.xp")}
            </ThemedText>
          </View>
          <View style={[styles.xpProgressBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.xpProgressFill, 
                { 
                  backgroundColor: theme.link,
                  width: `${Math.min(100, ((user?.xp || 0) - (user?.currentLevelXp || 0)) / ((user?.nextLevelXp || 100) - (user?.currentLevelXp || 0)) * 100)}%`
                }
              ]} 
            />
          </View>
          <ThemedText type="small" style={[styles.xpHint, { color: theme.textSecondary }]}>
            {((user?.nextLevelXp || 100) - (user?.xp || 0))} {t("xp.toNextLevel")}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => navigation.navigate("EditProfile")}
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: theme.backgroundSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="edit-2" size={16} color={theme.text} style={{ marginRight: Spacing.sm }} />
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {t("profile.editProfile")}
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab("uploads")}
          style={[
            styles.tab,
            activeTab === "uploads" && [styles.tabActive, { borderBottomColor: theme.link }],
          ]}
        >
          <Feather 
            name="video" 
            size={18} 
            color={activeTab === "uploads" ? theme.link : theme.textSecondary}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "uploads" ? "600" : "400",
              color: activeTab === "uploads" ? theme.link : theme.textSecondary,
            }}
          >
            {t("profile.uploads")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("saved")}
          style={[
            styles.tab,
            activeTab === "saved" && [styles.tabActive, { borderBottomColor: theme.link }],
          ]}
        >
          <Feather 
            name="bookmark" 
            size={18} 
            color={activeTab === "saved" ? theme.link : theme.textSecondary}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "saved" ? "600" : "400",
              color: activeTab === "saved" ? theme.link : theme.textSecondary,
            }}
          >
            {t("profile.saved")}
          </ThemedText>
        </Pressable>
      </View>

      {renderVideoGrid()}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  displayName: {
    marginBottom: Spacing.xs,
  },
  bio: {
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  expertiseContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  expertiseTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  stat: {
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: Spacing.xl,
    marginHorizontal: Spacing.xl,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  tabActive: {
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_SPACING,
    paddingHorizontal: Spacing.xl,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  gridThumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  gridTitle: {
    paddingHorizontal: Spacing.xs,
    lineHeight: 18,
  },
  emptyGrid: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  xpSection: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  xpLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  xpLevelText: {
    fontWeight: "700",
  },
  xpProgressBar: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  xpProgressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  xpHint: {
    textAlign: "center",
  },
});
