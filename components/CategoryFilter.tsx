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
  const { theme, isDark } = useTheme();

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
        const isAll = category.key === "all";
        
        return (
          <Pressable
            key={category.key}
            onPress={() => onSelectCategory(category.key)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.link
                  : theme.backgroundSecondary,
                borderColor: isSelected 
                  ? theme.link 
                  : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={category.icon}
              size={14}
              color={isSelected ? "#FFFFFF" : (isAll ? theme.text : category.color)}
            />
            <ThemedText
              type="caption"
              style={[
                styles.chipText,
                {
                  color: isSelected ? "#FFFFFF" : theme.text,
                  fontWeight: isSelected ? "600" : "500",
                },
              ]}
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
    paddingVertical: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    letterSpacing: 0.1,
    fontSize: 13,
  },
});
