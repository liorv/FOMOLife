import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ReleaseNotes from '../ReleaseNotes';

it('renders above the header stacking context using a body portal and focuses the close button', () => {
  const { container } = render(<header style={{ position: 'sticky', zIndex: 11001 }}><ReleaseNotes /></header>);
  fireEvent.click(screen.getByRole('button', { name: "What's New" }));
  const dialog = screen.getByRole('dialog', { name: 'Release Notes' });
  expect(container).not.toContainElement(dialog);
  expect(dialog.parentElement?.parentElement).toBe(document.body);
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Close release notes' })).toHaveFocus();
});

it('closes using the close button and restores focus to the trigger', () => {
  render(<ReleaseNotes />);
  const trigger = screen.getByRole('button', { name: "What's New" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'Close release notes' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('closes with Escape even when keyboard focus is outside the dialog', () => {
  render(<ReleaseNotes />);
  const trigger = screen.getByRole('button', { name: "What's New" });
  fireEvent.click(trigger);
  trigger.focus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('keeps keyboard focus inside the dialog', () => {
  render(<ReleaseNotes />);
  fireEvent.click(screen.getByRole('button', { name: "What's New" }));
  const close = screen.getByRole('button', { name: 'Close release notes' });
  fireEvent.keyDown(close, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(close).toHaveFocus();
});

it('closes on the backdrop but not when clicking release content', () => {
  render(<ReleaseNotes />);
  fireEvent.click(screen.getByRole('button', { name: "What's New" }));
  fireEvent.click(screen.getByRole('heading', { name: 'Release Notes' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  fireEvent.click(dialog.parentElement!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
