import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../src/components/LogoBar';

describe('LogoBar component', () => {
  test('renders only the logo and basic layout', () => {
    render(<LogoBar />);
    const logo = screen.getByAltText('FOMO logo');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('.left-column')).toBeInTheDocument();
    // the mid and right columns should still be present even though they are empty
    expect(document.querySelector('.mid-column')).toBeInTheDocument();
    expect(document.querySelector('.right-column')).toBeInTheDocument();
    // there should be no search input or filter icons
    expect(screen.queryByPlaceholderText('Search tasks…')).toBeNull();
    expect(document.querySelector('.filter-icon')).toBeNull();
  });
});
