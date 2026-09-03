import { Stack } from "expo-router";

import { useAppTheme } from "../../../src/providers/ThemeProvider";

export const unstable_settings = {
  initialRouteName: "community",
};

export default function CommunityStackLayout() {
  const { tokens } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        contentStyle: { backgroundColor: tokens.colors.shell },
        headerShown: false,
      }}
    />
  );
}
