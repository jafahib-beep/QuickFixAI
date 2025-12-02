import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { categories } from "@/utils/sampleData";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [expertise, setExpertise] = useState<string[]>(user?.expertise || []);
  const [isSaving, setIsSaving] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("profile.editProfile"),
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={isSaving} hitSlop={12}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.link} />
          ) : (
            <ThemedText type="body" style={{ color: theme.link, fontWeight: "600" }}>
              {t("common.save")}
            </ThemedText>
          )}
        </Pressable>
      ),
    });
  }, [navigation, theme, t, isSaving, displayName, bio, avatar, expertise]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Permission to access media library is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const toggleExpertise = (category: string) => {
    if (expertise.includes(category)) {
      setExpertise(expertise.filter((c) => c !== category));
    } else if (expertise.length < 5) {
      setExpertise([...expertise, category]);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert(t("common.error"), t("auth.displayNameRequired"));
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatar: avatar || undefined,
        expertise,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert(t("common.error"), t("errors.somethingWentWrong"));
    } finally {
      setIsSaving(false);
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
      <View style={styles.avatarSection}>
        <Pressable onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="h1">
                {displayName?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.link }]}>
            <Feather name="camera" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
        <Pressable onPress={pickImage}>
          <ThemedText type="link" style={{ color: theme.link }}>
            {t("profile.changeAvatar")}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          {t("auth.displayName")} *
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t("auth.displayName")}
          placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          {t("profile.bio")}
        </ThemedText>
        <TextInput
          style={[inputStyle, styles.textArea]}
          value={bio}
          onChangeText={(text) => setBio(text.slice(0, 150))}
          placeholder={t("profile.bioPlaceholder")}
          placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
          multiline
          numberOfLines={3}
          maxLength={150}
        />
        <ThemedText type="caption" style={[styles.charCount, { color: theme.textSecondary }]}>
          {bio.length}/150
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          {t("profile.expertise")}
        </ThemedText>
        <ThemedText type="caption" style={[styles.hint, { color: theme.textSecondary }]}>
          Select up to 5 categories
        </ThemedText>
        <View style={styles.expertiseGrid}>
          {categories.filter((c) => c.key !== "all").map((category) => (
            <Pressable
              key={category.key}
              onPress={() => toggleExpertise(category.key)}
              style={[
                styles.expertiseChip,
                {
                  backgroundColor: expertise.includes(category.key)
                    ? theme.text
                    : theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: expertise.includes(category.key)
                    ? theme.backgroundRoot
                    : theme.text,
                }}
              >
                {t(category.labelKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  hint: {
    marginBottom: Spacing.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  expertiseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  expertiseChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
