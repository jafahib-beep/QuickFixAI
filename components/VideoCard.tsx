import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Video } from "@/utils/storage";

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
  const { theme } = useTheme();

  const cardStyle = horizontal ? styles.cardHorizontal : styles.card;

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
          <ThemedText type="caption" style={styles.durationText}>
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
            <ThemedText type="caption" style={{ fontWeight: "600" }}>
              {video.authorName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {video.authorName}
          </ThemedText>
        </View>

        <View style={styles.tagsRow}>
          {video.tags.slice(0, 3).map((tag, index) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {tag}
              </ThemedText>
            </View>
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
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {video.likes}
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
