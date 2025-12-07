import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useCommunity } from "@/contexts/CommunityContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { CATEGORIES, getCategoryIcon, getCategoryColor } from "@/constants/categories";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const { createPost } = useCommunity();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string; category?: string }>({});

  const validate = (): boolean => {
    const newErrors: { title?: string; description?: string; category?: string } = {};

    if (!title.trim()) {
      newErrors.title = t("community.titleRequired");
    } else if (title.length < 10) {
      newErrors.title = t("community.titleTooShort");
    }

    if (!description.trim()) {
      newErrors.description = t("community.descriptionRequired");
    } else if (description.length < 20) {
      newErrors.description = t("community.descriptionTooShort");
    }

    if (!selectedCategory) {
      newErrors.category = t("community.categoryRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const post = await createPost({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (post) {
        navigation.goBack();
      } else {
        Alert.alert(t("common.error"), t("community.createPostError"));
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('token') || errorMessage.includes('Authentication') || errorMessage.includes('401')) {
        Alert.alert(
          t("common.error"),
          t("community.authError", "Please log out and log back in to post. Your session may have expired.")
        );
      } else {
        Alert.alert(t("common.error"), t("community.createPostError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenKeyboardAwareScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.link + "20" }]}>
            <Feather name="edit-3" size={24} color={theme.link} />
          </View>
          <ThemedText type="h2" style={styles.headerTitle}>
            {t("community.createPost")}
          </ThemedText>
          <ThemedText type="body" style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t("community.createPostHint")}
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="body" style={styles.label}>
              {t("community.postTitle")} *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: errors.title ? "#FF3B30" : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder={t("community.titlePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={150}
            />
            {errors.title ? (
              <ThemedText type="small" style={styles.errorText}>
                {errors.title}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={[styles.charCount, { color: theme.textSecondary }]}>
              {title.length}/150
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="body" style={styles.label}>
              {t("community.postDescription")} *
            </ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: errors.description ? "#FF3B30" : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder={t("community.descriptionPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            {errors.description ? (
              <ThemedText type="small" style={styles.errorText}>
                {errors.description}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={[styles.charCount, { color: theme.textSecondary }]}>
              {description.length}/1000
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="body" style={styles.label}>
              {t("community.category")} *
            </ThemedText>
            {errors.category ? (
              <ThemedText type="small" style={styles.errorText}>
                {errors.category}
              </ThemedText>
            ) : null}
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category.key;
                const categoryColor = getCategoryColor(category.key);
                return (
                  <Pressable
                    key={category.key}
                    onPress={() => setSelectedCategory(category.key)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: isSelected ? categoryColor + "20" : theme.backgroundDefault,
                        borderColor: isSelected ? categoryColor : theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={getCategoryIcon(category.key)}
                      size={18}
                      color={isSelected ? categoryColor : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? categoryColor : theme.text,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      {t(category.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="body" style={styles.label}>
              {t("community.imageUrl")} ({t("common.optional")})
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder={t("community.imageUrlPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={imageUrl}
              onChangeText={setImageUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            { backgroundColor: theme.link, opacity: isSubmitting ? 0.7 : 1 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                {t("community.submitPost")}
              </ThemedText>
            </>
          )}
        </Pressable>
      </ScreenKeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  headerSubtitle: {
    textAlign: "center",
  },
  form: {
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    minHeight: 120,
  },
  errorText: {
    color: "#FF3B30",
  },
  charCount: {
    textAlign: "right",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  categoryButton: {
    width: "31%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
