import React, { useCallback, useMemo } from "react";
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
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { VideoCard } from "@/components/VideoCard";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";
import { getCategoryByKey } from "@/constants/categories";

type CategoryFeedRouteProp = RouteProp<RootStackParamList, "CategoryFeed">;
type CategoryFeedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoryFeedScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<CategoryFeedNavigationProp>();
  const route = useRoute<CategoryFeedRouteProp>();
  const { categoryKey, categoryLabel } = route.params;
  const { videos, isLoading, refreshVideos, toggleSave, toggleLike } = useVideos();
  const { paddingTop, paddingBottom } = useScreenInsets();

  const category = getCategoryByKey(categoryKey);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: categoryLabel,
    });
  }, [navigation, categoryLabel]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => v.category === categoryKey && v.videoUrl);
  }, [videos, categoryKey]);

  const handleVideoPress = useCallback(
    (video: Video) => {
      navigation.navigate("VideoPlayer", { video });
    },
    [navigation]
  );

  const videoToCardFormat = (video: Video) => ({
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: category ? `${category.color}15` : theme.backgroundSecondary }]}>
        <Feather 
          name={category?.icon || "video"} 
          size={40} 
          color={category?.color || theme.textSecondary} 
        />
      </View>
      <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.sm }}>
        {t("categoryFeed.noVideos", { defaultValue: "No videos yet" })}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {t("categoryFeed.noVideosHint", { defaultValue: "Check back soon for new content" })}
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
      </ThemedText>
    </View>
  );

  if (isLoading && filteredVideos.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredVideos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingTop: Spacing.lg, paddingBottom },
      ]}
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshVideos}
          tintColor={theme.link}
        />
      }
      ListHeaderComponent={filteredVideos.length > 0 ? renderHeader : null}
      renderItem={({ item }) => (
        <VideoCard
          video={videoToCardFormat(item)}
          isSaved={item.isSaved}
          isLiked={item.isLiked}
          onSave={() => toggleSave(item.id)}
          onLike={() => toggleLike(item.id)}
          onPress={() => handleVideoPress(item)}
        />
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
  emptyHint: {
    textAlign: "center",
    lineHeight: 22,
  },
});
