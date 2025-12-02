import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { languages, changeLanguage, LanguageCode } from "@/utils/i18n";
import i18n from "@/utils/i18n";

export default function LanguagePickerScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("settings.selectLanguage"),
    });
  }, [navigation, t]);

  const handleSelectLanguage = async (code: LanguageCode) => {
    await changeLanguage(code);
    navigation.goBack();
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <View style={[styles.list, { backgroundColor: theme.backgroundDefault }]}>
        {languages.map((language, index) => (
          <React.Fragment key={language.code}>
            <Pressable
              onPress={() => handleSelectLanguage(language.code)}
              style={({ pressed }) => [
                styles.languageRow,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View>
                <ThemedText type="body">{language.nativeName}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {language.name}
                </ThemedText>
              </View>
              {i18n.language === language.code ? (
                <Feather name="check" size={22} color={theme.link} />
              ) : null}
            </Pressable>
            {index < languages.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing["5xl"],
  },
  list: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg,
  },
});
