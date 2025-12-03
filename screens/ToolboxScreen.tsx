import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { VideoCard } from "@/components/VideoCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
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
      setSavedVideos(videos ?? []);
    } catch (error) {
      console.error("Failed to load saved videos:", error);
      setSavedVideos([]);
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

  const handleVideoPress = useCallback((video: Video, index: number) => {
    const playableVideos = savedVideos.filter(v => v.videoUrl);
    const adjustedIndex = playableVideos.findIndex(v => v.id === video.id);
    navigation.navigate("SwipeVideoPlayer", { 
      videos: playableVideos, 
      startIndex: adjustedIndex >= 0 ? adjustedIndex : 0 
    });
  }, [navigation, savedVideos]);

  const handleToggleSave = async (videoId: string) => {
    const saved = await toggleSave(videoId);
    if (!saved) {
      setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="bookmark" size={40} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={[styles.emptyTitle, { color: theme.text }]}>
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
        <ActivityIndicator size="large" color={theme.link} />
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
            tintColor={theme.link}
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
          tintColor={theme.link}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerInfo}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {savedVideos.length} {savedVideos.length === 1 ? 'video' : 'videos'} saved
          </ThemedText>
        </View>
      }
      renderItem={({ item, index }) => (
        <VideoCard
          video={item}
          isSaved={item.isSaved}
          isLiked={item.isLiked}
          onSave={() => handleToggleSave(item.id)}
          onLike={() => toggleLike(item.id)}
          onPress={() => handleVideoPress(item, index)}
        />
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
  headerInfo: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyHint: {
    textAlign: "center",
    lineHeight: 22,
  },
});
