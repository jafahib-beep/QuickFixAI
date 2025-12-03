import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Video } from "@/utils/storage";
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
  const { theme } = useTheme();
  const navigation = useNavigation<VideoCardNavigationProp>();

  const cardStyle = horizontal ? styles.cardHorizontal : styles.card;
  const category = getCategoryByKey(video.category);

  const handleCategoryPress = () => {
    if (category) {
      navigation.navigate("CategoryFeed", {
        categoryKey: category.key,
        categoryLabel: t(category.labelKey),
      });
    }
  };

  const handleTagPress = (tag: string) => {
    navigation.navigate("TagFeed", { tag });
  };

  return (
    <View style={[cardStyle, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.thumbnailContainer,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.thumbnail, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="play-circle" size={40} color={theme.textSecondary} />
        </View>
        <View style={[styles.duration, { backgroundColor: theme.overlay }]}>
          <ThemedText type="small" style={styles.durationText}>
            {formatDuration(video.duration)}
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={2} style={styles.title}>
          {video.title}
        </ThemedText>

        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              {video.authorName?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {video.authorName || "Unknown"}
          </ThemedText>
        </View>

        <View style={styles.tagsRow}>
          {category ? (
            <Pressable
              onPress={handleCategoryPress}
              style={({ pressed }) => [
                styles.categoryTag,
                { backgroundColor: `${category.color}20`, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name={category.icon} size={12} color={category.color} />
              <ThemedText type="small" style={{ color: category.color }}>
                {t(category.labelKey)}
              </ThemedText>
            </Pressable>
          ) : null}
          {(video.tags ?? []).slice(0, 2).map((tag, index) => (
            <Pressable
              key={index}
              onPress={() => handleTagPress(tag)}
              style={({ pressed }) => [
                styles.tag,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                #{tag}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onLike}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={8}
          >
            <Feather
              name={isLiked ? "heart" : "heart"}
              size={18}
              color={isLiked ? "#FF3B30" : theme.textSecondary}
              style={isLiked ? { opacity: 1 } : { opacity: 0.6 }}
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {video.likes ?? 0}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onSave}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={8}
          >
            <Feather
              name={isSaved ? "bookmark" : "bookmark"}
              size={18}
              color={isSaved ? theme.link : theme.textSecondary}
              style={isSaved ? { opacity: 1 } : { opacity: 0.6 }}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  cardHorizontal: {
    width: 260,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  thumbnailContainer: {
    position: "relative",
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  duration: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  durationText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
});
