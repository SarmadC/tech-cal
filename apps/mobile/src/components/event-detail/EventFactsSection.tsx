import { Image, StyleSheet, Text, View } from 'react-native';
import { formatEventDateTime, getInitials } from './eventDetailUtils';
import { IconMetaRow } from './IconMetaRow';
import { useAppTheme } from '../../providers/ThemeProvider';

export function EventFactsSection({
  startTime,
  endTime,
  timezone,
  location,
  isLocationInteractive,
  hostName,
  hostLogoUrl,
  calendarStatusLabel,
  calendarStatusTone = 'neutral',
  onOpenLocation,
}: {
  startTime: string;
  endTime?: string | null;
  timezone?: string | null;
  location?: string | null;
  isLocationInteractive: boolean;
  hostName?: string | null;
  hostLogoUrl?: string | null;
  calendarStatusLabel?: string | null;
  calendarStatusTone?: 'neutral' | 'success' | 'warning' | 'danger';
  onOpenLocation: (location: string) => void;
}) {
  const { tokens } = useAppTheme();

  const calendarStatusColor =
    calendarStatusTone === 'success'
      ? tokens.colors.success
      : calendarStatusTone === 'warning'
        ? tokens.colors.warning
        : calendarStatusTone === 'danger'
          ? tokens.colors.danger
          : tokens.colors.textTertiary;

  return (
    <View>
      <IconMetaRow icon="calendar">
        <Text selectable style={[styles.metaText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          {formatEventDateTime(startTime, endTime, timezone)}
        </Text>
        {calendarStatusLabel ? (
          <Text style={[styles.calendarStatus, { color: calendarStatusColor, fontFamily: tokens.typography.sans }]}>
            {calendarStatusLabel}
          </Text>
        ) : null}
      </IconMetaRow>

      {location ? (
        <>
          <View style={[styles.divider, { backgroundColor: tokens.colors.divider }]} />
          <IconMetaRow
            icon="map-marker"
            onPress={isLocationInteractive ? () => onOpenLocation(location) : undefined}
          >
            <Text selectable style={[styles.metaText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
              {location}
            </Text>
          </IconMetaRow>
        </>
      ) : null}

      {hostName ? (
        <>
          <View style={[styles.divider, { backgroundColor: tokens.colors.divider }]} />
          <View style={styles.hostRow}>
            {hostLogoUrl ? (
              <Image source={{ uri: hostLogoUrl }} style={styles.hostLogo} />
            ) : (
              <View style={[styles.hostFallback, { backgroundColor: tokens.colors.accentSoft }]}>
                <Text style={[styles.hostFallbackText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                  {getInitials(hostName)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.organizerLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                Organizer
              </Text>
              <Text selectable style={[styles.metaText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {hostName}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  hostLogo: {
    width: 36,
    height: 36,
    borderRadius: 5,
  },
  hostFallback: {
    width: 36,
    height: 36,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostFallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  organizerLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  calendarStatus: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
});
