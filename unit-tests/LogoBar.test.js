import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../src/components/LogoBar';

// jest's JSDOM doesn't evaluate media queries, so we polyfill
// window.matchMedia to approximate the 400px breakpoint used in
// the component/CSS. Call setMatchMedia after changing innerWidth.
function setMatchMedia(width) {
  window.matchMedia = jest.fn().mockImplementation(query => {
    const mq = {
      matches: query === '(max-width:400px)' ? width <= 400 : false,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    return mq;
  });
}

describe('LogoBar component', () => {
  test('renders only the logo and basic layout', () => {
    setMatchMedia(window.innerWidth || 800);
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

  test('logo can act as navigation when onLogoClick provided', () => {
    setMatchMedia(window.innerWidth || 800);
    const onLogo = jest.fn();
    render(<LogoBar onLogoClick={onLogo} />);
    const logo = screen.getByAltText('FOMO logo');
    logo.click();
    expect(onLogo).toHaveBeenCalled();
  });

  test('shows title and back button when editing', async () => {
    setMatchMedia(window.innerWidth || 800);
    const back = jest.fn();
    render(<LogoBar title="Project A" onBack={back} />);
    // logo should still be present
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    // title should appear centered (text lives inside a span with the
    // bar-title-text class)
    const titleElement = screen.getByText('Project A');
    expect(titleElement).toHaveClass('bar-title-text');
    // Close button rendered in right column
    const closeBtn = screen.getByTitle('Close');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveClass('icon-button');
    // make sure sizing styles are applied for better touch targets
    expect(closeBtn).toHaveStyle({ padding: '12px' });
    const icon = closeBtn.querySelector('.material-icons');
    expect(icon).toHaveStyle({ fontSize: '24px' });
    // the button's textContent is just the material icon name
    expect(closeBtn.textContent).toBe('close');
    // clicking triggers callback
    fireEvent.click(closeBtn);
    expect(back).toHaveBeenCalled();
  });

  test('title becomes editable when clicked and commits changes', () => {
    setMatchMedia(window.innerWidth || 800);
    const change = jest.fn();
    render(<LogoBar title="Hello" onTitleChange={change} />);
    const titleSpan = screen.getByText('Hello');
    expect(titleSpan).toBeInTheDocument();
    // clicking the title enters edit mode
    fireEvent.click(titleSpan);
    const input = document.querySelector('.bar-title-input');
    expect(input).toBeInTheDocument();
    // input should carry the accessibility id we added
    expect(input.id).toBe('project-title-input');
    // change the text and press Enter
    fireEvent.change(input, { target: { value: 'World' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    // callback should have been called with new value
    expect(change).toHaveBeenCalledWith('World');
    // after commit the input should disappear; the component itself
    // still renders the original prop, so we update it to simulate parent
    expect(document.querySelector('.bar-title-input')).toBeNull();
    render(<LogoBar title="World" onTitleChange={change} />);
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  // the close button is always icon-only; no breakpoint handling required
  test('close button always shows icon only', () => {
    const back = jest.fn();
    render(<LogoBar title="Project B" onBack={back} />);
    const closeBtn = screen.getByTitle('Close');
    expect(closeBtn.textContent).toBe('close');
  });
});
