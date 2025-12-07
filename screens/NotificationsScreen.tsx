import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationsContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Notification } from "@/utils/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const getNotificationIcon = (type: string): "message-circle" | "heart" | "bell" | "user" => {
    switch (type) {
      case "comment":
        return "message-circle";
      case "like":
        return "heart";
      case "follow":
        return "user";
      default:
        return "bell";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("notifications.justNow", { defaultValue: "Just now" });
    if (diffMins < 60) return t("notifications.minutesAgo", { defaultValue: "{{count}}m ago", count: diffMins });
    if (diffHours < 24) return t("notifications.hoursAgo", { defaultValue: "{{count}}h ago", count: diffHours });
    return t("notifications.daysAgo", { defaultValue: "{{count}}d ago", count: diffDays });
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.relatedVideoId) {
      navigation.navigate("VideoPlayer", { video: { id: notification.relatedVideoId } as any });
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handleNotificationPress(item)}
      style={({ pressed }) => [
        styles.notificationItem,
        { 
          backgroundColor: item.isRead ? theme.backgroundSecondary : theme.link + "15",
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.link + "20" }]}>
        <Feather name={getNotificationIcon(item.type)} size={20} color={theme.link} />
      </View>
      <View style={styles.contentContainer}>
        <ThemedText type="body" style={[styles.title, !item.isRead && { fontWeight: "600" }]}>
          {item.title}
        </ThemedText>
        {item.message ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={2}>
            {item.message}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={[styles.time, { color: theme.textSecondary }]}>
          {formatTimeAgo(item.createdAt)}
        </ThemedText>
      </View>
      {!item.isRead ? (
        <View style={[styles.unreadDot, { backgroundColor: theme.link }]} />
      ) : null}
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="bell-off" size={40} color={theme.textSecondary} />
      </View>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        {t("notifications.empty", { defaultValue: "No notifications yet" })}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        {t("notifications.emptyHint", { defaultValue: "You'll see notifications when someone comments on your videos" })}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {unreadCount > 0 ? (
        <View style={styles.headerActions}>
          <Pressable
            onPress={markAllAsRead}
            style={({ pressed }) => [
              styles.markAllButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="check-circle" size={16} color={theme.link} />
            <ThemedText type="small" style={{ color: theme.link, marginLeft: Spacing.xs }}>
              {t("notifications.markAllRead", { defaultValue: "Mark all as read" })}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      ) : notifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  time: {
    marginTop: Spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
});
