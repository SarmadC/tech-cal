import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EVENT_SUBMISSION_TYPE_OPTIONS,
  buildSubmitEventPayload,
  createInitialSubmitEventState,
  submitEventSubmission,
  type SubmitEventFormState,
  validateSubmitEventForm,
} from '../src/lib/eventSubmission';
import { useAuth } from '../src/context/AuthProvider';

type FormErrors = Partial<Record<keyof SubmitEventFormState, string>> & { submit?: string };

function Field({
  children,
  error,
  hint,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function SubmitEventScreen() {
  const { loading, session, signOut } = useAuth();
  const [form, setForm] = useState<SubmitEventFormState>(() => createInitialSubmitEventState());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const disabled = submitting || loading;

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color="#7dd3fc" size="large" />
      </View>
    );
  }

  if (!session?.access_token) {
    return <Redirect href="/login" />;
  }

  const update = <Key extends keyof SubmitEventFormState>(field: Key, value: SubmitEventFormState[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateSubmitEventForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const id = await submitEventSubmission(session.access_token, buildSubmitEventPayload(form));
      setSubmissionId(id);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to submit event',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionId) {
    return (
      <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.successWrap}>
            <View style={styles.successCard}>
              <Text style={styles.successEyebrow}>Submission received</Text>
              <Text style={styles.successTitle}>The event is now in the shared admin review queue.</Text>
              <Text style={styles.successBody}>
                Submission ID: {submissionId}. The backend contract and moderation flow are the same ones used on web.
              </Text>

              <Pressable
                onPress={() => {
                  setForm(createInitialSubmitEventState());
                  setErrors({});
                  setSubmissionId(null);
                }}
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}
              >
                <Text style={styles.primaryButtonLabel}>Submit another event</Text>
              </Pressable>

              <Pressable
                onPress={signOut}
                style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}
              >
                <Text style={styles.secondaryButtonLabel}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Authenticated Submit Flow</Text>
                <Text style={styles.title}>Mobile event submission wired to the production review pipeline.</Text>
                <Text style={styles.subtitle}>
                  This sends the same JSON payload to <Text style={styles.code}>/api/events/submit</Text>, but authenticates with your Supabase bearer token instead of a browser cookie.
                </Text>
              </View>

              <Pressable
                onPress={signOut}
                style={({ pressed }) => [styles.chipButton, pressed ? styles.secondaryButtonPressed : null]}
              >
                <Text style={styles.chipButtonLabel}>Sign out</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Event details</Text>

              <Field error={errors.title} label="Event title">
                <TextInput
                  onChangeText={(value) => update('title', value)}
                  placeholder="SF React Meetup - March 2026"
                  placeholderTextColor="#475569"
                  style={styles.input}
                  value={form.title}
                />
              </Field>

              <Field hint="Choose the nearest content type used by the shared moderation queue." label="Event type">
                <View style={styles.optionWrap}>
                  {EVENT_SUBMISSION_TYPE_OPTIONS.map((option) => {
                    const active = form.eventType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => update('eventType', option.value)}
                        style={({ pressed }) => [
                          styles.optionChip,
                          active ? styles.optionChipActive : null,
                          pressed && !active ? styles.optionChipPressed : null,
                        ]}
                      >
                        <Text style={[styles.optionChipLabel, active ? styles.optionChipLabelActive : null]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Description">
                <TextInput
                  multiline
                  onChangeText={(value) => update('description', value)}
                  placeholder="Brief description of the event, what attendees can expect, and why it matters."
                  placeholderTextColor="#475569"
                  style={[styles.input, styles.multilineInput]}
                  textAlignVertical="top"
                  value={form.description}
                />
              </Field>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Schedule</Text>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field error={errors.startDate} hint="YYYY-MM-DD" label="Start date">
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={(value) => update('startDate', value)}
                      placeholder="2026-05-01"
                      placeholderTextColor="#475569"
                      style={styles.input}
                      value={form.startDate}
                    />
                  </Field>
                </View>

                <View style={styles.rowItem}>
                  <Field hint="24-hour HH:MM" label="Start time">
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={(value) => update('startTime', value)}
                      placeholder="09:00"
                      placeholderTextColor="#475569"
                      style={styles.input}
                      value={form.startTime}
                    />
                  </Field>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field hint="Optional YYYY-MM-DD" label="End date">
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={(value) => update('endDate', value)}
                      placeholder="2026-05-01"
                      placeholderTextColor="#475569"
                      style={styles.input}
                      value={form.endDate}
                    />
                  </Field>
                </View>

                <View style={styles.rowItem}>
                  <Field hint="Optional 24-hour HH:MM" label="End time">
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={(value) => update('endTime', value)}
                      placeholder="17:00"
                      placeholderTextColor="#475569"
                      style={styles.input}
                      value={form.endTime}
                    />
                  </Field>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Location and links</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.label}>Virtual event</Text>
                  <Text style={styles.hint}>If enabled, the backend clears the physical location before insert.</Text>
                </View>
                <Switch
                  onValueChange={(value) => update('isVirtual', value)}
                  thumbColor={form.isVirtual ? '#e0f2fe' : '#f8fafc'}
                  trackColor={{ false: '#334155', true: '#0369a1' }}
                  value={form.isVirtual}
                />
              </View>

              <Field error={errors.location} label="Location">
                <TextInput
                  editable={!form.isVirtual}
                  onChangeText={(value) => update('location', value)}
                  placeholder={form.isVirtual ? 'Virtual event selected' : 'City, venue, or region'}
                  placeholderTextColor="#475569"
                  style={[styles.input, form.isVirtual ? styles.inputDisabled : null]}
                  value={form.location}
                />
              </Field>

              <Field label="Registration URL">
                <TextInput
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={(value) => update('registrationUrl', value)}
                  placeholder="https://example.com/register"
                  placeholderTextColor="#475569"
                  style={styles.input}
                  value={form.registrationUrl}
                />
              </Field>

              <Field label="Organizer name">
                <TextInput
                  onChangeText={(value) => update('organizerName', value)}
                  placeholder="Tech Cal"
                  placeholderTextColor="#475569"
                  style={styles.input}
                  value={form.organizerName}
                />
              </Field>

              <Field hint="Comma-separated tags" label="Tags">
                <TextInput
                  autoCapitalize="none"
                  onChangeText={(value) => update('tagsInput', value)}
                  placeholder="react-native, ai, meetup"
                  placeholderTextColor="#475569"
                  style={styles.input}
                  value={form.tagsInput}
                />
              </Field>
            </View>

            {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                disabled ? styles.primaryButtonDisabled : null,
                pressed && !disabled ? styles.primaryButtonPressed : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#03111d" />
              ) : (
                <Text style={styles.primaryButtonLabel}>Submit event for review</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8, 15, 24, 0.86)',
    borderColor: 'rgba(125, 211, 252, 0.14)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  chipButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
  },
  chipButtonLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  code: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  errorText: {
    color: '#fda4af',
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 10,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: '#05070c',
    flex: 1,
    justifyContent: 'center',
  },
  multilineInput: {
    minHeight: 132,
  },
  optionChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.14)',
    borderColor: 'rgba(125, 211, 252, 0.55)',
  },
  optionChipLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipLabelActive: {
    color: '#e0f2fe',
  },
  optionChipPressed: {
    borderColor: 'rgba(125, 211, 252, 0.38)',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    borderRadius: 18,
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonLabel: {
    color: '#03111d',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.992 }],
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  rowItem: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 18,
    padding: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  secondaryButtonLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  submitError: {
    color: '#fda4af',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  successBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  successCard: {
    backgroundColor: 'rgba(8, 15, 24, 0.9)',
    borderColor: 'rgba(125, 211, 252, 0.18)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 24,
  },
  successEyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  successTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
});
