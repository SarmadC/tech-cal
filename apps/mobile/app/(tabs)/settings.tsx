import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthProvider';
import { getMobileApiBaseUrl, getMobileRuntimeMetadata } from '../../src/lib/env';

const runtime = getMobileRuntimeMetadata();

export default function SettingsScreen() {
  const { session, signOut } = useAuth();

  return (
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Runtime</Text>
            <Text style={styles.title}>Mobile keeps its own runtime plumbing inside <Text style={styles.code}>apps/mobile</Text>.</Text>
            <Text style={styles.subtitle}>
              Shared contracts live in the domain package, but session persistence, Expo env access, and native release config stay local to the app.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current account</Text>
            <Text style={styles.cardBody}>{session?.user.email ?? 'Unknown email'}</Text>
            <Text style={styles.cardMeta}>User ID: {session?.user.id ?? 'Unavailable'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Environment</Text>
            <Text style={styles.cardBody}>API base URL: {getMobileApiBaseUrl()}</Text>
            <Text style={styles.cardBody}>App slug: {runtime.slug}</Text>
            <Text style={styles.cardBody}>EAS project: {runtime.easProjectId ?? 'Not linked'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Architecture boundary</Text>
            <Text style={styles.cardBody}>
              Web stays in the root Next app. Native UI, navigation, session storage, and platform configuration stay here. Shared DTOs and validation contracts live in <Text style={styles.code}>packages/domain</Text>.
            </Text>
          </View>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8, 15, 24, 0.88)',
    borderColor: 'rgba(125, 211, 252, 0.14)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  cardMeta: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  code: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  content: {
    gap: 18,
    padding: 24,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 12,
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  secondaryButtonLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonPressed: {
    opacity: 0.82,
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
