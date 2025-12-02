import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  Pressable,
} from "react-native";
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

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { feed, isLoading, refreshFeed, toggleSave, toggleLike } = useVideos();

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video: videoToLegacy(video) });
  }, [navigation]);

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

  const renderSection = (title: string, data: Video[]) => (
    <View style={styles.section}>
      <ThemedText type="h3" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${title}-${item.id}`}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleVideoPress(item)}
            style={({ pressed }) => [
              styles.cardWrapper,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <VideoCard
              video={videoToLegacy(item)}
              isSaved={item.isSaved}
              isLiked={item.isLiked}
              onSave={() => toggleSave(item.id)}
              onLike={() => toggleLike(item.id)}
              horizontal
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <ThemedText type="body" style={{ opacity: 0.5 }}>
              {t("common.noVideos")}
            </ThemedText>
          </View>
        }
      />
    </View>
  );

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshFeed}
          tintColor={theme.text}
        />
      }
      contentContainerStyle={styles.content}
    >
      {renderSection(t("home.recommended"), feed.recommended)}
      {renderSection(t("home.new"), feed.new)}
      {renderSection(t("home.popular"), feed.popular)}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingBottom: Spacing["5xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  horizontalList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  cardWrapper: {
    width: 260,
  },
  emptySection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["2xl"],
  },
});
