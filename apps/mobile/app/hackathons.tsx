import { Text } from 'react-native';
import { KureCard } from '@/components/chrome/KureCard';
import { KureScreen } from '@/components/chrome/KureScreen';
import { SectionHeading } from '@/components/chrome/SectionHeading';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function HackathonsScreen() {
  const { tokens } = useAppTheme();

  return (
    <KureScreen
      title="Hackathons"
      subtitle="This route stays live so the entitlement model and native navigation already account for team-based hackathon flows."
    >
      <KureCard>
        <SectionHeading
          eyebrow="Coming next"
          title="Team workflows are reserved here"
          detail="Creation, invites, and role matching are the next extraction targets from the web product."
        />
        <Text style={{ color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans, lineHeight: 24 }}>
          The mobile shell now carries the slot in the same monochrome system as the rest of the signed-in app, even before the richer hackathon APIs are extracted.
        </Text>
      </KureCard>
    </KureScreen>
  );
}
