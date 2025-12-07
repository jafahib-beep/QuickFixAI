import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useXp } from "@/contexts/XpContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { CommunityPost, CommunityComment } from "@/utils/api";
import { getCategoryIcon, getCategoryColor } from "@/constants/categories";

type RouteParams = RouteProp<RootStackParamList, "CommunityPostDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
    case "open": return "#FF9500";
    case "answered": return theme.link;
    case "solved": return "#34C759";
    default: return theme.textSecondary;
  }
}

interface CommentItemProps {
  comment: CommunityComment;
  isPostAuthor: boolean;
  onMarkSolution: () => void;
  onAuthorPress: () => void;
}

function CommentItem({ comment, isPostAuthor, onMarkSolution, onAuthorPress }: CommentItemProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.commentCard, { backgroundColor: theme.backgroundDefault }]}>
      {comment.isSolution ? (
        <View style={[styles.solutionBadge, { backgroundColor: "#34C759" + "20" }]}>
          <Feather name="check-circle" size={14} color="#34C759" />
          <ThemedText type="small" style={{ color: "#34C759", marginLeft: 4, fontWeight: "600" }}>
            {t("community.solution")}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.commentHeader}>
        <Pressable style={styles.commentAuthor} onPress={onAuthorPress} hitSlop={8}>
          <View style={[styles.avatar, { backgroundColor: theme.link }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {comment.authorName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ fontWeight: "600", color: theme.link }}>
            {comment.authorName}
          </ThemedText>
        </Pressable>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatTimeAgo(comment.createdAt)}
        </ThemedText>
      </View>

      <ThemedText type="body" style={[styles.commentContent, { color: theme.text }]}>
        {comment.content}
      </ThemedText>

      {comment.linkedVideoTitle ? (
        <View style={[styles.linkedVideo, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="video" size={16} color={theme.link} />
          <ThemedText type="small" style={{ color: theme.link, marginLeft: Spacing.sm, flex: 1 }}>
            {comment.linkedVideoTitle}
          </ThemedText>
        </View>
      ) : null}

      {isPostAuthor && !comment.isSolution ? (
        <Pressable
          onPress={onMarkSolution}
          style={[styles.markSolutionButton, { borderColor: "#34C759" }]}
        >
          <Feather name="check" size={14} color="#34C759" />
          <ThemedText type="small" style={{ color: "#34C759", marginLeft: 4 }}>
            {t("community.markSolution")}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CommunityPostDetailScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { handleXpResponse } = useXp();
  const { getPost, getComments, addComment, markAsSolution } = useCommunity();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { postId } = route.params;
  const isPostAuthor = user?.id === post?.authorId;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [postData, commentsData] = await Promise.all([
        getPost(postId),
        getComments(postId),
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch (error) {
      console.log("[CommunityPostDetail] Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, getPost, getComments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await addComment(postId, newComment.trim());
      if (comment) {
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        if (comment.xpAwarded) {
          handleXpResponse({
            xpAwarded: comment.xpAwarded,
            totalXp: comment.totalXp,
            level: comment.level,
            leveledUp: comment.leveledUp,
          }, 'community_comment');
        }
      }
    } catch (error: any) {
      const errorMessage = (error?.message || '').toLowerCase();
      console.log('[CommunityPostDetail] Comment error:', error?.message);
      const isAuthError = errorMessage.includes('token') || 
                          errorMessage.includes('expired') || 
                          errorMessage.includes('authentication') || 
                          errorMessage.includes('unauthorized');
      if (isAuthError) {
        Alert.alert(
          t("common.error"),
          t("community.authError", "Please log out and log back in to comment. Your session may have expired.")
        );
      } else {
        Alert.alert(t("common.error"), t("community.commentError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSolution = async (commentId: string) => {
    try {
      await markAsSolution(postId, commentId);
      setComments((prev) =>
        prev.map((c) => ({ ...c, isSolution: c.id === commentId }))
      );
      if (post) {
        setPost({ ...post, status: "solved" });
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("community.markSolutionError"));
    }
  };

  const handleAuthorPress = useCallback((userId: string, userName: string) => {
    navigation.navigate("UserProfile", { userId, userName });
  }, [navigation]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.link} />
      </ThemedView>
    );
  }

  if (!post) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText type="h4" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          {t("community.postNotFound")}
        </ThemedText>
      </ThemedView>
    );
  }

  const categoryIcon = getCategoryIcon(post.category);
  const statusColor = getStatusColor(post.status, theme);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ThemedView style={styles.container}>
        <ScreenScrollView contentContainerStyle={styles.content}>
          <View style={[styles.postCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.postHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category) + "20" }]}>
                <Feather name={categoryIcon} size={14} color={getCategoryColor(post.category)} />
                <ThemedText type="small" style={{ color: getCategoryColor(post.category), marginLeft: 4 }}>
                  {t(`categories.${post.category}`)}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Feather name="circle" size={8} color={statusColor} />
                <ThemedText type="small" style={{ color: statusColor, marginLeft: 4, textTransform: "capitalize" }}>
                  {t(`community.status.${post.status}`)}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="h2" style={styles.postTitle}>
              {post.title}
            </ThemedText>

            <ThemedText type="body" style={[styles.postDescription, { color: theme.text }]}>
              {post.description}
            </ThemedText>

            {post.imageUrl ? (
              <View style={[styles.postImage, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="image" size={32} color={theme.textSecondary} />
              </View>
            ) : null}

            <View style={styles.postFooter}>
              <Pressable 
                style={styles.authorInfo}
                onPress={() => handleAuthorPress(post.authorId, post.authorName)}
                hitSlop={8}
              >
                <View style={[styles.avatar, { backgroundColor: theme.link }]}>
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {post.authorName.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText type="body" style={{ fontWeight: "600", color: theme.link }}>
                    {post.authorName}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {formatTimeAgo(post.createdAt)}
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <ThemedText type="h3" style={styles.commentsTitle}>
              {t("community.comments")} ({comments.length})
            </ThemedText>

            {comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isPostAuthor={isPostAuthor}
                    onMarkSolution={() => handleMarkSolution(comment.id)}
                    onAuthorPress={() => handleAuthorPress(comment.authorId, comment.authorName)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.noComments, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="message-circle" size={24} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  {t("community.noComments")}
                </ThemedText>
              </View>
            )}
          </View>
        </ScreenScrollView>

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border }]}>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: theme.backgroundSecondary, color: theme.text },
            ]}
            placeholder={t("community.writeComment")}
            placeholderTextColor={theme.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            style={[
              styles.sendButton,
              {
                backgroundColor: newComment.trim() ? theme.link : theme.backgroundSecondary,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={18} color={newComment.trim() ? "#FFFFFF" : theme.textSecondary} />
            )}
          </Pressable>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  postCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  postTitle: {
    marginBottom: Spacing.md,
  },
  postDescription: {
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  postImage: {
    height: 200,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsSection: {
    marginBottom: Spacing.xl,
  },
  commentsTitle: {
    marginBottom: Spacing.lg,
  },
  commentsList: {
    gap: Spacing.md,
  },
  commentCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  solutionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  commentAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  commentContent: {
    lineHeight: 22,
  },
  linkedVideo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  markSolutionButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  noComments: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
