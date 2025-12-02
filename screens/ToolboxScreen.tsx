import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image } from "react-native";
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
import { useScreenInsets } from "@/hooks/useScreenInsets";

type ToolboxScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ToolboxScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<ToolboxScreenNavigationProp>();
  const { getSavedVideos, savedVideoIds, likedVideoIds, toggleSave, toggleLike } = useVideos();
  const { paddingTop, paddingBottom } = useScreenInsets();

  const savedVideos = getSavedVideos();

  const handleVideoPress = useCallback((video: Video) => {
    navigation.navigate("VideoPlayer", { video });
  }, [navigation]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require("@/assets/images/empty-states/empty-toolbox.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={styles.emptyTitle}>
        {t("toolbox.empty")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyHint, { color: theme.textSecondary }]}>
        {t("toolbox.emptyHint")}
      </ThemedText>
    </View>
  );

  if (savedVideos.length === 0) {
    return (
      <ScreenScrollView contentContainerStyle={styles.emptyContainer}>
        {renderEmptyState()}
      </ScreenScrollView>
    );
  }

  return (
    <FlatList
      data={savedVideos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingTop, paddingBottom },
      ]}
      style={{ backgroundColor: theme.backgroundRoot }}
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
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
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
