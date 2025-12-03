import React from "react";
import { View, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CATEGORIES, Category } from "@/constants/categories";
import { RootStackParamList } from "@/navigation/RootNavigator";

type CategoriesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");
const GRID_SPACING = Spacing.lg;
const GRID_COLUMNS = 2;
const CARD_WIDTH = (width - Spacing.xl * 2 - GRID_SPACING) / GRID_COLUMNS;

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<CategoriesScreenNavigationProp>();
  const { paddingTop, paddingBottom } = useScreenInsets();

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("CategoryFeed", { 
      categoryKey: category.key,
      categoryLabel: t(category.labelKey)
    });
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => handleCategoryPress(item)}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: theme.backgroundSecondary,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${item.color}20` },
        ]}
      >
        <Feather name={item.icon} size={28} color={item.color} />
      </View>
      <ThemedText type="body" style={styles.categoryName}>
        {t(item.labelKey)}
      </ThemedText>
    </Pressable>
  );

  return (
    <FlatList
      data={CATEGORIES}
      renderItem={renderCategory}
      keyExtractor={(item) => item.key}
      numColumns={GRID_COLUMNS}
      contentContainerStyle={[
        styles.container,
        { paddingTop, paddingBottom },
      ]}
      columnWrapperStyle={styles.row}
      style={{ backgroundColor: theme.backgroundRoot }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: GRID_SPACING,
  },
  row: {
    gap: GRID_SPACING,
  },
  categoryCard: {
    width: CARD_WIDTH,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontWeight: "500",
    textAlign: "center",
  },
});
