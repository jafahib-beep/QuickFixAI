import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import ToolboxScreen from "@/screens/ToolboxScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type ToolboxStackParamList = {
  Toolbox: undefined;
};

const Stack = createNativeStackNavigator<ToolboxStackParamList>();

export default function ToolboxStackNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Toolbox"
        component={ToolboxScreen}
        options={{
          title: t("toolbox.title"),
        }}
      />
    </Stack.Navigator>
  );
}
