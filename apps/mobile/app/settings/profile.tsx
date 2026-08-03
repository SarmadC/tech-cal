import { Redirect } from "expo-router";

export default function SettingsProfileRoute() {
  return (
    <Redirect
      href={{ pathname: "/onboarding", params: { resume: "1" } }}
    />
  );
}
