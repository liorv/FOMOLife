import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TaskUpdateSnackbar from '../TaskUpdateSnackbar';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('announces the result in a portal and auto-dismisses after six seconds', () => {
  const onDismiss = jest.fn();
  const { container } = render(<TaskUpdateSnackbar message="Updated 2 tasks." onDismiss={onDismiss} />);
  expect(screen.getByRole('status')).toHaveTextContent('Updated 2 tasks.');
  expect(container).not.toContainElement(screen.getByRole('status'));
  act(() => jest.advanceTimersByTime(5999));
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('supports explicit dismissal', () => {
  const onDismiss = jest.fn();
  render(<TaskUpdateSnackbar message="Updated 2 tasks." onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss task update' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('pauses dismissal while hovered or keyboard focused', () => {
  const onDismiss = jest.fn();
  render(<TaskUpdateSnackbar message="Updated 2 tasks." onDismiss={onDismiss} />);
  const snackbar = screen.getByRole('status').parentElement!;
  const dismiss = screen.getByRole('button', { name: 'Dismiss task update' });
  fireEvent.mouseEnter(snackbar);
  act(() => jest.advanceTimersByTime(10000));
  expect(onDismiss).not.toHaveBeenCalled();
  fireEvent.focus(dismiss);
  fireEvent.mouseLeave(snackbar);
  act(() => jest.advanceTimersByTime(10000));
  expect(onDismiss).not.toHaveBeenCalled();
  fireEvent.blur(dismiss);
  act(() => jest.advanceTimersByTime(6000));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
