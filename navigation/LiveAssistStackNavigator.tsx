import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LiveAssistScreen from "@/screens/LiveAssistScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type LiveAssistStackParamList = {
  LiveAssist: undefined;
};

const Stack = createNativeStackNavigator<LiveAssistStackParamList>();

export default function LiveAssistStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark, transparent: false }),
      }}
    >
      <Stack.Screen
        name="LiveAssist"
        component={LiveAssistScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
