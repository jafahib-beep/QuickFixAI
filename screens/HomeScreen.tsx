import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { VideoCard } from "@/components/VideoCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
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
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filterByCategory = useCallback(
    (videos: Video[]) => {
      if (selectedCategory === "all") return videos;
      return videos.filter((v) => v.category === selectedCategory);
    },
    [selectedCategory]
  );

  const filteredFeed = useMemo(
    () => ({
      recommended: filterByCategory(feed.recommended),
      new: filterByCategory(feed.new),
      popular: filterByCategory(feed.popular),
    }),
    [feed, filterByCategory]
  );

  const handleVideoPress = useCallback((video: Video, videoList: Video[], index: number) => {
    const playableVideos = videoList.filter(v => v.videoUrl);
    const adjustedIndex = playableVideos.findIndex(v => v.id === video.id);
    navigation.navigate("SwipeVideoPlayer", { 
      videos: playableVideos, 
      startIndex: adjustedIndex >= 0 ? adjustedIndex : 0 
    });
  }, [navigation]);

  const renderSection = (title: string, data: Video[], showViewAll = false) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {showViewAll ? (
          <Pressable 
            onPress={() => navigation.navigate("VideoLibrary")}
            style={({ pressed }) => [styles.viewAllButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedText type="small" style={{ color: theme.link }}>
              {t("videoLibrary.allVideos")}
            </ThemedText>
            <Feather name="chevron-right" size={14} color={theme.link} />
          </Pressable>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {data.length} {data.length === 1 ? 'video' : 'videos'}
          </ThemedText>
        )}
      </View>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${title}-${item.id}`}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item, index }) => (
          <View style={styles.cardWrapper}>
            <VideoCard
              video={item}
              isSaved={item.isSaved}
              isLiked={item.isLiked}
              onSave={() => toggleSave(item.id)}
              onLike={() => toggleLike(item.id)}
              onPress={() => handleVideoPress(item, data, index)}
              horizontal
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {t("common.noVideos")}
            </ThemedText>
          </View>
        }
      />
    </View>
  );

  const hasFilteredContent =
    filteredFeed.recommended.length > 0 ||
    filteredFeed.new.length > 0 ||
    filteredFeed.popular.length > 0;

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshFeed}
          tintColor={theme.link}
        />
      }
      contentContainerStyle={styles.content}
    >
      <View style={styles.filterContainer}>
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {isLoading && !hasFilteredContent ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      ) : hasFilteredContent ? (
        <>
          {filteredFeed.recommended.length > 0
            ? renderSection(t("home.recommended"), filteredFeed.recommended, true)
            : null}
          {filteredFeed.new.length > 0
            ? renderSection(t("home.new"), filteredFeed.new)
            : null}
          {filteredFeed.popular.length > 0
            ? renderSection(t("home.popular"), filteredFeed.popular)
            : null}
        </>
      ) : (
        <View style={styles.emptyState}>
          <ThemedText type="h4" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            {t("search.noResults")}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, opacity: 0.7, textAlign: 'center' }}>
            {t("search.noResultsHint")}
          </ThemedText>
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingBottom: Spacing["5xl"],
  },
  filterContainer: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing["4xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    letterSpacing: -0.3,
  },
  horizontalList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  cardWrapper: {
    width: 280,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  emptySection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingHorizontal: Spacing["3xl"],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
});
