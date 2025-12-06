import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  I18nManager,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";

export type ReportContentType = "video" | "profile" | "comment";

export interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId?: string;
  targetUserId?: string;
}

const REPORT_REASONS = [
  "harassment",
  "hate",
  "threats",
  "sexual",
  "scam",
  "dangerous",
  "spam",
  "other",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

export default function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
  targetUserId,
}: ReportModalProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;

  console.log("[ReportModal] render, visible:", visible, "contentType:", contentType);

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedReason(null);
    setMessage("");
    setIsSubmitting(false);
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitReport({
        contentType,
        contentId,
        targetUserId,
        reason: selectedReason,
        message: message.trim() || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || t("report.errorSubmitting"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (contentType === "video") return t("report.reportVideo");
    if (contentType === "profile") return t("report.reportUser");
    return t("report.reportContent");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
              <ThemedText type="h3" style={styles.title}>
                {getTitle()}
              </ThemedText>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: `${theme.success}20` }]}>
                <Feather name="check" size={32} color={theme.success} />
              </View>
              <ThemedText type="h4" style={styles.successTitle}>
                {t("report.thankYou")}
              </ThemedText>
              <ThemedText type="body" style={[styles.successMessage, { color: theme.textSecondary }]}>
                {t("report.submittedForReview")}
              </ThemedText>
              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.link }]}
                onPress={handleClose}
              >
                <ThemedText type="body" style={styles.doneButtonText}>
                  {t("common.done")}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <ThemedText type="body" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {t("report.selectReason")}
              </ThemedText>

              <View style={styles.reasonsList}>
                {REPORT_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    style={[
                      styles.reasonItem,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: selectedReason === reason ? theme.link : "transparent",
                        borderWidth: 2,
                      },
                      isRTL && styles.reasonItemRTL,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: selectedReason === reason ? theme.link : theme.textSecondary,
                        },
                      ]}
                    >
                      {selectedReason === reason && (
                        <View style={[styles.radioInner, { backgroundColor: theme.link }]} />
                      )}
                    </View>
                    <ThemedText type="body" style={styles.reasonText}>
                      {t(`report.reasons.${reason}`)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText
                type="body"
                style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.lg }]}
              >
                {t("report.describeIssue")} ({t("common.optional")})
              </ThemedText>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                placeholder={t("report.describePlaceholder")}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                maxLength={500}
              />

              {error && (
                <View style={[styles.errorContainer, { backgroundColor: `${theme.error}20` }]}>
                  <Feather name="alert-circle" size={16} color={theme.error} />
                  <ThemedText type="small" style={{ color: theme.error, marginLeft: Spacing.xs }}>
                    {error}
                  </ThemedText>
                </View>
              )}

              <Pressable
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: selectedReason ? theme.link : theme.backgroundSecondary,
                    opacity: selectedReason ? 1 : 0.6,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText type="body" style={styles.submitButtonText}>
                    {t("report.submit")}
                  </ThemedText>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128, 128, 128, 0.4)",
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingBottom: Spacing.md,
  },
  headerContentRTL: {
    flexDirection: "row-reverse",
  },
  title: {
    fontSize: 20,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  reasonsList: {
    gap: Spacing.sm,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  reasonItemRTL: {
    flexDirection: "row-reverse",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonText: {
    flex: 1,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  successMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  doneButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl * 2,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
