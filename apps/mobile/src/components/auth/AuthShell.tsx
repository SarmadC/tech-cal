import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthShellProps {
  backHref?: Href;
  backLabel?: string;
  children: ReactNode;
  eyebrow?: string;
  subtitle: string;
  title: string;
}

export function AuthShell({
  backHref,
  backLabel = 'Back',
  children,
  eyebrow = 'KureCal Mobile',
  subtitle,
  title,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#08111f', '#05070c', '#030406']} style={styles.gradient}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <View style={styles.brandHalo} />
                  <Text style={styles.brandGlyph}>K</Text>
                </View>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
              </View>

              {backHref ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    router.replace(backHref);
                  }}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed ? styles.backButtonPressed : null,
                  ]}
                >
                  <Text style={styles.backLabel}>{backLabel}</Text>
                </Pressable>
              ) : null}

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.card}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
}

export const authPalette = {
  accent: '#7dd3fc',
  accentPressed: '#38bdf8',
  backgroundCard: 'rgba(8, 15, 24, 0.88)',
  backgroundField: 'rgba(15, 23, 42, 0.85)',
  backgroundOverlay: 'rgba(15, 23, 42, 0.52)',
  border: 'rgba(148, 163, 184, 0.16)',
  borderStrong: 'rgba(125, 211, 252, 0.18)',
  danger: '#fda4af',
  textMuted: '#64748b',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
};

export const authSharedStyles = StyleSheet.create({
  field: {
    gap: 8,
  },
  input: {
    backgroundColor: authPalette.backgroundField,
    borderColor: authPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: authPalette.textPrimary,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: authPalette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: authPalette.accent,
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
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: authPalette.backgroundOverlay,
    borderColor: authPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    color: authPalette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: authPalette.backgroundOverlay,
    borderColor: authPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonPressed: {
    opacity: 0.86,
  },
  backLabel: {
    color: authPalette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  brandGlyph: {
    color: authPalette.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    zIndex: 1,
  },
  brandHalo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderRadius: 20,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#10263b',
    borderColor: 'rgba(125, 211, 252, 0.35)',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: authPalette.backgroundCard,
    borderColor: authPalette.borderStrong,
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
    color: authPalette.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
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
  safeArea: {
    flex: 1,
  },
  subtitle: {
    color: authPalette.textTertiary,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: authPalette.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
