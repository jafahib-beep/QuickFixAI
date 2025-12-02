import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const { width } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface SlideData {
  id: string;
  titleKey: string;
  bodyKey: string;
  image: any;
}

const slides: SlideData[] = [
  {
    id: "1",
    titleKey: "onboarding.slide1Title",
    bodyKey: "onboarding.slide1Body",
    image: require("@/assets/images/onboarding/slide1.png"),
  },
  {
    id: "2",
    titleKey: "onboarding.slide2Title",
    bodyKey: "onboarding.slide2Body",
    image: require("@/assets/images/onboarding/slide2.png"),
  },
  {
    id: "3",
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
    image: require("@/assets/images/onboarding/slide3.png"),
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: SlideData }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
      </View>
      <ThemedText type="h2" style={styles.title}>
        {t(item.titleKey)}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.body, { color: theme.textSecondary }]}
      >
        {t(item.bodyKey)}
      </ThemedText>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentIndex ? theme.text : theme.border,
            },
          ]}
        />
      ))}
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
      ]}
    >
      <View style={styles.skipContainer}>
        <Pressable onPress={onComplete} hitSlop={12} accessibilityLabel="Skip onboarding">
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {t("common.skip")}
          </ThemedText>
        </Pressable>
      </View>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />
      {renderPaginationDots()}
      <View style={styles.buttonContainer}>
        <Button onPress={handleNext} style={styles.button} accessibilityLabel={isLastSlide ? "Get Started" : "Next"}>
          {isLastSlide ? t("onboarding.getStarted") : t("common.next")}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: "flex-end",
    paddingHorizontal: Spacing["2xl"],
    marginBottom: Spacing.md,
  },
  slide: {
    width,
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  imageContainer: {
    width: 240,
    height: 240,
    marginBottom: Spacing["4xl"],
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  body: {
    textAlign: "center",
    maxWidth: 280,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing["3xl"],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: Spacing["2xl"],
  },
  button: {
    borderRadius: BorderRadius.sm,
  },
});
