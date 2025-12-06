import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video, UserProfile, api as apiClient } from "@/utils/api";

type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileScreenRouteProp = RouteProp<RootStackParamList, "UserProfile">;

const { width } = Dimensions.get("window");
const GRID_SPACING = Spacing.sm;
const GRID_COLUMNS = 2;
const CARD_WIDTH = (width - Spacing.xl * 2 - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const route = useRoute<UserProfileScreenRouteProp>();
  const { user: currentUser } = useAuth();

  const { userId } = route.params;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await apiClient.getUser(userId);
      setUserProfile(profile);
      setIsFollowing(profile.isFollowing ?? false);
      setIsBlocked(profile.isBlocked ?? false);
      
      const videos = await apiClient.getUserVideos(userId);
      setUserVideos(videos ?? []);
    } catch (error: any) {
      console.log("Error loading user profile:", error);
      if (error.message?.includes("User not available")) {
        setIsBlockedByUser(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (isBlocked) return;
    
    try {
      const result = await apiClient.followUser(userId);
      setIsFollowing(result.following);
    } catch (error) {
      console.log("Error following user:", error);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      t("block.confirmTitle"),
      t("block.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("block.blockUser"),
          style: "destructive",
          onPress: confirmBlock,
        },
      ]
    );
  };

  const confirmBlock = async () => {
    setIsBlocking(true);
    try {
      await apiClient.blockUser(userId);
      setIsBlocked(true);
      setIsFollowing(false);
      Alert.alert(t("common.success"), t("block.userBlocked"));
    } catch (error) {
      console.log("Error blocking user:", error);
      Alert.alert(t("common.error"), t("block.blockError"));
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockUser = async () => {
    setIsBlocking(true);
    try {
      await apiClient.unblockUser(userId);
      setIsBlocked(false);
      Alert.alert(t("common.success"), t("block.userUnblocked"));
    } catch (error) {
      console.log("Error unblocking user:", error);
      Alert.alert(t("common.error"), t("block.unblockError"));
    } finally {
      setIsBlocking(false);
    }
  };

  const handleVideoPress = (video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  };

  const handleReport = () => {
    if (!userProfile) return;
    navigation.navigate("Report", {
      contentType: "profile",
      targetUserId: userProfile.id,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  if (isBlockedByUser) {
    return (
      <View style={[styles.blockedContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.blockedIcon, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="user-x" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText type="h3" style={{ textAlign: "center", marginTop: Spacing.lg }}>
          {t("block.userNotAvailable")}
        </ThemedText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.link }]}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {t("common.back")}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {t("profile.userNotFound")}
        </ThemedText>
      </View>
    );
  }

  const renderVideoGrid = () => {
    if (!userVideos || userVideos.length === 0) {
      return (
        <View style={styles.emptyGrid}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="video" size={32} color={theme.textSecondary} />
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {t("profile.noUploads")}
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {userVideos.map((video) => (
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
                  ? ["rgba(10,132,255,0.1)", "rgba(10,132,255,0.02)"]
                  : ["rgba(0,102,255,0.08)", "rgba(0,102,255,0.02)"]
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.playBadge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
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
        <View style={styles.avatarContainer}>
          {userProfile.avatarUrl ? (
            <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.link }]}>
              <ThemedText type="h1" style={{ color: "#FFFFFF" }}>
                {userProfile.displayName?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="h2" style={styles.displayName}>
          {userProfile.displayName || "User"}
        </ThemedText>

        {userProfile.bio ? (
          <ThemedText type="body" style={[styles.bio, { color: theme.textSecondary }]}>
            {userProfile.bio}
          </ThemedText>
        ) : null}

        {isBlocked ? (
          <View style={[styles.blockedBanner, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="slash" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
              {t("block.youBlockedThisUser")}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: "700" }}>
              {userProfile.followersCount || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.followers")}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: "700" }}>
              {userProfile.followingCount || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.following")}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <ThemedText type="h3" style={{ fontWeight: "700" }}>
              {userVideos.length}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("profile.videos")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {!isBlocked ? (
            <Pressable
              onPress={handleFollow}
              style={({ pressed }) => [
                styles.followButton,
                { 
                  backgroundColor: isFollowing ? theme.backgroundSecondary : theme.link,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name={isFollowing ? "user-check" : "user-plus"}
                size={16}
                color={isFollowing ? theme.text : "#FFFFFF"}
              />
              <ThemedText
                type="body"
                style={{
                  color: isFollowing ? theme.text : "#FFFFFF",
                  fontWeight: "600",
                  marginLeft: Spacing.sm,
                }}
              >
                {isFollowing ? t("profile.following") : t("profile.follow")}
              </ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={isBlocked ? handleUnblockUser : handleBlockUser}
            disabled={isBlocking}
            style={({ pressed }) => [
              styles.blockButton,
              { 
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed || isBlocking ? 0.7 : 1,
              },
            ]}
          >
            {isBlocking ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <Feather
                  name={isBlocked ? "user-check" : "slash"}
                  size={16}
                  color={isBlocked ? theme.text : theme.error}
                />
                <ThemedText
                  type="body"
                  style={{
                    color: isBlocked ? theme.text : theme.error,
                    fontWeight: "600",
                    marginLeft: Spacing.sm,
                  }}
                >
                  {isBlocked ? t("block.unblockUser") : t("block.blockUser")}
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleReport}
            style={({ pressed }) => [
              styles.reportButton,
              { 
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="flag" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.videosSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          {t("profile.uploads")}
        </ThemedText>
        {renderVideoGrid()}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  blockedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  displayName: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  bio: {
    marginTop: Spacing.sm,
    textAlign: "center",
    maxWidth: "80%",
  },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xl,
  },
  stat: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  blockButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minWidth: 100,
    justifyContent: "center",
  },
  reportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  videosSection: {
    marginTop: Spacing["4xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  emptyGrid: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
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
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.75,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: Spacing.xs,
  },
});
