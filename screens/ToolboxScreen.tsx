import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Image, ScrollView, SectionList } from "react-native";
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
import { Video, AIGuide } from "@/utils/api";
import { useScreenInsets } from "@/hooks/useScreenInsets";

type ToolboxScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ToolboxScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<ToolboxScreenNavigationProp>();
  const { getSavedVideos, toggleSave, toggleLike, savedGuides, deleteGuide, loadSavedGuides } = useVideos();
  const { paddingTop, paddingBottom } = useScreenInsets();

  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'guides'>('videos');
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());

  const loadSavedVideos = async () => {
    try {
      const videos = await getSavedVideos();
      setSavedVideos(videos ?? []);
    } catch (error) {
      console.log("Failed to load saved videos:", error);
      setSavedVideos([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedVideos();
    loadSavedGuides();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSavedVideos(), loadSavedGuides()]);
    setIsRefreshing(false);
  };

  const handleVideoPress = useCallback((video: Video, index: number) => {
    const playableVideos = savedVideos.filter(v => v.videoUrl);
    const adjustedIndex = playableVideos.findIndex(v => v.id === video.id);
    navigation.navigate("SwipeVideoPlayer", { 
      videos: playableVideos, 
      startIndex: adjustedIndex >= 0 ? adjustedIndex : 0 
    });
  }, [navigation, savedVideos]);

  const handleToggleSave = async (videoId: string) => {
    const saved = await toggleSave(videoId);
    if (!saved) {
      setSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
    }
  };

  const handleDeleteGuide = async (guideId: string) => {
    await deleteGuide(guideId);
  };

  const toggleGuideExpand = (guideId: string) => {
    setExpandedGuides(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guideId)) {
        newSet.delete(guideId);
      } else {
        newSet.add(guideId);
      }
      return newSet;
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={activeTab === 'videos' ? "bookmark" : "cpu"} size={40} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={[styles.emptyTitle, { color: theme.text }]}>
        {activeTab === 'videos' ? t("toolbox.empty") : t("aiGuide.emptyGuides")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {activeTab === 'videos' 
          ? t("toolbox.emptyHint")
          : t("aiGuide.emptyGuidesHint")
        }
      </ThemedText>
    </View>
  );

  const renderGuideCard = (guide: AIGuide) => {
    const isExpanded = expandedGuides.has(guide.id || '');
    
    return (
      <View 
        key={guide.id} 
        style={[styles.guideCard, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Pressable 
          onPress={() => toggleGuideExpand(guide.id || '')}
          style={({ pressed }) => [styles.guideHeader, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityLabel={`${guide.query} guide, ${guide.steps.length} steps`}
          accessibilityRole="button"
          testID="guide-card-header"
        >
          <View style={styles.guideHeaderLeft}>
            <View style={[styles.aiIconContainer, { backgroundColor: theme.link }]}>
              <Feather name="cpu" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.guideInfo}>
              <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }} numberOfLines={1}>
                {guide.query}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {guide.steps.length} {t("aiGuide.step")}{guide.steps.length !== 1 ? 's' : ''}
                {guide.images && guide.images.length > 0 && ` • ${guide.images.length} images`}
              </ThemedText>
            </View>
          </View>
          <View style={styles.guideHeaderRight}>
            <Feather 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.textSecondary} 
            />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.guideContent}>
            <View style={styles.stepsContainer}>
              {guide.steps.map((step, index) => (
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

            {guide.images && guide.images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesScroll}
                style={styles.imagesContainer}
              >
                {guide.images.map((img, index) => (
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

            <Pressable
              onPress={() => handleDeleteGuide(guide.id || '')}
              style={({ pressed }) => [
                styles.deleteButton,
                { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.8 : 1 }
              ]}
              accessibilityLabel="Remove Guide"
              accessibilityRole="button"
              testID="delete-guide-button"
            >
              <Feather name="trash-2" size={16} color={theme.error} />
              <ThemedText type="small" style={{ color: theme.error, marginLeft: Spacing.sm }}>
                {t("aiGuide.deleteGuide")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: theme.backgroundRoot }]}>
      <Pressable
        onPress={() => setActiveTab('videos')}
        style={({ pressed }) => [
          styles.tab,
          activeTab === 'videos' && { backgroundColor: theme.link },
          { opacity: pressed ? 0.8 : 1 }
        ]}
      >
        <Feather 
          name="video" 
          size={18} 
          color={activeTab === 'videos' ? "#FFFFFF" : theme.textSecondary} 
        />
        <ThemedText 
          type="small" 
          style={{ 
            color: activeTab === 'videos' ? "#FFFFFF" : theme.textSecondary,
            marginLeft: Spacing.sm,
            fontWeight: activeTab === 'videos' ? "600" : "500"
          }}
        >
          Videos ({savedVideos.length})
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => setActiveTab('guides')}
        style={({ pressed }) => [
          styles.tab,
          activeTab === 'guides' && { backgroundColor: theme.link },
          { opacity: pressed ? 0.8 : 1 }
        ]}
      >
        <Feather 
          name="cpu" 
          size={18} 
          color={activeTab === 'guides' ? "#FFFFFF" : theme.textSecondary} 
        />
        <ThemedText 
          type="small" 
          style={{ 
            color: activeTab === 'guides' ? "#FFFFFF" : theme.textSecondary,
            marginLeft: Spacing.sm,
            fontWeight: activeTab === 'guides' ? "600" : "500"
          }}
        >
          {t("aiGuide.title")} ({savedGuides.length})
        </ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  const isEmpty = activeTab === 'videos' ? savedVideos.length === 0 : savedGuides.length === 0;

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop }}>
        {renderTabs()}
      </View>

      {activeTab === 'videos' ? (
        isEmpty ? (
          <ScrollView 
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.link}
              />
            }
          >
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <FlatList
            data={savedVideos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.link}
              />
            }
            renderItem={({ item, index }) => (
              <VideoCard
                video={item}
                isSaved={item.isSaved}
                isLiked={item.isLiked}
                onSave={() => handleToggleSave(item.id)}
                onLike={() => toggleLike(item.id)}
                onPress={() => handleVideoPress(item, index)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
          />
        )
      ) : (
        isEmpty ? (
          <ScrollView 
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.link}
              />
            }
          >
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.guidesListContent, { paddingBottom }]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.link}
              />
            }
          >
            {savedGuides.map(guide => renderGuideCard(guide))}
          </ScrollView>
        )
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  guidesListContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: "transparent",
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
  guideCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  guideHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.md,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  guideInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  guideHeaderRight: {
    padding: Spacing.sm,
  },
  guideContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
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
  imagesContainer: {
    marginBottom: Spacing.lg,
    marginHorizontal: -Spacing.lg,
  },
  imagesScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  imageItem: {
    width: 160,
  },
  guideImage: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  imageCaption: {
    textAlign: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
});
