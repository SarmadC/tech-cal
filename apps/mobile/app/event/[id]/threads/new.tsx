import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function NewEventThreadRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!eventId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/event/[id]/threads",
      params: { compose: "1", id: eventId },
    });
  }, [eventId]);

  return <View />;
}
