import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../src/components/LogoBar';

describe('LogoBar component', () => {
  test('renders logo and optional search field', () => {
    const change = jest.fn();
    const { rerender } = render(
      <LogoBar searchQuery="" onSearchChange={change} showSearch={false} />
    );
    const logo = screen.getByAltText('FOMO logo');
    expect(logo).toBeInTheDocument();
    // logo should sit inside left-column
    expect(logo.closest('.left-column')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search tasks…')).toBeNull();

    rerender(
      <LogoBar searchQuery="" onSearchChange={change} showSearch={true} />
    );
    const input = screen.getByPlaceholderText('Search tasks…');
    expect(input).toBeInTheDocument();
    // verify layout columns/rows
    expect(document.querySelector('.left-column')).toBeInTheDocument();
    expect(document.querySelector('.mid-column')).toBeInTheDocument();
    expect(document.querySelector('.right-column')).toBeInTheDocument();
    // the search container should live in the center row
    const centerRow = document.querySelector('.mid-row.center');
    expect(centerRow.contains(input)).toBe(true);
    // icon should appear inside the search container
    const icon = document.querySelector('.search-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.textContent).toBe('search');

    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(change).toHaveBeenCalledWith('xyz');
  });

  test('filter button shows popup and pills, and active pill appears', () => {
    const change = jest.fn();
    const onToggle = jest.fn();
    // start with no filters
    const { rerender } = render(
      <LogoBar
        searchQuery=""
        onSearchChange={change}
        showSearch={true}
        filters={[]}
        onToggleFilter={onToggle}
      />
    );
    const filterBtn = document.querySelector('.filter-icon');
    expect(filterBtn).toBeInTheDocument();
    // clicking opens popup with two pills
    fireEvent.click(filterBtn);
    const popup = document.querySelector('.filter-popup');
    expect(popup).toBeInTheDocument();
    // popup position handled by CSS; presence is enough
    expect(popup).not.toBeNull();
    const pills = popup.querySelectorAll('.filter-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toBe('Completed');
    expect(pills[0]).toHaveClass('completed');
    expect(pills[1].textContent).toBe('Overdue');
    expect(pills[1]).toHaveClass('overdue');
    // selecting a pill triggers filter event and closes popup
    fireEvent.click(pills[0]);
    expect(onToggle).toHaveBeenCalledWith('completed');
    // simulate prop update to show active pill
    rerender(
      <LogoBar
        searchQuery=""
        onSearchChange={change}
        showSearch={true}
        filters={[ 'completed' ]}
        onToggleFilter={onToggle}
      />
    );
    let activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(1);
    expect(activeEls[0].textContent).toContain('Completed');
    // add second filter and ensure both show
    rerender(
      <LogoBar
        searchQuery=""
        onSearchChange={change}
        showSearch={true}
        filters={[ 'completed', 'overdue' ]}
        onToggleFilter={onToggle}
      />
    );
    activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(2);
    // clicking the remove x should trigger toggle as well
    const clear1 = activeEls[0].querySelector('.clear-filter');
    fireEvent.click(clear1);
    expect(onToggle).toHaveBeenCalledWith('completed');
  });
});
