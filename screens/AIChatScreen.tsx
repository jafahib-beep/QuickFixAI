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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { api, LiveAssistResponse } from "@/utils/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  videoUri?: string;
  videoName?: string;
  timestamp: Date;
}

export default function AIChatScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const language = i18n.language;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; name: string } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [isLiveAssistLoading, setIsLiveAssistLoading] = useState(false);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const checkHealth = useCallback(async () => {
    try {
      const healthy = await api.checkAIServiceHealth();
      console.log("[AIChatScreen] Health check result:", healthy);
      setIsOffline(!healthy);
      return healthy;
    } catch (error) {
      console.log("[AIChatScreen] Health check error:", error);
      setIsOffline(true);
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setSelectedImage({ uri: asset.uri, base64: asset.base64 });
        setSelectedVideo(null);
      } else {
        console.log("[AIChatScreen] No base64 data from ImagePicker");
      }
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

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setSelectedImage({ uri: asset.uri, base64: asset.base64 });
        setSelectedVideo(null);
      } else {
        console.log("[AIChatScreen] No base64 data from camera");
      }
    }
  };

  const pickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("chat.permissionRequired"), t("chat.photoLibraryPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const name = uri.split("/").pop() || "video.mp4";
      setSelectedVideo({ uri, name });
      setSelectedImage(null);
    }
  };

  const clearAttachment = () => {
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  const handleLiveAssist = async () => {
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

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const imageBase64 = asset.base64 as string;
    const imageUri = asset.uri;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: t("chat.liveAssistHint"),
      imageUri: imageUri,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLiveAssistLoading(true);

    try {
      console.log("[AIChatScreen] Calling LiveAssist API");
      const response = await api.liveAssist(imageBase64, language);
      setIsOffline(false);

      let formattedResponse = "";
      
      if (response.success && response.analysis) {
        const { summary, possibleIssue, steps, safetyNote } = response.analysis;
        
        if (summary) {
          formattedResponse += `**${t("chat.whatISee")}:**\n${summary}\n\n`;
        }
        if (possibleIssue) {
          formattedResponse += `**${t("chat.likelyIssue")}:**\n${possibleIssue}\n\n`;
        }
        if (steps && steps.length > 0) {
          formattedResponse += `**${t("chat.stepsToFix")}:**\n`;
          steps.forEach((step) => {
            formattedResponse += `${step.stepNumber}. ${step.text}\n`;
          });
          formattedResponse += "\n";
        }
        if (safetyNote) {
          formattedResponse += `**${t("chat.safetyNote")}:** ${safetyNote}`;
        }
      } else {
        formattedResponse = response.analysis?.rawResponse || t("chat.liveAssistError");
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: formattedResponse.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.log("[AIChatScreen] LiveAssist error:", error?.message || error);
      
      const isNetworkError = 
        error?.message?.includes("Network") || 
        error?.message?.includes("fetch") ||
        error?.name === "TypeError";
      
      if (isNetworkError) {
        setIsOffline(true);
      }

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: isNetworkError ? t("chat.offlineMessage") : t("chat.liveAssistError"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLiveAssistLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && !selectedImage && !selectedVideo) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmedText || (selectedImage ? t("chat.sentImage") : t("chat.sentVideo")),
      imageUri: selectedImage?.uri,
      videoUri: selectedVideo?.uri,
      videoName: selectedVideo?.name,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    const imageToSend = selectedImage;
    const videoToSend = selectedVideo;
    clearAttachment();
    setIsLoading(true);

    try {
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      console.log("[AIChatScreen] Sending chat request", {
        messageCount: conversationHistory.length,
        hasImage: !!imageToSend?.base64,
        hasVideo: !!videoToSend?.name,
        language,
      });

      const result = await api.chat({
        messages: conversationHistory,
        language,
        imageBase64: imageToSend?.base64,
        videoFileName: videoToSend?.name,
      });

      setIsOffline(false);
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: result.answer || t("chat.noResponse"),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.log("[AIChatScreen] Chat error:", error?.message || error);
      
      const errorMsg = error?.message || "";
      const errorName = error?.name || "";
      const isNetworkError = 
        errorMsg.includes("Network error") || 
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("fetch") ||
        errorMsg.includes("network") ||
        errorMsg.includes("timeout") ||
        errorMsg.includes("abort") ||
        errorName === "TypeError" ||
        errorName === "AbortError" ||
        error?.cause?.code === "ECONNREFUSED" ||
        error?.cause?.code === "ENOTFOUND";
      
      if (isNetworkError) {
        setIsOffline(true);
      }
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: isNetworkError ? t("chat.offlineMessage") : t("chat.errorMessage"),
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
            {item.imageUri && (
              <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
            )}
            {item.videoUri && (
              <View style={[styles.videoPreview, { backgroundColor: theme.backgroundTertiary }]}>
                <Feather name="video" size={24} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {item.videoName || "video.mp4"}
                </ThemedText>
              </View>
            )}
            <ThemedText
              type="body"
              style={[
                styles.messageText,
                { color: isUser ? "#FFFFFF" : theme.text },
              ]}
            >
              {item.content}
            </ThemedText>
          </View>
          {isUser && (
            <View style={[styles.avatarContainer, styles.userAvatar, { backgroundColor: theme.textSecondary }]}>
              <Feather name="user" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      );
    },
    [theme, t]
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
        {[
          t("chat.suggestion1"),
          t("chat.suggestion2"),
          t("chat.suggestion3"),
        ].map((suggestion, index) => (
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
        ))}
      </View>
    </View>
  );

  const retryConnection = async () => {
    setIsCheckingHealth(true);
    await checkHealth();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={[styles.headerIcon, { backgroundColor: theme.link }]}>
            <Feather name="cpu" size={20} color="#FFFFFF" />
          </View>
          <ThemedText type="h3" style={{ color: theme.text }}>
            {t("chat.title")}
          </ThemedText>
        </View>

        {isOffline ? (
          <Pressable
            onPress={retryConnection}
            style={[styles.offlineBanner, { backgroundColor: "#FF9500" }]}
          >
            <Feather name="wifi-off" size={16} color="#FFFFFF" />
            <ThemedText type="small" style={styles.offlineBannerText}>
              {t("chat.offlineBanner")}
            </ThemedText>
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
          </Pressable>
        ) : null}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        {(isLoading || isLiveAssistLoading) && (
          <View style={[styles.typingIndicator, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={theme.link} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
              {isLiveAssistLoading ? t("chat.analyzingPhoto") : t("chat.thinking")}
            </ThemedText>
          </View>
        )}

        {(selectedImage || selectedVideo) && (
          <View style={[styles.attachmentPreview, { backgroundColor: theme.backgroundSecondary }]}>
            {selectedImage && (
              <Image source={{ uri: selectedImage.uri }} style={styles.attachmentImage} />
            )}
            {selectedVideo && (
              <View style={[styles.attachmentVideo, { backgroundColor: theme.backgroundTertiary }]}>
                <Feather name="video" size={20} color={theme.link} />
                <ThemedText type="small" style={{ color: theme.text, marginLeft: Spacing.xs }} numberOfLines={1}>
                  {selectedVideo.name}
                </ThemedText>
              </View>
            )}
            <Pressable onPress={clearAttachment} style={styles.removeAttachment}>
              <Feather name="x" size={18} color={theme.error} />
            </Pressable>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { 
              backgroundColor: theme.backgroundSecondary,
              paddingBottom: Math.max(insets.bottom, tabBarHeight) + Spacing.sm,
            },
          ]}
        >
          <View style={styles.attachmentButtons}>
            <Pressable
              onPress={handleLiveAssist}
              disabled={isLiveAssistLoading || isLoading}
              style={({ pressed }) => [
                styles.liveAssistButton,
                { 
                  backgroundColor: theme.link, 
                  opacity: (pressed || isLiveAssistLoading || isLoading) ? 0.7 : 1 
                },
              ]}
            >
              {isLiveAssistLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="zap" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={styles.liveAssistText}>
                    {t("chat.liveAssist")}
                  </ThemedText>
                </>
              )}
            </Pressable>
            <View style={styles.attachButtonGroup}>
              <Pressable
                onPress={pickImage}
                style={({ pressed }) => [
                  styles.attachButton,
                  { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="image" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [
                  styles.attachButton,
                  { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="camera" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={pickVideo}
                style={({ pressed }) => [
                  styles.attachButton,
                  { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="video" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("chat.placeholder")}
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <Pressable
              onPress={sendMessage}
              disabled={isLoading || (!inputText.trim() && !selectedImage && !selectedVideo)}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: (inputText.trim() || selectedImage || selectedVideo) && !isLoading
                    ? theme.link
                    : theme.backgroundTertiary,
                  opacity: pressed && !isLoading ? 0.8 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name="send"
                  size={20}
                  color={(inputText.trim() || selectedImage || selectedVideo) ? "#FFFFFF" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatar: {
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  assistantBubble: {
    borderBottomLeftRadius: Spacing.xs,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  messageText: {
    lineHeight: 22,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  videoPreview: {
    width: 200,
    height: 100,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  suggestions: {
    width: "100%",
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignSelf: "flex-start",
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  attachmentVideo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    flex: 1,
  },
  removeAttachment: {
    padding: Spacing.sm,
    marginLeft: "auto",
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  attachmentButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    justifyContent: "space-between",
  },
  attachButtonGroup: {
    flexDirection: "row",
  },
  liveAssistButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
    justifyContent: "center",
  },
  liveAssistText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  offlineBannerText: {
    color: "#FFFFFF",
    marginHorizontal: Spacing.sm,
    fontWeight: "500",
  },
});
