jest.mock('@myorg/api-client', () => ({ inviteContact: jest.fn() }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactTile } from '../src';

describe('ContactTile', () => {
  it('starts editing and focuses name input when autoFocus is true', () => {
    render(
      <table><tbody>
      <ContactTile
        id="foo"
        name="My Name"
        status="linked"
        autoFocus
      />
      </tbody></table>
    );

    const input = screen.getByLabelText('Edit contact name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('does not render invite token accept fields', () => {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);

    render(
      <ContactTile
        id="foo"
        name="Bob"
        status="not_linked"
      />,
      { container: tbody }
    );

    expect(screen.queryByPlaceholderText(/invite token/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/invite token/i)).not.toBeInTheDocument();
    table.remove();
  });

  it('shows delete button and invite icon when not linked', async () => {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);

    render(
      <ContactTile
        id="foo"
        name="Charlie"
        status="not_linked"
      />,
      { container: tbody }
    );
    // delete button always present
    expect(screen.getByLabelText('Delete contact')).toBeInTheDocument();
    // invite icon present
    expect(screen.getByLabelText('Generate invite link')).toBeInTheDocument();
    table.remove();
  });

  it('generates and displays invite link when link button is clicked', async () => {
    const api = require('@myorg/api-client');
    (api.inviteContact as jest.Mock).mockResolvedValue({ inviteToken: 'tok123', inviteLink: 'http://app/accept?token=tok123' });

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);

    render(
      <ContactTile
        id="foo"
        name="Charlie"
        status="not_linked"
      />,
      { container: tbody }
    );

    const btn = screen.getByLabelText('Generate invite link');
    // stub clipboard too
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
    });
    fireEvent.click(btn);
    await screen.findByLabelText(/Copied invite link/i);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('token=tok123'));
    // cleanup DOM wrapper
    table.remove();
  });
});
