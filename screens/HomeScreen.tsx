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
import { Video } from "@/utils/storage";
import { sampleVideos } from "@/utils/sampleData";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { videos, isLoading, refreshVideos, savedVideoIds, likedVideoIds, toggleSave, toggleLike } = useVideos();

  const allVideos = videos.length > 0 ? videos : sampleVideos;

  const recommendedVideos = allVideos.slice(0, 5);
  const newVideos = [...allVideos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);
  const popularVideos = [...allVideos].sort((a, b) => b.likes - a.likes).slice(0, 5);

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  }, [navigation]);

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
              video={item}
              isSaved={savedVideoIds.includes(item.id)}
              isLiked={likedVideoIds.includes(item.id)}
              onSave={() => toggleSave(item.id)}
              onLike={() => toggleLike(item.id)}
              horizontal
            />
          </Pressable>
        )}
      />
    </View>
  );

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshVideos}
          tintColor={theme.text}
        />
      }
      contentContainerStyle={styles.content}
    >
      {renderSection(t("home.recommended"), recommendedVideos)}
      {renderSection(t("home.new"), newVideos)}
      {renderSection(t("home.popular"), popularVideos)}
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
});
