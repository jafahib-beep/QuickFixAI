import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import CommunityScreen from "@/screens/CommunityScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type CommunityStackParamList = {
  CommunityMain: undefined;
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStackNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityMain"
        component={CommunityScreen}
        options={{
          ...getCommonScreenOptions({ theme, isDark, transparent: true }),
          headerShown: true,
          title: t("community.title"),
        }}
      />
    </Stack.Navigator>
  );
}
