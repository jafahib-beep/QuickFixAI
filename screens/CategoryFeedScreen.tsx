import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { VideoCard } from "@/components/VideoCard";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";

type CategoryFeedRouteProp = RouteProp<RootStackParamList, "CategoryFeed">;
type CategoryFeedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoryFeedScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<CategoryFeedNavigationProp>();
  const route = useRoute<CategoryFeedRouteProp>();
  const { categoryKey, categoryLabel } = route.params;
  const { feed, isLoading, refreshFeed, toggleSave, toggleLike } = useVideos();
  const { paddingTop, paddingBottom } = useScreenInsets();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: categoryLabel,
    });
  }, [navigation, categoryLabel]);

  const filteredVideos = useMemo(() => {
    const allVideos = [
      ...feed.recommended,
      ...feed.new,
      ...feed.popular,
    ];
    const uniqueVideos = allVideos.filter(
      (video, index, self) =>
        index === self.findIndex((v) => v.id === video.id)
    );
    return uniqueVideos.filter((v) => v.category === categoryKey);
  }, [feed, categoryKey]);

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

  const handleVideoPress = useCallback(
    (video: Video) => {
      navigation.navigate("VideoPlayer", { video: videoToLegacy(video) });
    },
    [navigation]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        {t("search.noResults")}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        {t("search.noResultsHint")}
      </ThemedText>
    </View>
  );

  if (isLoading && filteredVideos.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredVideos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingTop: Spacing.xl, paddingBottom },
      ]}
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshFeed}
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
            onSave={() => toggleSave(item.id)}
            onLike={() => toggleLike(item.id)}
          />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      ListEmptyComponent={renderEmptyState}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
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
});
