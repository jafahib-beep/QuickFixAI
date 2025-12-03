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
import { Spacing, BorderRadius } from "@/constants/theme";
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
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        {videoUri ? (
          <View style={[styles.videoPreview, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="video" size={40} color={theme.link} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Video selected
            </ThemedText>
            <Pressable
              onPress={() => setVideoUri(null)}
              style={({ pressed }) => [
                styles.removeButton, 
                { backgroundColor: theme.error, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.videoButtons}>
            <Pressable
              onPress={pickVideo}
              style={({ pressed }) => [
                styles.videoButton, 
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              <View style={[styles.videoButtonIcon, { backgroundColor: `${theme.link}20` }]}>
                <Feather name="folder" size={24} color={theme.link} />
              </View>
              <ThemedText type="small" style={{ marginTop: Spacing.md, fontWeight: '500' }}>
                {t("upload.selectVideo")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={recordVideo}
              style={({ pressed }) => [
                styles.videoButton, 
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              <View style={[styles.videoButtonIcon, { backgroundColor: `${theme.link}20` }]}>
                <Feather name="video" size={24} color={theme.link} />
              </View>
              <ThemedText type="small" style={{ marginTop: Spacing.md, fontWeight: '500' }}>
                {t("upload.recordVideo")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
          {t("upload.title")} *
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={(text) => setTitle(text.slice(0, 60))}
          placeholder={t("upload.titlePlaceholder")}
          placeholderTextColor={theme.placeholder}
          maxLength={60}
        />
        <ThemedText type="caption" style={[styles.charCount, { color: theme.textSecondary }]}>
          {title.length}/60
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
            {t("upload.descriptionPlaceholder")}
          </ThemedText>
          <Pressable
            onPress={handleGenerateDescription}
            disabled={isGeneratingDesc || !title.trim()}
            style={({ pressed }) => [
              styles.aiButton, 
              { 
                backgroundColor: `${theme.link}15`,
                opacity: (isGeneratingDesc || !title.trim()) ? 0.5 : (pressed ? 0.8 : 1),
              }
            ]}
          >
            {isGeneratingDesc ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : (
              <>
                <Feather name="zap" size={14} color={theme.link} />
                <ThemedText type="caption" style={{ color: theme.link, marginLeft: 4, fontWeight: '500' }}>
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
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <ThemedText type="caption" style={[styles.charCount, { color: theme.textSecondary }]}>
          {description.length}/300
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
          {t("upload.category")} *
        </ThemedText>
        <Pressable
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          style={({ pressed }) => [
            inputStyle, 
            styles.picker,
            { opacity: pressed ? 0.85 : 1 }
          ]}
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
          <View style={[styles.categoryList, { backgroundColor: theme.backgroundSecondary }]}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category.key}
                onPress={() => {
                  setSelectedCategory(category.key);
                  setShowCategoryPicker(false);
                }}
                style={({ pressed }) => [
                  styles.categoryItem,
                  selectedCategory === category.key && { backgroundColor: theme.backgroundTertiary },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                    <Feather name={category.icon} size={16} color={category.color} />
                  </View>
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
          <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
            {t("upload.tags")}
          </ThemedText>
          <Pressable
            onPress={handleSuggestTags}
            disabled={isGeneratingTags || !title.trim()}
            style={({ pressed }) => [
              styles.aiButton, 
              { 
                backgroundColor: `${theme.link}15`,
                opacity: (isGeneratingTags || !title.trim()) ? 0.5 : (pressed ? 0.8 : 1),
              }
            ]}
          >
            {isGeneratingTags ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : (
              <>
                <Feather name="zap" size={14} color={theme.link} />
                <ThemedText type="caption" style={{ color: theme.link, marginLeft: 4, fontWeight: '500' }}>
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
            placeholderTextColor={theme.placeholder}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <Pressable
            onPress={addTag}
            disabled={!tagInput.trim()}
            style={({ pressed }) => [
              styles.addTagButton,
              { 
                backgroundColor: theme.link, 
                opacity: tagInput.trim() ? (pressed ? 0.8 : 1) : 0.5,
              },
            ]}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="small" style={{ fontWeight: '500' }}>#{tag}</ThemedText>
                <Pressable 
                  onPress={() => removeTag(tag)} 
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.toggleSection, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.toggleContent}>
          <Feather name="message-circle" size={20} color={theme.text} />
          <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{t("upload.allowComments")}</ThemedText>
        </View>
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
    marginBottom: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    paddingTop: Spacing.lg,
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
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  videoButtons: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  videoButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  videoButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreview: {
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toggleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
});
