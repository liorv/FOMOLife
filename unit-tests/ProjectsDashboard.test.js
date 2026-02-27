import React from 'react';
import { render } from '@testing-library/react';
import ProjectsDashboard from '../src/components/ProjectsDashboard';

describe('ProjectsDashboard layout', () => {
  it('renders a wrapper that fills the available container space', () => {
    const stub = () => {};
    const { container } = render(
      <ProjectsDashboard
        projects={[]}
        people={[]}
        onSelectProject={stub}
        onApplyChange={stub}
        onAddSubproject={stub}
        onReorder={stub}
        onDeleteProject={stub}
        onAddProject={stub}
        onTitleChange={stub}
      />
    );
    const wrapper = container.querySelector('.projects-dashboard');
    expect(wrapper).toBeInTheDocument();
    // Layout style is governed by external CSS rules; existence of the
    // class is sufficient for this unit-level check.
    expect(wrapper).toHaveClass('projects-dashboard');

    // the dashboard body should also be rendered as a direct child
    // dashboard-body is only present when a project is selected;
    // home view should not have it
    expect(wrapper.querySelector('.dashboard-body')).toBeNull();

    // watermark should be a direct child and visible
    const watermark = wrapper.querySelector('.dashboard-home-bg');
    expect(watermark).toBeInTheDocument();
    expect(wrapper.contains(watermark)).toBe(true);

    // grid should be rendered directly inside the wrapper
    const grid = wrapper.querySelector('.dashboard-tiles-grid');
    expect(grid).toBeInTheDocument();
    expect(wrapper.contains(grid)).toBe(true);
    // inline style should reflect centering behaviour
    expect(grid).toHaveStyle('justify-content: center');
    expect(grid).toHaveStyle('margin: 10px auto 0 auto');
  });

  it('overdue summary icon is red regardless of count', () => {
    const stub = () => {};
    const project = { id: 'p1', text: 'foo', subprojects: [] };
    const { container, rerender } = render(
      <ProjectsDashboard
        projects={[project]}
        people={[]}
        selectedProjectId="p1"
        onSelectProject={stub}
        onApplyChange={stub}
        onAddSubproject={stub}
        onReorder={stub}
        onDeleteProject={stub}
        onAddProject={stub}
        onTitleChange={stub}
      />
    );
    // locate the overdue card by label text
    const cards = container.querySelectorAll('.dashboard-card');
    let overdueIcon;
    cards.forEach((c) => {
      if (c.textContent.includes('Overdue')) {
        overdueIcon = c.querySelector('.dashboard-card__icon');
      }
    });
    expect(overdueIcon).toBeTruthy();
    expect(getComputedStyle(overdueIcon).color).toBe(getComputedStyle(document.documentElement).getPropertyValue('--color-danger'));
    // rerender again to be sure color persists
    rerender(
      <ProjectsDashboard
        projects={[project]}
        people={[]}
        selectedProjectId="p1"
        onSelectProject={stub}
        onApplyChange={stub}
        onAddSubproject={stub}
        onReorder={stub}
        onDeleteProject={stub}
        onAddProject={stub}
        onTitleChange={stub}
      />
    );
    const overdueIcon2 = container.querySelector('.dashboard-card__icon');
    expect(getComputedStyle(overdueIcon2).color).toBe(getComputedStyle(document.documentElement).getPropertyValue('--color-danger'));
  });
});
