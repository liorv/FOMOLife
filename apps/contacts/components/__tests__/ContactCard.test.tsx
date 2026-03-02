/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import shared component directly from UI package
// @ts-ignore
import { ContactCard } from '@myorg/ui';
import type { Contact } from '@myorg/types';

// stub clipboard
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  });
});

describe('ContactCard', () => {
  const base: Contact = {
    id: '1',
    name: 'Alice Smith',
    status: 'accepted',
    inviteToken: null,
    login: '',
  };

  it('renders initials and full name', () => {
    render(
      <ContactCard
        contact={base}
        onDelete={() => {}}
        onRename={() => {}}
        onGenerateInvite={() => {}}
      />,
    );

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('allows name editing when not read-only', async () => {
    const rename = jest.fn();
    render(
      <ContactCard
        contact={base}
        onDelete={() => {}}
        onRename={rename}
        onGenerateInvite={() => {}}
      />,
    );

    fireEvent.click(screen.getByTitle('Edit nickname'));
    const input = screen.getByLabelText('Edit contact name');
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText('Save'));

    expect(rename).toHaveBeenCalledWith('1', 'Bob');
  });

  it('copies existing invite link', async () => {
    const invited: Contact = { ...base, inviteToken: 'tok', status: 'invited' };
    render(
      <ContactCard
        contact={invited}
        onDelete={() => {}}
        onRename={() => {}}
        onGenerateInvite={() => {}}
      />,
    );

    const button = screen.getByLabelText('Copy invite link');
    fireEvent.click(button);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(screen.getByLabelText('Copied invite link')).toBeInTheDocument();
  });
});
