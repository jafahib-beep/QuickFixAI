import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import MainTabNavigator from "./MainTabNavigator";
import AuthNavigator from "./AuthNavigator";
import OnboardingScreen from "@/screens/OnboardingScreen";
import VideoPlayerScreen from "@/screens/VideoPlayerScreen";
import SwipeVideoPlayerScreen from "@/screens/SwipeVideoPlayerScreen";
import UploadScreen from "@/screens/UploadScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import LanguagePickerScreen from "@/screens/LanguagePickerScreen";
import CategoryFeedScreen from "@/screens/CategoryFeedScreen";
import TagFeedScreen from "@/screens/TagFeedScreen";
import CategoriesScreen from "@/screens/CategoriesScreen";
import CommunityPostDetailScreen from "@/screens/CommunityPostDetailScreen";
import CreatePostScreen from "@/screens/CreatePostScreen";
import VideoLibraryScreen from "@/screens/VideoLibraryScreen";
import UserProfileScreen from "@/screens/UserProfileScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { storage } from "@/utils/storage";
import { Video } from "@/utils/api";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined;
  VideoPlayer: { video: Video };
  SwipeVideoPlayer: { videos: Video[]; startIndex: number };
  Upload: undefined;
  Settings: undefined;
  EditProfile: undefined;
  LanguagePicker: undefined;
  CategoryFeed: { categoryKey: string; categoryLabel: string };
  TagFeed: { tag: string };
  Categories: undefined;
  CommunityPostDetail: { postId: string };
  CreatePost: undefined;
  VideoLibrary: undefined;
  UserProfile: { userId: string };
  Report: { contentType: "video" | "profile" | "comment"; contentId?: string; targetUserId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const completed = await storage.isOnboardingCompleted();
    setShowOnboarding(!completed);
  };

  const handleOnboardingComplete = async () => {
    await storage.setOnboardingCompleted();
    setShowOnboarding(false);
  };

  if (authLoading || showOnboarding === null) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showOnboarding && !isAuthenticated ? (
        <Stack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen {...props} onComplete={handleOnboardingComplete} />
          )}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen
            name="VideoPlayer"
            component={VideoPlayerScreen}
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="SwipeVideoPlayer"
            component={SwipeVideoPlayerScreen}
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Upload"
            component={UploadScreen}
            options={{
              presentation: "modal",
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="LanguagePicker"
            component={LanguagePickerScreen}
            options={{
              presentation: "modal",
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="CategoryFeed"
            component={CategoryFeedScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="TagFeed"
            component={TagFeedScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="CommunityPostDetail"
            component={CommunityPostDetailScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{
              presentation: "modal",
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="VideoLibrary"
            component={VideoLibraryScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              ...getCommonScreenOptions({ theme, isDark, transparent: false }),
              headerShown: true,
              title: "",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
