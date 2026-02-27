import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchTasks from '../src/components/SearchTasks';

describe('SearchTasks component', () => {
  test('search input drives onSearchChange and respects placeholder', () => {
    const change = jest.fn();
    render(
      <SearchTasks
        searchQuery=""
        onSearchChange={change}
        filters={[]}
        onToggleFilter={() => {}}
        placeholder="foo placeholder"
      />
    );
    const input = screen.getByPlaceholderText('foo placeholder');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'foo' } });
    expect(change).toHaveBeenCalledWith('foo');
  });

  test('filter button opens popup and toggles filters', () => {
    const toggle = jest.fn();
    const { rerender } = render(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[]}
        onToggleFilter={toggle}
      />
    );

    const filterBtn = document.querySelector('.filter-icon');
    expect(filterBtn).toBeInTheDocument();

    fireEvent.click(filterBtn);
    const popup = document.querySelector('.filter-popup');
    expect(popup).toBeInTheDocument();
    // popup should be positioned under the icon by default
    expect(popup).toHaveStyle('right: 12px');

    const pills = popup.querySelectorAll('.filter-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toBe('Completed');
    expect(pills[1].textContent).toBe('Overdue');

    fireEvent.click(pills[1]);
    expect(toggle).toHaveBeenCalledWith('overdue');

    // when filters prop includes something, active pill should render
    rerender(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={['overdue']}
        onToggleFilter={toggle}
      />
    );
    const activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(1);
    expect(activeEls[0].textContent).toContain('Overdue');

    const parent = activeEls[0].parentElement;
    expect(parent).toHaveClass('active-filters');
    // ensure the container is inside the search-container so positioning
    // will be correct
    expect(parent.parentElement).toHaveClass('search-container');
    expect(parent).toHaveStyle('top: calc(100% + 4px)');

    const clear = activeEls[0].querySelector('.clear-filter');
    fireEvent.click(clear);
    expect(toggle).toHaveBeenCalledWith('overdue');
  });

  test('allows custom availableFilters and hides icon when empty', () => {
    const toggle = jest.fn();
    const { rerender } = render(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[]}
        onToggleFilter={toggle}
        availableFilters={['starred', 'upcoming']}
      />
    );
    // icon should appear
    expect(document.querySelector('.filter-icon')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.filter-icon'));
    const popup = document.querySelector('.filter-popup');
    expect(popup).toBeInTheDocument();
    const labels = Array.from(popup.querySelectorAll('.filter-pill')).map(el => el.textContent);
    expect(labels).toEqual(['Starred','Upcoming']);

    // hide when availableFilters is empty
    rerender(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[]}
        onToggleFilter={toggle}
        availableFilters={[]}
      />
    );
    expect(document.querySelector('.filter-icon')).toBeNull();
  });

  test('ignores null/undefined in filters prop', () => {
    const toggle = jest.fn();
    render(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[null, 'completed', undefined]}
        onToggleFilter={toggle}
      />
    );
    const pills = document.querySelectorAll('.active-filter');
    expect(pills.length).toBe(1);
    expect(pills[0].textContent).toContain('Completed');
  });

  test('filters out null/undefined entries from availableFilters', () => {
    const toggle = jest.fn();
    render(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[]}
        onToggleFilter={toggle}
        availableFilters={[null, 'starred', undefined]}
      />
    );
    fireEvent.click(document.querySelector('.filter-icon'));
    const pills = document.querySelectorAll('.filter-pill');
    expect(pills.length).toBe(1);
    expect(pills[0].textContent).toBe('Starred');
  });
});