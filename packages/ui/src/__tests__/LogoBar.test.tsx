import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../LogoBar';

describe('LogoBar', () => {
  it('always renders the avatar button even when canSignOut is false', () => {
    render(<LogoBar canSignOut={false} userInitials="AB" />);

    const button = screen.getByRole('button', { name: /user account/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('AB');

    // no menu should be present since there are no actions provided
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows logout menu item when onSoftLogout is provided', () => {
    const logout = jest.fn();
    render(
      <LogoBar
        userInitials="XY"
        onSoftLogout={logout}
        onSwitchUsers={() => {}}
      />
    );

    // Clicking should open the menu
    const avatarBtn = screen.getByRole('button', { name: /open account menu/i });
    fireEvent.click(avatarBtn);

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();

    // clicking logout triggers callback and closes menu
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    expect(logout).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
