import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/utils/test-utils';

import SkillsDropdown from './SkillsDropdown';

describe('SkillsDropdown', () => {
  it('renders a native select and adds a selected option', async () => {
    const user = userEvent.setup();
    const onSkillsChange = vi.fn();

    render(
      <SkillsDropdown
        selectedSkills={[]}
        onSkillsChange={onSkillsChange}
        placeholder="Select a skill..."
        suggestions={['React', 'Product Strategy']}
        suggestionHeaderLabel="Suggested Skills"
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Product Strategy');

    expect(onSkillsChange).toHaveBeenCalledWith(['Product Strategy']);
    expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument();
  });

  it('shows selected skills and allows removing them', async () => {
    const user = userEvent.setup();
    const onSkillsChange = vi.fn();

    render(
      <SkillsDropdown
        selectedSkills={['React', 'Product Strategy']}
        onSkillsChange={onSkillsChange}
        suggestions={['React', 'Product Strategy', 'Go-to-Market']}
      />
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Product Strategy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove React' }));

    expect(onSkillsChange).toHaveBeenCalledWith(['Product Strategy']);
  });
});
