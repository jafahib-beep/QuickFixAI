import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  FlatList,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/contexts/VideosContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Video as VideoType } from "@/utils/api";
import { getCategoryByKey } from "@/constants/categories";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const { width, height } = Dimensions.get("window");

type SwipeVideoPlayerRouteProp = RouteProp<RootStackParamList, "SwipeVideoPlayer">;
type SwipeVideoPlayerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VideoItemProps {
  video: VideoType;
  isActive: boolean;
  onCategoryPress: (categoryKey: string, categoryLabel: string) => void;
  onTagPress: (tag: string) => void;
}

function VideoItem({ video, isActive, onCategoryPress, onTagPress }: VideoItemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { toggleSave, toggleLike } = useVideos();

  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);

  const isSaved = video.isSaved ?? false;
  const isLiked = video.isLiked ?? false;
  const category = getCategoryByKey(video.category);

  const player = useVideoPlayer(video.videoUrl || "", (p) => {
    p.loop = true;
    if (isActive) {
      p.play();
    }
  });

  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
    return () => {
      player.pause();
    };
  }, [isActive, player]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this fix: ${video.title}`,
        title: video.title,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      t("common.report"),
      "Report this video for inappropriate content?",
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.yes"), style: "destructive", onPress: () => Alert.alert("Reported") },
      ]
    );
  };

  const toggleUI = () => setShowUI(!showUI);

  const toggleMute = () => {
    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleCategoryPress = () => {
    if (category) {
      onCategoryPress(category.key, t(category.labelKey));
    }
  };

  return (
    <View style={[styles.videoPage, { height }]}>
      <Pressable onPress={toggleUI} style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <ThemedText type="small" style={styles.loadingText}>
              {t("common.loading")}
            </ThemedText>
          </View>
        ) : null}

        {!isPlaying && !isLoading && showUI ? (
          <Pressable onPress={togglePlayPause} style={styles.playPauseOverlay}>
            <View style={styles.playPauseButton}>
              <Feather name="play" size={40} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ) : null}
      </Pressable>

      {showUI ? (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
            <View style={styles.topRightButtons}>
              <Pressable
                onPress={toggleMute}
                style={({ pressed }) => [styles.topButton, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={12}
              >
                <Feather name={isMuted ? "volume-x" : "volume-2"} size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={handleReport}
                style={({ pressed }) => [styles.topButton, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={12}
              >
                <Feather name="flag" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={[styles.bottomOverlay, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.bottomContent}>
              <View style={styles.infoSection}>
                <ThemedText type="h3" style={styles.videoTitle}>
                  {video.title}
                </ThemedText>

                <Pressable style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    <ThemedText type="small" style={styles.authorInitial}>
                      {(video.authorName ?? "U").charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={styles.authorName}>
                    {video.authorName ?? t("common.unknown")}
                  </ThemedText>
                </Pressable>

                <View style={styles.tagsRow}>
                  {category ? (
                    <Pressable
                      onPress={handleCategoryPress}
                      style={({ pressed }) => [
                        styles.categoryTag,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name={category.icon} size={14} color="#FFFFFF" />
                      <ThemedText type="small" style={styles.tagText}>
                        {t(category.labelKey)}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {(video.tags ?? []).slice(0, 3).map((tag, index) => (
                    <Pressable
                      key={index}
                      onPress={() => onTagPress(tag)}
                      style={({ pressed }) => [
                        styles.tag,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <ThemedText type="small" style={styles.tagText}>
                        #{tag}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {video.description ? (
                  <ThemedText type="small" style={styles.description} numberOfLines={2}>
                    {video.description}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.actionsColumn}>
                <Pressable
                  onPress={() => toggleLike(video.id)}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather
                    name="heart"
                    size={26}
                    color={isLiked ? "#FF3B30" : "#FFFFFF"}
                  />
                  <ThemedText type="small" style={styles.actionText}>
                    {video.likesCount ?? (video as any).likes ?? 0}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => toggleSave(video.id)}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather
                    name="bookmark"
                    size={26}
                    color={isSaved ? theme.link : "#FFFFFF"}
                  />
                  <ThemedText type="small" style={styles.actionText}>
                    {isSaved ? t("toolbox.saved") : t("common.save")}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="share" size={26} color="#FFFFFF" />
                  <ThemedText type="small" style={styles.actionText}>
                    {t("common.share")}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </>
      ) : null}
    </View>
  );
}

export default function SwipeVideoPlayerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SwipeVideoPlayerNavigationProp>();
  const route = useRoute<SwipeVideoPlayerRouteProp>();
  const { videos: contextVideos } = useVideos();

  const { videos: routeVideos, startIndex } = route.params;
  
  const videos = routeVideos.map(rv => 
    contextVideos.find(v => v.id === rv.id) || rv as unknown as VideoType
  );

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleCategoryPress = useCallback((categoryKey: string, categoryLabel: string) => {
    navigation.navigate("CategoryFeed", { categoryKey, categoryLabel });
  }, [navigation]);

  const handleTagPress = useCallback((tag: string) => {
    navigation.navigate("TagFeed", { tag });
  }, [navigation]);

  const renderItem = useCallback(({ item, index }: { item: VideoType; index: number }) => (
    <VideoItem
      video={item}
      isActive={index === activeIndex}
      onCategoryPress={handleCategoryPress}
      onTagPress={handleTagPress}
    />
  ), [activeIndex, handleCategoryPress, handleTagPress]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: height,
    offset: height * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        snapToInterval={height}
        snapToAlignment="start"
      />

      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { top: insets.top + Spacing.sm }]}
        hitSlop={12}
      >
        <Feather name="chevron-down" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoPage: {
    width,
    backgroundColor: "#000000",
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: Spacing.md,
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  topRightButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["5xl"],
    paddingHorizontal: Spacing.lg,
  },
  bottomContent: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  infoSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  videoTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  authorInitial: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  authorName: {
    color: "#FFFFFF",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tagText: {
    color: "#FFFFFF",
  },
  description: {
    color: "rgba(255,255,255,0.8)",
  },
  actionsColumn: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
});
