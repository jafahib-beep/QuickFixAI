import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { CATEGORIES_WITH_ALL, Category } from "@/constants/categories";

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  showAllOption?: boolean;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
}: CategoryFilterProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const categories = showAllOption
    ? CATEGORIES_WITH_ALL
    : CATEGORIES_WITH_ALL.filter((c) => c.key !== "all");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category.key;
        return (
          <Pressable
            key={category.key}
            onPress={() => onSelectCategory(category.key)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.text
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name={category.icon}
              size={14}
              color={isSelected ? theme.backgroundRoot : category.color}
            />
            <ThemedText
              type="small"
              style={{
                color: isSelected ? theme.backgroundRoot : theme.text,
                fontWeight: isSelected ? "600" : "400",
              }}
            >
              {t(category.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
