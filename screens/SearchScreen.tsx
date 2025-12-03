import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { VideoCard } from "@/components/VideoCard";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video } from "@/utils/api";
import { CATEGORIES_WITH_ALL, Category } from "@/constants/categories";

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { videos, semanticSearch, toggleSave, toggleLike } = useVideos();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.trim() || selectedCategory !== "all") {
        setIsSearching(true);
        try {
          const results = await semanticSearch(query, selectedCategory !== "all" ? selectedCategory : undefined);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(videos);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query, selectedCategory, videos, semanticSearch]);

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  }, [navigation]);

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

  const displayVideos = query.trim() || selectedCategory !== "all" ? searchResults : videos;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="search" size={40} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={[styles.emptyTitle, { color: theme.text }]}>
        {t("search.noResults")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {t("search.noResultsHint")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor={theme.placeholder}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={theme.link} />
          ) : query.length > 0 ? (
            <Pressable 
              onPress={() => setQuery("")} 
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={[styles.clearButton, { backgroundColor: theme.backgroundTertiary }]}>
                <Feather name="x" size={14} color={theme.text} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {CATEGORIES_WITH_ALL.map((category: Category) => {
            const isSelected = selectedCategory === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundSecondary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? "#FFFFFF" : theme.text,
                    fontWeight: isSelected ? "600" : "500",
                  }}
                >
                  {t(category.labelKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={displayVideos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListEmptyComponent={isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.link} />
          </View>
        ) : renderEmptyState}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleVideoPress(item)}
            style={({ pressed }) => [
              { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
            ]}
          >
            <VideoCard
              video={videoToCardFormat(item)}
              isSaved={item.isSaved}
              isLiked={item.isLiked}
              onSave={() => toggleSave(item.id)}
              onLike={() => toggleLike(item.id)}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: 16,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  categoriesScroll: {
    marginHorizontal: -Spacing.xl,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
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
  loadingContainer: {
    paddingVertical: Spacing["5xl"],
    alignItems: "center",
  },
});
