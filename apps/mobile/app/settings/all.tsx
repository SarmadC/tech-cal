// Non-tab entry to the settings overview. Reached via router.push from the
// hamburger menu (and other tabs). Back pops the pushed screen, returning
// the user to whichever tab opened the menu.

import SettingsScreen from "../../src/screens/SettingsScreen";
import { MobileBackButton } from "../../src/components/chrome/MobileBackButton";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function SettingsHomeRoute() {
  const { panel } = useLocalSearchParams<{ panel?: string }>();

  if (panel === "profile") {
    return <Redirect href={{ pathname: "/onboarding", params: { resume: "1" } }} />;
  }

  if (panel === "career") {
    return <Redirect href={{ pathname: "/onboarding", params: { resume: "1" } }} />;
  }

  return <SettingsScreen headerLeft={<MobileBackButton />} />;
}
