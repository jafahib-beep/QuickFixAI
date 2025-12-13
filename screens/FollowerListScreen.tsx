import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { api as apiClient, UserPreview } from "@/utils/api";

export type FollowerListParams = {
  userId: string;
  type: "followers" | "following";
  userName?: string;
};

interface UserListItem {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing?: boolean;
}

export default function FollowerListScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user: currentUser } = useAuth();

  const params = route.params as FollowerListParams;
  const { userId, type, userName } = params;

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    try {
      const data = type === "followers" 
        ? await apiClient.getFollowers(userId)
        : await apiClient.getFollowing(userId);
      
      const mappedUsers = data.map((u: UserPreview) => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        isFollowing: false,
      }));
      setUsers(mappedUsers);

      const followingMap: Record<string, boolean> = {};
      mappedUsers.forEach((u: UserListItem) => {
        followingMap[u.id] = u.isFollowing || false;
      });
      setFollowingState(followingMap);
    } catch (error) {
      console.log("[FollowerListScreen] Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, type]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;

    const wasFollowing = followingState[targetUserId];
    setFollowingState((prev) => ({ ...prev, [targetUserId]: !wasFollowing }));

    try {
      await apiClient.followUser(targetUserId);
    } catch (error) {
      console.log("[FollowerListScreen] Follow toggle error:", error);
      setFollowingState((prev) => ({ ...prev, [targetUserId]: wasFollowing }));
    }
  };

  const navigateToProfile = (user: UserListItem) => {
    if (user.id === currentUser?.id) {
      navigation.navigate("MainTabs");
    } else {
      navigation.push("UserProfile", { userId: user.id, userName: user.displayName });
    }
  };

  const renderUserItem = ({ item }: { item: UserListItem }) => {
    const isCurrentUser = item.id === currentUser?.id;
    const isFollowing = followingState[item.id];

    return (
      <Pressable
        onPress={() => navigateToProfile(item)}
        style={({ pressed }) => [
          styles.userItem,
          { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.userInfo}>
          {item.avatarUrl ? (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="body" style={{ color: theme.text }}>
                {item.displayName?.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.link }]}>
              <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                {item.displayName?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
          <View style={styles.userText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {item.displayName}
            </ThemedText>
            {item.bio ? (
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
              >
                {item.bio}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {!isCurrentUser ? (
          <Pressable
            onPress={() => handleFollowToggle(item.id)}
            style={({ pressed }) => [
              styles.followButton,
              isFollowing
                ? { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }
                : { backgroundColor: theme.link },
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText
              type="small"
              style={{ fontWeight: "600", color: isFollowing ? theme.text : "#FFFFFF" }}
            >
              {isFollowing ? t("profile.following") : t("profile.follow")}
            </ThemedText>
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather
        name={type === "followers" ? "users" : "user-plus"}
        size={48}
        color={theme.textSecondary}
      />
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {type === "followers"
          ? t("profile.noFollowers") || "No followers yet"
          : t("profile.noFollowing") || "Not following anyone yet"}
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
          users.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  userText: {
    flex: 1,
  },
  followButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.md,
  },
  separator: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
