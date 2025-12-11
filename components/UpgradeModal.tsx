import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../hooks/useTheme";
import { useSubscription } from "../contexts/SubscriptionContext";

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: "daily_limit" | "video_upload" | "general";
  imagesUsed?: number;
  limit?: number;
}

export function UpgradeModal({
  visible,
  onClose,
  reason = "general",
  imagesUsed = 0,
  limit = 2,
}: UpgradeModalProps) {
  const { theme, isDark } = useTheme();
  const { config, startTrial, createCheckout, subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUsedTrial = subscription?.plan === "trial" || subscription?.status === "trialing";

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startTrial();
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to start trial");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createCheckout();
      if (result.url) {
        if (Platform.OS === "web") {
          window.open(result.url, "_blank");
        } else {
          await Linking.openURL(result.url);
        }
        onClose();
      } else {
        setError(result.error || "Failed to create checkout");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (reason) {
      case "daily_limit":
        return "Daily Limit Reached";
      case "video_upload":
        return "Premium Feature";
      default:
        return "Upgrade to Premium";
    }
  };

  const getMessage = () => {
    switch (reason) {
      case "daily_limit":
        return `You've used ${imagesUsed} of ${limit} free image analyses today. Upgrade to Premium for unlimited access.`;
      case "video_upload":
        return "Video uploads require a Premium subscription. Upgrade now to unlock this feature.";
      default:
        return "Unlock all LiveAssist features with Premium. Get unlimited image analyses, video uploads, and more.";
    }
  };

  const accentColor = "#0A84FF";
  const successColor = theme.success;
  const whiteColor = "#FFFFFF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={40} style={styles.backdrop} tint="dark">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.iconContainer, { backgroundColor: "rgba(10, 132, 255, 0.15)" }]}>
              <Feather name="zap" size={40} color={accentColor} />
            </View>

            <ThemedText style={[styles.title, { color: theme.text }]}>{getTitle()}</ThemedText>
            <ThemedText style={[styles.message, { color: theme.textSecondary }]}>{getMessage()}</ThemedText>

            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={18} color={successColor} />
                <ThemedText style={[styles.featureText, { color: theme.text }]}>Unlimited image analyses</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={18} color={successColor} />
                <ThemedText style={[styles.featureText, { color: theme.text }]}>Video upload support</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={18} color={successColor} />
                <ThemedText style={[styles.featureText, { color: theme.text }]}>Full AI responses</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={18} color={successColor} />
                <ThemedText style={[styles.featureText, { color: theme.text }]}>Premium badge</ThemedText>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <ThemedText style={[styles.price, { color: accentColor }]}>
                {config?.priceSek || 39} SEK
              </ThemedText>
              <ThemedText style={[styles.priceSubtext, { color: theme.textSecondary }]}>/month</ThemedText>
            </View>

            {error ? (
              <ThemedText style={[styles.errorText, { color: theme.error }]}>{error}</ThemedText>
            ) : null}

            {!hasUsedTrial ? (
              <Pressable
                style={[styles.primaryButton, { backgroundColor: accentColor }, loading && styles.buttonDisabled]}
                onPress={handleStartTrial}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={whiteColor} />
                ) : (
                  <>
                    <Feather name="play" size={18} color={whiteColor} />
                    <ThemedText style={[styles.primaryButtonText, { color: whiteColor }]}>
                      Start {config?.trialDays || 5}-Day Free Trial
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}

            <Pressable
              style={[
                hasUsedTrial ? [styles.primaryButton, { backgroundColor: accentColor }] : [styles.secondaryButton, { borderColor: accentColor }],
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              {loading && hasUsedTrial ? (
                <ActivityIndicator color={whiteColor} />
              ) : (
                <ThemedText
                  style={
                    hasUsedTrial
                      ? [styles.primaryButtonText, { color: whiteColor }]
                      : [styles.secondaryButtonText, { color: accentColor }]
                  }
                >
                  Subscribe Now
                </ThemedText>
              )}
            </Pressable>

            <Pressable style={styles.laterButton} onPress={onClose}>
              <ThemedText style={[styles.laterButtonText, { color: theme.textSecondary }]}>Maybe Later</ThemedText>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
  },
  price: {
    fontSize: 32,
    fontWeight: "700",
  },
  priceSubtext: {
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  laterButton: {
    paddingVertical: Spacing.sm,
  },
  laterButtonText: {
    fontSize: 14,
  },
});
