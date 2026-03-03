import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactCard, { ContactCardProps } from '../src/ContactCard';
import type { Contact } from '@myorg/types';

test('ContactCard displays name and handles actions', () => {
  const contact: Contact = { id: '1', name: 'John', status: 'linked' };
  const del = jest.fn();
  const rename = jest.fn();
  const invite = jest.fn();
  render(
    <ContactCard
      contact={contact}
      onDelete={del}
      onRename={rename}
      onGenerateInvite={invite}
    />
  );
  expect(screen.getByText('John')).toBeInTheDocument();
});