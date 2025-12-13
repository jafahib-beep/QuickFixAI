import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Alert, Platform, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { languages } from "@/utils/i18n";
import i18n from "@/utils/i18n";

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout } = useAuth();
  const { subscription, usage, config, createCheckout, cancelSubscription, refreshStatus } = useSubscription();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("settings.title"),
    });
  }, [navigation, t]);

  const currentLanguage = languages.find((l) => l.code === i18n.language);

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(t("auth.logoutConfirm"));
      if (confirmed) {
        await logout();
      }
    } else {
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
    }
  };

  const handleDeleteAccount = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(t("settings.deleteAccountConfirm"));
      if (confirmed) {
        const doubleConfirm = window.confirm("Are you absolutely sure?");
        if (doubleConfirm) {
          await logout();
        }
      }
    } else {
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
    }
  };

  const handleSubscribe = async () => {
    setIsSubscriptionLoading(true);
    try {
      const result = await createCheckout();
      if (result.url) {
        if (Platform.OS === "web") {
          window.open(result.url, "_blank");
        } else {
          await Linking.openURL(result.url);
        }
      } else {
        Alert.alert("Error", result.error || "Failed to open checkout");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsSubscriptionLoading(false);
      await refreshStatus();
    }
  };

  const handleCancelSubscription = async () => {
    const confirmCancel = () => {
      setIsSubscriptionLoading(true);
      cancelSubscription()
        .then((result) => {
          if (result.success) {
            Alert.alert("Subscription Cancelled", result.message || "Your subscription has been cancelled.");
          } else {
            Alert.alert("Error", result.error || "Failed to cancel subscription");
          }
        })
        .catch((err: any) => {
          Alert.alert("Error", err.message);
        })
        .finally(() => {
          setIsSubscriptionLoading(false);
          refreshStatus();
        });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to cancel your subscription?")) {
        confirmCancel();
      }
    } else {
      Alert.alert(
        "Cancel Subscription",
        "Are you sure you want to cancel? You will keep access until the end of your billing period.",
        [
          { text: "Keep Subscription", style: "cancel" },
          { text: "Cancel Subscription", style: "destructive", onPress: confirmCancel },
        ]
      );
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return "Free";
    if (subscription.plan === "paid" && subscription.isActive) return "Premium";
    if (subscription.plan === "trial" && subscription.isActive) return "Trial";
    if (subscription.status === "canceled") return "Cancelled";
    return "Free";
  };

  const getSubscriptionDetails = () => {
    if (!subscription) return null;
    if (subscription.plan === "trial" && subscription.trialEndsAt) {
      const endDate = new Date(subscription.trialEndsAt);
      return `Trial ends ${endDate.toLocaleDateString()}`;
    }
    if (subscription.plan === "paid" && subscription.paidUntil) {
      const renewDate = new Date(subscription.paidUntil);
      return `Renews ${renewDate.toLocaleDateString()}`;
    }
    if (subscription.status === "canceled" && subscription.paidUntil) {
      const accessUntil = new Date(subscription.paidUntil);
      return `Access until ${accessUntil.toLocaleDateString()}`;
    }
    return null;
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
        { opacity: pressed && onPress ? 0.85 : 1 },
      ]}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: destructive ? `${theme.error}15` : theme.backgroundTertiary }]}>
          <Feather
            name={icon as any}
            size={18}
            color={destructive ? theme.error : theme.text}
          />
        </View>
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
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.language").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          {renderSettingRow(
            "globe",
            t("settings.language"),
            () => navigation.navigate("LanguagePicker"),
            <View style={styles.rightContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {currentLanguage?.nativeName || "English"}
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.notifications").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
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
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.account").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          {renderSettingRow("lock", t("settings.changePassword"), () => {
            Alert.alert(t("settings.changePassword"), "This feature is coming soon.");
          })}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("trash-2", t("settings.deleteAccount"), handleDeleteAccount, undefined, true)}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.privacy").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          {renderSettingRow("slash", t("settings.blockedUsers"), () => {
            Alert.alert(t("settings.blockedUsers"), "No blocked users.");
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          SUBSCRIPTION
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={[styles.planBadge, { 
                backgroundColor: subscription?.isPremium ? `${theme.success}20` : theme.backgroundTertiary 
              }]}>
                <Feather 
                  name={subscription?.isPremium ? "zap" : "user"} 
                  size={16} 
                  color={subscription?.isPremium ? theme.success : theme.textSecondary} 
                />
                <ThemedText 
                  type="caption" 
                  style={{ 
                    color: subscription?.isPremium ? theme.success : theme.textSecondary,
                    fontWeight: "600",
                    marginLeft: Spacing.xs
                  }}
                >
                  {getSubscriptionStatus()}
                </ThemedText>
              </View>
            </View>
            
            {getSubscriptionDetails() ? (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {getSubscriptionDetails()}
              </ThemedText>
            ) : null}

            {usage ? (
              <View style={[styles.usageInfo, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="image" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                  {subscription?.isPremium 
                    ? "Unlimited image analyses"
                    : `${usage.imagesUsedToday}/${usage.dailyImageLimit || 2} images used today`
                  }
                </ThemedText>
              </View>
            ) : null}

            {!subscription?.isPremium ? (
              <Pressable
                style={[styles.upgradeButton, { backgroundColor: theme.link }]}
                onPress={handleSubscribe}
                disabled={isSubscriptionLoading}
              >
                <Feather name="zap" size={16} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                  {config?.priceSek ? `Upgrade - ${config.priceSek} SEK/month` : "Upgrade to Premium"}
                </ThemedText>
              </Pressable>
            ) : subscription?.status !== "canceled" ? (
              <Pressable
                style={[styles.cancelButton, { borderColor: theme.error }]}
                onPress={handleCancelSubscription}
                disabled={isSubscriptionLoading}
              >
                <ThemedText type="body" style={{ color: theme.error }}>
                  Cancel Subscription
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.legal", { defaultValue: "LEGAL" }).toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          {renderSettingRow("book-open", t("settings.communityGuidelines", { defaultValue: "Community Guidelines" }), () => {
            navigation.navigate("PrivacyTerms", { type: "guidelines" });
          })}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("file-text", t("settings.termsOfService"), () => {
            navigation.navigate("PrivacyTerms", { type: "terms" });
          })}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {renderSettingRow("shield", t("settings.privacyPolicy"), () => {
            navigation.navigate("PrivacyTerms", { type: "privacy" });
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("settings.about").toUpperCase()}
        </ThemedText>
        <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground }]}>
          {renderSettingRow(
            "info",
            t("settings.version"),
            undefined,
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              1.0.0
            </ThemedText>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: `${theme.error}10`, opacity: pressed ? 0.85 : 1 },
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
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: BorderRadius.md,
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontWeight: "400",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  logoutText: {
    fontWeight: "600",
  },
  subscriptionCard: {
    padding: Spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  usageInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
});
