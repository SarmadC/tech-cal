import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/utils/test-utils';

import MultiSelectDropdown from './MultiSelectDropdown';

describe('MultiSelectDropdown', () => {
  it('uses the native variant and removes normalized selections correctly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelectDropdown
        options={[
          { value: 'SQL', label: 'SQL' },
          { value: 'Python', label: 'Python' },
        ]}
        selectedValues={['sql']}
        onChange={onChange}
        label="Current Skills"
        placeholder="Choose a skill..."
        variant="native"
      />
    );

    expect(screen.getByRole('combobox', { name: 'Current Skills' })).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove SQL' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows inline suggestions and overlap guidance for the inline-search variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelectDropdown
        options={[
          { value: 'Python', label: 'Python' },
          { value: 'SQL', label: 'SQL' },
          { value: 'Power BI', label: 'Power BI' },
          { value: 'Tableau', label: 'Tableau' },
        ]}
        selectedValues={['Python', 'SQL', 'Power BI', 'Tableau']}
        onChange={onChange}
        label="Current Skills"
        placeholder="Search current skills..."
        suggestions={['dbt']}
        suggestionLabel="Popular for your role"
        relatedValues={['Python']}
        relatedLabel="Current Skills"
        statusText="You can add 6 more."
        variant="inline-search"
      />
    );

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
    expect(screen.queryByText('You can add 6 more.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('textbox', { name: 'Current Skills' }));

    expect(screen.getByText('You can add 6 more.')).toBeInTheDocument();
    expect(screen.getByText('Also in Current Skills: Python. Overlap is okay if you want to go deeper.')).toBeInTheDocument();
    expect(screen.getByText('Popular for your role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dbt' })).toBeInTheDocument();
  });
});
