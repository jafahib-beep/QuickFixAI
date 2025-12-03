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
import { Video, AIGuide } from "@/utils/api";
import { CATEGORIES_WITH_ALL, Category } from "@/constants/categories";

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { videos, semanticSearch, toggleSave, toggleLike, generateGuide, saveGuide } = useVideos();
  const language = i18n.language;

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [aiGuide, setAiGuide] = useState<AIGuide | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAiGuide, setShowAiGuide] = useState(false);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.trim() || selectedCategory !== "all") {
        setIsSearching(true);
        try {
          const results = await semanticSearch(query, selectedCategory !== "all" ? selectedCategory : undefined);
          setSearchResults(results);
        } catch (error) {
          console.log("Search failed:", error);
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

  const displayVideos = query.trim() || selectedCategory !== "all" ? searchResults : videos;

  const handleVideoPress = useCallback((video: Video, index: number) => {
    const playableVideos = displayVideos.filter(v => v.videoUrl);
    const adjustedIndex = playableVideos.findIndex(v => v.id === video.id);
    navigation.navigate("SwipeVideoPlayer", { 
      videos: playableVideos, 
      startIndex: adjustedIndex >= 0 ? adjustedIndex : 0 
    });
  }, [navigation, displayVideos]);

  const handleAskAI = async () => {
    if (!query.trim()) return;
    
    setShowAiGuide(true);
    setIsGeneratingGuide(true);
    setIsGeneratingImages(false);
    setAiGuide(null);
    setIsSaved(false);
    setShowImages(false);
    
    try {
      const guide = await generateGuide(query, language, true);
      if (guide) {
        setAiGuide(guide);
        if (guide.images && guide.images.length > 0) {
          setShowImages(true);
        }
      }
    } catch (error) {
      console.log("Generate guide failed:", error);
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleSaveGuide = async () => {
    if (!aiGuide) return;
    const success = await saveGuide(aiGuide);
    if (success) {
      setIsSaved(true);
    }
  };

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

  const renderAIGuideCard = () => {
    if (!showAiGuide) return null;

    return (
      <View style={[styles.aiGuideCard, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.aiGuideHeader}>
          <View style={styles.aiGuideHeaderLeft}>
            <View style={[styles.aiIconContainer, { backgroundColor: theme.link }]}>
              <Feather name="cpu" size={18} color="#FFFFFF" />
            </View>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {t("aiGuide.title")}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => {
              setShowAiGuide(false);
              setAiGuide(null);
            }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {aiGuide?.query && (
          <View style={[styles.queryContainer, { backgroundColor: theme.backgroundTertiary }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {aiGuide.query}
            </ThemedText>
          </View>
        )}

        {isGeneratingGuide ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.link} />
            <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
              {isGeneratingImages ? t("aiGuide.generatingImages") : t("aiGuide.generating")}
            </ThemedText>
          </View>
        ) : aiGuide ? (
          <>
            <View style={styles.stepsSection}>
              <ThemedText type="body" style={[styles.sectionTitle, { color: theme.text, fontWeight: "600" }]}>
                {t("aiGuide.stepByStep")}
              </ThemedText>
              {aiGuide.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.link }]}>
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {step.stepNumber}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={[styles.stepText, { color: theme.text }]}>
                    {step.text}
                  </ThemedText>
                </View>
              ))}
            </View>

            {aiGuide.images && aiGuide.images.length > 0 ? (
              <View style={styles.imagesSection}>
                <Pressable
                  onPress={() => setShowImages(!showImages)}
                  style={({ pressed }) => [
                    styles.toggleImagesButton,
                    { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <Feather 
                    name={showImages ? "chevron-up" : "image"} 
                    size={18} 
                    color={theme.link} 
                  />
                  <ThemedText type="small" style={{ color: theme.link, marginLeft: Spacing.sm }}>
                    {showImages ? t("aiGuide.hideImages") : t("aiGuide.showImages")}
                  </ThemedText>
                </Pressable>

                {showImages && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imagesScroll}
                    style={styles.imagesScrollContainer}
                  >
                    {aiGuide.images.map((img, index) => (
                      <View key={index} style={styles.imageItem}>
                        <Image 
                          source={{ uri: img.url }} 
                          style={styles.guideImage}
                          resizeMode="cover"
                        />
                        <ThemedText 
                          type="small" 
                          style={[styles.imageCaption, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {img.caption}
                        </ThemedText>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={[styles.noImagesNote, { backgroundColor: theme.backgroundTertiary }]}>
                <Feather name="image" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={[styles.noImagesText, { color: theme.textSecondary }]}>
                  {t("aiGuide.imageGuideNotAvailable")}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleSaveGuide}
              disabled={isSaved}
              style={({ pressed }) => [
                styles.saveButton,
                { 
                  backgroundColor: isSaved ? theme.backgroundTertiary : theme.link,
                  opacity: pressed && !isSaved ? 0.8 : 1 
                }
              ]}
            >
              <Feather 
                name={isSaved ? "check" : "bookmark"} 
                size={18} 
                color={isSaved ? theme.success : "#FFFFFF"} 
              />
              <ThemedText 
                type="body" 
                style={{ 
                  color: isSaved ? theme.success : "#FFFFFF", 
                  marginLeft: Spacing.sm,
                  fontWeight: "600"
                }}
              >
                {isSaved ? t("aiGuide.savedGuide") : t("aiGuide.saveGuide")}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={24} color={theme.error} />
            <ThemedText type="body" style={[styles.errorText, { color: theme.textSecondary }]}>
              {t("aiGuide.noGuide")}
            </ThemedText>
            <Pressable
              onPress={handleAskAI}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: theme.link, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <ThemedText type="small" style={{ color: "#FFFFFF" }}>
                {t("aiGuide.tryAgain")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {query.trim().length > 0 && !showAiGuide && (
        <Pressable
          onPress={handleAskAI}
          style={({ pressed }) => [
            styles.askAIButton,
            { backgroundColor: theme.link, opacity: pressed ? 0.85 : 1 }
          ]}
        >
          <Feather name="cpu" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={styles.askAIText}>
            {t("aiGuide.askAI")}
          </ThemedText>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
      )}
      {renderAIGuideCard()}
    </>
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
              onPress={() => {
                setQuery("");
                setShowAiGuide(false);
                setAiGuide(null);
              }} 
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
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isSearching ? (
          <View style={styles.loadingContainerMain}>
            <ActivityIndicator size="large" color={theme.link} />
          </View>
        ) : renderEmptyState}
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
  loadingContainerMain: {
    paddingVertical: Spacing["5xl"],
    alignItems: "center",
  },
  askAIButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  askAIText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginHorizontal: Spacing.md,
  },
  aiGuideCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  aiGuideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  aiGuideHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  queryContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  stepsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    marginTop: 2,
  },
  stepText: {
    flex: 1,
    lineHeight: 22,
  },
  imagesSection: {
    marginBottom: Spacing.lg,
  },
  toggleImagesButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  imagesScrollContainer: {
    marginHorizontal: -Spacing.xl,
  },
  imagesScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  imageItem: {
    width: 200,
  },
  guideImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  imageCaption: {
    textAlign: "center",
  },
  noImagesNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  noImagesText: {
    marginLeft: Spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
});
