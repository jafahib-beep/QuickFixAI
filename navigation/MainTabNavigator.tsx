import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, Pressable, View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import HomeStackNavigator from "./HomeStackNavigator";
import LiveAssistStackNavigator from "./LiveAssistStackNavigator";
import CommunityStackNavigator from "./CommunityStackNavigator";
import ProfileStackNavigator from "./ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationsContext";
import { RootStackParamList } from "./RootNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

const TAB_ICON_SIZE = 24;
const TAB_LABEL_SIZE = 12;

export type MainTabParamList = {
  HomeTab: undefined;
  LiveAssistTab: undefined;
  UploadTab: undefined;
  CommunityTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function UploadPlaceholder() {
  return null;
}

function UploadButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.uploadButtonContainer}>
      <Pressable
        onPress={() => navigation.navigate("Upload")}
        style={({ pressed }) => [
          styles.uploadButton,
          { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="plus" size={24} color={theme.backgroundRoot} />
      </Pressable>
    </View>
  );
}

function ProfileTabIcon({ color }: { color: string }) {
  const { unreadCount } = useNotifications();
  
  return (
    <View style={styles.profileIconContainer}>
      <Feather name="user" size={TAB_ICON_SIZE} color={color} />
      {unreadCount > 0 ? (
        <View style={styles.notificationBadge}>
          {unreadCount <= 9 ? (
            <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
          ) : (
            <Text style={styles.notificationBadgeText}>9+</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.select({ ios: 88, android: 64 }),
          paddingBottom: Platform.select({ ios: 28, android: 8 }),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: TAB_LABEL_SIZE,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LiveAssistTab"
        component={LiveAssistStackNavigator}
        options={{
          title: "LiveAssist",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="zap" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="UploadTab"
        component={UploadPlaceholder}
        options={{
          title: "",
          tabBarIcon: () => <UploadButton />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityStackNavigator}
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="users" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <ProfileTabIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  uploadButtonContainer: {
    position: "absolute",
    bottom: Spacing.sm,
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profileIconContainer: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
