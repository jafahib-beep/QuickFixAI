import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  Image,
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
import { Video } from "@/utils/storage";
import { sampleVideos, categories } from "@/utils/sampleData";

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { videos, savedVideoIds, likedVideoIds, toggleSave, toggleLike, searchVideos } = useVideos();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const allVideos = videos.length > 0 ? videos : sampleVideos;

  const filteredVideos = query || selectedCategory !== "all"
    ? searchVideos(query, selectedCategory).length > 0
      ? searchVideos(query, selectedCategory)
      : allVideos.filter((v) => {
          const matchesQuery = !query ||
            v.title.toLowerCase().includes(query.toLowerCase()) ||
            v.description?.toLowerCase().includes(query.toLowerCase()) ||
            v.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
          const matchesCategory = selectedCategory === "all" || v.category === selectedCategory;
          return matchesQuery && matchesCategory;
        })
    : allVideos;

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  }, [navigation]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require("@/assets/images/empty-states/no-results.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={styles.emptyTitle}>
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
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <Pressable
              key={category.key}
              onPress={() => setSelectedCategory(category.key)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category.key
                      ? theme.text
                      : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color:
                    selectedCategory === category.key
                      ? theme.backgroundRoot
                      : theme.text,
                  fontWeight: selectedCategory === category.key ? "600" : "400",
                }}
              >
                {t(category.labelKey)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredVideos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleVideoPress(item)}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <VideoCard
              video={item}
              isSaved={savedVideoIds.includes(item.id)}
              isLiked={likedVideoIds.includes(item.id)}
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
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
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
