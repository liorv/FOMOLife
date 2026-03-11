import React from 'react';
import { render, screen, act } from '@testing-library/react';
import FrameworkHost from '../components/FrameworkHost';

// minimal props
const baseProps = {
  userId: 'u',
  userName: 'Test User',
  userEmail: 'test@example.com',
  userInitials: 'TU',
  canSignOut: false,
};

describe('FrameworkHost thumb icon messaging', () => {
  it('prefixes icon path with origin when received via thumbs-config', () => {
    render(<FrameworkHost {...baseProps} />);

    // before message, default icon text should appear inside the thumb button
    const beforeBtn = screen.getByLabelText('Thumb');
    expect(beforeBtn).toHaveTextContent(/add|refresh/i);

    // dispatch a message event with a relative icon path from another origin
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'thumb-config', icon: '/foo.svg', action: 'some' },
          origin: 'https://example.com',
        }),
      );
    });

    // after update, the thumb button should render an image element with full URL
    const imgBtn = screen.getByLabelText('Thumb');
    const img = imgBtn.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/foo.svg');
  });
});