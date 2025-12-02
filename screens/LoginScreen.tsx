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

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
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

  const handleLogin = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert(t("common.error"), result.error || t("auth.invalidCredentials"));
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
          {t("auth.welcomeBack")}
        </ThemedText>

        <View style={styles.form}>
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

          <Pressable
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPassword}
          >
            <ThemedText type="link" style={{ color: theme.link }}>
              {t("auth.forgotPassword")}
            </ThemedText>
          </Pressable>

          <Button
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.loginButton}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              t("auth.login")
            )}
          </Button>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <Button
            onPress={() => handleLogin()}
            style={[styles.socialButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="mail" size={20} color={theme.text} style={styles.socialIcon} />
            <ThemedText style={styles.socialButtonText}>
              {t("auth.continueWithGoogle")}
            </ThemedText>
          </Button>

          <Button
            onPress={() => handleLogin()}
            style={[styles.socialButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="smartphone" size={20} color={theme.text} style={styles.socialIcon} />
            <ThemedText style={styles.socialButtonText}>
              {t("auth.continueWithApple")}
            </ThemedText>
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {t("auth.noAccount")}{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <ThemedText type="link" style={{ color: theme.link }}>
              {t("auth.signUp")}
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
  forgotPassword: {
    alignSelf: "flex-end",
  },
  loginButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  divider: {
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    height: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  socialIcon: {
    marginRight: Spacing.sm,
  },
  socialButtonText: {
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["3xl"],
  },
});
