import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootNavigator";

type PrivacyTermsScreenRouteProp = RouteProp<RootStackParamList, "PrivacyTerms">;

export default function PrivacyTermsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<PrivacyTermsScreenRouteProp>();
  const screenType = route.params?.type || "privacy";

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: screenType === "privacy" 
        ? t("settings.privacyPolicy") 
        : screenType === "terms" 
        ? t("settings.termsOfService")
        : t("settings.communityGuidelines", { defaultValue: "Community Guidelines" }),
    });
  }, [navigation, t, screenType]);

  const renderPrivacyContent = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.cardHeader}>
          <Feather name="shield" size={20} color={theme.link} />
          <ThemedText type="h4" style={styles.cardTitle}>
            {t("legal.privacyTitle", { defaultValue: "Your Privacy Matters" })}
          </ThemedText>
        </View>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.privacyIntro", { defaultValue: "QuickFix is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.dataCollection", { defaultValue: "Data We Collect" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.dataCollectionText", { defaultValue: "We collect information you provide directly, such as account details, uploaded content, and messages. We also collect usage data to improve the app experience." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.aiUsage", { defaultValue: "AI-Powered Features" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.aiUsageText", { defaultValue: "QuickFix uses artificial intelligence to provide troubleshooting suggestions and analyze images. Your photos and queries may be processed by our AI systems to generate helpful responses. We do not store your images permanently after analysis." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.dataSecurity", { defaultValue: "Data Security" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.dataSecurityText", { defaultValue: "We implement industry-standard security measures to protect your data. Your account information is encrypted and stored securely." })}
        </ThemedText>
      </View>
    </>
  );

  const renderTermsContent = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.cardHeader}>
          <Feather name="file-text" size={20} color={theme.link} />
          <ThemedText type="h4" style={styles.cardTitle}>
            {t("legal.termsTitle", { defaultValue: "Terms of Service" })}
          </ThemedText>
        </View>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.termsIntro", { defaultValue: "By using QuickFix, you agree to these terms. Please read them carefully before using the app." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.acceptableUse", { defaultValue: "Acceptable Use" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.acceptableUseText", { defaultValue: "You agree to use QuickFix responsibly and not to post harmful, misleading, or illegal content. Uploaded videos and content must be your own or properly licensed." })}
        </ThemedText>
      </View>

      <View style={[styles.warningCard, { backgroundColor: `${theme.error}15` }]}>
        <View style={styles.cardHeader}>
          <Feather name="alert-triangle" size={20} color={theme.error} />
          <ThemedText type="h4" style={[styles.cardTitle, { color: theme.error }]}>
            {t("legal.disclaimer", { defaultValue: "Important Disclaimer" })}
          </ThemedText>
        </View>
        <ThemedText type="body" style={[styles.cardText, { color: theme.text }]}>
          {t("legal.disclaimerText", { defaultValue: "AI-generated troubleshooting suggestions are provided for informational purposes only. QuickFix and its AI features do not guarantee accuracy or safety. Users are solely responsible for evaluating and implementing any suggestions. Always consult a qualified professional for electrical, plumbing, or other potentially dangerous repairs. QuickFix is not liable for any damages, injuries, or losses resulting from following AI-generated advice." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.userResponsibility", { defaultValue: "User Responsibility" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.userResponsibilityText", { defaultValue: "You are responsible for your own safety when attempting any repair or maintenance task. Always prioritize safety, wear appropriate protective equipment, and know when to call a professional." })}
        </ThemedText>
      </View>
    </>
  );

  const renderGuidelinesContent = () => (
    <>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.cardHeader}>
          <Feather name="book-open" size={20} color={theme.link} />
          <ThemedText type="h4" style={styles.cardTitle}>
            {t("legal.guidelinesTitle", { defaultValue: "Community Guidelines" })}
          </ThemedText>
        </View>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.guidelinesIntro", { defaultValue: "Help us keep QuickFix a helpful and safe community. Follow these guidelines when using the app." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.beRespectful", { defaultValue: "Be Respectful" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.beRespectfulText", { defaultValue: "Treat others with respect. No harassment, hate speech, bullying, or discrimination will be tolerated." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.beHelpful", { defaultValue: "Be Helpful & Accurate" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.beHelpfulText", { defaultValue: "Share accurate, helpful information. Do not post misleading content, spam, or dangerous advice that could harm others." })}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {t("legal.reportViolations", { defaultValue: "Report Violations" })}
        </ThemedText>
        <ThemedText type="body" style={[styles.cardText, { color: theme.textSecondary }]}>
          {t("legal.reportViolationsText", { defaultValue: "If you see content that violates these guidelines, please report it. This helps keep the QuickFix community safe and helpful for everyone." })}
        </ThemedText>
      </View>
    </>
  );

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      {screenType === "privacy" ? renderPrivacyContent() : null}
      {screenType === "terms" ? renderTermsContent() : null}
      {screenType === "guidelines" ? renderGuidelinesContent() : null}

      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
          {t("legal.lastUpdated", { defaultValue: "Last updated: December 2024" })}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          QuickFix v1.0.0
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["5xl"],
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  warningCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  cardText: {
    lineHeight: 24,
  },
  footer: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
