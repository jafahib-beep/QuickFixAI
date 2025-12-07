import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, View, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import ProfileScreen from "@/screens/ProfileScreen";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationsContext";
import { getCommonScreenOptions } from "./screenOptions";
import { RootStackParamList } from "./RootNavigator";
import { Spacing } from "@/constants/theme";

export type ProfileStackParamList = {
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function HeaderRightButtons() {
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.headerButtons}>
      <Pressable
        onPress={() => navigation.navigate("Notifications")}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <View>
          <Feather name="bell" size={22} color={theme.text} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              {unreadCount <= 9 ? (
                <Text style={styles.badgeText}>{unreadCount}</Text>
              ) : (
                <Text style={styles.badgeText}>9+</Text>
              )}
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate("Settings")}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <Feather name="settings" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerButton: {
    position: "relative",
  },
  badge: {
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
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t("profile.title"),
          headerRight: () => <HeaderRightButtons />,
        }}
      />
    </Stack.Navigator>
  );
}
