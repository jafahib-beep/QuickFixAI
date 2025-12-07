import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from "react-i18next";

import RootNavigator from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { VideosProvider } from "@/contexts/VideosContext";
import { CommunityProvider } from "@/contexts/CommunityContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { useTheme } from "@/hooks/useTheme";
import i18n, { initializeI18n } from "@/utils/i18n";

function AppContent() {
  const { theme } = useTheme();
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeI18n();
      setIsI18nReady(true);
    };
    init();
  }, []);

  if (!isI18nReady) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <NotificationsProvider>
          <VideosProvider>
            <CommunityProvider>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
              <StatusBar style="auto" />
            </CommunityProvider>
          </VideosProvider>
        </NotificationsProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AppContent />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
