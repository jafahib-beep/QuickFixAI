import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  timestamp: Date;
}

const TAB_BAR_HEIGHT = 80;

export default function AIChatView() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const language = i18n.language;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ uri: string; base64: string }[]>([]);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("chat.permissionRequired"), t("chat.photoLibraryPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({ uri: asset.uri, base64: asset.base64! }));
      setPendingImages((prev) => [...prev, ...newImages].slice(0, 4));
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("chat.permissionRequired"), t("chat.cameraPermission"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      setPendingImages((prev) => [...prev, { uri: asset.uri, base64: asset.base64! }].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && pendingImages.length === 0) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmedText || (pendingImages.length > 0 ? t("chat.sentImage") : ""),
      imageUri: pendingImages.length > 0 ? pendingImages[0].uri : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    const imagesToSend = [...pendingImages];
    setPendingImages([]);
    setIsLoading(true);

    try {
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await api.chat({
        messages: conversationHistory,
        language,
        imageBase64: imagesToSend.length > 0 ? imagesToSend[0].base64 : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: result.answer || t("chat.noResponse"),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.log("[AIChatView] Chat error:", error?.message || error);

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: t("chat.errorMessage"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";

      return (
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatarContainer, { backgroundColor: theme.link }]}>
              <Feather name="cpu" size={16} color="#FFFFFF" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser
                ? [styles.userBubble, { backgroundColor: theme.link }]
                : [styles.assistantBubble, { backgroundColor: theme.backgroundSecondary }],
            ]}
          >
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
            ) : null}
            <ThemedText
              type="body"
              style={[styles.messageText, { color: isUser ? "#FFFFFF" : theme.text }]}
            >
              {item.content}
            </ThemedText>
          </View>
          {isUser && (
            <View
              style={[
                styles.avatarContainer,
                styles.userAvatar,
                { backgroundColor: theme.textSecondary },
              ]}
            >
              <Feather name="user" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      );
    },
    [theme]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.link }]}>
        <Feather name="message-circle" size={40} color="#FFFFFF" />
      </View>
      <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.text }]}>
        {t("chat.welcomeTitle")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {t("chat.welcomeSubtitle")}
      </ThemedText>
      <View style={styles.suggestions}>
        {[t("chat.suggestion1"), t("chat.suggestion2"), t("chat.suggestion3")].map(
          (suggestion, index) => (
            <Pressable
              key={index}
              onPress={() => setInputText(suggestion)}
              style={({ pressed }) => [
                styles.suggestionChip,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="zap" size={14} color={theme.link} />
              <ThemedText type="small" style={{ color: theme.text, marginLeft: Spacing.xs }}>
                {suggestion}
              </ThemedText>
            </Pressable>
          )
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.emptyListContainer,
          { paddingBottom: 160 + TAB_BAR_HEIGHT },
        ]}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      {isLoading ? (
        <View style={[styles.typingIndicator, { backgroundColor: theme.backgroundSecondary }]}>
          <ActivityIndicator size="small" color={theme.link} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
            {t("chat.thinking")}
          </ThemedText>
        </View>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: theme.backgroundRoot, bottom: TAB_BAR_HEIGHT },
        ]}
      >
        {pendingImages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pendingImagesScroll}
            contentContainerStyle={styles.pendingImagesContent}
          >
            {pendingImages.map((img, index) => (
              <View key={index} style={styles.pendingImageContainer}>
                <Image source={{ uri: img.uri }} style={styles.pendingImage} />
                <Pressable
                  onPress={() => removeImage(index)}
                  style={[styles.removeImageBtn, { backgroundColor: theme.error }]}
                >
                  <Feather name="x" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View
          style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Pressable
            onPress={takePhoto}
            style={({ pressed }) => [
              styles.attachButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="camera" size={20} color={theme.link} />
          </Pressable>

          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.attachButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="image" size={20} color={theme.link} />
          </Pressable>

          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("chat.inputPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={2000}
          />

          <Pressable
            onPress={sendMessage}
            disabled={isLoading || (!inputText.trim() && pendingImages.length === 0)}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: theme.link,
                opacity: pressed || isLoading || (!inputText.trim() && pendingImages.length === 0) ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatar: {
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.sm,
  },
  assistantBubble: {
    borderBottomLeftRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  messageText: {
    lineHeight: 24,
  },
  messageImage: {
    width: 180,
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  suggestions: {
    gap: Spacing.sm,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typingIndicator: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 160 + TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inputWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    zIndex: 100,
  },
  pendingImagesScroll: {
    marginBottom: Spacing.sm,
  },
  pendingImagesContent: {
    gap: Spacing.sm,
  },
  pendingImageContainer: {
    position: "relative",
  },
  pendingImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...Typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
