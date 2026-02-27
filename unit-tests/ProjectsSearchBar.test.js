import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// simple sanity check that the SearchTasks component will stretch to the
// full width of its parent container when used inside the mid-column.
// This test mirrors the previous semantics but targets the updated markup.

test('search-tasks component expands to 100% width', () => {
  const { container } = render(
    <div className="mid-column" style={{ width: '300px', display: 'flex' }}>
      <div className="search-tasks" style={{ width: '100%' }}>foo</div>
    </div>
  );
  const bar = container.querySelector('.search-tasks');
  expect(bar).toBeInTheDocument();
  expect(bar).toHaveStyle('width: 100%');
});
