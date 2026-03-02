/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../LogoBar';

describe('LogoBar', () => {
  it('renders search field when showSearch is true', () => {
    const handle = jest.fn();
    render(<LogoBar showSearch={true} searchValue="" onSearchChange={handle} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'foo' } });
    expect(handle).toHaveBeenCalledWith('foo');
  });

  it('toggles account menu when avatar clicked', () => {
    const logout = jest.fn();
    render(<LogoBar canSignOut={true} userName="Bob" onSoftLogout={logout} />);
    const avatarBtn = screen.getByLabelText('Open account menu');
    fireEvent.click(avatarBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Logout'));
    expect(logout).toHaveBeenCalled();
  });
});
