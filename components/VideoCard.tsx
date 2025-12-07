import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Video } from "@/utils/api";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { getCategoryByKey } from "@/constants/categories";

type VideoCardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VideoCardProps {
  video: Video;
  isSaved?: boolean;
  isLiked?: boolean;
  onSave?: () => void;
  onLike?: () => void;
  onPress?: () => void;
  horizontal?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoCard({
  video,
  isSaved = false,
  isLiked = false,
  onSave,
  onLike,
  onPress,
  horizontal = false,
}: VideoCardProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<VideoCardNavigationProp>();

  const category = getCategoryByKey(video.category);

  const handleCategoryPress = (e: any) => {
    e.stopPropagation();
    if (category) {
      navigation.navigate("CategoryFeed", {
        categoryKey: category.key,
        categoryLabel: t(category.labelKey),
      });
    }
  };

  const handleTagPress = (tag: string, e: any) => {
    e.stopPropagation();
    navigation.navigate("TagFeed", { tag });
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    onLike?.();
  };

  const handleSavePress = (e: any) => {
    e.stopPropagation();
    onSave?.();
  };

  const cardStyles = [
    styles.card,
    horizontal && styles.cardHorizontal,
    { backgroundColor: theme.cardBackground },
  ];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ...cardStyles,
        { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View style={styles.thumbnailContainer}>
        <View style={[styles.thumbnail, { backgroundColor: theme.backgroundSecondary }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(10,132,255,0.15)', 'rgba(10,132,255,0.05)']
              : ['rgba(0,102,255,0.1)', 'rgba(0,102,255,0.03)']
            }
            style={styles.thumbnailGradient}
          />
          <View style={styles.playIconContainer}>
            <View style={[
              styles.playIcon, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }
            ]}>
              <Feather name="play" size={24} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
        </View>
        <View style={styles.durationBadge}>
          <ThemedText type="caption" style={styles.durationText}>
            {formatDuration(video.duration)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={2} style={styles.title}>
          {video.title}
        </ThemedText>

        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: theme.link }]}>
            <ThemedText type="caption" style={styles.avatarText}>
              {video.authorName?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.authorName, { color: theme.textSecondary }]}>
            {video.authorName || "Unknown"}
          </ThemedText>
        </View>

        <View style={styles.tagsRow}>
          {category ? (
            <Pressable
              onPress={handleCategoryPress}
              style={({ pressed }) => [
                styles.categoryTag,
                { 
                  backgroundColor: `${category.color}${isDark ? '25' : '15'}`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name={category.icon} size={11} color={category.color} />
              <ThemedText type="caption" style={{ color: category.color, fontWeight: '500' }}>
                {t(category.labelKey)}
              </ThemedText>
            </Pressable>
          ) : null}
          {(video.tags ?? []).slice(0, 2).map((tag, index) => (
            <Pressable
              key={index}
              onPress={(e) => handleTagPress(tag, e)}
              style={({ pressed }) => [
                styles.tag,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                #{tag}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleLikePress}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={10}
          >
            <Feather
              name="heart"
              size={18}
              color={isLiked ? "#FF3B30" : theme.textSecondary}
              style={{ opacity: isLiked ? 1 : 0.7 }}
            />
            <ThemedText 
              type="caption" 
              style={[
                styles.actionCount, 
                { color: isLiked ? "#FF3B30" : theme.textSecondary }
              ]}
            >
              {video.likesCount ?? 0}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleSavePress}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={10}
          >
            <Feather
              name="bookmark"
              size={18}
              color={isSaved ? theme.link : theme.textSecondary}
              style={{ opacity: isSaved ? 1 : 0.7 }}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  cardHorizontal: {
    width: 280,
  },
  thumbnailContainer: {
    position: "relative",
    aspectRatio: 16 / 9,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  thumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  durationText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    marginBottom: Spacing.sm,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  authorName: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    fontWeight: "500",
  },
});
