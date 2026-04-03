import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthProvider';

export default function LoginScreen() {
  const { loading, session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(
    () => submitting || loading || !email.trim() || !password,
    [email, loading, password, submitting]
  );

  if (session) {
    return <Redirect href="../(tabs)/dashboard" />;
  }

  const handleSignIn = async () => {
    if (disabled) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await signIn({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.replace('../(tabs)/dashboard');
    setSubmitting(false);
  };

  return (
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>KureCal Mobile</Text>
              <Text style={styles.title}>Signed-in mobile foundation for the shared KureCal backend.</Text>
              <Text style={styles.subtitle}>
                Phase 1 keeps auth, routing, env access, and event submission in Expo while shared contracts live in the new domain package.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor="#4b5563"
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#4b5563"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={handleSignIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  disabled && styles.primaryButtonDisabled,
                  pressed && !disabled ? styles.primaryButtonPressed : null,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#03111d" />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Sign in</Text>
                )}
              </Pressable>
            </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
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
    fontSize: 14,
    lineHeight: 20,
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
  hero: {
    gap: 12,
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
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
    transform: [{ scale: 0.99 }],
  },
  safeArea: {
    flex: 1,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
