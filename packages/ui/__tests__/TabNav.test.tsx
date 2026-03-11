import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNav } from '../src';

test('TabNav renders tabs and handles click', () => {
  type Tab = 'tasks' | 'people';
  const tabs = [
    { key: 'tasks', label: 'A', icon: 'a' },
    { key: 'people', label: 'B', icon: 'b' },
  ] as const;
  const change = jest.fn();
  const { rerender } = render(<TabNav active="tasks" tabs={tabs} onChange={change} />);
  const btnA = screen.getByText('A').closest('button');
  expect(btnA).toBeInTheDocument();
  expect(btnA).toHaveClass('tab-tasks');
  // hamburger placeholder should be rendered
  const ham = screen.getByLabelText('Menu');
  expect(ham).toBeInTheDocument();
  expect(ham).toHaveClass('tab-hamburger');
  fireEvent.click(screen.getByText('B'));
  expect(change).toHaveBeenCalledWith('people');

  // thumb button should invoke handler when using a glyph
  const thumbClick = jest.fn();
  rerender(
    <TabNav
      active="tasks"
      tabs={tabs}
      onChange={change}
      onThumbButtonClick={thumbClick}
      thumbIcon="star"
    />,
  );
  // button exists and uses icon name as text content inside fab
  const thumbBtn = screen.getByLabelText('Thumb');
  expect(thumbBtn).toBeInTheDocument();
  expect(thumbBtn).toHaveTextContent('star');
  fireEvent.click(thumbBtn);
  expect(thumbClick).toHaveBeenCalled();

  // custom svg path should render an <img> element instead of text
  const svgClick = jest.fn();
  rerender(
    <TabNav
      active="tasks"
      tabs={tabs}
      onChange={change}
      onThumbButtonClick={svgClick}
      thumbIcon="/assets/add-project.svg"
    />,
  );
  const svgBtn = screen.getByLabelText('Thumb');
  expect(svgBtn).toBeInTheDocument();
  const img = svgBtn.querySelector('img');
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('src', '/assets/add-project.svg');
  // image should live inside the circular fab wrapper
  expect(img?.closest('.tabs-thumb-fab')).toBeInTheDocument();
  fireEvent.click(svgBtn);
  expect(svgClick).toHaveBeenCalled();
});