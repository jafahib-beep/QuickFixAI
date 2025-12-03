import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  FlatList,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Comment, Video } from "@/utils/api";
import { getCategoryByKey } from "@/constants/categories";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const { width, height } = Dimensions.get("window");

type VideoPlayerRouteProp = RouteProp<RootStackParamList, "VideoPlayer">;

type VideoPlayerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function VideoPlayerScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<VideoPlayerNavigationProp>();
  const route = useRoute<VideoPlayerRouteProp>();
  const { user } = useAuth();
  const { videos, toggleSave, toggleLike, getComments, addComment } = useVideos();

  const { video: routeVideo } = route.params;
  const video = videos.find(v => v.id === routeVideo.id) || routeVideo as unknown as Video;

  const [isMuted, setIsMuted] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const isSaved = video.isSaved ?? false;
  const isLiked = video.isLiked ?? false;
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

  useEffect(() => {
    loadComments();
  }, [video.id]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    const loadedComments = await getComments(video.id);
    setComments(loadedComments);
    setIsLoadingComments(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this fix: ${video.title}`,
        title: video.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      t("common.report"),
      "Report this video for inappropriate content?",
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.yes"), style: "destructive", onPress: () => Alert.alert("Reported") },
      ]
    );
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    
    const newComment = await addComment(video.id, commentText.trim());
    if (newComment) {
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    }
  };

  const toggleUI = () => setShowUI(!showUI);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      <Pressable onPress={toggleUI} style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Feather name="play-circle" size={80} color="rgba(255,255,255,0.5)" />
        </View>

        {isMuted && showUI ? (
          <Pressable onPress={toggleMute} style={styles.muteIndicator}>
            <Feather name="volume-x" size={20} color="#FFFFFF" />
            <ThemedText type="small" style={styles.muteText}>
              {t("player.unmute")}
            </ThemedText>
          </Pressable>
        ) : null}
      </Pressable>

      {showUI ? (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.topButton, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={12}
            >
              <Feather name="chevron-down" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleReport}
              style={({ pressed }) => [styles.topButton, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={12}
            >
              <Feather name="flag" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={[styles.bottomOverlay, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.bottomContent}>
              <View style={styles.infoSection}>
                <ThemedText type="h3" style={styles.videoTitle}>
                  {video.title}
                </ThemedText>

                <Pressable style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    <ThemedText type="small" style={styles.authorInitial}>
                      {(video.authorName ?? "U").charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={styles.authorName}>
                    {video.authorName ?? t("common.unknown")}
                  </ThemedText>
                </Pressable>

                <View style={styles.tagsRow}>
                  {category ? (
                    <Pressable
                      onPress={handleCategoryPress}
                      style={({ pressed }) => [
                        styles.categoryTag,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name={category.icon} size={14} color="#FFFFFF" />
                      <ThemedText type="small" style={styles.tagText}>
                        {t(category.labelKey)}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {(video.tags ?? []).slice(0, 3).map((tag, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleTagPress(tag)}
                      style={({ pressed }) => [
                        styles.tag,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <ThemedText type="small" style={styles.tagText}>
                        #{tag}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {video.description ? (
                  <ThemedText type="small" style={styles.description} numberOfLines={2}>
                    {video.description}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.actionsColumn}>
                <Pressable
                  onPress={() => toggleLike(video.id)}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather
                    name="heart"
                    size={26}
                    color={isLiked ? "#FF3B30" : "#FFFFFF"}
                  />
                  <ThemedText type="small" style={styles.actionText}>
                    {video.likesCount ?? (video as any).likes ?? 0}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => toggleSave(video.id)}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather
                    name="bookmark"
                    size={26}
                    color={isSaved ? theme.link : "#FFFFFF"}
                  />
                  <ThemedText type="small" style={styles.actionText}>
                    {isSaved ? t("toolbox.saved") : t("common.save")}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="share" size={26} color="#FFFFFF" />
                  <ThemedText type="small" style={styles.actionText}>
                    {t("common.share")}
                  </ThemedText>
                </Pressable>

                {video.commentsEnabled ? (
                  <Pressable
                    onPress={() => setShowComments(true)}
                    style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Feather name="message-circle" size={26} color="#FFFFFF" />
                    <ThemedText type="small" style={styles.actionText}>
                      {comments.length}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        </>
      ) : null}

      {showComments ? (
        <View style={[styles.commentsOverlay, { paddingBottom: insets.bottom }]}>
          <View style={[styles.commentsHeader, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText type="h4">{t("player.comments")}</ThemedText>
            <Pressable onPress={() => setShowComments(false)} hitSlop={12}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            style={{ backgroundColor: theme.backgroundRoot }}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <ThemedText type="body" style={[styles.noComments, { color: theme.textSecondary }]}>
                {t("player.noComments")}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <View style={[styles.commentAvatar, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {(item.authorName ?? "U").charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.commentContent}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {item.authorName ?? "User"}
                  </ThemedText>
                  <ThemedText type="body">{item.content}</ThemedText>
                </View>
              </View>
            )}
          />

          <View style={[styles.commentInput, { backgroundColor: theme.backgroundDefault }]}>
            <TextInput
              style={[styles.commentTextInput, { color: theme.text }]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("player.addComment")}
              placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
              multiline
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!commentText.trim()}
              style={({ pressed }) => [{ opacity: pressed || !commentText.trim() ? 0.5 : 1 }]}
            >
              <Feather name="send" size={22} color={theme.link} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
  },
  muteIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  muteText: {
    color: "#FFFFFF",
    marginLeft: Spacing.sm,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["5xl"],
    paddingHorizontal: Spacing.lg,
  },
  bottomContent: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  infoSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  videoTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  authorInitial: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  authorName: {
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tagText: {
    color: "#FFFFFF",
  },
  description: {
    color: "rgba(255,255,255,0.8)",
  },
  actionsColumn: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  commentsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  commentsList: {
    padding: Spacing.lg,
  },
  noComments: {
    textAlign: "center",
    paddingVertical: Spacing["3xl"],
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  commentContent: {
    flex: 1,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  commentTextInput: {
    flex: 1,
    fontSize: 16,
    marginRight: Spacing.md,
    maxHeight: 80,
  },
});
