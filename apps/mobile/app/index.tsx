import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/context/AuthProvider';

export default function IndexScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#05070c',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#7dd3fc" size="large" />
      </View>
    );
  }

  return <Redirect href={session ? '/dashboard' : '/login'} />;
}
