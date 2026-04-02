import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: {
          backgroundColor: '#05070c',
        },
        headerShown: false,
      }}
    />
  );
}
