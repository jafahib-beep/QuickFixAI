import { Feather } from "@expo/vector-icons";
import { ComponentProps } from "react";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

export interface Category {
  key: string;
  labelKey: string;
  icon: FeatherIconName;
  color: string;
}

export const CATEGORIES: Category[] = [
  { key: "kitchen", labelKey: "categories.kitchen", icon: "coffee", color: "#FF6B6B" },
  { key: "bathroom", labelKey: "categories.bathroom", icon: "droplet", color: "#4ECDC4" },
  { key: "cleaning", labelKey: "categories.cleaning", icon: "wind", color: "#45B7D1" },
  { key: "laundry", labelKey: "categories.laundry", icon: "loader", color: "#96CEB4" },
  { key: "electronics", labelKey: "categories.electronics", icon: "smartphone", color: "#9B59B6" },
  { key: "car", labelKey: "categories.car", icon: "truck", color: "#E74C3C" },
  { key: "tools", labelKey: "categories.tools", icon: "tool", color: "#F39C12" },
  { key: "plumbing", labelKey: "categories.plumbing", icon: "thermometer", color: "#3498DB" },
  { key: "emergency", labelKey: "categories.emergency", icon: "alert-triangle", color: "#E91E63" },
  { key: "other", labelKey: "categories.other", icon: "more-horizontal", color: "#95A5A6" },
];

export const ALL_CATEGORY: Category = {
  key: "all",
  labelKey: "categories.all",
  icon: "grid",
  color: "#2C3E50",
};

export const getCategoryByKey = (key: string): Category | undefined => {
  if (key === "all") return ALL_CATEGORY;
  return CATEGORIES.find((cat) => cat.key === key);
};

export const getCategoryLabel = (key: string): string => {
  const category = getCategoryByKey(key);
  return category?.labelKey || "categories.other";
};

export const getCategoryIcon = (key: string): FeatherIconName => {
  const category = getCategoryByKey(key);
  return category?.icon || "more-horizontal";
};

export const getCategoryColor = (key: string): string => {
  const category = getCategoryByKey(key);
  return category?.color || "#95A5A6";
};

export const CATEGORIES_WITH_ALL: Category[] = [ALL_CATEGORY, ...CATEGORIES];
