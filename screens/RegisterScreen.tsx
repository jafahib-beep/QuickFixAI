import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: { displayName?: string; email?: string; password?: string } = {};
    
    if (!displayName.trim()) {
      newErrors.displayName = t("auth.displayNameRequired");
    }
    if (!email.trim()) {
      newErrors.email = t("auth.emailRequired");
    }
    if (!password.trim()) {
      newErrors.password = t("auth.passwordRequired");
    } else if (password.length < 6) {
      newErrors.password = t("auth.passwordMinLength");
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const result = await register(email, password, displayName);
      if (!result.success) {
        Alert.alert(t("common.error"), result.error || t("errors.somethingWentWrong"));
      }
    } catch {
      Alert.alert(t("common.error"), t("errors.somethingWentWrong"));
    } finally {
      setIsLoading(false);
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
    <ThemedView style={styles.container}>
      <ScreenKeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing["5xl"] },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <ThemedText type="h1" style={styles.title}>
          {t("auth.createAccount")}
        </ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.label}>
              {t("auth.displayName")}
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("auth.displayName")}
              placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {errors.displayName ? (
              <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                {errors.displayName}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.label}>
              {t("auth.email")}
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.email")}
              placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? (
              <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                {errors.email}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.label}>
              {t("auth.password")}
            </ThemedText>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[inputStyle, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.password")}
                placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
            {errors.password ? (
              <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                {errors.password}
              </ThemedText>
            ) : null}
          </View>

          <Button
            onPress={handleRegister}
            disabled={isLoading}
            style={styles.registerButton}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              t("auth.signUp")
            )}
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {t("auth.haveAccount")}{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <ThemedText type="link" style={{ color: theme.link }}>
              {t("auth.login")}
            </ThemedText>
          </Pressable>
        </View>
      </ScreenKeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.xs,
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
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: Spacing["5xl"],
  },
  eyeButton: {
    position: "absolute",
    right: Spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  error: {
    marginTop: Spacing.xs,
  },
  registerButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["3xl"],
  },
});
