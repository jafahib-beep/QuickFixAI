import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  api,
  LiveAssistSessionMessage,
  LiveAssistSessionStep,
  LiveAssistYouTubeLink,
} from "@/utils/api";

interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  images?: string[];
  imageUrls?: string[];
  steps?: LiveAssistSessionStep[];
  youtube_links?: LiveAssistYouTubeLink[];
  safety_warnings?: string[];
  timestamp: number;
}

interface LiveAssistThreadProps {
  sessionId: string;
  language: string;
  onError?: (error: string) => void;
}

export default function LiveAssistThread({
  sessionId,
  language,
  onError,
}: LiveAssistThreadProps) {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const messagesLoadedRef = useRef(false);

  // Fix A: Load existing messages from server on mount
  useEffect(() => {
    if (messagesLoadedRef.current || !sessionId) return;
    messagesLoadedRef.current = true;
    
    const loadMessages = async () => {
      setIsLoadingHistory(true);
      try {
        console.log("[LiveAssistThread] Loading messages for session:", sessionId);
        const result = await api.getLiveAssistSessionMessages(sessionId);
        if (result.messages && result.messages.length > 0) {
          const loadedMessages: ThreadMessage[] = result.messages.map((m, index) => ({
            id: `loaded-${index}-${Date.now()}`,
            role: m.role as "user" | "assistant",
            text: m.text || "",
            imageUrls: m.imageUrls || [],
            steps: m.analysisResult?.steps,
            youtube_links: m.analysisResult?.youtube_links,
            safety_warnings: m.analysisResult?.safety_warnings,
            timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
          }));
          setMessages(loadedMessages);
          console.log("[LiveAssistThread] Loaded", loadedMessages.length, "messages from history");
        }
      } catch (err) {
        console.log("[LiveAssistThread] Failed to load messages:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadMessages();
  }, [sessionId]);

  const toggleStepComplete = async (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    const isCompleted = newCompleted.has(stepId);
    
    if (isCompleted) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);

    try {
      await api.updateLiveAssistStepProgress(sessionId, stepId, !isCompleted);
    } catch (e) {
      console.log("[LiveAssistThread] Failed to update step progress:", e);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: true,
    });

    if (result.canceled || !result.assets) {
      return;
    }

    const newImages = result.assets
      .filter((a) => a.base64)
      .map((a) => `data:image/jpeg;base64,${a.base64}`);
    
    setPendingImages((prev) => [...prev, ...newImages]);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const imageData = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setPendingImages((prev) => [...prev, imageData]);
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!inputText.trim() && pendingImages.length === 0) return;

    const userMessage: ThreadMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: inputText.trim(),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
      imageUrls: pendingImages.length > 0 ? [...pendingImages] : undefined,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setPendingImages([]);
    setIsLoading(true);

    try {
      const response = await api.sendLiveAssistMessage(sessionId, {
        text: userMessage.text,
        images: userMessage.images,
        language,
      });

      const assistantMessage: ThreadMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.text,
        steps: response.steps,
        youtube_links: response.youtube_links,
        safety_warnings: response.safety_warnings,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("[LiveAssistThread] Error:", error);
      onError?.(error?.message || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const openYouTubeLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("[LiveAssistThread] Failed to open URL:", err)
    );
  };

  const renderStep = (step: LiveAssistSessionStep, index: number) => {
    const isCompleted = completedSteps.has(step.id);
    const isExpanded = expandedSteps.has(step.id);

    return (
      <View
        key={step.id}
        style={[
          styles.stepCard,
          { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5" },
        ]}
      >
        <Pressable
          style={styles.stepHeader}
          onPress={() => toggleStepComplete(step.id)}
        >
          <View
            style={[
              styles.stepCheckbox,
              {
                borderColor: isCompleted ? theme.success : theme.border,
                backgroundColor: isCompleted ? theme.success : "transparent",
              },
            ]}
          >
            {isCompleted ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <View style={styles.stepContent}>
            <ThemedText
              style={[
                styles.stepNumber,
                { color: theme.link },
              ]}
            >
              Step {index + 1}
            </ThemedText>
            <ThemedText
              style={[
                styles.stepText,
                {
                  color: theme.text,
                  textDecorationLine: isCompleted ? "line-through" : "none",
                  opacity: isCompleted ? 0.6 : 1,
                },
              ]}
            >
              {step.text}
            </ThemedText>
          </View>
          {step.detail ? (
            <Pressable
              onPress={() => toggleStepExpanded(step.id)}
              style={styles.expandButton}
            >
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </Pressable>

        {isExpanded && step.detail ? (
          <View style={styles.stepDetail}>
            <ThemedText style={[styles.stepDetailText, { color: theme.textSecondary }]}>
              {step.detail}
            </ThemedText>
          </View>
        ) : null}

        {step.tools && step.tools.length > 0 ? (
          <View style={styles.toolsContainer}>
            {step.tools.map((tool, i) => (
              <View
                key={i}
                style={[styles.toolChip, { backgroundColor: theme.link + "20" }]}
              >
                <Feather name="tool" size={12} color={theme.link} />
                <ThemedText style={[styles.toolText, { color: theme.link }]}>
                  {tool}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderYouTubeCard = (link: LiveAssistYouTubeLink, index: number) => (
    <Pressable
      key={index}
      style={[
        styles.youtubeCard,
        { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5" },
      ]}
      onPress={() => openYouTubeLink(link.url)}
    >
      <View style={styles.youtubeIcon}>
        <Feather name="youtube" size={24} color="#FF0000" />
      </View>
      <View style={styles.youtubeContent}>
        <ThemedText style={[styles.youtubeTitle, { color: theme.text }]} numberOfLines={2}>
          {link.title}
        </ThemedText>
        <ThemedText style={[styles.youtubeSubtitle, { color: theme.textSecondary }]}>
          Tap to watch on YouTube
        </ThemedText>
      </View>
      <Feather name="external-link" size={18} color={theme.textSecondary} />
    </Pressable>
  );

  const renderMessage = ({ item }: { item: ThreadMessage }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser ? (
          <View style={[styles.avatar, { backgroundColor: theme.link }]}>
            <Feather name="zap" size={16} color="#FFFFFF" />
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.link }]
              : [styles.assistantBubble, { backgroundColor: theme.backgroundSecondary }],
          ]}
        >
          {(item.images && item.images.length > 0) || (item.imageUrls && item.imageUrls.length > 0) ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: Spacing.sm }}>
              {(item.images || item.imageUrls || []).map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: img }}
                  style={{ width: 120, height: 80, borderRadius: BorderRadius.md, marginRight: Spacing.xs, marginBottom: Spacing.xs }}
                />
              ))}
            </View>
          ) : null}

          {item.text ? (
            <ThemedText
              style={[
                styles.messageText,
                { color: isUser ? "#FFFFFF" : theme.text },
              ]}
            >
              {item.text}
            </ThemedText>
          ) : null}

          {item.safety_warnings && item.safety_warnings.length > 0 ? (
            <View style={styles.warningsContainer}>
              {item.safety_warnings.map((warning, i) => (
                <View
                  key={i}
                  style={[styles.warningCard, { backgroundColor: "#FF3B30" + "20" }]}
                >
                  <Feather name="alert-triangle" size={16} color="#FF3B30" />
                  <ThemedText style={[styles.warningText, { color: "#FF3B30" }]}>
                    {warning}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {item.steps && item.steps.length > 0 ? (
            <View style={styles.stepsContainer}>
              <ThemedText style={[styles.stepsTitle, { color: theme.text }]}>
                Steps to Fix:
              </ThemedText>
              {item.steps.map((step, i) => renderStep(step, i))}
              {item.steps.every((s) => completedSteps.has(s.id)) ? (
                <View style={[styles.allDoneBadge, { backgroundColor: theme.success + "20" }]}>
                  <Feather name="check-circle" size={16} color={theme.success} />
                  <ThemedText style={[styles.allDoneText, { color: theme.success }]}>
                    All done!
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          {item.youtube_links && item.youtube_links.length > 0 ? (
            <View style={styles.youtubeContainer}>
              <ThemedText style={[styles.youtubeHeader, { color: theme.text }]}>
                Helpful Videos:
              </ThemedText>
              {item.youtube_links.map((link, i) => renderYouTubeCard(link, i))}
            </View>
          ) : null}
        </View>

        {isUser ? (
          <View style={[styles.avatar, { backgroundColor: theme.textSecondary }]}>
            <Feather name="user" size={16} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
    );
  };

  const TAB_BAR_HEIGHT = 80;

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
        contentContainerStyle={[styles.messagesList, { paddingBottom: 140 + TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start a conversation by describing your problem or uploading a photo
            </ThemedText>
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      {isLoading ? (
        <View style={[styles.loadingBar, { backgroundColor: theme.backgroundSecondary, bottom: 80 + TAB_BAR_HEIGHT }]}>
          <ActivityIndicator size="small" color={theme.link} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing...
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.inputWrapper, { bottom: TAB_BAR_HEIGHT }]}>
        {pendingImages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.pendingImagesContainer, { backgroundColor: theme.backgroundSecondary }]}
          >
            {pendingImages.map((img, i) => (
              <View key={i} style={styles.pendingImageWrapper}>
                <Image source={{ uri: img }} style={styles.pendingImage} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => removePendingImage(i)}
                >
                  <Feather name="x" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderTopWidth: 1, borderTopColor: theme.border }]}>
          <Pressable onPress={handleTakePhoto} style={styles.iconButton}>
            <Feather name="camera" size={24} color={theme.link} />
          </Pressable>
          <Pressable onPress={handlePickImage} style={styles.iconButton}>
            <Feather name="image" size={24} color={theme.link} />
          </Pressable>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.text, backgroundColor: isDark ? "#252525" : "#F5F5F5" },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your problem..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={isLoading || (!inputText.trim() && pendingImages.length === 0)}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() || pendingImages.length > 0 ? theme.link : theme.border,
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="send" size={20} color="#FFFFFF" />
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
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  inputWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.lg,
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-start",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: BorderRadius.xs,
  },
  messageText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
  },
  imagesScroll: {
    marginBottom: Spacing.sm,
  },
  messageImage: {
    width: 120,
    height: 90,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.xs,
  },
  warningsContainer: {
    marginTop: Spacing.md,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
  stepsContainer: {
    marginTop: Spacing.md,
  },
  stepsTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  stepCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  stepText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  expandButton: {
    padding: Spacing.xs,
  },
  stepDetail: {
    marginTop: Spacing.sm,
    paddingLeft: 36,
  },
  stepDetailText: {
    fontSize: Typography.caption.fontSize,
    lineHeight: 20,
  },
  toolsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingLeft: 36,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  toolText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  allDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  allDoneText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  youtubeContainer: {
    marginTop: Spacing.md,
  },
  youtubeHeader: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  youtubeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  youtubeIcon: {
    marginRight: Spacing.md,
  },
  youtubeContent: {
    flex: 1,
  },
  youtubeTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
    marginBottom: 2,
  },
  youtubeSubtitle: {
    fontSize: Typography.small.fontSize,
  },
  loadingBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
    zIndex: 99,
  },
  loadingText: {
    fontSize: Typography.caption.fontSize,
  },
  pendingImagesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pendingImageWrapper: {
    position: "relative",
    marginRight: Spacing.sm,
  },
  pendingImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  removeImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.body.fontSize,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
