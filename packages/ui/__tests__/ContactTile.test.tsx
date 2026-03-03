import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContactTile } from '../src/ContactTile';

describe('ContactTile', () => {
  it('starts editing and focuses name input when autoFocus is true', () => {
    render(
      <ContactTile
        id="foo"
        name="My Name"
        status="linked"
        autoFocus
      />
    );

    const input = screen.getByLabelText('Edit contact name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('does not render invite token accept fields', () => {
    render(
      <ContactTile
        id="foo"
        name="Bob"
        status="not_linked"
      />
    );

    expect(screen.queryByPlaceholderText(/invite token/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/invite token/i)).not.toBeInTheDocument();
  });

  it('shows delete button and invite icon when not linked', async () => {
    render(
      <ContactTile
        id="foo"
        name="Charlie"
        status="not_linked"
      />
    );
    // delete button always present
    expect(screen.getByLabelText('Delete contact')).toBeInTheDocument();
    // invite icon present
    expect(screen.getByLabelText('Generate invite link')).toBeInTheDocument();
  });

  it('generates and displays invite link when link button is clicked', async () => {
    const fake = jest.spyOn(require('@myorg/api-client'), 'inviteContact');
    fake.mockResolvedValue({ inviteToken: 'tok123', inviteLink: 'http://app/accept?token=tok123' });

    render(
      <ContactTile
        id="foo"
        name="Charlie"
        status="not_linked"
      />
    );

    const btn = screen.getByLabelText('Generate invite link');
    // stub clipboard too
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
    });
    btn.click();
    await screen.findByText(/Invite link copied to clipboard!/i);
    expect(screen.getByText('Invite link')).toHaveAttribute('href', 'http://app/accept?token=tok123');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/accept-invite?token=tok123'));
    fake.mockRestore();
  });
});
