import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video, AIGuide, api } from "@/utils/api";
import { CATEGORIES_WITH_ALL, Category } from "@/constants/categories";

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { videos, semanticSearch, toggleSave, toggleLike, generateGuide, saveGuide } = useVideos();
  const language = i18n.language;

  const [problemQuery, setProblemQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [recommendedVideo, setRecommendedVideo] = useState<Video | null>(null);
  const [otherVideos, setOtherVideos] = useState<Video[]>([]);
  const [aiGuide, setAiGuide] = useState<AIGuide | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleFindSolution = async () => {
    if (!problemQuery.trim()) return;
    
    setHasSearched(true);
    setIsSearching(true);
    setIsGeneratingGuide(true);
    setRecommendedVideo(null);
    setOtherVideos([]);
    setAiGuide(null);
    setAiAnswer(null);
    setIsSaved(false);

    try {
      const [searchResults, guide, aiResponse] = await Promise.all([
        semanticSearch(problemQuery, selectedCategory !== "all" ? selectedCategory : undefined),
        generateGuide(problemQuery, language, false),
        api.askAI(problemQuery, language).catch(() => null)
      ]);

      if (searchResults.length > 0) {
        setRecommendedVideo(searchResults[0]);
        setOtherVideos(searchResults.slice(1, 5));
      }

      if (guide) {
        setAiGuide(guide);
      }

      if (aiResponse?.answer) {
        setAiAnswer(aiResponse.answer);
      }
    } catch (error) {
      console.log("Search/Guide failed:", error);
    } finally {
      setIsSearching(false);
      setIsGeneratingGuide(false);
    }
  };

  const handleVideoPress = useCallback((video: Video) => {
    const allVideos = recommendedVideo 
      ? [recommendedVideo, ...otherVideos]
      : otherVideos;
    const playableVideos = allVideos.filter(v => v.videoUrl);
    const index = playableVideos.findIndex(v => v.id === video.id);
    navigation.navigate("SwipeVideoPlayer", { 
      videos: playableVideos, 
      startIndex: index >= 0 ? index : 0 
    });
  }, [navigation, recommendedVideo, otherVideos]);

  const handleSaveGuide = async () => {
    if (!aiGuide) return;
    const success = await saveGuide(aiGuide);
    if (success) {
      setIsSaved(true);
    }
  };

  const handleClear = () => {
    setProblemQuery("");
    setHasSearched(false);
    setRecommendedVideo(null);
    setOtherVideos([]);
    setAiGuide(null);
    setAiAnswer(null);
    setIsSaved(false);
  };

  const handleCategoryChange = async (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    if (hasSearched && problemQuery.trim()) {
      setIsSearching(true);
      try {
        const results = await semanticSearch(problemQuery, categoryKey !== "all" ? categoryKey : undefined);
        if (results.length > 0) {
          setRecommendedVideo(results[0]);
          setOtherVideos(results.slice(1, 5));
        } else {
          setRecommendedVideo(null);
          setOtherVideos([]);
        }
      } catch (error) {
        console.log("Category filter search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const renderCategoryChips = () => (
    <View style={styles.categoriesWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES_WITH_ALL.map((category: Category) => {
          const isSelected = selectedCategory === category.key;
          return (
            <Pressable
              key={category.key}
              onPress={() => handleCategoryChange(category.key)}
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? theme.link : theme.backgroundSecondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
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
  );

  const renderAIEntryArea = () => (
    <View style={styles.aiEntryArea}>
      <View style={[styles.aiIconLarge, { backgroundColor: theme.link }]}>
        <Feather name="cpu" size={28} color="#FFFFFF" />
      </View>
      <ThemedText type="h3" style={[styles.mainTitle, { color: theme.text }]}>
        {t("search.whatToFix")}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("search.describeProblem")}
      </ThemedText>
      
      <View style={[styles.problemInputContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <TextInput
          style={[styles.problemInput, { color: theme.text }]}
          value={problemQuery}
          onChangeText={setProblemQuery}
          placeholder={t("search.problemPlaceholder")}
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="search"
          blurOnSubmit={true}
          onSubmitEditing={() => {
            if (problemQuery.trim() && !isSearching) {
              handleFindSolution();
            }
          }}
        />
        <Pressable
          onPress={handleFindSolution}
          disabled={!problemQuery.trim() || isSearching}
          style={({ pressed }) => [
            styles.inputAskButton,
            { 
              backgroundColor: problemQuery.trim() ? theme.link : theme.backgroundTertiary,
              opacity: pressed && problemQuery.trim() ? 0.85 : 1 
            }
          ]}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="cpu" size={16} color={problemQuery.trim() ? "#FFFFFF" : theme.textSecondary} />
              <ThemedText 
                type="small" 
                style={{ 
                  color: problemQuery.trim() ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600",
                  marginLeft: Spacing.xs
                }}
              >
                {t("search.askAI")}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>

      {renderCategoryChips()}

      <Pressable
        onPress={handleFindSolution}
        disabled={!problemQuery.trim() || isSearching}
        style={({ pressed }) => [
          styles.findButton,
          { 
            backgroundColor: problemQuery.trim() ? theme.link : theme.backgroundTertiary,
            opacity: pressed && problemQuery.trim() ? 0.85 : 1 
          }
        ]}
      >
        <View style={styles.findButtonContent}>
          {isSearching ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <ThemedText 
                type="body" 
                style={[styles.findButtonText, { color: "#FFFFFF" }]}
              >
                {t("search.searching")}
              </ThemedText>
            </>
          ) : (
            <>
              <Feather name="zap" size={20} color={problemQuery.trim() ? "#FFFFFF" : theme.textSecondary} />
              <ThemedText 
                type="body" 
                style={[
                  styles.findButtonText, 
                  { color: problemQuery.trim() ? "#FFFFFF" : theme.textSecondary }
                ]}
              >
                {t("search.findSolution")}
              </ThemedText>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );

  const renderRecommendedVideo = () => {
    if (!recommendedVideo) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="star" size={18} color={theme.link} />
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("search.recommendedVideo")}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleVideoPress(recommendedVideo)}
          style={({ pressed }) => [
            styles.recommendedCard,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Image
            source={{ uri: recommendedVideo.thumbnailUrl }}
            style={styles.recommendedThumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={[styles.playButton, { backgroundColor: theme.link }]}>
              <Feather name="play" size={24} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.recommendedInfo}>
            <ThemedText type="body" style={[styles.recommendedTitle, { color: theme.text }]} numberOfLines={2}>
              {recommendedVideo.title}
            </ThemedText>
            <View style={styles.recommendedMeta}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {recommendedVideo.authorName}
              </ThemedText>
              {recommendedVideo.category && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundTertiary }]}>
                  <ThemedText type="small" style={{ color: theme.link }}>
                    {t(`categories.${recommendedVideo.category}`)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderOtherVideos = () => {
    if (otherVideos.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="video" size={18} color={theme.textSecondary} />
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("search.otherVideos")}
          </ThemedText>
        </View>
        {otherVideos.map((video) => (
          <View key={video.id} style={styles.videoCardWrapper}>
            <VideoCard
              video={video}
              isSaved={video.isSaved}
              isLiked={video.isLiked}
              onSave={() => toggleSave(video.id)}
              onLike={() => toggleLike(video.id)}
              onPress={() => handleVideoPress(video)}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderAIAnswer = () => {
    if (!hasSearched || (!aiAnswer && !isGeneratingGuide)) return null;

    return (
      <View style={styles.section}>
        <View style={[styles.aiAnswerCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.aiGuideHeader}>
            <View style={styles.aiGuideHeaderLeft}>
              <View style={[styles.aiIconContainer, { backgroundColor: theme.link }]}>
                <Feather name="message-circle" size={18} color="#FFFFFF" />
              </View>
              <ThemedText type="h4" style={{ color: theme.text }}>
                {t("search.aiResponse")}
              </ThemedText>
            </View>
          </View>

          {isGeneratingGuide && !aiAnswer ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.link} />
              <ThemedText type="small" style={[styles.loadingText, { color: theme.textSecondary }]}>
                {t("search.thinking")}
              </ThemedText>
            </View>
          ) : aiAnswer ? (
            <ThemedText type="body" style={[styles.aiAnswerText, { color: theme.text }]}>
              {aiAnswer}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  };

  const renderAIGuide = () => {
    if (!hasSearched) return null;

    const noVideosFound = !recommendedVideo && otherVideos.length === 0 && !isSearching;
    
    const isGenericFallback = aiGuide && aiGuide.steps.length > 0 && 
      aiGuide.steps.some(step => 
        step.text.toLowerCase().includes("search for tutorials") ||
        step.text.toLowerCase().includes("watch video guides") ||
        step.text.toLowerCase().includes("consult a professional")
      );
    
    const hasRealAIContent = aiAnswer && aiAnswer.length > 50;
    const useAIAnswerInstead = hasRealAIContent && (!aiGuide || isGenericFallback);

    return (
      <View style={styles.section}>
        {noVideosFound && !isGeneratingGuide && (
          <View style={[styles.noVideosMessage, { backgroundColor: theme.backgroundTertiary }]}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.noVideosText, { color: theme.textSecondary }]}>
              {t("search.noVideosFound")} — {t("search.aiGuideAvailable")}
            </ThemedText>
          </View>
        )}

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
          </View>

          {(aiGuide?.query || problemQuery) && (
            <View style={[styles.queryContainer, { backgroundColor: theme.backgroundTertiary }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {aiGuide?.query || problemQuery}
              </ThemedText>
            </View>
          )}

          {isGeneratingGuide && !aiAnswer ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.link} />
              <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
                {t("search.thinking")}
              </ThemedText>
            </View>
          ) : useAIAnswerInstead ? (
            <View style={styles.aiAnswerContainer}>
              <ThemedText type="body" style={[styles.aiAnswerFullText, { color: theme.text }]}>
                {aiAnswer}
              </ThemedText>
            </View>
          ) : aiGuide && !isGenericFallback ? (
            <>
              <View style={styles.stepsContainer}>
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
          ) : aiAnswer ? (
            <View style={styles.aiAnswerContainer}>
              <ThemedText type="body" style={[styles.aiAnswerFullText, { color: theme.text }]}>
                {aiAnswer}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={24} color={theme.error} />
              <ThemedText type="body" style={[styles.errorText, { color: theme.textSecondary }]}>
                {t("aiGuide.noGuide")}
              </ThemedText>
              <Pressable
                onPress={handleFindSolution}
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
      </View>
    );
  };

  const renderResults = () => {
    if (isSearching && !aiGuide) {
      return (
        <View style={styles.loadingContainerMain}>
          <ActivityIndicator size="large" color={theme.link} />
          <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t("aiGuide.generating")}
          </ThemedText>
        </View>
      );
    }

    return (
      <>
        {renderAIAnswer()}
        {renderRecommendedVideo()}
        {renderOtherVideos()}
        {renderAIGuide()}
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {hasSearched && (
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather name="arrow-left" size={20} color={theme.link} />
            <ThemedText type="body" style={{ color: theme.link, marginLeft: Spacing.sm }}>
              {t("common.back")}
            </ThemedText>
          </Pressable>
        )}

        {!hasSearched ? (
          renderAIEntryArea()
        ) : (
          <>
            <View style={[styles.searchSummary, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="search" size={16} color={theme.textSecondary} />
              <ThemedText 
                type="body" 
                style={[styles.searchSummaryText, { color: theme.text }]}
                numberOfLines={1}
              >
                {problemQuery}
              </ThemedText>
              <Pressable onPress={handleClear} hitSlop={8}>
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            
            {renderCategoryChips()}
            {renderResults()}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  aiEntryArea: {
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  aiIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  mainTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  problemInputContainer: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  problemInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  inputAskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-end",
  },
  categoriesWrapper: {
    marginHorizontal: -Spacing.xl,
    marginBottom: Spacing.xl,
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
  findButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    width: "100%",
  },
  findButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  findButtonText: {
    fontWeight: "600",
    marginLeft: Spacing.md,
  },
  searchSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  searchSummaryText: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  recommendedCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  recommendedThumbnail: {
    width: "100%",
    height: 200,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    height: 200,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  recommendedInfo: {
    padding: Spacing.lg,
  },
  recommendedTitle: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  recommendedMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  videoCardWrapper: {
    marginBottom: Spacing.md,
  },
  noVideosMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  noVideosText: {
    flex: 1,
  },
  aiGuideCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  aiAnswerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  aiAnswerText: {
    lineHeight: 24,
  },
  aiAnswerContainer: {
    paddingVertical: Spacing.sm,
  },
  aiAnswerFullText: {
    lineHeight: 24,
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
  loadingContainerMain: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  stepsContainer: {
    marginBottom: Spacing.lg,
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
