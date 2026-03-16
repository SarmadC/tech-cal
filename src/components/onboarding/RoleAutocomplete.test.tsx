import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/utils/test-utils';

import { RoleAutocomplete } from './RoleAutocomplete';

describe('RoleAutocomplete', () => {
  it('renders a native select and updates the chosen role', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <RoleAutocomplete
        id="role"
        value=""
        onChange={onChange}
        label="Role"
      />
    );

    const select = screen.getByLabelText('Role');
    await user.selectOptions(select, 'Software Engineer');

    expect(onChange).toHaveBeenCalledWith('Software Engineer');
  });
});
