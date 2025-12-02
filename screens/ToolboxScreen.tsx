import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, RefreshControl, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { VideoCard } from "@/components/VideoCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";
import { useScreenInsets } from "@/hooks/useScreenInsets";

type ToolboxScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ToolboxScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<ToolboxScreenNavigationProp>();
  const { getSavedVideos, toggleSave, toggleLike } = useVideos();
  const { paddingTop, paddingBottom } = useScreenInsets();

  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSavedVideos = async () => {
    try {
      const videos = await getSavedVideos();
      setSavedVideos(videos);
    } catch (error) {
      console.error("Failed to load saved videos:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedVideos();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSavedVideos();
  };

  const videoToLegacy = (video: Video) => ({
    id: video.id,
    uri: video.videoUrl || "",
    thumbnailUri: video.thumbnailUrl || "",
    title: video.title,
    description: video.description || "",
    category: video.category,
    tags: video.tags,
    authorId: video.authorId,
    authorName: video.authorName,
    authorAvatar: video.authorAvatar,
    duration: video.duration,
    likes: video.likesCount,
    commentsEnabled: video.commentsEnabled,
    createdAt: video.createdAt,
  });

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video: videoToLegacy(video) });
  }, [navigation]);

  const handleToggleSave = async (videoId: string) => {
    const saved = await toggleSave(videoId);
    if (!saved) {
      setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require("@/assets/images/empty-states/empty-toolbox.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={styles.emptyTitle}>
        {t("toolbox.empty")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {t("toolbox.emptyHint")}
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (savedVideos.length === 0) {
    return (
      <ScreenScrollView 
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.text}
          />
        }
      >
        {renderEmptyState()}
      </ScreenScrollView>
    );
  }

  return (
    <FlatList
      data={savedVideos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingTop, paddingBottom },
      ]}
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.text}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => handleVideoPress(item)}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <VideoCard
            video={videoToLegacy(item)}
            isSaved={item.isSaved}
            isLiked={item.isLiked}
            onSave={() => handleToggleSave(item.id)}
            onLike={() => toggleLike(item.id)}
          />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: Spacing["2xl"],
    opacity: 0.6,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    textAlign: "center",
  },
});
