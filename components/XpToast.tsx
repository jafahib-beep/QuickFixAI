import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

interface XpToastProps {
  amount: number;
  reason?: string;
  visible: boolean;
  onHide: () => void;
}

const TOAST_DURATION = 2500;
const ANIMATION_DURATION = 300;

export function XpToast({ amount, reason, visible, onHide }: XpToastProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible && amount > 0) {
      opacity.value = withSequence(
        withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.cubic) }),
        withDelay(TOAST_DURATION, withTiming(0, { duration: ANIMATION_DURATION }, () => {
          runOnJS(onHide)();
        }))
      );
      translateY.value = withSequence(
        withTiming(0, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.back(1.5)) }),
        withDelay(TOAST_DURATION, withTiming(-50, { duration: ANIMATION_DURATION }))
      );
      scale.value = withSequence(
        withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.back(1.2)) }),
        withDelay(TOAST_DURATION, withTiming(0.8, { duration: ANIMATION_DURATION }))
      );
    }
  }, [visible, amount]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible || amount <= 0) {
    return null;
  }

  const getReasonLabel = (reasonCode?: string): string => {
    switch (reasonCode) {
      case 'daily_login':
        return 'Daily Login';
      case 'community_post':
        return 'New Post';
      case 'community_comment':
        return 'Comment';
      case 'post_solved':
        return 'Solution Accepted';
      case 'video_upload':
        return 'Video Upload';
      case 'ai_chat_message':
        return 'AI Chat';
      case 'liveassist_scan':
        return 'LiveAssist Scan';
      case 'video_watch':
        return 'Video Watch';
      default:
        return '';
    }
  };

  const reasonLabel = getReasonLabel(reason);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: theme.success,
            ...Platform.select({
              ios: {
                shadowColor: theme.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          animatedStyle,
        ]}
      >
        <Feather name="zap" size={18} color="#FFFFFF" />
        <ThemedText style={styles.xpText}>+{amount} XP</ThemedText>
        {reasonLabel ? (
          <ThemedText style={styles.reasonText}>{reasonLabel}</ThemedText>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  xpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reasonText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
});
