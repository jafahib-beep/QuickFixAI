import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useCommunity } from "@/contexts/CommunityContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { CommunityPost } from "@/utils/api";
import { CATEGORIES_WITH_ALL, getCategoryIcon, getCategoryColor } from "@/constants/categories";

type CommunityScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string, theme: any): string {
  switch (status) {
    case "open":
      return "#FF9500";
    case "answered":
      return theme.link;
    case "solved":
      return "#34C759";
    default:
      return theme.textSecondary;
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "open":
      return "help-circle";
    case "answered":
      return "message-circle";
    case "solved":
      return "check-circle";
    default:
      return "circle";
  }
}

interface PostCardProps {
  post: CommunityPost;
  onPress: () => void;
}

function PostCard({ post, onPress }: PostCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const categoryIcon = getCategoryIcon(post.category);
  const statusColor = getStatusColor(post.status, theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.postCard,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.postHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category) + "20" }]}>
          <Feather name={categoryIcon} size={12} color={getCategoryColor(post.category)} />
          <ThemedText type="small" style={{ color: getCategoryColor(post.category), marginLeft: 4 }}>
            {t(`categories.${post.category}`)}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Feather name={getStatusIcon(post.status) as any} size={12} color={statusColor} />
          <ThemedText type="small" style={{ color: statusColor, marginLeft: 4, textTransform: "capitalize" }}>
            {t(`community.status.${post.status}`)}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="h4" style={styles.postTitle} numberOfLines={2}>
        {post.title}
      </ThemedText>

      <ThemedText type="body" style={[styles.postDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {post.description}
      </ThemedText>

      {post.imageUrl ? (
        <View style={[styles.postImage, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="image" size={24} color={theme.textSecondary} />
        </View>
      ) : null}

      <View style={styles.postFooter}>
        <View style={styles.authorInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.link }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {post.authorName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {post.authorName}
          </ThemedText>
        </View>
        <View style={styles.postMeta}>
          <Feather name="message-circle" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4, marginRight: 12 }}>
            {post.commentsCount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatTimeAgo(post.createdAt)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { posts, isLoading, refreshPosts } = useCommunity();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (selectedStatus !== "all") {
      result = result.filter((p) => p.status === selectedStatus);
    }
    return result;
  }, [posts, selectedCategory, selectedStatus]);

  const handlePostPress = useCallback((post: CommunityPost) => {
    navigation.navigate("CommunityPostDetail", { postId: post.id });
  }, [navigation]);

  const handleCreatePost = useCallback(() => {
    navigation.navigate("CreatePost");
  }, [navigation]);

  const statusFilters = [
    { key: "all", label: t("categories.all") },
    { key: "open", label: t("community.status.open") },
    { key: "answered", label: t("community.status.answered") },
    { key: "solved", label: t("community.status.solved") },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshPosts}
            tintColor={theme.link}
          />
        }
        contentContainerStyle={styles.content}
      >
        <Pressable
          onPress={handleCreatePost}
          style={({ pressed }) => [
            styles.askButton,
            { backgroundColor: theme.link, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Feather name="edit-3" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={styles.askButtonText}>
            {t("community.askCommunity")}
          </ThemedText>
        </Pressable>

        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {CATEGORIES_WITH_ALL.slice(0, 6).map((category) => (
              <Pressable
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedCategory === category.key
                        ? theme.link
                        : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedCategory === category.key ? "#FFFFFF" : theme.text,
                    fontWeight: selectedCategory === category.key ? "600" : "500",
                  }}
                >
                  {t(category.labelKey)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statusFilters}>
          {statusFilters.map((status) => (
            <Pressable
              key={status.key}
              onPress={() => setSelectedStatus(status.key)}
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    selectedStatus === status.key
                      ? theme.link
                      : theme.backgroundSecondary,
                },
              ]}
            >
              {status.key !== "all" ? (
                <Feather
                  name={getStatusIcon(status.key) as any}
                  size={12}
                  color={selectedStatus === status.key ? "#FFFFFF" : getStatusColor(status.key, theme)}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <ThemedText
                type="small"
                style={{
                  color: selectedStatus === status.key ? "#FFFFFF" : theme.text,
                  fontWeight: selectedStatus === status.key ? "600" : "500",
                }}
              >
                {status.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {isLoading && filteredPosts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.link} />
          </View>
        ) : filteredPosts.length > 0 ? (
          <View style={styles.postsContainer}>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => handlePostPress(post)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="users" size={32} color={theme.textSecondary} />
            </View>
            <ThemedText type="h4" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              {t("community.noPosts")}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, opacity: 0.7, textAlign: "center" }}>
              {t("community.noPostsHint")}
            </ThemedText>
          </View>
        )}
      </ScreenScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  askButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  filtersSection: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.xl,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  postsContainer: {
    gap: Spacing.lg,
  },
  postCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  postTitle: {
    marginBottom: Spacing.sm,
  },
  postDescription: {
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  postImage: {
    height: 120,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
});
