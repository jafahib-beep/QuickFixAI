import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Image, FlatList, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

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
  const { theme } = useTheme();
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
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {t("common.loading")}
          </ThemedText>
        </View>
      );
    }

    if (!displayVideos || displayVideos.length === 0) {
      return (
        <View style={styles.emptyGrid}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
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
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.gridThumbnail, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="play-circle" size={24} color={theme.textSecondary} />
            </View>
            <ThemedText type="small" numberOfLines={1} style={styles.gridTitle}>
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
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="h1">
                {user?.displayName?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.link }]}>
            <Feather name="edit-2" size={12} color="#FFFFFF" />
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
                <ThemedText type="small">{item}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText type="h4">{user?.followersCount || 0}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.followers")}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <ThemedText type="h4">{user?.followingCount || 0}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.following")}
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate("EditProfile")}
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {t("profile.editProfile")}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab("uploads")}
          style={[
            styles.tab,
            activeTab === "uploads" && { borderBottomColor: theme.text, borderBottomWidth: 2 },
          ]}
        >
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "uploads" ? "600" : "400",
              color: activeTab === "uploads" ? theme.text : theme.textSecondary,
            }}
          >
            {t("profile.uploads")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("saved")}
          style={[
            styles.tab,
            activeTab === "saved" && { borderBottomColor: theme.text, borderBottomWidth: 2 },
          ]}
        >
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "saved" ? "600" : "400",
              color: activeTab === "saved" ? theme.text : theme.textSecondary,
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
    paddingVertical: Spacing.xl,
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
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
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
  },
  expertiseContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
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
    height: 32,
  },
  editButton: {
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_SPACING,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  gridThumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  gridTitle: {
    paddingHorizontal: Spacing.xs,
  },
  emptyGrid: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
});
