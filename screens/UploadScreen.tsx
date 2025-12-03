import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useVideos } from "@/contexts/VideosContext";
import { CATEGORIES } from "@/constants/categories";

export default function UploadScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { addVideo, suggestTags, generateDescription } = useVideos();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("upload.title"),
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ThemedText type="body" style={{ color: theme.link }}>
            {t("common.cancel")}
          </ThemedText>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handlePublish}
          disabled={isPublishing || !title || !selectedCategory}
          hitSlop={12}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={theme.link} />
          ) : (
            <ThemedText
              type="body"
              style={{
                color: theme.link,
                opacity: !title || !selectedCategory ? 0.5 : 1,
                fontWeight: "600",
              }}
            >
              {t("upload.publish")}
            </ThemedText>
          )}
        </Pressable>
      ),
    });
  }, [navigation, theme, t, isPublishing, title, selectedCategory]);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Permission to access media library is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const recordVideo = async () => {
    if (Platform.OS === "web") {
      Alert.alert(t("common.error"), "Video recording is not available on web. Please use Expo Go on your mobile device.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Permission to access camera is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const addTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSuggestTags = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("upload.titleRequired"));
      return;
    }
    setIsGeneratingTags(true);
    try {
      const suggested = await suggestTags(title, description, selectedCategory);
      if (suggested.length > 0) {
        const newTags = [...new Set([...tags, ...suggested])].slice(0, 8);
        setTags(newTags);
      }
    } catch {
      Alert.alert(t("common.error"), "Failed to generate tags");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("upload.titleRequired"));
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const generated = await generateDescription(title, selectedCategory, tags);
      if (generated) {
        setDescription(generated);
      }
    } catch {
      Alert.alert(t("common.error"), "Failed to generate description");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("upload.titleRequired"));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t("common.error"), t("upload.categoryRequired"));
      return;
    }

    setIsPublishing(true);

    try {
      await addVideo({
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedCategory,
        tags,
        videoUrl: videoUri || undefined,
        duration: 45,
        commentsEnabled: allowComments,
      });

      Alert.alert(t("common.success"), t("upload.uploadSuccess"), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t("common.error"), t("upload.uploadError"));
    } finally {
      setIsPublishing(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundDefault,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        {videoUri ? (
          <View style={[styles.videoPreview, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="video" size={40} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Video selected
            </ThemedText>
            <Pressable
              onPress={() => setVideoUri(null)}
              style={[styles.removeButton, { backgroundColor: theme.error }]}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.videoButtons}>
            <Pressable
              onPress={pickVideo}
              style={[styles.videoButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="folder" size={28} color={theme.text} />
              <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                {t("upload.selectVideo")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={recordVideo}
              style={[styles.videoButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="video" size={28} color={theme.text} />
              <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
                {t("upload.recordVideo")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          {t("upload.title")} *
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={(text) => setTitle(text.slice(0, 60))}
          placeholder={t("upload.titlePlaceholder")}
          placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
          maxLength={60}
        />
        <ThemedText type="caption" style={[styles.charCount, { color: theme.textSecondary }]}>
          {title.length}/60
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ThemedText type="small" style={styles.label}>
            {t("upload.descriptionPlaceholder")}
          </ThemedText>
          <Pressable
            onPress={handleGenerateDescription}
            disabled={isGeneratingDesc || !title.trim()}
            style={[styles.aiButton, { opacity: isGeneratingDesc || !title.trim() ? 0.5 : 1 }]}
          >
            {isGeneratingDesc ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : (
              <>
                <Feather name="zap" size={14} color={theme.link} />
                <ThemedText type="caption" style={{ color: theme.link, marginLeft: 4 }}>
                  AI Generate
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
        <TextInput
          style={[inputStyle, styles.textArea]}
          value={description}
          onChangeText={(text) => setDescription(text.slice(0, 300))}
          placeholder={t("upload.descriptionPlaceholder")}
          placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <ThemedText type="caption" style={[styles.charCount, { color: theme.textSecondary }]}>
          {description.length}/300
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          {t("upload.category")} *
        </ThemedText>
        <Pressable
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          style={[inputStyle, styles.picker]}
        >
          <ThemedText
            type="body"
            style={{ color: selectedCategory ? theme.text : theme.placeholder }}
          >
            {selectedCategory
              ? t(`categories.${selectedCategory}`)
              : t("upload.selectCategory")}
          </ThemedText>
          <Feather
            name={showCategoryPicker ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        {showCategoryPicker ? (
          <View style={[styles.categoryList, { backgroundColor: theme.backgroundDefault }]}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category.key}
                onPress={() => {
                  setSelectedCategory(category.key);
                  setShowCategoryPicker(false);
                }}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.key && { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                  <Feather name={category.icon} size={18} color={category.color} />
                  <ThemedText type="body">{t(category.labelKey)}</ThemedText>
                </View>
                {selectedCategory === category.key ? (
                  <Feather name="check" size={18} color={theme.link} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ThemedText type="small" style={styles.label}>
            {t("upload.tags")}
          </ThemedText>
          <Pressable
            onPress={handleSuggestTags}
            disabled={isGeneratingTags || !title.trim()}
            style={[styles.aiButton, { opacity: isGeneratingTags || !title.trim() ? 0.5 : 1 }]}
          >
            {isGeneratingTags ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : (
              <>
                <Feather name="zap" size={14} color={theme.link} />
                <ThemedText type="caption" style={{ color: theme.link, marginLeft: 4 }}>
                  AI Suggest
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[inputStyle, styles.tagInput]}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder={t("upload.addTags")}
            placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <Pressable
            onPress={addTag}
            disabled={!tagInput.trim()}
            style={[
              styles.addTagButton,
              { backgroundColor: theme.text, opacity: tagInput.trim() ? 1 : 0.5 },
            ]}
          >
            <Feather name="plus" size={20} color={theme.backgroundRoot} />
          </Pressable>
        </View>
        {tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="small">{tag}</ThemedText>
                <Pressable onPress={() => removeTag(tag)} hitSlop={8}>
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.section, styles.toggleRow]}>
        <ThemedText type="body">{t("upload.allowComments")}</ThemedText>
        <Switch
          value={allowComments}
          onValueChange={setAllowComments}
          trackColor={{ false: theme.border, true: theme.link }}
          thumbColor="#FFFFFF"
        />
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontWeight: "600",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryList: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  videoButtons: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  videoButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreview: {
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tagInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
