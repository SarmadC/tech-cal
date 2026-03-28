import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { KureButton } from '@/components/chrome/KureButton';
import { KureCard } from '@/components/chrome/KureCard';
import { KureScreen } from '@/components/chrome/KureScreen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <KureScreen title="Route not found" subtitle="The native shell could not resolve that destination. Jump back into the product graph.">
        <KureCard>
          <Text>That path is not part of the current mobile build.</Text>
          <Link href="/(tabs)/discover" asChild>
            <KureButton>Return to discover</KureButton>
          </Link>
        </KureCard>
      </KureScreen>
    </>
  );
}
