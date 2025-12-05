import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AIChatScreen from "@/screens/AIChatScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type SearchStackParamList = {
  AIChat: undefined;
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark, transparent: false }),
      }}
    >
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
