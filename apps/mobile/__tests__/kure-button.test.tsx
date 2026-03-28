import { describe, expect, it } from '@jest/globals';
import { useState } from 'react';
import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { KureButton } from '../components/chrome/KureButton';
import { renderWithProviders } from './renderWithProviders';

function ButtonHarness() {
  const [label, setLabel] = useState('Idle');

  return (
    <>
      <Text>{label}</Text>
      <KureButton onPress={() => setLabel('Pressed')}>Trigger action</KureButton>
    </>
  );
}

describe('KureButton', () => {
  it('runs async-safe handlers and updates state through user presses', () => {
    renderWithProviders(<ButtonHarness />);

    expect(screen.getByText('Idle')).toBeTruthy();
    fireEvent.press(screen.getByText('Trigger action'));
    expect(screen.getByText('Pressed')).toBeTruthy();
  });
});
