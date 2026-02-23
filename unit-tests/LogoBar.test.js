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

  test('shows title and done/check button when editing', async () => {
    const back = jest.fn();
    render(<LogoBar title="Project A" onBack={back} />);
    // logo should still be present
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    // title should appear centered (text lives inside a span with the
    // bar-title-text class)
    const titleElement = screen.getByText('Project A');
    expect(titleElement).toHaveClass('bar-title-text');
    // done/check button rendered in right column and styled circular
    const doneBtn = screen.getByTitle('Done');
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn).toHaveClass('check-circle');
    // clicking back is synchronous; no special act needed
    fireEvent.click(doneBtn);
    expect(back).toHaveBeenCalled();
  });

  test('title becomes editable when clicked and commits changes', () => {
    const change = jest.fn();
    render(<LogoBar title="Hello" onTitleChange={change} />);
    const titleSpan = screen.getByText('Hello');
    expect(titleSpan).toBeInTheDocument();
    // clicking the title enters edit mode
    fireEvent.click(titleSpan);
    const input = document.querySelector('.bar-title-input');
    expect(input).toBeInTheDocument();
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
});
