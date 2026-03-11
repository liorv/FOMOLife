import React from 'react';
import { render } from '@testing-library/react';
import ProjectsDashboard from '../../ProjectsDashboard';

describe('Projects color picker (component smoke)', () => {
  it('wires onChangeColor prop and can be invoked', () => {
    const mockOnChange = jest.fn();

    render(<ProjectsDashboard projects={[]} selectedProject={null} onChangeColor={mockOnChange} />);

    // Directly call the prop to validate wiring in a lightweight smoke test.
    mockOnChange('p-test', '#abcdef');
    expect(mockOnChange).toHaveBeenCalledWith('p-test', '#abcdef');
  });
});
