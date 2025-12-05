import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";
import { getCategoryByKey } from "@/constants/categories";
import { sampleVideos } from "@/utils/sampleData";

type VideoLibraryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

type SortOption = "newest" | "mostViewed" | "trending";

export default function VideoLibraryScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<VideoLibraryNavigationProp>();
  const { feed, isLoading, toggleSave, toggleLike } = useVideos();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("trending");

  const allVideos = useMemo(() => {
    const combined: Video[] = [];
    const seen = new Set<string>();
    
    const sources = [
      ...sampleVideos,
      ...feed.recommended,
      ...feed.new, 
      ...feed.popular
    ];
    
    sources.forEach(video => {
      if (!seen.has(video.id)) {
        seen.add(video.id);
        combined.push(video as Video);
      }
    });
    
    return combined;
  }, [feed]);

  const youtubeVideos = useMemo(() => 
    allVideos.filter(v => v.isYouTube),
  [allVideos]);

  const quickFixVideos = useMemo(() => 
    allVideos.filter(v => !v.isYouTube),
  [allVideos]);

  const filteredVideos = useMemo(() => {
    let videos = allVideos;
    
    if (selectedCategory !== "all") {
      videos = videos.filter(v => v.category === selectedCategory);
    }
    
    switch (sortBy) {
      case "newest":
        return [...videos].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "mostViewed":
        return [...videos].sort((a, b) => b.likesCount - a.likesCount);
      case "trending":
      default:
        return [...videos].sort((a, b) => {
          const aScore = (b.likesCount * 0.5) + (b.isYouTube ? 1000 : 0);
          const bScore = (a.likesCount * 0.5) + (a.isYouTube ? 1000 : 0);
          return aScore - bScore;
        });
    }
  }, [allVideos, selectedCategory, sortBy]);

  const handleVideoPress = useCallback((video: Video) => {
    if (video.isYouTube && video.youtubeId) {
      const url = `https://www.youtube.com/watch?v=${video.youtubeId}`;
      Linking.openURL(url);
    } else {
      navigation.navigate("SwipeVideoPlayer", { 
        videos: quickFixVideos.filter(v => v.videoUrl), 
        startIndex: quickFixVideos.findIndex(v => v.id === video.id) || 0 
      });
    }
  }, [navigation, quickFixVideos]);

  const renderVideoCard = ({ item: video }: { item: Video }) => {
    const category = getCategoryByKey(video.category);
    
    return (
      <Pressable
        onPress={() => handleVideoPress(video)}
        style={({ pressed }) => [
          styles.videoCard,
          { 
            backgroundColor: theme.cardBackground,
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={styles.thumbnailContainer}>
          <View style={[styles.thumbnail, { backgroundColor: theme.backgroundSecondary }]}>
            <LinearGradient
              colors={video.isYouTube 
                ? ['rgba(255,0,0,0.15)', 'rgba(255,0,0,0.05)']
                : isDark 
                  ? ['rgba(10,132,255,0.15)', 'rgba(10,132,255,0.05)']
                  : ['rgba(0,102,255,0.1)', 'rgba(0,102,255,0.03)']
              }
              style={styles.thumbnailGradient}
            />
            <View style={styles.playIconContainer}>
              <View style={[
                styles.playIcon, 
                { backgroundColor: video.isYouTube ? '#FF0000' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)') }
              ]}>
                <Feather name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>
          
          {video.isYouTube ? (
            <View style={styles.youtubeBadge}>
              <Feather name="youtube" size={12} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.youtubeText}>
                YouTube
              </ThemedText>
            </View>
          ) : null}
          
          <View style={styles.durationBadge}>
            <ThemedText type="caption" style={styles.durationText}>
              {formatDuration(video.duration)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardContent}>
          <ThemedText type="h4" numberOfLines={2} style={styles.title}>
            {video.title}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.authorInfo}>
              <View style={[styles.avatar, { backgroundColor: video.isYouTube ? '#FF0000' : theme.link }]}>
                <ThemedText type="caption" style={styles.avatarText}>
                  {video.authorName?.charAt(0).toUpperCase() || "U"}
                </ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {video.authorName}
              </ThemedText>
            </View>
            <View style={styles.statsRow}>
              <Feather name="heart" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {formatViews(video.likesCount)}
              </ThemedText>
            </View>
          </View>

          {category ? (
            <View 
              style={[
                styles.categoryTag,
                { backgroundColor: `${category.color}${isDark ? '25' : '15'}` },
              ]}
            >
              <Feather name={category.icon} size={10} color={category.color} />
              <ThemedText type="caption" style={{ color: category.color, fontWeight: '500' }}>
                {t(category.labelKey)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleLike(video.id);
            }}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather
              name="heart"
              size={16}
              color={video.isLiked ? "#FF3B30" : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleSave(video.id);
            }}
            style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather
              name="bookmark"
              size={16}
              color={video.isSaved ? theme.link : theme.textSecondary}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderYouTubeFeatured = () => {
    if (youtubeVideos.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.youtubeIcon}>
              <Feather name="youtube" size={16} color="#FF0000" />
            </View>
            <ThemedText type="h3">{t("videoLibrary.realTutorials")}</ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {youtubeVideos.length} {youtubeVideos.length === 1 ? 'video' : 'videos'}
          </ThemedText>
        </View>
        <FlatList
          data={youtubeVideos.slice(0, 5)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `yt-${item.id}`}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <View style={styles.featuredCard}>
              {renderVideoCard({ item })}
            </View>
          )}
        />
      </View>
    );
  };

  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      {(['trending', 'newest', 'mostViewed'] as SortOption[]).map((option) => (
        <Pressable
          key={option}
          onPress={() => setSortBy(option)}
          style={[
            styles.sortButton,
            { 
              backgroundColor: sortBy === option 
                ? theme.link 
                : theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText 
            type="small" 
            style={{ 
              color: sortBy === option ? '#FFFFFF' : theme.textSecondary,
              fontWeight: '600',
            }}
          >
            {t(`videoLibrary.${option}`)}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  if (isLoading && allVideos.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="h2">{t("videoLibrary.title")}</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          {allVideos.length} {t("videoLibrary.allVideos").toLowerCase()}
        </ThemedText>
      </View>

      <View style={styles.filterContainer}>
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {renderYouTubeFeatured()}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h3">{t("videoLibrary.quickFixes")}</ThemedText>
        </View>
        {renderSortButtons()}
      </View>

      <View style={styles.gridContainer}>
        {filteredVideos.length > 0 ? (
          filteredVideos.map((video) => (
            <View key={video.id} style={styles.gridItem}>
              {renderVideoCard({ item: video })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="video-off" size={48} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            <ThemedText type="h4" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
              {t("videoLibrary.noVideos")}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, opacity: 0.7, marginTop: Spacing.xs }}>
              {t("videoLibrary.noVideosHint")}
            </ThemedText>
          </View>
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filterContainer: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  youtubeIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  featuredCard: {
    width: 300,
  },
  sortContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  sortButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  gridItem: {
    width: "48%",
    marginBottom: Spacing.sm,
  },
  videoCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  thumbnailContainer: {
    position: "relative",
    aspectRatio: 16 / 9,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  youtubeBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF0000",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  youtubeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  durationBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  durationText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  cardContent: {
    padding: Spacing.md,
  },
  title: {
    marginBottom: Spacing.sm,
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.xs,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
});
