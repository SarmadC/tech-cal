import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EVENT_SUBMISSION_TYPE_OPTIONS } from '@kurecal/domain';

import { useAuth } from '../../src/context/AuthProvider';
import { getMobileRuntimeMetadata } from '../../src/lib/env';

const runtime = getMobileRuntimeMetadata();

export default function DashboardScreen() {
  const { session } = useAuth();

  return (
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Phase 1</Text>
            <Text style={styles.title}>Expo now has a signed-in shell instead of a single-purpose screen.</Text>
            <Text style={styles.subtitle}>
              Routing stays native inside <Text style={styles.code}>apps/mobile</Text>, while the submission and profile contracts moved to <Text style={styles.code}>packages/domain</Text>.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signed-in session</Text>
            <Text style={styles.cardBody}>
              Logged in as {session?.user.email ?? 'unknown user'}
            </Text>
            <Text style={styles.cardMeta}>
              Expo slug: {runtime.slug} · EAS project: {runtime.easProjectId ?? 'not linked'}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.card, styles.rowCard]}>
              <Text style={styles.cardTitle}>Shared contracts</Text>
              <Text style={styles.metric}>{EVENT_SUBMISSION_TYPE_OPTIONS.length}</Text>
              <Text style={styles.cardBody}>event submission types come from the domain package</Text>
            </View>

            <View style={[styles.card, styles.rowCard]}>
              <Text style={styles.cardTitle}>Next phases</Text>
              <Text style={styles.metric}>2</Text>
              <Text style={styles.cardBody}>discover, dashboard detail, and event detail adapters are the next safe rehydration slice</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Foundation routes</Text>
            <Text style={styles.cardBody}>
              This branch keeps the shared submit endpoint, adds a real signed-in tab shell, and leaves future mobile-only API routes narrow and opt-in.
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push('/submit-event')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : null,
                ]}
              >
                <Text style={styles.primaryButtonLabel}>Open submit flow</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.secondaryButtonPressed : null,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>Review runtime config</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 6,
  },
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
  metric: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
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
  rowCard: {
    flex: 1,
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
    minHeight: 52,
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
