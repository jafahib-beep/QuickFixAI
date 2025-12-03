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

type TagFeedRouteProp = RouteProp<RootStackParamList, "TagFeed">;
type TagFeedNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TagFeedScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<TagFeedNavigationProp>();
  const route = useRoute<TagFeedRouteProp>();
  const { tag } = route.params;
  const { videos, isLoading, refreshVideos, toggleSave, toggleLike } = useVideos();
  const { paddingBottom } = useScreenInsets();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: `#${tag}`,
    });
  }, [navigation, tag]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) =>
      v.videoUrl && v.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  }, [videos, tag]);

  const handleVideoPress = useCallback(
    (video: Video, index: number) => {
      const playableVideos = filteredVideos.filter(v => v.videoUrl);
      const adjustedIndex = playableVideos.findIndex(v => v.id === video.id);
      navigation.navigate("SwipeVideoPlayer", { 
        videos: playableVideos, 
        startIndex: adjustedIndex >= 0 ? adjustedIndex : 0 
      });
    },
    [navigation, filteredVideos]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="hash" size={40} color={theme.link} />
      </View>
      <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.sm }}>
        {t("tagFeed.noVideos", { defaultValue: "No videos with this tag" })}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {t("tagFeed.noVideosHint", { defaultValue: "Check back soon for new content" })}
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <View style={[styles.tagBadge, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText type="body" style={{ color: theme.link, fontWeight: '600' }}>
          #{tag}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
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
      renderItem={({ item, index }) => (
        <VideoCard
          video={item}
          isSaved={item.isSaved}
          isLiked={item.isLiked}
          onSave={() => toggleSave(item.id)}
          onLike={() => toggleLike(item.id)}
          onPress={() => handleVideoPress(item, index)}
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
    marginBottom: Spacing.xl,
  },
  tagBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
