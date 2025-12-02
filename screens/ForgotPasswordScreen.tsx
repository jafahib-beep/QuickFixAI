import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    Alert.alert(t("auth.passwordReset"), t("auth.resetEmailSent"), [
      { text: t("common.ok"), onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScreenKeyboardAwareScrollView contentContainerStyle={styles.content}>
      <ThemedText type="h2" style={styles.title}>
        {t("auth.resetPassword")}
      </ThemedText>
      
      <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
        {t("auth.resetEmailSent")}
      </ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText type="small" style={styles.label}>
          {t("auth.email")}
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: error ? theme.error : theme.border,
              color: theme.text,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.email")}
          placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? (
          <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        ) : null}
      </View>

      <Button
        onPress={handleReset}
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.buttonText} />
        ) : (
          t("auth.resetPassword")
        )}
      </Button>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.lg,
  },
  description: {
    marginBottom: Spacing["3xl"],
  },
  inputContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  error: {
    marginTop: Spacing.xs,
  },
  button: {
    borderRadius: BorderRadius.sm,
  },
});
