import { Redirect } from "expo-router";

export default function SettingsCareerRoute() {
  return <Redirect href={{ pathname: "/onboarding", params: { resume: "1" } }} />;
}
