import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { languages } from "@/utils/i18n";
import i18n from "@/utils/i18n";

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout } = useAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("settings.title"),
    });
  }, [navigation, t]);

  const currentLanguage = languages.find((l) => l.code === i18n.language);

  const handleLogout = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t("settings.deleteAccount"), t("settings.deleteAccountConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          Alert.alert(t("settings.deleteAccount"), "Are you absolutely sure?", [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("common.yes"),
              style: "destructive",
              onPress: async () => {
                await logout();
              },
            },
          ]);
        },
      },
    ]);
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    destructive?: boolean
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: theme.backgroundDefault, opacity: pressed && onPress ? 0.8 : 1 },
      ]}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Feather
          name={icon as any}
          size={20}
          color={destructive ? theme.error : theme.text}
        />
        <ThemedText
          type="body"
          style={[styles.settingTitle, destructive && { color: theme.error }]}
        >
          {title}
        </ThemedText>
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.language").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
          {renderSettingRow(
            "globe",
            t("settings.language"),
            () => navigation.navigate("LanguagePicker"),
            <View style={styles.rightContent}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {currentLanguage?.nativeName || "English"}
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.notifications").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
          {renderSettingRow(
            "bell",
            t("settings.pushNotifications"),
            undefined,
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: theme.border, true: theme.link }}
              thumbColor="#FFFFFF"
            />
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow(
            "mail",
            t("settings.emailNotifications"),
            undefined,
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: theme.border, true: theme.link }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.account").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
          {renderSettingRow("lock", t("settings.changePassword"), () => {
            Alert.alert(t("settings.changePassword"), "This feature is coming soon.");
          })}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("trash-2", t("settings.deleteAccount"), handleDeleteAccount, undefined, true)}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.privacy").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
          {renderSettingRow("slash", t("settings.blockedUsers"), () => {
            Alert.alert(t("settings.blockedUsers"), "No blocked users.");
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.about").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
          {renderSettingRow(
            "info",
            t("settings.version"),
            undefined,
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              1.0.0
            </ThemedText>
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("file-text", t("settings.termsOfService"), () => {
            Alert.alert(t("settings.termsOfService"), "Terms of Service will be displayed here.");
          })}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("shield", t("settings.privacyPolicy"), () => {
            Alert.alert(t("settings.privacyPolicy"), "Privacy Policy will be displayed here.");
          })}
        </View>
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="log-out" size={20} color={theme.error} />
        <ThemedText type="body" style={[styles.logoutText, { color: theme.error }]}>
          {t("auth.logout")}
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionContent: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingTitle: {
    marginLeft: Spacing.md,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  logoutText: {
    fontWeight: "600",
  },
});
