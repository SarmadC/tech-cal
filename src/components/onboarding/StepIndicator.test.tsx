import { describe, expect, it } from 'vitest';

import { render, screen } from '@/utils/test-utils';

import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('always shows the fixed 3-step onboarding flow', () => {
    render(<StepIndicator currentStep={3} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.queryByText('Learning')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Step 3: Goals')).toHaveAttribute('aria-current', 'step');
  });
});
