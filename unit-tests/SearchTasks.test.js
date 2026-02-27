import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchTasks from '../src/components/SearchTasks';

describe('SearchTasks component', () => {
  test('search input drives onSearchChange', () => {
    const change = jest.fn();
    render(
      <SearchTasks
        searchQuery=""
        onSearchChange={change}
        filters={[]}
        onToggleFilter={() => {}}
      />
    );
    const input = screen.getByPlaceholderText('Search tasks…');
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

    const pills = popup.querySelectorAll('.filter-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toBe('Completed');
    expect(pills[1].textContent).toBe('Overdue');

    // try custom availableFilters
    rerender(
      <SearchTasks
        searchQuery=""
        onSearchChange={() => {}}
        filters={[]}
        onToggleFilter={toggle}
        availableFilters={["starred", "upcoming"]}
        placeholder="Search items…"
      />
    );
    const input2 = screen.getByPlaceholderText('Search items…');
    expect(input2).toBeInTheDocument();
    fireEvent.click(document.querySelector('.filter-icon'));
    const customPills = document.querySelectorAll('.filter-pill');
    expect(customPills.length).toBe(2);
    expect(customPills[0].textContent).toBe('Starred');
    expect(customPills[1].textContent).toBe('Upcoming');

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

    const clear = activeEls[0].querySelector('.clear-filter');
    fireEvent.click(clear);
    expect(toggle).toHaveBeenCalledWith('overdue');
  });
});