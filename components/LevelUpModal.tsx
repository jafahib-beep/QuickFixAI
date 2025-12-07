import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  onDismiss: () => void;
}

const LEVEL_TITLES = [
  'Newcomer',
  'Helper',
  'Fixer',
  'Expert',
  'Master',
];

export function LevelUpModal({ visible, level, onDismiss }: LevelUpModalProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const starOpacity = useSharedValue(0);
  const badgeRotate = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      starOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      badgeRotate.value = withSequence(
        withTiming(10, { duration: 100 }),
        withSpring(0, { damping: 8, stiffness: 200 })
      );
    } else {
      scale.value = 0;
      starOpacity.value = 0;
      badgeRotate.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${badgeRotate.value}deg` }],
  }));

  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || 'Master';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <LinearGradient
            colors={['#1A1A2E', '#16213E', '#0F3460']}
            style={styles.gradient}
          >
            <Animated.View style={[styles.starsContainer, starStyle]}>
              <Feather name="star" size={24} color="#FFD700" style={styles.starLeft} />
              <Feather name="star" size={16} color="#FFD700" style={styles.starTopLeft} />
              <Feather name="star" size={16} color="#FFD700" style={styles.starTopRight} />
              <Feather name="star" size={24} color="#FFD700" style={styles.starRight} />
            </Animated.View>
            
            <ThemedText style={styles.levelUpText}>LEVEL UP</ThemedText>
            
            <Animated.View style={[styles.levelBadge, badgeStyle]}>
              <LinearGradient
                colors={['#0A84FF', '#5856D6']}
                style={styles.levelBadgeGradient}
              >
                <ThemedText style={styles.levelNumber}>{level}</ThemedText>
              </LinearGradient>
            </Animated.View>
            
            <ThemedText style={styles.levelTitle}>{levelTitle}</ThemedText>
            
            <ThemedText style={styles.congratsText}>
              Congratulations! Keep helping the community to unlock more rewards.
            </ThemedText>
            
            <Pressable
              style={[styles.continueButton, { backgroundColor: theme.link }]}
              onPress={onDismiss}
            >
              <ThemedText style={styles.continueButtonText}>Awesome!</ThemedText>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0A84FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  gradient: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starLeft: {
    position: 'absolute',
    top: 40,
    left: 30,
  },
  starTopLeft: {
    position: 'absolute',
    top: 20,
    left: 80,
  },
  starTopRight: {
    position: 'absolute',
    top: 20,
    right: 80,
  },
  starRight: {
    position: 'absolute',
    top: 40,
    right: 30,
  },
  levelUpText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#FFD700',
    marginBottom: Spacing.xl,
  },
  levelBadge: {
    marginBottom: Spacing.lg,
  },
  levelBadgeGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  congratsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  continueButton: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
