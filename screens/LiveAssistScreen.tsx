import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { api, LiveAssistResponse } from "@/utils/api";

interface AnalysisResult {
  summary: string;
  possibleIssue: string;
  steps: Array<{ stepNumber: number; text: string }>;
  safetyNote?: string;
  rawResponse?: string;
}

export default function LiveAssistScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const language = i18n.language;

  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("chat.permissionRequired"), t("chat.cameraPermission"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    setCapturedImage(asset.uri);
    setError(null);
    await analyzeImage(asset.base64 as string);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("chat.permissionRequired"), t("chat.photoLibraryPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    setCapturedImage(asset.uri);
    setError(null);
    await analyzeImage(asset.base64 as string);
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await api.liveAssist(imageBase64, language);

      if (response.success && response.analysis) {
        setAnalysisResult(response.analysis);
      } else {
        setError(response.analysis?.rawResponse || t("chat.liveAssistError"));
      }
    } catch (err: any) {
      console.log("[LiveAssistScreen] Error:", err?.message || err);
      setError(t("chat.liveAssistError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  const renderWelcomeState = () => (
    <View style={[styles.welcomeContainer, { paddingBottom: tabBarHeight + Spacing.xl }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.link + "20" }]}>
        <Feather name="zap" size={64} color={theme.link} />
      </View>
      
      <ThemedText style={[styles.welcomeTitle, { color: theme.text }]}>
        {t("liveAssist.title")}
      </ThemedText>
      
      <ThemedText style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
        {t("liveAssist.subtitle")}
      </ThemedText>

      <View style={styles.buttonsContainer}>
        <Pressable
          onPress={handleTakePhoto}
          style={({ pressed }) => [
            styles.mainButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#0A84FF", "#0066CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Feather name="camera" size={28} color="#FFFFFF" />
            <ThemedText style={styles.mainButtonText}>
              {t("liveAssist.takePhoto")}
            </ThemedText>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handlePickImage}
          style={({ pressed }) => [
            styles.secondaryButton,
            { 
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="image" size={24} color={theme.text} />
          <ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>
            {t("liveAssist.chooseFromGallery")}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureRow}>
          <Feather name="check-circle" size={18} color={theme.success} />
          <ThemedText style={[styles.featureText, { color: theme.textSecondary }]}>
            {t("liveAssist.feature1")}
          </ThemedText>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check-circle" size={18} color={theme.success} />
          <ThemedText style={[styles.featureText, { color: theme.textSecondary }]}>
            {t("liveAssist.feature2")}
          </ThemedText>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check-circle" size={18} color={theme.success} />
          <ThemedText style={[styles.featureText, { color: theme.textSecondary }]}>
            {t("liveAssist.feature3")}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {capturedImage ? (
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
      ) : null}
      <View style={[styles.loadingOverlay, { backgroundColor: theme.overlay }]}>
        <ActivityIndicator size="large" color={theme.link} />
        <ThemedText style={[styles.loadingText, { color: "#FFFFFF" }]}>
          {t("chat.analyzingPhoto")}
        </ThemedText>
      </View>
    </View>
  );

  const renderResultState = () => (
    <ScrollView
      style={styles.resultScrollView}
      contentContainerStyle={[
        styles.resultContainer,
        { paddingBottom: tabBarHeight + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {capturedImage ? (
        <Image source={{ uri: capturedImage }} style={styles.resultImage} />
      ) : null}

      {analysisResult ? (
        <View style={styles.analysisContainer}>
          {analysisResult.summary ? (
            <View style={[styles.resultCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.resultCardHeader}>
                <Feather name="eye" size={20} color={theme.link} />
                <ThemedText style={[styles.resultCardTitle, { color: theme.text }]}>
                  {t("chat.whatISee")}
                </ThemedText>
              </View>
              <ThemedText style={[styles.resultCardContent, { color: theme.textSecondary }]}>
                {analysisResult.summary}
              </ThemedText>
            </View>
          ) : null}

          {analysisResult.possibleIssue ? (
            <View style={[styles.resultCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.resultCardHeader}>
                <Feather name="alert-circle" size={20} color={theme.error} />
                <ThemedText style={[styles.resultCardTitle, { color: theme.text }]}>
                  {t("chat.likelyIssue")}
                </ThemedText>
              </View>
              <ThemedText style={[styles.resultCardContent, { color: theme.textSecondary }]}>
                {analysisResult.possibleIssue}
              </ThemedText>
            </View>
          ) : null}

          {analysisResult.steps && analysisResult.steps.length > 0 ? (
            <View style={[styles.resultCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.resultCardHeader}>
                <Feather name="list" size={20} color={theme.success} />
                <ThemedText style={[styles.resultCardTitle, { color: theme.text }]}>
                  {t("chat.stepsToFix")}
                </ThemedText>
              </View>
              {analysisResult.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.link }]}>
                    <ThemedText style={styles.stepNumberText}>
                      {step.stepNumber || index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.stepText, { color: theme.textSecondary }]}>
                    {step.text}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {analysisResult.safetyNote ? (
            <View style={[styles.resultCard, styles.safetyCard, { backgroundColor: "#FFF3CD" }]}>
              <View style={styles.resultCardHeader}>
                <Feather name="shield" size={20} color="#856404" />
                <ThemedText style={[styles.resultCardTitle, { color: "#856404" }]}>
                  {t("chat.safetyNote")}
                </ThemedText>
              </View>
              <ThemedText style={[styles.resultCardContent, { color: "#856404" }]}>
                {analysisResult.safetyNote}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : error ? (
        <View style={[styles.errorCard, { backgroundColor: theme.error + "20" }]}>
          <Feather name="alert-triangle" size={24} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [
          styles.newScanButton,
          { 
            backgroundColor: theme.link,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Feather name="refresh-cw" size={20} color="#FFFFFF" />
        <ThemedText style={styles.newScanButtonText}>
          {t("liveAssist.newScan")}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: theme.backgroundRoot,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: theme.link }]}>
            <Feather name="zap" size={20} color="#FFFFFF" />
          </View>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {t("liveAssist.title")}
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          renderLoadingState()
        ) : analysisResult || error ? (
          renderResultState()
        ) : (
          renderWelcomeState()
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  welcomeTitle: {
    ...Typography.h2,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  buttonsContainer: {
    width: "100%",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  mainButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  mainButtonText: {
    color: "#FFFFFF",
    ...Typography.h4,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  secondaryButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  featuresContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureText: {
    ...Typography.small,
  },
  loadingContainer: {
    flex: 1,
    position: "relative",
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    fontWeight: "600",
  },
  resultScrollView: {
    flex: 1,
  },
  resultContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  resultImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  analysisContainer: {
    gap: Spacing.md,
  },
  resultCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  resultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultCardTitle: {
    ...Typography.h4,
  },
  resultCardContent: {
    ...Typography.body,
    lineHeight: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 24,
  },
  safetyCard: {
    borderWidth: 1,
    borderColor: "#856404",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    flex: 1,
  },
  newScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  newScanButtonText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
});
