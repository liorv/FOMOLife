import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// simple sanity check that the bar can take 100% width (which is what we
// rely on in App.js).  This avoids importing the whole App component and
// sidesteps the various router/db hassles in the larger suite.

test('projects-search-bar uses full width when given', () => {
  const { container } = render(
    <div className="mid-column" style={{ width: '300px' }}>
      <div className="projects-search-bar" style={{ width: '75%' }}>foo</div>
    </div>
  );
  const bar = container.querySelector('.projects-search-bar');
  expect(bar).toBeInTheDocument();
  expect(bar).toHaveStyle('width: 75%');
});
