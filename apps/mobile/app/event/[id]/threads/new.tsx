import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  HeaderActionButton,
  MobilePage,
} from "../../../../src/components/chrome/MobilePage";
import { createMobileCommunityRoomThread } from "../../../../src/lib/mobileApi";
import { useAppTheme } from "../../../../src/providers/ThemeProvider";

export default function NewEventThreadScreen() {
  const { tokens } = useAppTheme();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!eventId) {
      setError("Event id is missing");
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError("Add a title and a body to start the thread.");
      return;
    }

    setError(null);
    setPosting(true);
    try {
      const thread = await createMobileCommunityRoomThread(eventId, {
        title: trimmedTitle,
        body: trimmedBody,
      });
      router.replace(`/event/${eventId}/threads/${thread.id}`);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't post the thread.",
      );
      setPosting(false);
    }
  };

  return (
    <MobilePage
      title="New thread"
      action={
        <HeaderActionButton
          label="Cancel"
          onPress={() => {
            if (posting) return;
            router.back();
          }}
        />
      }
    >
      <View style={styles.stack}>
        <View
          style={[
            styles.field,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.fieldLabel,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Title
          </Text>
          <TextInput
            accessibilityLabel="Thread title"
            editable={!posting}
            maxLength={200}
            onChangeText={setTitle}
            placeholder="What's this thread about?"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              styles.titleInput,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
            value={title}
          />
        </View>

        <View
          style={[
            styles.field,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.fieldLabel,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Body
          </Text>
          <TextInput
            accessibilityLabel="Thread body"
            editable={!posting}
            maxLength={5000}
            multiline
            onChangeText={setBody}
            placeholder="Share context, ask a question, kick off a conversation..."
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              styles.bodyInput,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
            value={body}
          />
        </View>

        {error ? (
          <Text
            style={{
              color: tokens.colors.danger,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              fontWeight: "500",
            }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={posting}
          onPress={handlePost}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: tokens.colors.accent,
              borderRadius: tokens.radius.sm,
            },
            pressed && styles.pressed,
          ]}
        >
          {posting ? (
            <ActivityIndicator color={tokens.colors.textInverse} />
          ) : (
            <Text
              style={{
                color: tokens.colors.textInverse,
                fontFamily: tokens.typography.sans,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              Post thread
            </Text>
          )}
        </Pressable>
      </View>
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  bodyInput: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 160,
    textAlignVertical: "top",
  },
  field: {
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.82,
  },
  stack: {
    gap: 12,
  },
  submit: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
});
